import { randomUUID } from "node:crypto";
import { getAdminContext } from "@/lib/admin/gate";
import { authResponse } from "@/lib/auth/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeEventBanner } from "@/lib/media/images";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !(ctx.permissions.has("events.create") || ctx.permissions.has("events.update"))) return authResponse({ error: "Event editing permission required." }, 403);
    if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Invalid request." }, 403);
    if (!rateLimit(`event-cover:${ctx.userId}`, 8, 60 * 60_000).allowed) return authResponse({ error: "Too many image uploads. Try again later." }, 429);
    if (Number(request.headers.get("content-length") ?? 0) > 6 * 1024 * 1024) return authResponse({ error: "Choose an image smaller than 5 MB." }, 413);
    const form = await request.formData();
    const file = form.get("file");
    const alt = form.get("alt");
    if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024 || typeof alt !== "string" || alt.trim().length < 2 || alt.length > 160) return authResponse({ error: "Choose a JPEG, PNG, or WebP image under 5 MB and add alt text." }, 422);
    let banner: Awaited<ReturnType<typeof sanitizeEventBanner>>;
    try { banner = await sanitizeEventBanner(Buffer.from(await file.arrayBuffer()), file.type); }
    catch { return authResponse({ error: "Choose a single-frame image at least 640 × 480 px. CSC will prepare a centered 4:3 crop." }, 422); }
    const bucketName = "member-portraits";
    const path = `event-covers/${randomUUID()}.webp`;
    const admin = createAdminClient();
    const bucket = admin.storage.from(bucketName);
    const { error } = await bucket.upload(path, banner.data, { contentType: "image/webp", cacheControl: "3600", upsert: false });
    if (error) return authResponse({ error: "Event image could not be stored." }, 503);
    const { data: preview, error: previewError } = await bucket.createSignedUrl(path, 60 * 60);
    if (previewError || !preview?.signedUrl) { await bucket.remove([path]); return authResponse({ error: "Uploaded event image could not be previewed." }, 503); }
    return authResponse({ ok: true, path, previewUrl: preview.signedUrl, width: banner.width, height: banner.height, alt: alt.trim() });
  } catch { return authResponse({ error: "Event image upload is unavailable." }, 503); }
}

export async function GET(request: Request) {
  try {
    const eventId = new URL(request.url).searchParams.get("event") ?? "";
    if (!z.string().uuid().safeParse(eventId).success) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const admin = createAdminClient();
    const { data: event } = await admin.from("events").select("status,cover_image").eq("id", eventId).maybeSingle();
    const path = event?.cover_image ?? "";
    if (!event || !/^event-covers\/[0-9a-f-]{36}\.webp$/i.test(path)) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    if (event.status !== "published") {
      const ctx = await getAdminContext();
      if (ctx.mode !== "live" || !(ctx.permissions.has("events.update") || ctx.permissions.has("events.publish"))) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    }
    const { data: image, error } = await admin.storage.from("member-portraits").download(path);
    if (error || !image) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new Response(await image.arrayBuffer(), { headers: { "Content-Type": "image/webp", "Cache-Control": event.status === "published" ? "public, max-age=300, stale-while-revalidate=3600" : "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}
