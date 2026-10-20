import { createAnonClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventNoticeSchema } from "@/lib/announcements/event-notice";

export async function GET() {
  try {
    const db = createAnonClient();
    if (!db) return new Response(null, { status: 404 });
    const { data, error } = await db.from("content_blocks").select("value").eq("key", "homepage.event_notice").eq("status", "published").maybeSingle();
    if (error || !data?.value) return new Response(null, { status: 404 });
    const parsed = eventNoticeSchema.safeParse(JSON.parse(data.value));
    if (!parsed.success || !parsed.data.bannerPath || (parsed.data.expiresAt && new Date(parsed.data.expiresAt) <= new Date())) {
      return new Response(null, { status: 404 });
    }
    const admin = createAdminClient();
    const { data: banner, error: downloadError } = await admin.storage.from("member-portraits").download(parsed.data.bannerPath);
    if (downloadError || !banner) return new Response(null, { status: 404 });
    return new Response(await banner.arrayBuffer(), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(banner.size),
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
