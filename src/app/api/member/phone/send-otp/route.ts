import { getMemberContext } from "@/lib/services/member/context";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { sendPhoneOtp } from "@/lib/auth/phone-auth";
import { rateLimit } from "@/lib/rate-limit";
import { WHATSAPP_MAINTENANCE_LOCK } from "@/lib/whatsapp/maintenance-config";

export async function POST(request: Request) {
  try {
    if (WHATSAPP_MAINTENANCE_LOCK.isLocked()) {
      return authResponse(
        {
          error: "WhatsApp OTP verification is temporarily paused for 24-hour scheduled maintenance. Please try again after maintenance completes.",
          locked: true,
          maintenanceNotice: WHATSAPP_MAINTENANCE_LOCK.getNotice(),
        },
        503
      );
    }
    const ctx = await getMemberContext();
    if (ctx.mode !== "live" || !ctx.user) {
      return authResponse({ error: "Sign in to continue." }, 401);
    }

    if (!rateLimit(`member:phone-otp:${ctx.user.id}`, 4, 300_000).allowed) {
      return authResponse({ error: "Too many verification attempts. Please wait a few minutes." }, 429);
    }

    const body = await readAuthBody(request);
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return authResponse({ error: "Please enter a valid 10-digit mobile number." }, 400);
    }

    const res = await sendPhoneOtp({ phone, channel: "whatsapp" });
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
