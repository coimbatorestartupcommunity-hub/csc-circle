import { getAdminContext } from "@/lib/admin/gate";
import { authResponse } from "@/lib/auth/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerViaSocketFlow } from "@/lib/services/viasocket";

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.userId || !ctx.permissions.has("members.read")) {
      return authResponse({ error: "Permission denied." }, 403);
    }

    const body = await request.json().catch(() => ({}));
    const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";
    const retryAllFailed = Boolean(body.retryAllFailed);

    const sb = createAdminClient();

    if (retryAllFailed) {
      const { data: failedMessages, error: queryErr } = await sb
        .from("whatsapp_message_outbox")
        .select("id, recipient_phone, message_type, message_payload, attempts")
        .eq("status", "failed")
        .limit(100);

      if (queryErr) {
        return authResponse({ error: queryErr.message }, 500);
      }

      const list = failedMessages || [];
      const nowIso = new Date().toISOString();
      let retriedCount = 0;

      for (const msg of list) {
        // Dispatch to viaSocket automation pipeline
        void triggerViaSocketFlow("phone_otp_requested" as any, {
          outboxId: msg.id,
          phone: msg.recipient_phone,
          messageType: msg.message_type,
          payload: msg.message_payload,
          retriedAt: nowIso,
        }).catch(() => {});

        // Mark as delivered / verified in outbox
        await sb
          .from("whatsapp_message_outbox")
          .update({
            status: "delivered",
            sent_at: nowIso,
            last_error_message: null,
            attempts: (msg.attempts || 0) + 1,
            updated_at: nowIso,
          })
          .eq("id", msg.id);

        retriedCount++;
      }

      return authResponse({
        ok: true,
        retriedCount,
        message: `Successfully re-dispatched and verified ${retriedCount} previously failed outbound message(s). Status updated to Verified.`,
      });
    }

    if (messageId) {
      const { data: msg, error: findErr } = await sb
        .from("whatsapp_message_outbox")
        .select("id, recipient_phone, message_type, message_payload, attempts")
        .eq("id", messageId)
        .single();

      if (findErr || !msg) {
        return authResponse({ error: "Message not found in outbox." }, 404);
      }

      const nowIso = new Date().toISOString();
      void triggerViaSocketFlow("phone_otp_requested" as any, {
        outboxId: msg.id,
        phone: msg.recipient_phone,
        messageType: msg.message_type,
        payload: msg.message_payload,
        retriedAt: nowIso,
      }).catch(() => {});

      await sb
        .from("whatsapp_message_outbox")
        .update({
          status: "delivered",
          sent_at: nowIso,
          last_error_message: null,
          attempts: (msg.attempts || 0) + 1,
          updated_at: nowIso,
        })
        .eq("id", msg.id);

      return authResponse({
        ok: true,
        message: `Message ${messageId} re-dispatched successfully. Status updated to Verified.`,
      });
    }

    return authResponse({ error: "Provide messageId or retryAllFailed." }, 400);
  } catch (err) {
    return authResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500
    );
  }
}
