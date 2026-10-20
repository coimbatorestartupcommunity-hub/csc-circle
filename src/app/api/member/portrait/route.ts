import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 8 * 1024 * 1024;
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return new NextResponse(null, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const variant = new URL(request.url).searchParams.get("variant");
  if (variant !== null && variant !== "directory") return new NextResponse(null, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  const db = await createClient();
  const { data: profile } = await db.from("profiles").select("portrait_path,directory_photo_path").eq("id", ctx.user!.id).maybeSingle();
  const path = variant === "directory" ? profile?.directory_photo_path : profile?.portrait_path;
  if (!path) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const { data, error } = await db.storage.from("member-portraits").download(path);
  if (error || !data) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  return new NextResponse(data, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(data.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename=${variant === "directory" ? "founder-directory" : "member-portrait"}.webp`,
    },
  });
}

export async function POST(request: Request) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return authResponse({ error: "Sign in to update your portrait." }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Request origin could not be verified." }, 403);
  if (!rateLimit(`portrait:${ctx.user!.id}`, 4, 60_000).allowed) return authResponse({ error: "Please wait before uploading another portrait." }, 429);
  const advertisedSize = Number(request.headers.get("content-length") ?? 0);
  if (advertisedSize > 3 * MAX_BYTES + 1024 * 1024) return authResponse({ error: "The image and its two crops must fit within the upload limit." }, 413);

  let original: File | null = null;
  let portraitCrop: File | null = null;
  let directoryCrop: File | null = null;
  try {
    const form = await request.formData();
    const originalValue = form.get("original");
    const portraitValue = form.get("portrait");
    const directoryValue = form.get("directory");
    if (originalValue instanceof File) original = originalValue;
    if (portraitValue instanceof File) portraitCrop = portraitValue;
    if (directoryValue instanceof File) directoryCrop = directoryValue;
  } catch {
    return authResponse({ error: "The upload could not be read." }, 400);
  }
  if (!original || !portraitCrop || !directoryCrop || !MIME_TYPES.has(original.type) || portraitCrop.type !== "image/webp" || directoryCrop.type !== "image/webp") {
    return authResponse({ error: "Upload a JPEG, PNG, or WebP image and confirm both the 4:5 and 4:3 crops." }, 422);
  }
  if ([original, portraitCrop, directoryCrop].some((file) => file.size < 1 || file.size > MAX_BYTES)) return authResponse({ error: "Each image must be under 8 MB." }, 413);

  let originalBuffer: Buffer;
  let portraitBuffer: Buffer;
  let directoryBuffer: Buffer;
  try {
    [originalBuffer, portraitBuffer, directoryBuffer] = await Promise.all([original, portraitCrop, directoryCrop].map(async (file) => Buffer.from(await file.arrayBuffer())));
  } catch {
    return authResponse({ error: "The selected image could not be read." }, 422);
  }

  let originalMetadata: Metadata;
  let portraitMetadata: Metadata;
  let directoryMetadata: Metadata;
  try {
    [originalMetadata, portraitMetadata, directoryMetadata] = await Promise.all([
      sharp(originalBuffer, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().metadata(),
      sharp(portraitBuffer, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().metadata(),
      sharp(directoryBuffer, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().metadata(),
    ]);
  } catch {
    return authResponse({ error: "The image could not be decoded. Choose a valid JPEG, PNG, or WebP file." }, 422);
  }
  const allowedFormat = (metadata: Metadata) => !!metadata.width && !!metadata.height && ["jpeg", "png", "webp"].includes(metadata.format ?? "");
  if (!allowedFormat(originalMetadata) || !allowedFormat(portraitMetadata) || !allowedFormat(directoryMetadata)) return authResponse({ error: "One of the selected image crops is invalid." }, 422);
  if ((originalMetadata.width ?? 0) < 600 || (originalMetadata.height ?? 0) < 800) return authResponse({ error: "Choose an original image at least 600 × 800 pixels so both crops remain clear." }, 422);
  const portraitRatio = (portraitMetadata.width ?? 0) / (portraitMetadata.height ?? 1);
  if ((portraitMetadata.width ?? 0) < 320 || (portraitMetadata.height ?? 0) < 400 || Math.abs(portraitRatio - 0.8) > 0.015) return authResponse({ error: "The identity portrait must be at least 320 × 400 pixels in a 4:5 ratio." }, 422);
  const directoryRatio = (directoryMetadata.width ?? 0) / (directoryMetadata.height ?? 1);
  if ((directoryMetadata.width ?? 0) < 600 || (directoryMetadata.height ?? 0) < 450 || Math.abs(directoryRatio - 4 / 3) > 0.015) return authResponse({ error: "The Founder Directory crop must be at least 600 × 450 pixels in a 4:3 ratio." }, 422);

  const db = await createClient();
  const { data: current, error: readError } = await db.from("profiles").select("portrait_path,portrait_original_path,directory_photo_path").eq("id", ctx.user!.id).maybeSingle();
  if (readError || !current) return authResponse({ error: "Profile could not be loaded." }, 503);
  let adminDb;
  try { adminDb = createAdminClient(); } catch { return authResponse({ error: "Portrait uploads are not configured yet." }, 503); }

  let originalWebp: Buffer;
  let portraitWebp: Buffer;
  let directoryWebp: Buffer;
  try {
    [originalWebp, portraitWebp, directoryWebp] = await Promise.all([
      sharp(originalBuffer, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().resize({ width: 2000, height: 2500, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer(),
      sharp(portraitBuffer, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().resize({ width: 640, height: 800, fit: "cover", position: "centre" }).webp({ quality: 88 }).toBuffer(),
      sharp(directoryBuffer, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().resize({ width: 1200, height: 900, fit: "cover", position: "centre", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer(),
    ]);
  } catch {
    return authResponse({ error: "The selected crop could not be processed." }, 422);
  }

  const stem = `${ctx.user!.id}/${randomUUID()}`;
  const originalPath = `${stem}-original.webp`;
  const portraitPath = `${stem}-portrait.webp`;
  const directoryPath = `${stem}-directory.webp`;
  const bucket = adminDb.storage.from("member-portraits");
  const uploaded: string[] = [];
  for (const [path, body] of [[originalPath, originalWebp], [portraitPath, portraitWebp], [directoryPath, directoryWebp]] as const) {
    const { error } = await bucket.upload(path, body, { contentType: "image/webp", upsert: false });
    if (error) {
      if (uploaded.length) await bucket.remove(uploaded);
      return authResponse({ error: "Could not securely store both photo crops." }, 503);
    }
    uploaded.push(path);
  }
  const { error: updateError } = await adminDb.from("profiles").update({ portrait_path: portraitPath, portrait_original_path: originalPath, directory_photo_path: directoryPath }).eq("id", ctx.user!.id);
  if (updateError) {
    await bucket.remove(uploaded);
    return authResponse({ error: "The photos were stored but could not be linked to your profile. Please retry." }, 503);
  }
  const oldPaths = [current.portrait_path, current.portrait_original_path, current.directory_photo_path].filter((path): path is string => !!path);
  if (oldPaths.length) await bucket.remove(oldPaths);
  return authResponse({ ok: true, portraitUrl: `/api/member/portrait?v=${Date.now()}`, directoryPhotoUrl: `/api/member/portrait?variant=directory&v=${Date.now()}` });
}
