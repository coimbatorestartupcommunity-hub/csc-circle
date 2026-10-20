import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";

const schema = z.object({
  title: z.string().trim().min(3).max(100),
  message: z.string().trim().min(8).max(500),
  actionLabel: z.string().trim().min(2).max(40).default("Accept & view event"),
  eventPath: z.string().trim().regex(/^\/events(?:\/[a-z0-9-]+)?(?:\?[a-zA-Z0-9_=&%-]*)?$/, "Choose an internal event page."),
  expiresAt: z.string().datetime().nullable().optional(),
  publish: z.boolean(),
});

export async function GET() {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || (!ctx.permissions.has("settings.manage") && !ctx.permissions.has("content.manage"))) return authResponse({ error: "Permission denied." }, 403);
    const admin = createAdminClient();
    const { data, error } = await admin.from("content_blocks").select("value,status,updated_at").eq("key", "homepage.event_notice").maybeSingle();
    if (error) return authResponse({ error: "Could not load the event notice." }, 503);
    let notice = null;
    if (data?.value) { try { notice = JSON.parse(data.value); } catch { notice = null; } }
    return authResponse({ notice, published: data?.status === "published", updatedAt: data?.updated_at ?? null });
  } catch { return authResponse({ error: "Could not load the event notice." }, 503); }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || (!ctx.permissions.has("settings.manage") && !ctx.permissions.has("content.manage"))) return authResponse({ error: "Permission denied." }, 403);
    const parsed = schema.safeParse(await readAuthBody(request));
    if (!parsed.success) return authResponse({ error: parsed.error.issues[0]?.message ?? "Invalid notice." }, 422);
    const { publish, ...notice } = parsed.data;
    if (notice.expiresAt && new Date(notice.expiresAt) <= new Date()) return authResponse({ error: "The expiry must be in the future." }, 422);
    const sb = await createClient();
    const { error } = await sb.rpc("csc_save_content", { content_key: "homepage.event_notice", content_value: JSON.stringify(notice), publish });
    if (error) return authResponse({ error: "The notice was not saved." }, 409);
    revalidateTag("content", { expire: 0 });
    return authResponse({ ok: true, published: publish });
  } catch { return authResponse({ error: "Notice publishing is unavailable." }, 503); }
}
