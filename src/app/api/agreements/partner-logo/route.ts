import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, isSafeOrigin } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { agreementsTable, type DigitalAgreementRow } from "@/lib/agreements/db";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  if (!isSafeOrigin(request)) {
    return authResponse({ error: "Request origin could not be verified." }, 403);
  }
  const user = await getAuthUser();
  if (!user || !user.email) {
    return authResponse({ error: "Sign in with your verified email to upload a logo." }, 401);
  }
  if (!rateLimit(`agreement-logo:${user.id}`, 6, 60_000).allowed) {
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
  if (agreement.recipient_email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    return authResponse({ error: "Email does not match agreement recipient." }, 403);
  }
  if (agreement.status !== "sent") {
    return authResponse({ error: "Logo can only be updated while agreement is pending." }, 409);
  }

  let pngBuffer: Buffer;
  try {
    const raw = Buffer.from(await file.arrayBuffer());
    pngBuffer = await sharp(raw, { limitInputPixels: 25_000_000, failOn: "error" })
      .resize(400, 200, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    return authResponse({ error: "Could not decode image. Use a valid PNG, JPEG, or WebP file." }, 422);
  }

  const storagePath = `${agreement.id}/partner-logo.png`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("agreement-assets")
    .upload(storagePath, pngBuffer, { contentType: "image/png", upsert: true });

  if (uploadError) {
    return authResponse({ error: "Logo upload failed." }, 503);
  }

  await agreementsTable()
    .update({ partner_logo_path: storagePath, updated_at: new Date().toISOString() })
    .eq("id", agreement.id);

  return NextResponse.json({ ok: true, path: storagePath });
}
