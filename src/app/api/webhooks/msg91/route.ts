import { NextResponse } from "next/server";
import { triggerViaSocketFlow } from "@/lib/services/viasocket";
import { createAdminClient } from "@/lib/supabase/admin";
import { routeInboundWhatsAppMessage } from "@/lib/services/whatsapp-inbound-router";
import {
  routeOutboundWhatsAppWebhook,
  isOutboundWebhookPayload,
  CSC_BUSINESS_NUMBERS,
} from "@/lib/services/whatsapp-outbound-router";

// In-memory sliding cache for deduplication (TTL 60s)
const processedMessageCache = new Map<string, number>();

function isDuplicate(key: string): boolean {
  const now = Date.now();
  // Evict items older than 60 seconds
  for (const [k, timestamp] of processedMessageCache.entries()) {
    if (now - timestamp > 60_000) {
      processedMessageCache.delete(k);
    }
  }
  if (processedMessageCache.has(key)) {
    return true;
  }
  processedMessageCache.set(key, now);
  return false;
}

/**
 * High-Reliability Inbound & Outbound Webhook for MSG91 & WhatsApp Business API
 *
 * Handles:
 * 1. Inbound messages received from users (e.g. WhatsApp replies/queries)
 * 2. Outbound lifecycle callbacks (via whatsapp-outbound-router, strictly terminating loop)
 * 3. Automatic forwarding to viaSocket Flow for no-code automations
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const eventName = (
      body.eventName ||
      body.event ||
      body.type ||
      body.direction ||
      ""
    ).toString();

    console.log(
      `[msg91-webhook] Callback received: event="${eventName}", summary=${JSON.stringify(body).slice(0, 200)}`
    );

    // Resilient extraction across MSG91, Meta Cloud API, and generic schemas
    const customerNumber = (
      body.customerNumber ||
      body.mobile ||
      body.from ||
      body.sender ||
      body.wa_id ||
      body.phone ||
      body.data?.customerNumber ||
      body.data?.from ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
      body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.wa_id ||
      ""
    ).toString();

    const text = (
      body.content ||
      body.text ||
      body.body ||
      body.message ||
      body.msg ||
      body.caption ||
      body.button_reply?.title ||
      body.list_reply?.title ||
      body.interactive?.button_reply?.title ||
      body.interactive?.list_reply?.title ||
      body.data?.content ||
      body.data?.text ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.title ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.list_reply?.title ||
      ""
    ).toString();

    const messageId = (
      body.uuid ||
      body.messageId ||
      body.requestId ||
      body.crqid ||
      body.data?.uuid ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ||
      ""
    ).toString();

    const integratedNumber = (
      body.integratedNumber ||
      body.to ||
      body.data?.integratedNumber ||
      ""
    ).toString();

    const cleanSender = customerNumber.replace(/\D/g, "");

    // =========================================================================
    // GUARD 1: Dedicated Outbound Lifecycle Router
    // Catches MSG91 "On Outbound Request Received", delivery reports, blue ticks,
    // and notifications from our own dispatches. NEVER triggers a reply.
    // =========================================================================
    if (isOutboundWebhookPayload(body)) {
      console.log(
        `[msg91-webhook] Routing to Outbound Router: event="${eventName}", recipient="${cleanSender}"`
      );
      const outboundResult = await routeOutboundWhatsAppWebhook({
        eventName,
        messageId,
        customerNumber,
        integratedNumber,
        status: body.status || eventName,
        reason: body.reason || body.description || body.error,
        timestamp: body.timestamp || new Date().toISOString(),
        rawPayload: body,
      });

      return NextResponse.json({
        status: "success",
        channel: "outbound",
        result: outboundResult,
      });
    }

    // =========================================================================
    // GUARD 2: Self-Message Rejection
    // If the sender is our own CSC Business Number (+91 7550067712), ignore.
    // =========================================================================
    if (CSC_BUSINESS_NUMBERS.has(cleanSender)) {
      console.log(
        `[msg91-webhook] Dropping self-dispatched message from ${cleanSender}`
      );
      return NextResponse.json({
        status: "success",
        type: "self_message_ignored",
      });
    }

    // =========================================================================
    // GUARD 3: Deduplication
    // Drops identical webhook deliveries within a 60-second sliding window.
    // =========================================================================
    const dedupKey = messageId
      ? `id:${messageId}`
      : `msg:${cleanSender}:${text.trim().toLowerCase()}`;

    if (isDuplicate(dedupKey)) {
      console.log(`[msg91-webhook] Duplicate webhook ignored: ${dedupKey}`);
      return NextResponse.json({
        status: "success",
        type: "duplicate_ignored",
      });
    }

    // =========================================================================
    // GUARD 4: Require valid inbound sender and text
    // =========================================================================
    if (!cleanSender || !text.trim()) {
      return NextResponse.json({
        status: "success",
        type: "empty_payload_ignored",
      });
    }

    // =========================================================================
    // INBOUND USER MESSAGE DISPATCH (1 Inbound -> Process -> 1 Response Flow)
    // =========================================================================
    console.log(
      `[msg91-webhook] Processing verified inbound user message from ${cleanSender}: "${text.slice(0, 60)}..."`
    );

    // 1. Forward to viaSocket Flow for visual automations
    triggerViaSocketFlow("whatsapp_inbound_message" as any, {
      customerNumber: cleanSender,
      integratedNumber,
      text,
      messageId,
      receivedAt: new Date().toISOString(),
    }).catch((err) =>
      console.warn("[msg91-webhook] viaSocket trigger error:", err)
    );

    // 2. Forward to background AI worker endpoint if active
    try {
      fetch("http://127.0.0.1:3030/webhook/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${cleanSender}@c.us`,
          body: text,
          id: messageId,
        }),
      }).catch(() => {});
    } catch {
      // Non-blocking forward
    }

    // 3. Log inbound interaction into database
    try {
      const admin = createAdminClient();
      await admin.from("whatsapp_message_outbox").insert({
        contact_id: "00000000-0000-0000-0000-000000000000",
        recipient_phone: cleanSender,
        recipient_chat_id: `${cleanSender}@c.us`,
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
      console.warn("[msg91-webhook] Database record note:", dbErr);
    }

    // 4. Dispatch to WhatsApp Inbound Router
    const isAudio =
      body.type === "ptt" ||
      body.type === "audio" ||
      body.mimetype?.includes("audio");

    try {
      await routeInboundWhatsAppMessage({
        phone: cleanSender,
        text,
        messageId,
        isAudio,
      });
    } catch (routeErr) {
      console.error("[msg91-webhook] Inbound router dispatch error:", routeErr);
    }

    return NextResponse.json({
      status: "success",
      type: "inbound_processed",
      recipient: cleanSender,
    });
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
      inbound: "POST /api/webhooks/msg91 (Receives verified customer messages)",
      outbound: "POST /api/webhooks/msg91 (Absorbs delivery reports and dispatches safely)",
    },
  });
}
