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

  // 0. Explicit inbound exclusion (Never treat inbound as outbound)
  if (
    eventName.includes("inbound") ||
    direction === "inbound" ||
    eventName.includes("on inbound request received") ||
    eventName.includes("on inbound message received")
  ) {
    return false;
  }

  // 1. Explicit outbound identifiers
  if (
    eventName.includes("outbound") ||
    direction === "outbound" ||
    body.type === "outbound"
  ) {
    return true;
  }

  // 2. Specific MSG91 outbound event labels
  if (
    eventName.includes("on outbound request received") ||
    eventName.includes("on outbound message received")
  ) {
    return true;
  }

  // 3. Standard delivery receipts (Delivered, Read, Failed, Undelivered, Sent)
  const deliveryStatuses = [
    "delivered",
    "read",
    "failed",
    "undelivered",
    "sent",
    "submitted",
    "rejected",
  ];
  if (
    deliveryStatuses.includes(eventName) ||
    deliveryStatuses.includes(rawStatus)
  ) {
    return true;
  }

  // 4. Sender check: If sender/from is our business number, this is an outbound event
  const senderCandidate = (
    body.sender ||
    body.from ||
    body.senderId ||
    body.data?.from ||
    body.data?.sender ||
    ""
  ).toString().replace(/\D/g, "");

  if (CSC_BUSINESS_NUMBERS.has(senderCandidate)) {
    return true;
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
