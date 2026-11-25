import { NextResponse } from "next/server";
import { triggerViaSocketFlow } from "@/lib/services/viasocket";
import { createAdminClient } from "@/lib/supabase/admin";
import { routeInboundWhatsAppMessage } from "@/lib/services/whatsapp-inbound-router";
import { CSC_BUSINESS_NUMBERS, isOutboundWebhookPayload } from "@/lib/services/whatsapp-outbound-router";

// In-memory deduplication cache (TTL 60s)
const processedMessageCache = new Map<string, number>();

function isDuplicate(key: string): boolean {
  const now = Date.now();
  for (const [k, timestamp] of processedMessageCache.entries()) {
    if (now - timestamp > 60_000) {
      processedMessageCache.delete(k);
    }
  }
  if (processedMessageCache.has(key)) return true;
  processedMessageCache.set(key, now);
  return false;
}

/**
 * DEDICATED INBOUND WHATSAPP WEBHOOK
 * Strictly handles incoming customer messages, queries, greetings, and slash commands.
 * Dispatches automated AI & Menu replies immediately back to the user on WhatsApp.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Resilient extraction across MSG91, Meta Cloud API, and generic webhooks
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
      "917550067712"
    ).toString();

    const cleanSender = customerNumber.replace(/\D/g, "");

    // Guard: ignore self-messages from our own bot number
    if (CSC_BUSINESS_NUMBERS.has(cleanSender)) {
      return NextResponse.json({ status: "success", type: "self_message_ignored" });
    }

    // Guard: ignore outbound lifecycle callbacks if delivered to inbound endpoint
    if (isOutboundWebhookPayload(body)) {
      console.log(`[inbound-webhook] Outbound callback received on inbound route, absorbing cleanly`);
      return NextResponse.json({ status: "success", type: "outbound_absorbed_on_inbound" });
    }

    // Guard: require valid customer number and text
    if (!cleanSender || !text.trim()) {
      return NextResponse.json({ status: "success", type: "empty_payload_ignored" });
    }

    // Deduplication check
    const dedupKey = messageId ? `id:${messageId}` : `inbound:${cleanSender}:${text.trim().toLowerCase()}`;
    if (isDuplicate(dedupKey)) {
      return NextResponse.json({ status: "success", type: "duplicate_ignored" });
    }

    console.log(`[inbound-webhook] Processing message from ${cleanSender}: "${text.slice(0, 60)}"`);

    // 1. Forward to viaSocket Flow
    triggerViaSocketFlow("whatsapp_inbound_message" as any, {
      customerNumber: cleanSender,
      integratedNumber,
      text,
      messageId,
      receivedAt: new Date().toISOString(),
    }).catch(() => {});

    // 2. Log inbound record to database
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
    } catch (err) {
      console.warn("[inbound-webhook] DB record warning:", err);
    }

    // 3. Dispatch to Inbound Router & send reply safely to customer
    const isAudio = body.type === "ptt" || body.type === "audio" || body.mimetype?.includes("audio");
    const result = await routeInboundWhatsAppMessage({
      phone: cleanSender,
      text,
      messageId,
      isAudio,
    });

    return NextResponse.json({
      status: "success",
      type: "inbound_processed",
      recipient: cleanSender,
      command: result.command,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Error processing inbound message";
    console.error("[inbound-webhook] Error:", error);
    return NextResponse.json({ status: "error", error }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    type: "inbound_webhook",
    service: "Coimbatore Startup Community Inbound Agent",
    info: "Configured to process incoming customer messages & replies 24/7",
  });
}
