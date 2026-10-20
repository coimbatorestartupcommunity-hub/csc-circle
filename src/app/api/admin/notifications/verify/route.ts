import { getAdminContext } from "@/lib/admin/gate";
import { authResponse } from "@/lib/auth/http";
import { emailConfiguration } from "@/lib/notifications/config";
import { verifyEmailTransport } from "@/lib/notifications/email";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.userId || !ctx.permissions.has("settings.manage")) {
      return authResponse({ error: "Permission denied." }, 403);
    }
    if (!rateLimit(`notification-email-check:${ctx.userId}`, 3, 60_000).allowed) {
      return authResponse({ error: "Please wait before checking email again." }, 429);
    }

    const config = emailConfiguration();
    if (!config.enabled) return authResponse({ error: "Email notifications are disabled." }, 409);
    await verifyEmailTransport();

    // Once SMTP authentication is confirmed, process the durable queue. This
    // also drains first-login welcome messages that were waiting for a worker.
    scheduleNotificationDelivery();
    return authResponse({ ok: true, message: "SMTP connection verified. Queued email delivery has started." });
  } catch {
    // Keep SMTP credentials and provider response details out of the API.
    return authResponse({ error: "Email verification failed. Check the server-side email configuration." }, 503);
  }
}
