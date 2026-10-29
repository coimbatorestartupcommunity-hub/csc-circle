import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getAdminContext } from "@/lib/admin/gate";
import { authResponse } from "@/lib/auth/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !(ctx.permissions.has("events.update") || ctx.permissions.has("events.publish"))) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const eventId = new URL(request.url).searchParams.get("event") ?? "";
    if (!z.string().uuid().safeParse(eventId).success) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const admin = createAdminClient();
    const { data: event } = await admin.from("events").select("status,upi_qr_path").eq("id", eventId).maybeSingle();
    if (!event?.upi_qr_path || !/^event-upi-qr\/[0-9a-f-]{36}\.webp$/i.test(event.upi_qr_path)) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const { data, error } = await admin.storage.from("member-portraits").createSignedUrl(event.upi_qr_path, 600);
    return data?.signedUrl && !error ? Response.redirect(data.signedUrl, 302) : new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}
export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !(ctx.permissions.has("events.create") || ctx.permissions.has("events.update"))) return authResponse({ error: "Event editing permission required." }, 403);
    if (request.headers.get("origin") !== new URL(request.url).origin || !rateLimit(`event-upi-qr:${ctx.userId}`, 8, 60 * 60_000).allowed) return authResponse({ error: "Upload unavailable. Check the request and try again later." }, 429);
    if (Number(request.headers.get("content-length") ?? 0) > 6 * 1024 * 1024) return authResponse({ error: "Choose an image smaller than 5 MB." }, 413);
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return authResponse({ error: "Choose a JPEG, PNG, or WebP QR image under 5 MB." }, 422);
    const bytes = Buffer.from(await file.arrayBuffer());
    const output = await sharp(bytes, { limitInputPixels: 16_000_000 }).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    const path = `event-upi-qr/${randomUUID()}.webp`;
    const bucket = createAdminClient().storage.from("member-portraits");
    const { error } = await bucket.upload(path, output, { contentType: "image/webp", cacheControl: "3600", upsert: false });
    if (error) return authResponse({ error: "UPI QR image could not be stored." }, 503);
    const { data, error: previewError } = await bucket.createSignedUrl(path, 3600);
    if (previewError || !data?.signedUrl) { await bucket.remove([path]); return authResponse({ error: "Uploaded QR image could not be previewed." }, 503); }
    return authResponse({ ok: true, path, previewUrl: data.signedUrl });
  } catch { return authResponse({ error: "UPI QR upload is unavailable." }, 503); }
}
