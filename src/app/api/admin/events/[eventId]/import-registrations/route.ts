import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdminContext, can } from "@/lib/admin/gate";
import { authResponse } from "@/lib/auth/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { issueImportedRegistrationPasses } from "@/lib/admin/imported-registration-pass";
import { ensureEventPassEmail } from "@/lib/admin/event-pass-email";
import { parseGoogleFormCsv, validateGoogleFormResponse } from "@/lib/import/google-form-csv";
import { indexRegistrationsByEmail, planGoogleFormImport } from "@/lib/import/registration-import-plan";

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
          // Imported attendees are invited accounts that have not confirmed
          // their email yet, so the status trigger's EventConfirmed email has no
          // resolvable recipient and fails as INVALID_RECIPIENT. Point it at the
          // known Google Form address so the confirmation + pass QR actually send.
          await ensureEventPassEmail(admin, row.id);
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
      admin.from("event_registrations").select("id,user_id,source_email,source,status,payment,created_at,source_parent_registration_id").eq("event_id", eventId),
      listAllAuthUsers(admin),
    ]);
    if (registrationsError || knownUsers.error || !knownUsers.users) return authResponse({ error: "Existing registrations could not be checked safely." }, 503);
    const userEmailById = new Map(knownUsers.users.filter((user) => user.email).map((user) => [user.id, mailKey(user.email!)]));
    const existingByEmail = indexRegistrationsByEmail(registrations ?? [], userEmailById);
    const reviewRows = planGoogleFormImport(responses, existingByEmail, (row) => {
      const price = Number(event.price_per_attendee ?? Number(event.price_minor ?? 0) / 100);
      return validateGoogleFormResponse(row, { maxAttendees: event.max_attendees_per_registration ?? 10, pricePerAttendee: event.admission === "paid" && Number.isFinite(price) ? price : undefined });
    });
    if (parsedBody.data.action === "preview") return authResponse({ ok: true, rows: reviewRows });

    const emails = new Map(knownUsers.users.filter((user) => user.email).map((user) => [mailKey(user.email!), user.id]));
    const results: Array<{ rowNumber: number; status: string }> = [];
    let repairedPassEmails = 0;
    for (let index = 0; index < responses.length; index += 1) {
      const row = responses[index];
      const preview = reviewRows[index];
      if (preview.status === "invalid") { results.push({ rowNumber: preview.rowNumber, status: preview.status }); continue; }
      const emailKey = mailKey(row.email);
      const existing = existingByEmail.get(emailKey);
      let userId = emails.get(mailKey(row.email));
      if (!userId && existing?.user_id) userId = existing.user_id;
      if (!userId) {
        const redirectTo = new URL("/auth/confirm?next=%2Fmember%2Fevents", new URL(request.url).origin).toString();
        const { data, error } = await admin.auth.admin.inviteUserByEmail(row.email, { redirectTo });
        if (error || !data.user) {
          // The auth invite email is rate-limited after many imports in a short
          // window, which would otherwise silently drop valid rows. Fall back to
          // creating the account without sending an email so the registration
          // still imports; the attendee receives their event pass email directly
          // and can sign in with Google using the same address.
          const { data: created, error: createError } = await admin.auth.admin.createUser({ email: row.email, email_confirm: true });
          if (createError || !created.user) { results.push({ rowNumber: preview.rowNumber, status: "invite_failed" }); continue; }
          userId = created.user.id;
        } else {
          userId = data.user.id;
        }
        emails.set(mailKey(row.email), userId);
      }
      const registrationId = existing?.id ?? randomUUID();
      const metadata = {
        source: "google_form_import", timestamp: row.timestamp, whatsapp: row.whatsapp, organization: row.organization, role: row.role,
        attendeeCount: row.attendeeCount, additionalAttendeeNames: row.additionalAttendeeNames, referralSource: row.referralSource,
        amountPaid: row.amountPaid, transactionRef: row.transactionRef, paymentScreenshotDriveUrl: safeDriveUrl(row.paymentScreenshotUrl), fullName: row.fullName, raw: row.raw,
      };
      if (!existing) {
        const { error: insertError } = await admin.from("event_registrations").insert({
          id: registrationId, user_id: userId, event_id: eventId, reference: `CSC-EVT-${randomUUID().replaceAll("-", "").toUpperCase()}`,
          status: "pending_review", payment: "pending", attendee_name: row.fullName, source: "google_form_import", source_email: emailKey,
          source_timestamp: timestamp(row.timestamp), goal: "Imported Google Form registration pending payment verification.",
        });
        if (insertError) { results.push({ rowNumber: preview.rowNumber, status: "insert_failed" }); continue; }
      }
      const { error: metadataError } = await admin.from("event_registration_import_metadata").upsert({ registration_id: registrationId, metadata }, { onConflict: "registration_id" });
      if (metadataError) {
        if (!existing) await admin.from("event_registrations").delete().eq("id", registrationId);
        results.push({ rowNumber: preview.rowNumber, status: "metadata_failed" });
        continue;
      }
      if (existing) {
        const reviewed = ["confirmed", "checked_in"].includes(existing.status);
        const { error: updateError } = await admin.from("event_registrations").update({
          user_id: userId,
          attendee_name: row.fullName,
          source: "google_form_import",
          source_email: emailKey,
          source_timestamp: timestamp(row.timestamp),
          status: reviewed ? existing.status : "pending_review",
          payment: reviewed ? existing.payment : "pending",
          goal: reviewed ? "Imported Google Form payment data attached to an existing event pass." : "Imported Google Form registration pending payment verification.",
        }).eq("id", registrationId);
        if (updateError) { results.push({ rowNumber: preview.rowNumber, status: "update_failed" }); continue; }
        existing.source = "google_form_import";
        existing.source_email = emailKey;
        existing.user_id = userId;
        if (reviewed) {
          const email = await ensureEventPassEmail(admin, registrationId);
          if (email.ok && email.queued) repairedPassEmails += 1;
        }
        results.push({ rowNumber: preview.rowNumber, status: "updated" });
      } else {
        existingByEmail.set(emailKey, {
          id: registrationId, user_id: userId, source_email: emailKey, source: "google_form_import", status: "pending_review",
          payment: "pending", created_at: new Date().toISOString(), source_parent_registration_id: null,
        });
        results.push({ rowNumber: preview.rowNumber, status: "imported" });
      }
    }
    const imported = results.filter((row) => row.status === "imported").length;
    const updated = results.filter((row) => row.status === "updated").length;
    const invalid = results.filter((row) => row.status === "invalid").length;
    if (repairedPassEmails) scheduleNotificationDelivery();
    return authResponse({ ok: true, results, imported, updated, invalid, processed: imported + updated, repairedPassEmails });
  } catch { return authResponse({ error: "Registration import is temporarily unavailable." }, 503); }
}
