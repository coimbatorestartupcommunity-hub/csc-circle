import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { eventEditorSchema } from "@/lib/validations/admin";
export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live") return authResponse({ error: "Administrator access required." }, 403);
    const parsed = z.object({ event: eventEditorSchema, id: z.string().uuid().optional() }).safeParse(await readAuthBody(request));
    if (!parsed.success) return authResponse({ error: "Check the event details." }, 422);
    const { event, id } = parsed.data;
    if (!ctx.permissions.has(id ? "events.update" : "events.create") || (event.status === "published" && !ctx.permissions.has("events.publish"))) return authResponse({ error: "Permission denied." }, 403);
    const sb = await createClient();
    const { data, error } = await sb.rpc("csc_save_event", { payload: event, target: id ?? null });
    if (error) return authResponse({ error: "Event was not saved. Check times, price, capacity, and slug uniqueness." }, 409);
    revalidateTag("events", { expire: 0 });
    scheduleNotificationDelivery();
    return authResponse({ ok: true, id: data });
  } catch { return authResponse({ error: "Event saving is unavailable." }, 503); }
}
