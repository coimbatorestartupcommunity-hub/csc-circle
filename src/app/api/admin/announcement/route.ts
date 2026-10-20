import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { eventNoticeSchema } from "@/lib/announcements/event-notice";

export async function GET() {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || (!ctx.permissions.has("settings.manage") && !ctx.permissions.has("content.manage"))) return authResponse({ error: "Permission denied." }, 403);
    const admin = createAdminClient();
    const { data, error } = await admin.from("content_blocks").select("value,status,updated_at").eq("key", "homepage.event_notice").maybeSingle();
    if (error) return authResponse({ error: "Could not load the event notice." }, 503);
    let notice = null;
    let previewUrl: string | null = null;
    if (data?.value) {
      try {
        const parsed = eventNoticeSchema.safeParse(JSON.parse(data.value));
        if (parsed.success) {
          notice = parsed.data;
          if (parsed.data.bannerPath) {
            const { data: signed } = await admin.storage.from("member-portraits").createSignedUrl(parsed.data.bannerPath, 60 * 60);
            previewUrl = signed?.signedUrl ?? null;
          }
        }
      } catch { notice = null; }
    }
    return authResponse({ notice, previewUrl, published: data?.status === "published", updatedAt: data?.updated_at ?? null });
  } catch { return authResponse({ error: "Could not load the event notice." }, 503); }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || (!ctx.permissions.has("settings.manage") && !ctx.permissions.has("content.manage"))) return authResponse({ error: "Permission denied." }, 403);
    const body = await readAuthBody(request);
    const parsed = eventNoticeSchema.extend({ publish: z.boolean() }).safeParse(body);
    if (!parsed.success) return authResponse({ error: parsed.error.issues[0]?.message ?? "Invalid notice." }, 422);
    const { publish, ...notice } = parsed.data;
    if (publish && !notice.bannerPath) return authResponse({ error: "Upload a 4:3 event banner before publishing this notice." }, 422);
    if (notice.expiresAt && new Date(notice.expiresAt) <= new Date()) return authResponse({ error: "The expiry must be in the future." }, 422);
    const sb = await createClient();
    const admin = createAdminClient();
    const { data: previous } = await admin.from("content_blocks").select("value").eq("key", "homepage.event_notice").maybeSingle();
    let previousBannerPath = "";
    try { previousBannerPath = eventNoticeSchema.parse(JSON.parse(previous?.value ?? "{}")).bannerPath; } catch { previousBannerPath = ""; }
    const { error } = await sb.rpc("csc_save_content", { content_key: "homepage.event_notice", content_value: JSON.stringify(notice), publish });
    if (error) return authResponse({ error: "The notice was not saved." }, 409);
    if (previousBannerPath && previousBannerPath !== notice.bannerPath) {
      try { await admin.storage.from("member-portraits").remove([previousBannerPath]); }
      catch { console.error("CSC_EVENT_NOTICE_OLD_BANNER_CLEANUP_FAILED"); }
    }
    revalidateTag("content", { expire: 0 });
    return authResponse({ ok: true, published: publish });
  } catch { return authResponse({ error: "Notice publishing is unavailable." }, 503); }
}
