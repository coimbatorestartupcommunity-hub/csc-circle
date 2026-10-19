import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return new NextResponse(null, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const db = await createClient();
  const { data: profile } = await db.from("profiles").select("portrait_path").eq("id", ctx.user!.id).maybeSingle();
  if (!profile?.portrait_path) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const { data, error } = await db.storage.from("member-portraits").download(profile.portrait_path);
  if (error || !data) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  return new NextResponse(data, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(data.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline; filename=member-portrait.webp",
    },
  });
}

export async function POST(request: Request) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return authResponse({ error: "Sign in to update your portrait." }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Request origin could not be verified." }, 403);
  if (!rateLimit(`portrait:${ctx.user!.id}`, 4, 60_000).allowed) return authResponse({ error: "Please wait before uploading another portrait." }, 429);
  const advertisedSize = Number(request.headers.get("content-length") ?? 0);
  if (advertisedSize > 17 * 1024 * 1024) return authResponse({ error: "The image is too large. Choose an image under 8 MB." }, 413);
  let original = null as File | null;
  let cropped = null as File | null;
  try {
    const form = await request.formData();
    const originalValue = form.get("original");
    const croppedValue = form.get("cropped");
    if (originalValue instanceof File) original = originalValue;
    if (croppedValue instanceof File) cropped = croppedValue;
  } catch {
    return authResponse({ error: "The upload could not be read." }, 400);
  }
  const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!original || !cropped || !accepted.has(original.type) || !accepted.has(cropped.type)) return authResponse({ error: "Upload a JPEG, PNG, or WebP image and confirm its 4:5 crop." }, 422);
  if (original.size < 1 || original.size > 8 * 1024 * 1024 || cropped.size < 1 || cropped.size > 8 * 1024 * 1024) return authResponse({ error: "Each image must be under 8 MB." }, 413);

  const db = await createClient();
  const { data: current, error: readError } = await db.from("profiles").select("portrait_path,portrait_original_path").eq("id", ctx.user!.id).maybeSingle();
  if (readError || !current) return authResponse({ error: "Profile could not be loaded." }, 503);
  let adminDb;
  try { adminDb = createAdminClient(); } catch { return authResponse({ error: "Portrait uploads are not configured yet." }, 503); }

  const originalBuffer = Buffer.from(await original.arrayBuffer());
  const croppedBuffer = Buffer.from(await cropped.arrayBuffer());
  const decodedOriginal = await sharp(originalBuffer, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().metadata();
  if (!decodedOriginal.width || !decodedOriginal.height || !decodedOriginal.format || !["jpeg", "png", "webp"].includes(decodedOriginal.format)) return authResponse({ error: "This image could not be decoded. Choose a valid JPEG, PNG, or WebP file." }, 422);
  const decodedCrop = await sharp(croppedBuffer, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().metadata();
  if (!decodedCrop.width || !decodedCrop.height || !decodedCrop.format || !["jpeg", "png", "webp"].includes(decodedCrop.format)) return authResponse({ error: "The cropped image is invalid. Please choose and crop the photo again." }, 422);
  const cropRatio = decodedCrop.width / decodedCrop.height;
  if (decodedCrop.width < 320 || decodedCrop.height < 400 || Math.abs(cropRatio - 0.8) > 0.015) return authResponse({ error: "The saved photo must be at least 320 × 400 pixels in a 4:5 ratio." }, 422);

  const stem = `${ctx.user!.id}/${randomUUID()}`;
  const originalPath = `${stem}-original.webp`;
  const portraitPath = `${stem}-portrait.webp`;
  const normalizedOriginal = await sharp(originalBuffer, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().resize({ width: 2000, height: 2500, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
  const portrait = await sharp(croppedBuffer, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().resize({ width: 640, height: 800, fit: "fill" }).webp({ quality: 88 }).toBuffer();
  const bucket = adminDb.storage.from("member-portraits");
  const { error: originalError } = await bucket.upload(originalPath, normalizedOriginal, { contentType: "image/webp", upsert: false });
  if (originalError) return authResponse({ error: "Could not securely store the original image." }, 503);
  const { error: portraitError } = await bucket.upload(portraitPath, portrait, { contentType: "image/webp", upsert: false });
  if (portraitError) {
    await bucket.remove([originalPath]);
    return authResponse({ error: "Could not store the cropped 4:5 portrait." }, 503);
  }
  const { error: updateError } = await adminDb.from("profiles").update({ portrait_path: portraitPath, portrait_original_path: originalPath }).eq("id", ctx.user!.id);
  if (updateError) {
    await bucket.remove([originalPath, portraitPath]);
    return authResponse({ error: "The portrait was stored but could not be linked to your profile. Please retry." }, 503);
  }
  if (current.portrait_path || current.portrait_original_path) await bucket.remove([current.portrait_path, current.portrait_original_path].filter((path): path is string => !!path));
  return authResponse({ ok: true, portraitUrl: `/api/member/portrait?v=${Date.now()}` });
}
