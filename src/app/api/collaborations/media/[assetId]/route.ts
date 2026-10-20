import { createAnonClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(assetId)) return new Response(null, { status: 404 });
    const path = `collaboration-featured/${assetId}.webp`;
    const db = createAnonClient();
    if (!db) return new Response(null, { status: 404 });
    const { data: visible, error: visibleError } = await db.from("collaborations").select("id").eq("featured_image_path", path).eq("publication_status", "published").maybeSingle();
    if (visibleError || !visible) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const admin = createAdminClient();
    const { data: image, error } = await admin.storage.from("member-portraits").download(path);
    if (error || !image) return new Response(null, { status: 404 });
    return new Response(await image.arrayBuffer(), { headers: { "Content-Type": "image/webp", "Content-Length": String(image.size), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 404 }); }
}
