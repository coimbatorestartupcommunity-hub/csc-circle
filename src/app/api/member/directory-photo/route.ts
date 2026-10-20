import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp, { type Metadata } from "sharp";
import { authResponse } from "@/lib/auth/http";
import { getMemberContext } from "@/lib/services/member/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return authResponse({ error: "Sign in to save a Founder Directory photo." }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Request origin could not be verified." }, 403);
  if (!rateLimit(`directory-photo:${ctx.user!.id}`, 5, 60_000).allowed) return authResponse({ error: "Please wait before uploading another image." }, 429);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES + 256 * 1024) return authResponse({ error: "The photo is too large." }, 413);

  let image: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("image");
    if (value instanceof File) image = value;
  } catch {
    return authResponse({ error: "The photo upload could not be read." }, 400);
  }
  if (!image || !ALLOWED_MIME.has(image.type) || image.size < 1 || image.size > MAX_BYTES) {
    return authResponse({ error: "Upload a JPEG, PNG or WebP image under 8 MB." }, 422);
  }

  let input: Buffer;
  let metadata: Metadata;
  try {
    input = Buffer.from(await image.arrayBuffer());
    metadata = await sharp(input, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().metadata();
  } catch {
    return authResponse({ error: "The photo is invalid or could not be decoded." }, 422);
  }
  if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) return authResponse({ error: "Choose a valid JPEG, PNG or WebP photo." }, 422);
  if (metadata.width < 600 || metadata.height < 450 || Math.abs(metadata.width / metadata.height - 4 / 3) > 0.015) {
    return authResponse({ error: "The founder photo must be at least 600 × 450 pixels in a 4:3 ratio." }, 422);
  }

  let output: Buffer;
  try {
    output = await sharp(input, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize({ width: 1200, height: 900, fit: "cover", position: "centre", withoutEnlargement: true })
      .webp({ quality: 90, effort: 5 })
      .toBuffer();
  } catch {
    return authResponse({ error: "The 4:3 photo crop could not be processed." }, 422);
  }

  const db = await createClient();
  const { data: profile, error: profileError } = await db.from("profiles").select("directory_photo_path").eq("id", ctx.user!.id).maybeSingle();
  if (profileError || !profile) return authResponse({ error: "Your member profile could not be loaded." }, 503);
  let adminDb;
  try {
    adminDb = createAdminClient();
  } catch {
    return authResponse({ error: "Secure photo storage is not configured yet." }, 503);
  }

  const path = `${ctx.user!.id}/${randomUUID()}-directory.webp`;
  const bucket = adminDb.storage.from("member-portraits");
  const { error: uploadError } = await bucket.upload(path, output, { contentType: "image/webp", upsert: false });
  if (uploadError) return authResponse({ error: "Could not securely save the founder photo." }, 503);

  const { error: updateError } = await adminDb.from("profiles").update({ directory_photo_path: path }).eq("id", ctx.user!.id);
  if (updateError) {
    await bucket.remove([path]);
    return authResponse({ error: "The photo was stored but could not be linked to your profile." }, 503);
  }
  if (profile.directory_photo_path) await bucket.remove([profile.directory_photo_path]);

  return NextResponse.json({ ok: true, url: "/api/member/portrait?variant=directory" }, { headers: { "Cache-Control": "private, no-store" } });
}
