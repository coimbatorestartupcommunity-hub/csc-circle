import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    if (event.coverImage?.startsWith("event-covers/")) {
      if (!/^event-covers\/[0-9a-f-]{36}\.webp$/i.test(event.coverImage)) return authResponse({ error: "Invalid event cover reference." }, 422);
      const { error: imageError } = await createAdminClient().storage.from("member-portraits").download(event.coverImage);
      if (imageError) return authResponse({ error: "The uploaded event cover could not be verified. Upload it again." }, 422);
    }
    const previous = id ? await sb.from("events").select("cover_image").eq("id", id).maybeSingle() : null;
    const { data, error } = await sb.rpc("csc_save_event", { payload: event, target: id ?? undefined });
    if (error) return authResponse({ error: "Event was not saved. Check times, price, capacity, and slug uniqueness." }, 409);
    const oldCover = previous?.data?.cover_image;
    if (oldCover && oldCover !== event.coverImage && /^event-covers\/[0-9a-f-]{36}\.webp$/i.test(oldCover)) {
      await createAdminClient().storage.from("member-portraits").remove([oldCover]);
    }
    revalidateTag("events", { expire: 0 });
    scheduleNotificationDelivery();
    return authResponse({ ok: true, id: data });
  } catch { return authResponse({ error: "Event saving is unavailable." }, 503); }
}
