import { createAnonClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const noticeId = new URL(request.url).searchParams.get("noticeId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(noticeId)) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const db = createAnonClient();
    if (!db) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const { data: notice } = await (db as unknown as SupabaseClient).from("event_notices").select("banner_path").eq("id", noticeId).maybeSingle();
    const path = typeof notice?.banner_path === "string" ? notice.banner_path : "";
    if (!/^event-banners\/[0-9a-f-]{36}\.webp$/i.test(path)) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const admin = createAdminClient();
    const { data: image, error } = await admin.storage.from("member-portraits").download(path);
    if (error || !image) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new Response(await image.arrayBuffer(), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
}
