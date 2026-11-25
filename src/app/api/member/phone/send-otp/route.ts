import { getMemberContext } from "@/lib/services/member/context";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { sendPhoneOtp } from "@/lib/auth/phone-auth";
import { rateLimit } from "@/lib/rate-limit";
import { WHATSAPP_MAINTENANCE_LOCK } from "@/lib/whatsapp/maintenance-config";
import { getWhatsAppLockConfig } from "@/lib/services/system-settings";

export async function POST(request: Request) {
  try {
    const waConfig = await getWhatsAppLockConfig();
    const isLocked = waConfig.locked && Date.now() < waConfig.unlockEpochMs;

    if (isLocked || WHATSAPP_MAINTENANCE_LOCK.isLocked()) {
      return authResponse(
        {
          error: waConfig.reason || "WhatsApp OTP verification is temporarily paused for scheduled maintenance.",
          locked: true,
          maintenanceNotice: WHATSAPP_MAINTENANCE_LOCK.getNotice(waConfig.reason, waConfig.tamilReason),
        },
        503
      );
    }

    const ctx = await getMemberContext();
    if (ctx.mode !== "live" || !ctx.user) {
      return authResponse({ error: "Sign in to continue." }, 401);
    }

    // 30-Second Rate Limit Restriction per member/user requested by user (1 request per 30,000ms = 30 seconds)
    if (!rateLimit(`member:phone-otp:${ctx.user.id}`, 1, 30_000).allowed) {
      return authResponse(
        { error: "A verification code was already dispatched. Please wait 30 seconds before requesting a new OTP." },
        429
      );
    }

    const body = await readAuthBody(request);
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return authResponse({ error: "Please enter a valid 10-digit mobile number." }, 400);
    }

    const channel = (body?.channel === "email" || body?.channel === "both") ? body.channel : "whatsapp";
    const res = await sendPhoneOtp({
      phone,
      channel,
      email: ctx.user.email || undefined,
    });
    if (!res.success) {
      return authResponse({ error: res.error || "Failed to dispatch verification code." }, 400);
    }

    return authResponse({ ok: true, phone: res.phone });
  } catch (err) {
    return authResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500
    );
  }
}
