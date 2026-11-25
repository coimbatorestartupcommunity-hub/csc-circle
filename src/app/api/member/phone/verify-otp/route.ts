import { getMemberContext } from "@/lib/services/member/context";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { verifyPhoneOtpCode } from "@/lib/auth/phone-auth";
import { normalizePhoneForWhatsApp } from "@/lib/notifications/whatsapp-outbox";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { notifyPhoneVerifiedSuccess } from "@/lib/services/phone-verification-notifications";

export async function POST(request: Request) {
  try {
    const ctx = await getMemberContext();
    if (ctx.mode !== "live" || !ctx.user) {
      return authResponse({ error: "Sign in to continue." }, 401);
    }

    if (!rateLimit(`member:phone-verify:${ctx.user.id}`, 6, 300_000).allowed) {
      return authResponse({ error: "Too many verification attempts. Please wait." }, 429);
    }

    const body = await readAuthBody(request);
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!phone || !code || code.length !== 6) {
      return authResponse({ error: "Please enter the 6-digit verification code." }, 400);
    }

    const isValid = await verifyPhoneOtpCode(phone, code);
    if (!isValid) {
      return authResponse({ error: "Invalid or expired verification code." }, 400);
    }

    const { e164 } = normalizePhoneForWhatsApp(phone);
    const admin = createAdminClient();

    // 1. Fetch existing profile consent
    const { data: profile } = await admin
      .from("profiles")
      .select("consent, full_name, display_name, email")
      .eq("id", ctx.user.id)
      .maybeSingle();

    const existingConsent = (profile?.consent as Record<string, unknown>) || {};
    const updatedConsent = {
      ...existingConsent,
      phone_verified: true,
      phone_verified_at: new Date().toISOString(),
    };

    // 2. Update profile table
    await admin
      .from("profiles")
      .update({
        whatsapp: e164,
        consent: updatedConsent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.user.id);

    // 3. Update auth user metadata
    try {
      await admin.auth.admin.updateUserById(ctx.user.id, {
        user_metadata: {
          ...ctx.user.user_metadata,
          phone: e164,
          whatsapp: e164,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        },
      });
    } catch (metaErr) {
      console.warn("[verify-otp] User metadata update warning:", metaErr);
    }

    // 4. Dispatch WhatsApp, Email & In-App verification confirmation notifications
    const memberName = profile?.full_name || profile?.display_name || ctx.user.user_metadata?.full_name || "Founder";
    const memberEmail = profile?.email || ctx.user.email;
    try {
      await notifyPhoneVerifiedSuccess({
        userId: ctx.user.id,
        phone: e164,
        email: memberEmail,
        name: memberName,
        force: true,
      });
    } catch (notifErr) {
      console.warn("[verify-otp] Post-verification notification warning:", notifErr);
    }

    return authResponse({ ok: true, phone: e164 });
  } catch (err) {
    return authResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500
    );
  }
}
