import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdminContext, can } from "@/lib/admin/gate";
import { authResponse } from "@/lib/auth/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { issueImportedRegistrationPasses } from "@/lib/admin/imported-registration-pass";
import { parseGoogleFormCsv, validateGoogleFormResponse } from "@/lib/import/google-form-csv";

const requestSchema = z.object({ csv: z.string().max(5 * 1024 * 1024).default(""), action: z.enum(["preview", "commit", "approve_all"]) });
const mailKey = (value: string) => value.trim().toLowerCase();
async function listAllAuthUsers(admin: ReturnType<typeof createAdminClient>) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { users: null, error };
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return { users, error: null };
}
const timestamp = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};
const safeDriveUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["drive.google.com", "docs.google.com"].includes(url.hostname) ? url.href : "";
  } catch { return ""; }
};

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !can(ctx, "registrations.approve")) return authResponse({ error: "Registration import permission required." }, 403);
    if (!rateLimit(`event-import:${ctx.userId}:${clientIp(request)}`, 8, 60 * 60_000).allowed) return authResponse({ error: "Import limit reached. Try again later." }, 429);
    const { eventId } = await params;
    if (!z.string().uuid().safeParse(eventId).success) return authResponse({ error: "Invalid event." }, 404);
    const parsedBody = requestSchema.safeParse(await request.json());
    if (!parsedBody.success) return authResponse({ error: "Upload a CSV file under 5 MB." }, 422);
    if (parsedBody.data.action !== "approve_all" && !parsedBody.data.csv) return authResponse({ error: "Upload a CSV file under 5 MB." }, 422);
    const admin = createAdminClient();

    if (parsedBody.data.action === "approve_all") {
      const { data: event } = await admin.from("events").select("status,ends_at,capacity").eq("id", eventId).maybeSingle();
      if (!event || event.status !== "published" || Date.parse(event.ends_at) <= Date.now()) return authResponse({ error: "Imported passes can be issued only for a published upcoming event." }, 409);
      const { data: pending, error } = await admin.from("event_registrations").select("id,reference").eq("event_id", eventId).eq("source", "google_form_import").eq("status", "pending_review");
      if (error) return authResponse({ error: "Imported registrations could not be loaded." }, 503);
      const { count: confirmedCount } = await admin.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", eventId).in("status", ["confirmed", "checked_in"]);
      let approved = 0;
      let passesIssued = 0;
      let full = false;
      for (const row of pending ?? []) {
        if (event.capacity && (confirmedCount ?? 0) + passesIssued >= event.capacity) { full = true; break; }
        const result = await issueImportedRegistrationPasses(admin, row.id);
        if (result.ok) {
          approved += 1;
          passesIssued += result.passCount;
          await admin.from("audit_logs").insert({ action: "event.imported_registration.confirmed", actor_id: ctx.userId, target_type: "event_registrations", target_id: row.id, after: { status: "confirmed", reference: result.reference, passCount: result.passCount } });
        } else if (result.error.includes("capacity")) { full = true; break; }
      }
      if (approved) scheduleNotificationDelivery();
      return authResponse({ ok: true, approved, passesIssued, total: pending?.length ?? 0, full });
    }

    const { data: event, error: eventError } = await admin.from("events").select("id,title,max_attendees_per_registration,price_per_attendee,price_minor,admission").eq("id", eventId).maybeSingle();
    if (eventError || !event) return authResponse({ error: "Event not found." }, 404);
    let responses;
    try { responses = parseGoogleFormCsv(parsedBody.data.csv); }
    catch { return authResponse({ error: "The CSV headers or quoted fields could not be read." }, 422); }
    if (responses.length > 5000) return authResponse({ error: "CSV is limited to 5,000 response rows." }, 413);

    const [{ data: registrations, error: registrationsError }, knownUsers] = await Promise.all([
      admin.from("event_registrations").select("user_id,source_email").eq("event_id", eventId),
      listAllAuthUsers(admin),
    ]);
    if (registrationsError || knownUsers.error || !knownUsers.users) return authResponse({ error: "Existing registrations could not be checked safely." }, 503);
    const userEmailById = new Map(knownUsers.users.filter((user) => user.email).map((user) => [user.id, mailKey(user.email!)]));
    const existingEmails = new Set((registrations ?? []).flatMap((row) => [row.source_email, userEmailById.get(row.user_id)]).filter((value): value is string => Boolean(value)).map(mailKey));
    const seen = new Set<string>();
    const reviewRows = responses.map((row, index) => {
      const price = Number(event.price_per_attendee ?? Number(event.price_minor ?? 0) / 100);
      const errors = validateGoogleFormResponse(row, { maxAttendees: event.max_attendees_per_registration ?? 10, pricePerAttendee: event.admission === "paid" && Number.isFinite(price) ? price : undefined });
      const key = mailKey(row.email);
      const duplicate = Boolean(key) && (existingEmails.has(key) || seen.has(key));
      if (key) seen.add(key);
      return { rowNumber: index + 2, fullName: row.fullName, email: row.email, amountPaid: row.amountPaid, attendeeCount: row.attendeeCount, status: errors.length ? "invalid" : duplicate ? "duplicate" : "new", errors };
    });
    if (parsedBody.data.action === "preview") return authResponse({ ok: true, rows: reviewRows });

    const emails = new Map(knownUsers.users.filter((user) => user.email).map((user) => [mailKey(user.email!), user.id]));
    const results: Array<{ rowNumber: number; status: string }> = [];
    for (let index = 0; index < responses.length; index += 1) {
      const row = responses[index];
      const preview = reviewRows[index];
      if (preview.status !== "new") { results.push({ rowNumber: preview.rowNumber, status: preview.status }); continue; }
      let userId = emails.get(mailKey(row.email));
      if (!userId) {
        const redirectTo = new URL("/auth/confirm?next=%2Fmember%2Fevents", new URL(request.url).origin).toString();
        const { data, error } = await admin.auth.admin.inviteUserByEmail(row.email, { redirectTo });
        if (error || !data.user) { results.push({ rowNumber: preview.rowNumber, status: "invite_failed" }); continue; }
        userId = data.user.id;
        emails.set(mailKey(row.email), userId);
      }
      const registrationId = randomUUID();
      const { error: insertError } = await admin.from("event_registrations").insert({
        id: registrationId, user_id: userId, event_id: eventId, reference: `CSC-EVT-${randomUUID().replaceAll("-", "").toUpperCase()}`,
        status: "pending_review", payment: "pending", attendee_name: row.fullName, source: "google_form_import", source_email: mailKey(row.email),
        source_timestamp: timestamp(row.timestamp), goal: "Imported Google Form registration pending payment verification.",
      });
      if (insertError) { results.push({ rowNumber: preview.rowNumber, status: "insert_failed" }); continue; }
      const { error: metadataError } = await admin.from("event_registration_import_metadata").insert({ registration_id: registrationId, metadata: {
        source: "google_form_import", timestamp: row.timestamp, whatsapp: row.whatsapp, organization: row.organization, role: row.role,
        attendeeCount: row.attendeeCount, additionalAttendeeNames: row.additionalAttendeeNames, referralSource: row.referralSource,
        amountPaid: row.amountPaid, transactionRef: row.transactionRef, paymentScreenshotDriveUrl: safeDriveUrl(row.paymentScreenshotUrl), raw: row.raw,
      } });
      if (metadataError) {
        await admin.from("event_registrations").delete().eq("id", registrationId);
        results.push({ rowNumber: preview.rowNumber, status: "metadata_failed" });
        continue;
      }
      existingEmails.add(mailKey(row.email));
      results.push({ rowNumber: preview.rowNumber, status: "imported" });
    }
    return authResponse({ ok: true, results, imported: results.filter((row) => row.status === "imported").length });
  } catch { return authResponse({ error: "Registration import is temporarily unavailable." }, 503); }
}
