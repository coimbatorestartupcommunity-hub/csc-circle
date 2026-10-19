import { randomUUID } from "node:crypto";
import { getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { authResponse } from "@/lib/auth/http";
import { sanitizeImage } from "@/lib/media/images";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.permissions.has("media.manage")) return authResponse({ error: "Permission denied." }, 403);
    if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Invalid request." }, 403);
    if (!rateLimit(`media:${ctx.userId}`, 10, 60_000).allowed) return authResponse({ error: "Too many uploads." }, 429);
    const bucket = process.env.CSC_PRIVATE_MEDIA_BUCKET;
    if (!bucket) return authResponse({ error: "Private media storage is not configured. No file was saved." }, 503);
    if (Number(request.headers.get("content-length") ?? 0) > 6 * 1024 * 1024) return authResponse({ error: "Image is too large." }, 413);
    const form = await request.formData(); const file = form.get("file"); const alt = form.get("alt");
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || typeof alt !== "string" || alt.length < 2 || alt.length > 160) return authResponse({ error: "Choose a JPEG, PNG, or WebP under 5 MB and supply alt text." }, 422);
    let processed;
    try { processed = await sanitizeImage(Buffer.from(await file.arrayBuffer()), file.type); }
    catch { return authResponse({ error: "Invalid image contents, dimensions, or type." }, 422); }
    const sb = await createClient(); const path = `${ctx.userId}/${randomUUID()}.webp`;
    const { error: uploadError } = await sb.storage.from(bucket).upload(path, processed.data, { contentType: "image/webp", upsert: false });
    if (uploadError) return authResponse({ error: "Storage rejected the upload. Check the private bucket and media RLS policies." }, 409);
    const { data, error } = await sb.from("media_assets").insert({ filename: path.split("/").pop()!, alt_text: alt, type: "image/webp", width: processed.info.width, height: processed.info.height, size_bytes: processed.info.size, category: "gallery", visibility: "private", storage_path: path }).select("id").single();
    if (error) { await sb.storage.from(bucket).remove([path]); return authResponse({ error: "Media metadata was not saved." }, 409); }
    return authResponse({ ok: true, id: data.id });
  } catch { return authResponse({ error: "Upload unavailable. Please try again." }, 503); }
}
