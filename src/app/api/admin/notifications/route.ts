import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { scheduleNotificationDelivery, drainNotificationQueue } from "@/lib/notifications/schedule";

const schema = z.object({
  job: z.string().uuid(),
  reason: z.string().trim().min(5).max(500),
  acknowledge_ambiguous: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.permissions.has("roles.manage")) {
      return authResponse({ error: "Permission denied." }, 403);
    }

    const body = await readAuthBody(request);

    // Support flushing / dispatching all pending notifications immediately
    if (body?.action === "dispatch_all" || body?.flush_all === true) {
      const result = await drainNotificationQueue(10);
      return authResponse({
        ok: true,
        message: `Notification queue drained: ${result.claimed} claimed, ${result.accepted} delivered, ${result.deferred} deferred.`,
        result,
      });
    }

    if (!rateLimit(`notification-retry:${ctx.userId}`, 5, 60_000).allowed) {
      return authResponse({ error: "Try again later." }, 429);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return authResponse({ error: "Select a failed notification and provide a reason." }, 422);

    const sb = await createClient();
    const result = await sb.rpc("csc_retry_notification", parsed.data);
    if (result.error) return authResponse({ error: "Retry unavailable. Reconcile uncertain deliveries before retrying." }, 409);

    scheduleNotificationDelivery();
    return authResponse({ ok: true });
  } catch {
    return authResponse({ error: "Notification dispatch unavailable." }, 503);
  }
}
