import { NextResponse } from "next/server";
import { triggerViaSocketFlow } from "@/lib/services/viasocket";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Inbound & Outbound Webhook for MSG91 & WhatsApp Business API
 * Handles:
 * 1. Inbound messages received from users (e.g. WhatsApp replies/queries)
 * 2. Outbound delivery reports (Delivered, Read, Failed)
 * 3. Automatic forwarding to viaSocket Flow for no-code automations
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log("[msg91-webhook] Received callback:", JSON.stringify(body).slice(0, 300));

    const eventName = (body.eventName || body.event || body.type || "").toLowerCase();
    const customerNumber = body.customerNumber || body.mobile || body.from || "";
    const text = body.text || body.body || body.message || "";
    const messageId = body.uuid || body.messageId || body.requestId || "";
    const integratedNumber = body.integratedNumber || body.to || "";

    // 1. Inbound User Message (User texted WhatsApp +91 7550067712)
    if (eventName === "inbound" || (customerNumber && text)) {
      console.log(`[msg91-webhook] Inbound message from ${customerNumber}: "${text.slice(0, 50)}..."`);

      // Forward to viaSocket Flow so visual automations can act on it
      triggerViaSocketFlow("whatsapp_inbound_message" as any, {
        customerNumber,
        integratedNumber,
        text,
        messageId,
        receivedAt: new Date().toISOString(),
      }).catch((err) => console.warn("[msg91-webhook] viaSocket trigger error:", err));

      // Forward to background AI worker endpoint if running
      try {
        const cleanDigits = customerNumber.replace(/\D/g, "");
        fetch("http://127.0.0.1:3030/webhook/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${cleanDigits}@c.us`,
            body: text,
            id: messageId,
          }),
        }).catch(() => {});
      } catch {
        // Non-blocking forward
      }

      // Log inbound interaction into database if available
      try {
        const admin = createAdminClient();
        await admin.from("whatsapp_message_outbox").insert({
          contact_id: "00000000-0000-0000-0000-000000000000",
          recipient_phone: customerNumber.replace(/\D/g, ""),
          recipient_chat_id: `${customerNumber.replace(/\D/g, "")}@c.us`,
          message_type: "inbound_user_message",
          message_payload: {
            text,
            messageId,
            integratedNumber,
            receivedAt: new Date().toISOString(),
          },
          status: "delivered",
          idempotency_key: `inbound-${messageId || Date.now()}`,
        });
      } catch (dbErr) {
        // Non-blocking database insertion
        console.warn("[msg91-webhook] Database record note:", dbErr);
      }

      return NextResponse.json({ status: "success", type: "inbound_processed" });
    }

    // 2. Outbound Delivery Report (Message Delivered / Read / Failed)
    if (["delivered", "read", "failed", "undelivered"].includes(eventName) || body.status) {
      const deliveryStatus = eventName || (typeof body.status === "string" ? body.status.toLowerCase() : "unknown");
      console.log(`[msg91-webhook] Delivery update for ${customerNumber || messageId}: ${deliveryStatus}`);

      // Forward delivery status to viaSocket Flow for tracking
      triggerViaSocketFlow("whatsapp_delivery_report" as any, {
        messageId,
        customerNumber,
        deliveryStatus,
        updatedAt: new Date().toISOString(),
      }).catch((err) => console.warn("[msg91-webhook] viaSocket report error:", err));

      return NextResponse.json({ status: "success", type: "delivery_report_processed", deliveryStatus });
    }

    return NextResponse.json({ status: "success", received: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Invalid payload";
    console.error("[msg91-webhook] Error:", error);
    return NextResponse.json({ status: "error", error }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    gateway: "MSG91 Inbound & Outbound Webhook Listener",
    service: "Coimbatore Startup Community",
    endpoints: {
      inbound: "POST /api/webhooks/msg91 (Receives customer messages)",
      outbound_dlr: "POST /api/webhooks/msg91 (Receives delivery reports)",
    },
  });
}
