import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { chooseNotificationRecipient } from "@/lib/notifications/recipients";

/** Ensure a confirmed event pass has one durable email outbox row. */
export async function ensureEventPassEmail(admin: SupabaseClient<Database>, registrationId: string) {
  const { data: pass, error: passError } = await admin
    .from("event_registrations")
    .select("id,user_id,reference,status,pass_token,source_email,attendee_name,paid_registration_id,event_id")
    .eq("id", registrationId)
    .maybeSingle();

  if (passError || !pass || pass.status !== "confirmed" || !pass.pass_token) {
    return { ok: false as const, queued: false };
  }

  // Tier 1: source_email and attendee_name directly on event_registrations
  let recipient = chooseNotificationRecipient(pass.source_email);
  let attendeeName = pass.attendee_name?.trim() || "";

  // Tier 2: paid_event_registrations
  if ((!recipient || !attendeeName) && pass.paid_registration_id) {
    const { data: paidRegistration } = await admin
      .from("paid_event_registrations")
      .select("email,full_name")
      .eq("id", pass.paid_registration_id)
      .maybeSingle();
    if (paidRegistration) {
      recipient ||= chooseNotificationRecipient(paidRegistration.email);
      attendeeName ||= paidRegistration.full_name?.trim() || "";
    }
  }

  // Tier 3: event_payment_orders
  if ((!recipient || !attendeeName) && (pass.paid_registration_id || pass.event_id)) {
    let orderQuery = admin
      .from("event_payment_orders")
      .select("email,full_name")
      .eq("status", "reconciled");

    orderQuery = pass.paid_registration_id
      ? orderQuery.eq("paid_registration_id", pass.paid_registration_id)
      : orderQuery.eq("event_id", pass.event_id!);

    const { data: paymentOrder } = await orderQuery.limit(1).maybeSingle();
    if (paymentOrder) {
      recipient ||= chooseNotificationRecipient(paymentOrder.email);
      attendeeName ||= paymentOrder.full_name?.trim() || "";
    }
  }

  // Tier 4: profiles (when pass.user_id is present)
  if ((!recipient || !attendeeName) && pass.user_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email,full_name,display_name")
      .eq("id", pass.user_id)
      .maybeSingle();
    if (profile) {
      recipient ||= chooseNotificationRecipient(profile.email);
      attendeeName ||= profile.full_name?.trim() || profile.display_name?.trim() || "";
    }
  }

  if (!recipient) return { ok: false as const, queued: false };

  // Self-healing persistence: backfill resolved source_email or attendee_name onto event_registrations
  const shouldUpdateEmail = !pass.source_email?.trim() || pass.source_email !== recipient;
  const shouldUpdateName = !pass.attendee_name?.trim() && Boolean(attendeeName);

  if (shouldUpdateEmail || shouldUpdateName) {
    const { error: repairPassError } = await admin
      .from("event_registrations")
      .update({
        ...(shouldUpdateEmail ? { source_email: recipient } : {}),
        ...(shouldUpdateName ? { attendee_name: attendeeName } : {}),
      })
      .eq("id", pass.id);
    if (repairPassError) return { ok: false as const, queued: false };
  }

  // Check for existing outbox notification
  const { data: existing, error: existingError } = await admin
    .from("notifications")
    .select("id,status,last_error,recipient")
    .eq("related_record_id", pass.id)
    .eq("template_key", "EventConfirmed")
    .maybeSingle();
  if (existingError) return { ok: false as const, queued: false };

  if (existing) {
    const current = existing;
    const recoverInvalidRecipient =
      current.status === "failed_permanent" && current.last_error === "INVALID_RECIPIENT";
    const { error: repairError } = await admin
      .from("notifications")
      .update({
        recipient,
        ...(recoverInvalidRecipient
          ? {
              status: "queued" as const,
              attempts: 0,
              available_at: new Date().toISOString(),
              last_error: null,
              lease_id: null,
            }
          : {}),
      })
      .eq("id", current.id);
    if (repairError) return { ok: false as const, queued: false };
    return {
      ok: true as const,
      queued:
        recoverInvalidRecipient ||
        current.status === "queued" ||
        current.status === "failed_retryable",
    };
  }

  // Insert fresh outbox row
  const { error: insertError } = await admin.from("notifications").insert({
    type: "EventConfirmed",
    template_key: "EventConfirmed",
    template_version: 1,
    channel: "email",
    recipient,
    recipient_user_id: pass.user_id,
    audience: "member",
    related_record_type: "event_registrations",
    related_record_id: pass.id,
    payload: {
      registrationId: pass.id,
      reference: pass.reference,
      status: "confirmed",
      name: attendeeName || "Attendee",
    },
    dedupe_key: `event-pass-confirmed:${pass.id}`,
    status: "queued",
  });
  if (insertError && insertError.code !== "23505") return { ok: false as const, queued: false };
  return { ok: true as const, queued: !insertError };
}
