import { randomUUID } from "node:crypto";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { getAdminContext } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeCollaborationImage } from "@/lib/media/images";
import { rateLimit } from "@/lib/rate-limit";

const bucketName = "member-portraits";
const pathPattern = /^collaboration-featured\/[0-9a-f-]{36}\.webp$/i;

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.userId || !ctx.permissions.has("content.manage")) return authResponse({ error: "Permission denied." }, 403);
    if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Invalid request." }, 403);
    if (!rateLimit(`collaboration-image:${ctx.userId}`, 8, 60 * 60_000).allowed) return authResponse({ error: "Too many image uploads. Try again later." }, 429);
    if (Number(request.headers.get("content-length") ?? 0) > 6 * 1024 * 1024) return authResponse({ error: "Choose an image smaller than 5 MB." }, 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024) return authResponse({ error: "Choose a JPEG, PNG, or WebP image under 5 MB." }, 422);
    let image: Awaited<ReturnType<typeof sanitizeCollaborationImage>>;
    try { image = await sanitizeCollaborationImage(Buffer.from(await file.arrayBuffer()), file.type); }
    catch { return authResponse({ error: "Choose a single-frame JPEG, PNG, or WebP image at least 640 × 384 px. It will be safely normalized to 5:3." }, 422); }
    const admin = createAdminClient();
    const path = `collaboration-featured/${randomUUID()}.webp`;
    const bucket = admin.storage.from(bucketName);
    const { error } = await bucket.upload(path, image.data, { contentType: "image/webp", cacheControl: "3600", upsert: false });
    if (error) return authResponse({ error: "The collaboration image could not be stored." }, 503);
    const { data: preview, error: previewError } = await bucket.createSignedUrl(path, 60 * 60);
    if (previewError || !preview?.signedUrl) {
      await bucket.remove([path]);
      return authResponse({ error: "The uploaded image could not be previewed." }, 503);
    }
    return authResponse({ ok: true, path, previewUrl: preview.signedUrl, width: image.width, height: image.height });
  } catch { return authResponse({ error: "Image upload is unavailable." }, 503); }
}

export async function GET(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.permissions.has("content.manage")) return new Response(null, { status: 403, headers: { "Cache-Control": "private, no-store" } });
    const path = new URL(request.url).searchParams.get("path") ?? "";
    if (!pathPattern.test(path)) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(bucketName).download(path);
    if (error || !data) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new Response(await data.arrayBuffer(), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}

export async function DELETE(request: Request) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !ctx.userId || !ctx.permissions.has("content.manage")) return authResponse({ error: "Permission denied." }, 403);
  if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Invalid request." }, 403);
  const body = await readAuthBody(request);
  const path = body && typeof body === "object" && "path" in body ? String(body.path) : "";
  if (!pathPattern.test(path)) return authResponse({ error: "Image not found." }, 404);
  const admin = createAdminClient();
  const [featured, gallery] = await Promise.all([
    admin.from("collaborations").select("id", { count: "exact", head: true }).eq("featured_image_path", path),
    admin.from("collaboration_media").select("id", { count: "exact", head: true }).eq("media_path", path),
  ]);
  if (featured.error || gallery.error) return authResponse({ error: "The image could not be checked for references." }, 503);
  if ((featured.count ?? 0) + (gallery.count ?? 0) > 0) return authResponse({ error: "This image is still used by a collaboration." }, 409);
  const { error } = await admin.storage.from(bucketName).remove([path]);
  if (error) return authResponse({ error: "The unused image could not be removed." }, 503);
  return authResponse({ ok: true });
}
