import sharp from "sharp";
import { NextResponse } from "next/server";
import { getMemberContext } from "@/lib/services/member/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Request origin could not be verified." }, 403);
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return authResponse({ error: "Sign in to upload startup media." }, 401);
  if (!rateLimit(`startup-assets:${ctx.user!.id}`, 20, 60_000).allowed) return authResponse({ error: "Too many image uploads. Try again shortly." }, 429);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const startupId = String(form?.get("startupId") ?? "");
  const kind = String(form?.get("kind") ?? "");
  if (!(file instanceof File) || !/^[0-9a-f-]{36}$/i.test(startupId) || !["logo", "directory"].includes(kind)) {
    return authResponse({ error: "Choose a startup image and try again." }, 400);
  }
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 8 * 1024 * 1024) {
    return authResponse({ error: "Use a JPEG, PNG or WebP image smaller than 8 MB." }, 422);
  }
  try {
    const source = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(source, { limitInputPixels: 24_000_000 }).metadata();
    if (!meta.width || !meta.height || !["jpeg", "png", "webp"].includes(meta.format ?? "")) return authResponse({ error: "The selected file is not a valid image." }, 422);
    const output = kind === "directory"
      ? await sharp(source).rotate().resize(1200, 900, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 88, effort: 5 }).toBuffer()
      : await sharp(source).rotate().resize(640, 640, { fit: "inside", withoutEnlargement: true }).webp({ quality: 90, effort: 5 }).toBuffer();
    const path = `${ctx.user!.id}/${startupId}-${kind === "directory" ? "directory-startup" : "startup-logo"}.webp`;
    const admin = createAdminClient();
    const { error } = await admin.storage.from("member-portraits").upload(path, output, { contentType: "image/webp", upsert: true, cacheControl: "3600" });
    if (error) return authResponse({ error: "The startup image could not be saved. Please try again." }, 503);
    const { data: preview } = await admin.storage.from("member-portraits").createSignedUrl(path, 1800);
    return NextResponse.json({ ok: true, path, previewUrl: preview?.signedUrl ?? "" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return authResponse({ error: "The image could not be processed. Please choose a smaller valid image." }, 422);
  }
}
