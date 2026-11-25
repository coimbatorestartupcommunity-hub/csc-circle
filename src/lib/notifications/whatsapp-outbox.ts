import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendMsg91WhatsAppTextMessage,
  sendMsg91WhatsAppTemplate,
} from "@/lib/services/msg91";

export const SYSTEM_NOTIFICATION_CONTACT_ID = "00000000-0000-0000-0000-000000000000";

export const CSC_WHATSAPP_FOOTER = [
  "🚀 *Connect • Build • Grow*",
  "🌐 *Coimbatore Startup Community (CSC Circle)*",
  "🤍 ⚙️ *Powered by Logic Intelligence Technologies*",
].join("\n");

export interface WhatsAppNotificationPayload {
  recipientPhone: string;
  recipientChatId?: string;
  text: string;
  messageType?: string;
  name?: string;
  idempotencyKey?: string;
  templateName?: string;
  templateVariables?: string[];
}

/**
 * Normalizes CommonMark / LLM Markdown into standard WhatsApp formatting.
 * - Converts markdown double or multiple asterisks (**bold** / ****bold****) to single asterisks (*bold*).
 * - Converts ***bold-italic*** to _*bold-italic*_.
 * - Converts markdown headings (# Heading) to *Heading*.
 * - Converts bullet points (* or +) to • to avoid unclosed asterisk formatting bleed.
 * - Cleans stray double-stars and internal whitespace to guarantee native WhatsApp bolding.
 */
export function formatForWhatsApp(text: string): string {
  if (!text) return "";
  let out = text;
  // Convert markdown bullet points (* or + at start of line) to •
  out = out.replace(/^([ \t]*)[\*\+]\s+/gm, "$1• ");
  // Triple asterisks (bold italic) ***text*** -> _*text*_
  out = out.replace(/\*{3,}([^\*\n]+?)\*{3,}/g, "_*$1*_");
  // Double or multiple asterisks (markdown bold) **text** -> *text*
  out = out.replace(/\*{2,}([^\*\n]+?)\*{2,}/g, "*$1*");
  // Markdown headings (# Heading) -> *Heading*
  out = out.replace(/^#{1,6}\s+(.*)$/gm, "*$1*");
  // Clean up any remaining multiple asterisks (** or *** -> *)
  out = out.replace(/\*{2,}/g, "*");
  // Clean spaces right inside bold asterisks e.g. * Vikash * -> *Vikash*
  out = out.replace(/\*\s+([^\*\n]+?)\s+\*/g, "*$1*");
  return out;
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
 * The background worker claims and dispatches it via WhatsApp Cloud Gateway within seconds.
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

    const formattedText = formatForWhatsApp(payload.text);

    const { data, error } = await admin
      .from("whatsapp_message_outbox")
      .insert({
        contact_id: SYSTEM_NOTIFICATION_CONTACT_ID,
        recipient_phone: e164,
        recipient_chat_id: finalChatId,
        message_type: payload.messageType || "system_notification",
        message_payload: {
          text: formattedText,
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

    // Serverless Direct Dispatch via MSG91 WhatsApp Gateway for instant delivery
    try {
      let sendRes;

      // Note: Meta rejects OTP/passkey templates under UTILITY with INCORRECT_CATEGORY.
      // Calling MSG91 template API with a rejected template returns 200 asynchronously but Meta drops it.
      // Therefore, rejected templates MUST be bypassed in favor of direct text messaging.
      const REJECTED_TEMPLATES = new Set(["csc_otp_verification", "csc_login_passkey"]);

      const candidateTemplate =
        payload.templateName ||
        (payload.messageType === "phone_verification_success"
          ? "phone_verification_success"
          : undefined);

      const targetTemplate =
        candidateTemplate && !REJECTED_TEMPLATES.has(candidateTemplate)
          ? candidateTemplate
          : undefined;

      if (targetTemplate) {
        const bodyParams =
          payload.templateVariables && payload.templateVariables.length > 0
            ? payload.templateVariables
            : targetTemplate === "phone_verification_success"
            ? [
                payload.name || "Member",
                e164,
                "https://csc.logicintelligencetechnologies.in/profile",
              ]
            : [];

        sendRes = await sendMsg91WhatsAppTemplate({
          recipientPhone: e164,
          templateName: targetTemplate,
          bodyParameters: bodyParams,
        });

        // If template dispatch fails (e.g. pending approval), seamlessly fall back to text message
        if (!sendRes.success) {
          sendRes = await sendMsg91WhatsAppTextMessage({
            recipientPhone: e164,
            text: formattedText,
          });
        }
      } else {
        sendRes = await sendMsg91WhatsAppTextMessage({
          recipientPhone: e164,
          text: formattedText,
        });
      }

      if (sendRes.success) {
        await admin
          .from("whatsapp_message_outbox")
          .update({
            status: "delivered",
            sent_at: new Date().toISOString(),
            openwa_message_id: targetTemplate ? `template:${targetTemplate}` : "msg91_sent",
          })
          .eq("id", data.id);
      } else {
        await admin
          .from("whatsapp_message_outbox")
          .update({
            last_error_message: sendRes.message || "Gateway dispatch failed",
            last_error_code: String(sendRes.code || "DISPATCH_FAILED"),
          })
          .eq("id", data.id);
      }
    } catch (dispatchErr) {
      console.warn("[enqueueWhatsAppNotification] Direct dispatch non-fatal error:", dispatchErr);
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
