import { randomUUID } from "node:crypto";
import { getAdminContext } from "@/lib/admin/gate";
import { authResponse } from "@/lib/auth/http";
import { sanitizeEventBanner } from "@/lib/media/images";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.userId || (!ctx.permissions.has("content.manage") && !ctx.permissions.has("settings.manage"))) {
      return authResponse({ error: "Permission denied." }, 403);
    }
    if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Invalid request." }, 403);
    if (!rateLimit(`event-notice-banner:${ctx.userId}`, 5, 60 * 60_000).allowed) return authResponse({ error: "Too many banner uploads. Try again later." }, 429);
    if (Number(request.headers.get("content-length") ?? 0) > 6 * 1024 * 1024) return authResponse({ error: "Choose an image smaller than 5 MB." }, 413);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024) {
      return authResponse({ error: "Choose a JPEG, PNG, or WebP event banner under 5 MB." }, 422);
    }
    let banner: Awaited<ReturnType<typeof sanitizeEventBanner>>;
    try { banner = await sanitizeEventBanner(Buffer.from(await file.arrayBuffer()), file.type); }
    catch { return authResponse({ error: "Choose a clear, single-frame image at least 640 × 480 px. It will be cropped to 4:3." }, 422); }

    const admin = createAdminClient();
    const path = `event-banners/${randomUUID()}.webp`;
    const bucket = admin.storage.from("member-portraits");
    const { error: uploadError } = await bucket.upload(path, banner.data, { contentType: "image/webp", cacheControl: "3600", upsert: false });
    if (uploadError) return authResponse({ error: "The event banner could not be saved to CSC media storage." }, 503);
    const { data: preview, error: previewError } = await bucket.createSignedUrl(path, 60 * 60);
    if (previewError || !preview?.signedUrl) {
      await bucket.remove([path]);
      return authResponse({ error: "The uploaded banner could not be previewed." }, 503);
    }
    return authResponse({ ok: true, bannerPath: path, previewUrl: preview.signedUrl, width: banner.width, height: banner.height });
  } catch {
    return authResponse({ error: "Banner upload is unavailable. Please try again." }, 503);
  }
}
