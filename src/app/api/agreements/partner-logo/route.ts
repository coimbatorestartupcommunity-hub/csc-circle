import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, isSafeOrigin, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { agreementsTable, type DigitalAgreementRow } from "@/lib/agreements/db";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  if (!isSafeOrigin(request)) {
    return authResponse({ error: "Request origin could not be verified." }, 403);
  }
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const user = await getAuthUser();
  const rateLimitKey = user?.id ? `agreement-logo:${user.id}` : `agreement-logo:${clientIp}`;
  if (!rateLimit(rateLimitKey, 10, 60_000).allowed) {
    return authResponse({ error: "Too many uploads. Please wait a moment." }, 429);
  }

  let token = "";
  let file: File | null = null;
  try {
    const form = await request.formData();
    token = String(form.get("token") ?? "").trim();
    const f = form.get("logo");
    if (f instanceof File) file = f;
  } catch {
    return authResponse({ error: "Invalid form data." }, 400);
  }

  if (!token || !file || !ALLOWED_MIME.has(file.type) || file.size < 1 || file.size > MAX_BYTES) {
    return authResponse({ error: "Upload a PNG, JPEG, or WebP logo under 5 MB." }, 422);
  }

  const { data } = await agreementsTable().select("*").eq("signing_token", token).maybeSingle();
  const agreement = data as DigitalAgreementRow | null;
  if (!agreement) return authResponse({ error: "Agreement not found." }, 404);

  if (agreement.status === "signed" || agreement.status === "voided") {
    return authResponse({ error: "Logo cannot be updated on an executed or voided agreement." }, 409);
  }

  let pngBuffer: Buffer;
  try {
    const raw = Buffer.from(await file.arrayBuffer());
    const size = 400;
    const circleMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff" /></svg>`,
    );
    pngBuffer = await sharp(raw, { limitInputPixels: 25_000_000, failOn: "error" })
      .resize(size, size, { fit: "cover" })
      .composite([{ input: circleMask, blend: "dest-in" }])
      .png()
      .toBuffer();
  } catch {
    return authResponse({ error: "Could not decode image. Use a valid PNG, JPEG, or WebP file." }, 422);
  }

  const storagePath = `${agreement.id}/partner-logo.png`;
  const admin = createAdminClient();
  let { error: uploadError } = await admin.storage
    .from("agreement-assets")
    .upload(storagePath, pngBuffer, { contentType: "image/png", upsert: true });

  if (uploadError && (uploadError.message?.toLowerCase().includes("not found") || uploadError.message?.toLowerCase().includes("bucket"))) {
    try {
      await admin.storage.createBucket("agreement-assets", { public: false });
      const retry = await admin.storage
        .from("agreement-assets")
        .upload(storagePath, pngBuffer, { contentType: "image/png", upsert: true });
      uploadError = retry.error;
    } catch {
      // Continue to check uploadError below
    }
  }

  if (uploadError) {
    return authResponse({ error: "Logo upload failed: " + (uploadError.message || "Storage error") }, 503);
  }

  await agreementsTable()
    .update({ partner_logo_path: storagePath, updated_at: new Date().toISOString() })
    .eq("id", agreement.id);

  const previewUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
  return NextResponse.json({ ok: true, path: storagePath, previewUrl });
}

export async function DELETE(request: Request) {
  if (!isSafeOrigin(request)) {
    return authResponse({ error: "Request origin could not be verified." }, 403);
  }

  let token = "";
  try {
    const body = await readAuthBody(request);
    token = String(body?.token ?? "").trim();
  } catch {
    return authResponse({ error: "Invalid request body." }, 400);
  }

  if (!token) return authResponse({ error: "Token is required." }, 422);

  const { data } = await agreementsTable().select("*").eq("signing_token", token).maybeSingle();
  const agreement = data as DigitalAgreementRow | null;
  if (!agreement) return authResponse({ error: "Agreement not found." }, 404);

  if (agreement.status === "signed" || agreement.status === "voided") {
    return authResponse({ error: "Cannot remove logo on an executed or voided agreement." }, 409);
  }

  await agreementsTable()
    .update({ partner_logo_path: null, updated_at: new Date().toISOString() })
    .eq("id", agreement.id);

  return NextResponse.json({ ok: true, removed: true });
}
