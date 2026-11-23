import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendPhoneOtp } from "@/lib/auth/phone-auth";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const ipLimit = rateLimit(`auth:phone:send:${ip}`, 10, 120_000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes before requesting another code." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const channel = (body?.channel === "email" || body?.channel === "both") ? body.channel : "whatsapp";

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile phone number." },
        { status: 422 }
      );
    }

    const phoneLimit = rateLimit(`auth:phone:throttle:${phone.replace(/\D/g, "").slice(-10)}`, 5, 300_000);
    if (!phoneLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests for this mobile number. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const result = await sendPhoneOtp({ phone, channel });
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to dispatch code." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      phone: result.phone,
      channel,
      message: channel === "email" ? "Verification code sent to email." : "Verification code sent to WhatsApp.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable." },
      { status: 503 }
    );
  }
}
