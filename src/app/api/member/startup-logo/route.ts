import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp, { type Metadata } from "sharp";
import { authResponse } from "@/lib/auth/http";
import { getMemberContext } from "@/lib/services/member/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return authResponse({ error: "Sign in to upload a startup logo." }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Request origin could not be verified." }, 403);
  if (!rateLimit(`startup-logo:${ctx.user!.id}`, 6, 60_000).allowed) return authResponse({ error: "Please wait before uploading another company logo." }, 429);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES + 256 * 1024) return authResponse({ error: "The company logo file is too large." }, 413);

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return authResponse({ error: "The company logo upload could not be read." }, 400);
  }
  if (!file || !ALLOWED_MIME.has(file.type) || file.size < 1 || file.size > MAX_BYTES) {
    return authResponse({ error: "Upload a JPEG, PNG or WebP company logo under 8 MB." }, 422);
  }

  let input: Buffer;
  let metadata: Metadata;
  try {
    input = Buffer.from(await file.arrayBuffer());
    metadata = await sharp(input, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().metadata();
  } catch {
    return authResponse({ error: "The company logo is invalid or could not be decoded." }, 422);
  }
  if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) return authResponse({ error: "Choose a valid JPEG, PNG or WebP logo." }, 422);

  let output: Buffer;
  try {
    output = await sharp(input, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize({ width: 600, height: 600, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 }, withoutEnlargement: true })
      .webp({ quality: 92, effort: 5 })
      .toBuffer();
  } catch {
    return authResponse({ error: "The company logo could not be optimized." }, 422);
  }

  try {
    const admin = createAdminClient();
    const path = `${ctx.user!.id}/${randomUUID()}-startup-logo.webp`;
    const { error } = await admin.storage.from("member-portraits").upload(path, output, { contentType: "image/webp", upsert: false });
    if (error) return authResponse({ error: "Could not securely save the company logo." }, 503);
    return NextResponse.json({ ok: true, logoPath: path }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return authResponse({ error: "Secure company-logo storage is not configured." }, 503);
  }
}
