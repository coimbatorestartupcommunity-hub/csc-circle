import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { chooseNotificationRecipient } from "@/lib/notifications/recipients";

/** Ensure a confirmed event pass has a durable email outbox row without duplicating the status trigger. */
export async function ensureEventPassEmail(admin: SupabaseClient<Database>, registrationId: string) {
  const { data: pass, error: passError } = await admin.from("event_registrations")
    .select("id,user_id,reference,status,pass_token,source_email")
    .eq("id", registrationId)
    .maybeSingle();
  if (passError || !pass || pass.status !== "confirmed" || !pass.user_id || !pass.pass_token) {
    return { ok: false as const, queued: false };
  }

  const recipient = chooseNotificationRecipient(pass.source_email);
  const { data: existing, error: existingError } = await admin.from("notifications")
    .select("id,status,last_error,recipient")
    .eq("channel", "email")
    .eq("template_key", "EventConfirmed")
    .eq("related_record_type", "event_registrations")
    .eq("related_record_id", pass.id)
    .order("created_at", { ascending: false })
    .limit(1);
  if (existingError) return { ok: false as const, queued: false };
  if (existing?.length) {
    const current = existing[0];
    const recoverInvalidRecipient = current.status === "failed_permanent" && current.last_error === "INVALID_RECIPIENT" && Boolean(recipient);
    const { error: repairError } = await admin.from("notifications").update({
      ...(recipient ? { recipient } : {}),
      ...(recoverInvalidRecipient ? { status: "queued", attempts: 0, available_at: new Date().toISOString(), last_error: null, lease_id: null } : {}),
    }).eq("id", current.id);
    if (repairError) return { ok: false as const, queued: false };
    return { ok: true as const, queued: recoverInvalidRecipient || current.status === "queued" || current.status === "failed_retryable" };
  }

  const { error: insertError } = await admin.from("notifications").insert({
    type: "EventConfirmed",
    template_key: "EventConfirmed",
    template_version: 1,
    channel: "email",
    recipient: recipient || null,
    recipient_user_id: pass.user_id,
    audience: "member",
    related_record_type: "event_registrations",
    related_record_id: pass.id,
    payload: { registrationId: pass.id, reference: pass.reference, status: "confirmed" },
    dedupe_key: `event-pass-confirmed:${pass.id}`,
    status: "queued",
  });
  if (insertError && insertError.code !== "23505") return { ok: false as const, queued: false };
  return { ok: true as const, queued: !insertError };
}
