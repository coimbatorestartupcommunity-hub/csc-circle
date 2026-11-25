import { NextResponse } from "next/server";
import { routeOutboundWhatsAppWebhook } from "@/lib/services/whatsapp-outbound-router";

/**
 * DEDICATED OUTBOUND WHATSAPP WEBHOOK
 * Strictly absorbs outbound delivery receipts, blue ticks (read), failures, and submission logs.
 * Updates outbox state and telemetry.
 * GUARANTEE: Never invokes WhatsApp send APIs or triggers message replies (0% loop risk).
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

    const customerNumber = (
      body.customerNumber ||
      body.mobile ||
      body.to ||
      body.sender ||
      body.phone ||
      ""
    ).toString();

    const messageId = (
      body.uuid ||
      body.messageId ||
      body.requestId ||
      body.crqid ||
      ""
    ).toString();

    const integratedNumber = (
      body.integratedNumber ||
      body.sender ||
      "917550067712"
    ).toString();

    const result = await routeOutboundWhatsAppWebhook({
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
      type: "outbound_absorbed",
      result,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Error processing outbound webhook";
    console.error("[outbound-webhook] Error:", error);
    return NextResponse.json({ status: "error", error }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    type: "outbound_webhook",
    service: "Coimbatore Startup Community Outbound Telemetry Listener",
    info: "Configured to absorb delivery reports, blue ticks, and failure events safely",
  });
}
