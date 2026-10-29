import { randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parseAdditionalAttendeeNames } from "@/lib/validations/paid-registration";
import { ensureEventPassEmail } from "@/lib/admin/event-pass-email";

export async function issueImportedRegistrationPasses(admin: SupabaseClient<Database>, registrationId: string) {
  const { data: lead, error } = await admin.from("event_registrations").select("id,event_id,user_id,attendee_name,reference,pass_token,status,source,source_email,source_timestamp").eq("id", registrationId).maybeSingle();
  if (error || !lead || lead.source !== "google_form_import") return { ok: false as const, error: "Imported registration could not be found." };
  if (lead.status === "confirmed") {
    const email = await ensureEventPassEmail(admin, lead.id);
    if (!email.ok) return { ok: false as const, error: "Registration is approved, but its pass email could not be queued. Refresh and use Resend pass." };
    return { ok: true as const, reference: lead.reference, passCount: 1 };
  }
  if (lead.status !== "pending_review") return { ok: false as const, error: `Imported registration is currently ${lead.status.replaceAll("_", " ")}.` };
  const [{ data: event }, { data: saved }] = await Promise.all([
    admin.from("events").select("status,ends_at,capacity,title").eq("id", lead.event_id).maybeSingle(),
    admin.from("event_registration_import_metadata").select("metadata").eq("registration_id", lead.id).maybeSingle(),
  ]);
  if (!event || event.status !== "published" || Date.parse(event.ends_at) <= Date.now()) return { ok: false as const, error: "Passes can be issued only for a published upcoming event." };
  const metadata = (saved?.metadata ?? {}) as Record<string, unknown>;
  const additional = typeof metadata.additionalAttendeeNames === "string" ? parseAdditionalAttendeeNames(metadata.additionalAttendeeNames) : [];
  const names = [...new Set([lead.attendee_name?.trim() || (typeof metadata.fullName === "string" ? metadata.fullName.trim() : ""), ...additional].filter(Boolean))].slice(0, 10);
  if (!names.length) return { ok: false as const, error: "Attendee names are missing." };
  const { count: confirmedCount } = await admin.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", lead.event_id).in("status", ["confirmed", "checked_in"]);
  const { data: existing } = await admin.from("event_registrations").select("id,attendee_name,status").eq("source_parent_registration_id", lead.id);
  const existingNames = new Set((existing ?? []).map((pass) => pass.attendee_name?.trim().toLocaleLowerCase("en")).filter(Boolean));
  const needed = 1 + names.slice(1).filter((name) => !existingNames.has(name.toLocaleLowerCase("en"))).length;
  if (event.capacity && (confirmedCount ?? 0) + needed > event.capacity) return { ok: false as const, error: "The remaining event capacity is too small for this registration." };

  const passToken = lead.pass_token || randomBytes(32).toString("hex");
  const { error: leadError } = await admin.from("event_registrations").update({ status: "confirmed", payment: "paid", attendee_name: names[0], pass_token: passToken }).eq("id", lead.id).eq("status", "pending_review");
  if (leadError) return { ok: false as const, error: "The lead attendee pass could not be issued." };
  for (const name of names.slice(1)) {
    if (existingNames.has(name.toLocaleLowerCase("en"))) continue;
    const id = randomUUID();
    const ref = `CSC-EVT-${randomUUID().replaceAll("-", "").toUpperCase()}`;
    const { error: insertError } = await admin.from("event_registrations").insert({
      id, event_id: lead.event_id, user_id: lead.user_id, status: "confirmed", payment: "paid", attendee_name: name,
      reference: ref, pass_token: randomBytes(32).toString("hex"), source: "google_form_import", source_email: lead.source_email,
      source_timestamp: lead.source_timestamp, source_parent_registration_id: lead.id, goal: "Additional attendee pass from imported Google Form registration.",
    });
    if (insertError) return { ok: false as const, error: "An additional attendee pass could not be issued." };
    await admin.from("event_registration_import_metadata").insert({ registration_id: id, metadata: { ...metadata, attendeeName: name, groupRegistrationId: lead.id } });
  }

  // Best-effort in-app (bell) notification confirming registration + pass
  // approval, deep-linked to the downloadable pass page. The dedupe key is keyed
  // per (member, event) to stay idempotent with the registration_confirmed_inapp
  // DB trigger, which also covers the paid and admin-RSVP approval paths. The
  // EventConfirmed email is enqueued separately by the registration_status_email
  // trigger. A notification failure must never block pass issuance.
  if (lead.user_id) {
    const eventTitle = typeof event.title === "string" && event.title.trim() ? event.title.trim() : "your CSC event";
    try {
      await admin.from("notifications").insert({
        type: "EventConfirmed",
        channel: "in_app",
        recipient: lead.source_email,
        recipient_user_id: lead.user_id,
        audience: "member",
        related_record_type: "event_registrations",
        related_record_id: lead.id,
        title: "You're registered — event pass approved",
        message: `Your registration for ${eventTitle} is confirmed and your event pass is approved. Open your event pass to view the QR and download it.`,
        action_url: `/member/events/${lead.id}`,
        payload: { reference: lead.reference, passCount: names.length },
        dedupe_key: `event.confirmed.inapp:${lead.user_id}:${lead.event_id}`,
        status: "available",
        delivered_at: new Date().toISOString(),
      });
    } catch {
      /* pass issuance already succeeded; the email remains the durable channel */
    }
  }

  const email = await ensureEventPassEmail(admin, lead.id);
  if (!email.ok) return { ok: false as const, error: "Pass was issued, but its confirmation email could not be queued. Refresh and use Resend pass." };

  return { ok: true as const, reference: lead.reference, passCount: names.length };
}
