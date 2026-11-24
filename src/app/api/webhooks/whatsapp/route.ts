import { NextResponse } from "next/server";
import { normalizePhoneNumber } from "@/lib/phone/normalize";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const authHeader =
      req.headers.get("x-webhook-secret") ||
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    const expectedSecret =
      process.env.WHATSAPP_WEBHOOK_SECRET || process.env.MSG91_WEBHOOK_SECRET || "";

    if (expectedSecret && authHeader !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Standard webhook format: raw event or direct message payload
    const data = payload.data || payload;
    const from = data.from || data.chatId;
    const body = data.body || data.text;

    if (!from || !body) {
      return NextResponse.json({ received: true, ignored: true, reason: "Missing from or body" });
    }

    // Forward to background worker endpoint if running locally
    try {
      fetch("http://127.0.0.1:3030/webhook/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Non-blocking forward
      });
    } catch {
      // Ignore background forward error
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err) {
    console.error("[POST /api/webhooks/whatsapp] Error handling webhook:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
