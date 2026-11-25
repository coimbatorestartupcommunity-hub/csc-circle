import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerViaSocketFlow } from "@/lib/services/viasocket";

export interface OutboundWebhookInput {
  eventName?: string;
  messageId?: string;
  customerNumber?: string;
  integratedNumber?: string;
  status?: string;
  reason?: string;
  timestamp?: string;
  rawPayload?: Record<string, unknown>;
}

export interface OutboundWebhookResult {
  handled: boolean;
  type: string;
  status: string;
  details?: Record<string, unknown>;
}

/**
 * Known business numbers owned by CSC Circle / Logic Intelligence Technologies.
 * Any webhook where the sender is one of these numbers is strictly an outbound message/event.
 */
export const CSC_BUSINESS_NUMBERS = new Set([
  "917550067712",
  "7550067712",
]);

/**
 * Checks whether an incoming webhook payload represents an OUTBOUND event
 * (e.g. MSG91 "On Outbound Request Received", delivery reports, blue ticks, or echo of our own dispatches).
 */
export function isOutboundWebhookPayload(body: Record<string, any>): boolean {
  if (!body || typeof body !== "object") return false;

  const eventName = (
    body.eventName ||
    body.event ||
    body.type ||
    body.direction ||
    ""
  ).toString().toLowerCase();

  const direction = (body.direction || "").toString().toLowerCase();
  const rawStatus = (body.status || "").toString().toLowerCase();

  // 0. Sender check: If sender/from is our business number (+91 7550067712), this is an outbound event (echo of our send)
  const senderCandidate = (
    body.sender ||
    body.from ||
    body.senderId ||
    body.data?.from ||
    body.data?.sender ||
    body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
    ""
  ).toString().replace(/\D/g, "");

  if (CSC_BUSINESS_NUMBERS.has(senderCandidate)) {
    return true;
  }

  // 1. Explicit direction check (direction: "1" or "outbound")
  if (direction === "outbound" || direction === "1") {
    return true;
  }

  // 2. Stringified JSON text check:
  // When MSG91 sends an outbound callback for a message that was dispatched,
  // MSG91 echoes back the sent payload as stringified JSON in `content` or `text` (e.g. `{"text": ...}`)
  const rawContent = (
    typeof body.content === "string"
      ? body.content
      : typeof body.text === "string"
      ? body.text
      : ""
  ).trim();

  if (
    rawContent.startsWith('{"text":') ||
    rawContent.startsWith('{"payload":') ||
    rawContent.startsWith('{"type":')
  ) {
    return true;
  }

  // 3. Specific MSG91 outbound event labels & delivery lifecycle receipts
  const outboundLifecycleEvents = [
    "submitted",
    "delivered",
    "read",
    "sent",
    "failed",
    "undelivered",
    "rejected",
    "request_acknowledged",
    "on outbound request received",
    "on outbound message received",
    "on outbound report received",
  ];

  if (eventName.includes("outbound") || outboundLifecycleEvents.includes(eventName)) {
    return true;
  }

  if (
    outboundLifecycleEvents.includes(rawStatus) &&
    !eventName.includes("inbound") &&
    eventName !== "message"
  ) {
    return true;
  }

  // 4. Explicit inbound exclusion (Never treat inbound as outbound)
  if (
    eventName.includes("inbound") ||
    direction === "inbound" ||
    direction === "0" ||
    eventName.includes("on inbound request received") ||
    eventName.includes("on inbound message received")
  ) {
    return false;
  }

  return false;
}

/**
 * WhatsApp Outbound Router
 *
 * Dedicated router to handle all outbound lifecycle notifications from MSG91 & WhatsApp Business API:
 * - "On Outbound Request Received" / "On Outbound Message Received"
 * - Delivery status updates (Delivered, Read, Failed)
 * - Telemetry & viaSocket Flow dispatching
 *
 * CRITICAL ARCHITECTURAL GUARANTEE:
 * This router NEVER invokes WhatsApp send APIs or triggers replies.
 * It absorbs outbound callbacks safely, updates database state,
 * and terminates cleanly to permanently prevent infinite message loops.
 */
export async function routeOutboundWhatsAppWebhook(
  input: OutboundWebhookInput
): Promise<OutboundWebhookResult> {
  try {
    const { getSubsystemMaintenanceConfig } = await import("@/lib/services/system-settings");
    const subsystems = await getSubsystemMaintenanceConfig();
    if (subsystems.whatsappOutbound?.paused) {
      console.log(
        `[whatsapp-outbound-router] Outbound processing skipped: paused by admin kill-switch (${subsystems.whatsappOutbound.reason || "Paused"})`
      );
      return { handled: true, type: "outbound_paused_by_admin", status: "paused" };
    }
  } catch {}

  const eventName = (input.eventName || "").toLowerCase();
  const rawStatus = (input.status || "").toLowerCase();

  // Map to normalized delivery status
  let deliveryStatus = "submitted";
  if (eventName.includes("read") || rawStatus === "read") {
    deliveryStatus = "read";
  } else if (eventName.includes("deliver") || rawStatus === "delivered") {
    deliveryStatus = "delivered";
  } else if (
    eventName.includes("fail") ||
    eventName.includes("undeliver") ||
    rawStatus === "failed" ||
    rawStatus === "undelivered"
  ) {
    deliveryStatus = "failed";
  } else if (eventName.includes("sent") || rawStatus === "sent") {
    deliveryStatus = "sent";
  } else if (
    eventName.includes("request received") ||
    eventName.includes("outbound")
  ) {
    deliveryStatus = "request_acknowledged";
  }

  const cleanPhone = (input.customerNumber || "").replace(/\D/g, "");
  const messageId = input.messageId || "";

  console.log(
    `[whatsapp-outbound-router] Outbound lifecycle event absorbed: ` +
    `event="${eventName}", status="${deliveryStatus}", recipient="${cleanPhone}", msgId="${messageId}"`
  );

  // 1. Forward delivery telemetry to viaSocket Flow for analytics & tracking
  try {
    await triggerViaSocketFlow("whatsapp_delivery_report" as any, {
      messageId,
      customerNumber: cleanPhone,
      deliveryStatus,
      rawEvent: eventName,
      reason: input.reason || null,
      updatedAt: input.timestamp || new Date().toISOString(),
    });
  } catch (flowErr) {
    console.warn(
      "[whatsapp-outbound-router] viaSocket delivery report warning:",
      flowErr
    );
  }

  // 2. Persist status update to Supabase outbox table if record exists
  if (messageId || cleanPhone) {
    try {
      const admin = createAdminClient();
      if (messageId) {
        const updatePayload: Record<string, any> = {
          status: deliveryStatus,
          updated_at: new Date().toISOString(),
        };
        if (input.reason) {
          updatePayload.last_error_message = input.reason;
        }
        await (admin.from("whatsapp_message_outbox") as any)
          .update(updatePayload)
          .or(
            `idempotency_key.eq.${messageId},idempotency_key.eq.inbound-${messageId}`
          );
      }
    } catch (dbErr) {
      console.warn(
        "[whatsapp-outbound-router] Supabase status update note:",
        dbErr
      );
    }
  }

  return {
    handled: true,
    type: "outbound_webhook_processed",
    status: deliveryStatus,
    details: {
      messageId,
      recipient: cleanPhone,
      eventName,
    },
  };
}
