import { randomUUID } from "node:crypto";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { getAdminContext } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeCollaborationLogo } from "@/lib/media/images";
import { rateLimit } from "@/lib/rate-limit";

const bucketName = "member-portraits";
const pathPattern = /^collaboration-logos\/[0-9a-f-]{36}\.webp$/i;

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.userId || !ctx.permissions.has("content.manage")) return authResponse({ error: "Permission denied." }, 403);
    if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Invalid request." }, 403);
    if (!rateLimit(`collaboration-logo:${ctx.userId}`, 12, 60 * 60_000).allowed) return authResponse({ error: "Too many logo uploads. Try again later." }, 429);
    if (Number(request.headers.get("content-length") ?? 0) > 6 * 1024 * 1024) return authResponse({ error: "Choose a logo smaller than 5 MB." }, 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024) return authResponse({ error: "Choose a JPEG, PNG, or WebP logo under 5 MB." }, 422);
    let image: Awaited<ReturnType<typeof sanitizeCollaborationLogo>>;
    try { image = await sanitizeCollaborationLogo(Buffer.from(await file.arrayBuffer()), file.type); }
    catch { return authResponse({ error: "Choose a single-frame JPEG, PNG, or WebP logo at least 48 × 48 px." }, 422); }

    const admin = createAdminClient();
    const path = `collaboration-logos/${randomUUID()}.webp`;
    const bucket = admin.storage.from(bucketName);
    const { error } = await bucket.upload(path, image.data, { contentType: "image/webp", cacheControl: "3600", upsert: false });
    if (error) return authResponse({ error: "The partner logo could not be stored." }, 503);
    const { data: preview, error: previewError } = await bucket.createSignedUrl(path, 60 * 60);
    if (previewError || !preview?.signedUrl) {
      await bucket.remove([path]);
      return authResponse({ error: "The uploaded logo could not be previewed." }, 503);
    }
    return authResponse({ ok: true, path, previewUrl: preview.signedUrl, width: image.width, height: image.height });
  } catch {
    return authResponse({ error: "Partner logo upload is unavailable." }, 503);
  }
}

export async function DELETE(request: Request) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !ctx.userId || !ctx.permissions.has("content.manage")) return authResponse({ error: "Permission denied." }, 403);
  if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Invalid request." }, 403);
  const body = await readAuthBody(request);
  const path = body && typeof body === "object" && "path" in body ? String(body.path) : "";
  if (!pathPattern.test(path)) return authResponse({ error: "Logo not found." }, 404);

  const admin = createAdminClient();
  const { count, error: lookupError } = await admin.from("collaboration_organizations")
    .select("id", { count: "exact", head: true }).eq("logo_path", path);
  if (lookupError) return authResponse({ error: "The logo could not be checked for references." }, 503);
  if (count) return authResponse({ error: "This logo is still used by a partner organization." }, 409);
  const { error } = await admin.storage.from(bucketName).remove([path]);
  if (error) return authResponse({ error: "The unused logo could not be removed." }, 503);
  return authResponse({ ok: true });
}
