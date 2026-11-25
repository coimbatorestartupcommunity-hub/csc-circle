import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getWebsiteMaintenanceConfig } from "@/lib/services/system-settings";
import {
  verifyPhoneOtpCode,
  resolveOrCreatePhoneUser,
  createPhoneSessionToken,
} from "@/lib/auth/phone-auth";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const ipLimit = rateLimit(`auth:phone:verify:${ip}`, 15, 120_000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait a few minutes." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!phone || !code || code.length !== 6) {
      return NextResponse.json(
        { error: "Please provide a valid 6-digit verification code." },
        { status: 422 }
      );
    }

    // 1. Verify 6-digit cryptographic OTP
    const isValid = await verifyPhoneOtpCode(phone, code);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please check your WhatsApp and try again." },
        { status: 401 }
      );
    }

    // 2. Resolve existing user or provision phone account
    const user = await resolveOrCreatePhoneUser(phone);

    // During scheduled maintenance mode, ONLY verified administrators can sign in.
    const maintenance = await getWebsiteMaintenanceConfig();
    if (maintenance.enabled) {
      const adminSb = createAdminClient();
      const { data: adminRoles } = await adminSb
        .from("admin_roles")
        .select("role")
        .eq("user_id", user.userId)
        .limit(1);
      const isAdmin = Boolean(adminRoles && adminRoles.length > 0);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Platform is currently under scheduled maintenance. Only verified administrators can sign in." },
          { status: 403 }
        );
      }
    }

    // 3. Generate token hash and set SSR cookies
    const tokenHash = await createPhoneSessionToken(user.email);
    const sb = await createClient();
    const { error: verifyErr } = await sb.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });

    if (verifyErr) {
      console.error("[verify-otp] SSR session establishment error:", verifyErr);
      return NextResponse.json(
        { error: "Could not establish secure login session. Please try again." },
        { status: 500 }
      );
    }

    // 4. Dispatch WhatsApp, Email & In-App verification confirmation notifications
    try {
      const { notifyPhoneVerifiedSuccess } = await import("@/lib/services/phone-verification-notifications");
      await notifyPhoneVerifiedSuccess({
        userId: user.userId,
        phone,
        email: user.email?.endsWith("@login.csc.internal") ? null : user.email,
        name: null,
      });
    } catch (notifErr) {
      console.warn("[verify-otp] Post-verification notification note:", notifErr);
    }

    return NextResponse.json({
      ok: true,
      userId: user.userId,
      needsEmailPrompt: user.needsEmailPrompt,
      isNewUser: user.isNewUser,
      next: "/profile",
    });
  } catch (err) {
    console.error("[verify-otp] Exception:", err);
    return NextResponse.json(
      { error: "Authentication service error. Please try again later." },
      { status: 503 }
    );
  }
}
