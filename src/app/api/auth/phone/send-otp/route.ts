import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendPhoneOtp } from "@/lib/auth/phone-auth";
import { WHATSAPP_MAINTENANCE_LOCK } from "@/lib/whatsapp/maintenance-config";
import { getWhatsAppLockConfig } from "@/lib/services/system-settings";

export async function POST(request: Request) {
  // Check dynamic WhatsApp lock from database/redis
  const waConfig = await getWhatsAppLockConfig();
  const isLocked = waConfig.locked && Date.now() < waConfig.unlockEpochMs;

  if (isLocked || WHATSAPP_MAINTENANCE_LOCK.isLocked()) {
    return NextResponse.json(
      {
        error: waConfig.reason || "WhatsApp OTP verification is temporarily paused for scheduled maintenance.",
        locked: true,
        maintenanceNotice: WHATSAPP_MAINTENANCE_LOCK.getNotice(waConfig.reason, waConfig.tamilReason),
      },
      { status: 503 }
    );
  }

  const ip = clientIp(request);
  // High-concurrency allowance: allows up to 150 requests per 2 mins per IP to support university campuses & co-working NATs
  if (ip && ip !== "unknown") {
    const ipLimit = rateLimit(`auth:phone:send:${ip}`, 150, 120_000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts from this network. Please wait a few minutes before requesting another code." },
        { status: 429 }
      );
    }
  }

  try {
    const body = await request.json();
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const channel = (body?.channel === "email" || body?.channel === "both") ? body.channel : "whatsapp";
    const email = typeof body?.email === "string" ? body.email.trim() : undefined;

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile phone number." },
        { status: 422 }
      );
    }

    const cleanNumber = phone.replace(/\D/g, "").slice(-10);

    // 30-Second Rate Limit Restriction per phone number requested by user
    const phoneLimit = rateLimit(`auth:phone:throttle:${cleanNumber}`, 1, 30_000);
    if (!phoneLimit.allowed) {
      return NextResponse.json(
        { error: "A verification code was recently sent. Please wait 30 seconds before requesting another OTP." },
        { status: 429 }
      );
    }

    const result = await sendPhoneOtp({ phone, channel, email });
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to dispatch code." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      phone: result.phone,
      channel,
      message:
        channel === "email"
          ? "Verification code sent to your email."
          : channel === "both"
          ? "Verification code sent to WhatsApp and Email."
          : "Verification code sent to WhatsApp.",
    });
  } catch {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable." },
      { status: 503 }
    );
  }
}
