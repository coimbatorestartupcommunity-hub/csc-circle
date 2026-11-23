import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const SYSTEM_NOTIFICATION_CONTACT_ID = "00000000-0000-0000-0000-000000000000";

export interface WhatsAppNotificationPayload {
  recipientPhone: string;
  recipientChatId?: string;
  text: string;
  messageType?: string;
  name?: string;
  idempotencyKey?: string;
}

/**
 * Normalizes phone numbers to standard international format (digits only).
 * Converts 10-digit Indian numbers to 91XXXXXXXXXX.
 */
export function normalizePhoneForWhatsApp(input: string): { e164: string; chatId: string } {
  let cleaned = (input || "").replace(/\D/g, "");
  // If user entered 10 digits without country code, assume India +91
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  const chatId = `${cleaned}@c.us`;
  return { e164: cleaned, chatId };
}

/**
 * Enqueues an outgoing notification directly to the Supabase transactional outbox.
 * The background worker claims and dispatches it via OpenWA within seconds.
 */
export async function enqueueWhatsAppNotification(
  payload: WhatsAppNotificationPayload
): Promise<{ success: boolean; outboxId?: string; error?: string }> {
  try {
    const { e164, chatId } = normalizePhoneForWhatsApp(payload.recipientPhone);
    if (!e164 || e164.length < 10) {
      return { success: false, error: "Invalid recipient phone number" };
    }

    const admin = createAdminClient();
    const finalChatId = payload.recipientChatId || chatId;
    const finalKey =
      payload.idempotencyKey ||
      `notif-${payload.messageType || "msg"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { data, error } = await admin
      .from("whatsapp_message_outbox")
      .insert({
        contact_id: SYSTEM_NOTIFICATION_CONTACT_ID,
        recipient_phone: e164,
        recipient_chat_id: finalChatId,
        message_type: payload.messageType || "system_notification",
        message_payload: {
          text: payload.text,
          name: payload.name,
          enqueuedAt: new Date().toISOString(),
        },
        status: "pending",
        idempotency_key: finalKey,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[enqueueWhatsAppNotification] Database error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, outboxId: data.id };
  } catch (err) {
    console.error("[enqueueWhatsAppNotification] Exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
