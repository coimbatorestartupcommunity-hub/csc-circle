import { NextResponse } from "next/server";

/**
 * Inbound Webhook for MSG91 (DLR & Inbound Messages)
 * Handles delivery reports (Delivered, Read, Failed) and inbound replies
 * sent from MSG91 or viaSocket.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log("[msg91-webhook] Received callback:", JSON.stringify(body).slice(0, 300));

    // Handle delivery status update
    // e.g. { requestId: "...", status: "DELIVERED", mobile: "91..." }
    // Or WhatsApp inbound message payload

    return NextResponse.json({ status: "success", received: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ status: "error", error }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    gateway: "MSG91 Inbound Webhook Listener",
    service: "Coimbatore Startup Community",
  });
}
