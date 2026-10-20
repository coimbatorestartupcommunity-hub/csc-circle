import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.permissions.has("content.manage")) return authResponse({ error: "Permission denied." }, 403);
    const parsed = z.object({ content_key: z.enum(["homepage.announcement", "community.introduction", "about.mission", "about.vision", "homepage.event_notice"]), content_value: z.string().max(4000), publish: z.boolean() }).safeParse(await readAuthBody(request));
    if (!parsed.success) return authResponse({ error: "Invalid content." }, 422);
    const sb = await createClient(); const { error } = await sb.rpc("csc_save_content", parsed.data);
    if (error) return authResponse({ error: "Content was not saved." }, 409);
    revalidateTag("content", { expire: 0 }); return authResponse({ ok: true });
  } catch { return authResponse({ error: "Content saving is unavailable." }, 503); }
}
