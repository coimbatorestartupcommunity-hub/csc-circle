import sharp from "sharp";
import { NextResponse } from "next/server";
import { getMemberContext } from "@/lib/services/member/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { isSupportedStartupImage, isSupportedStartupImageFormat } from "@/lib/startups/image-input";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Request origin could not be verified." }, 403);
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return authResponse({ error: "Sign in to upload startup media." }, 401);
  if (!rateLimit(`startup-assets:${ctx.user!.id}`, 20, 60_000).allowed) return authResponse({ error: "Too many image uploads. Try again shortly." }, 429);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const startupId = String(form?.get("startupId") ?? "");
  const kind = String(form?.get("kind") ?? "");
  const revisionId = String(form?.get("revisionId") ?? "");
  if (!(file instanceof File) || !/^[0-9a-f-]{36}$/i.test(startupId) || !["logo", "directory"].includes(kind)) {
    return authResponse({ error: "Choose a startup image and try again." }, 400);
  }
  if (!isSupportedStartupImage(file) || file.size > 8 * 1024 * 1024) {
    return authResponse({ error: "Use a valid JPG, JPEG, PNG, WebP, GIF, TIFF, AVIF or HEIC image smaller than 8 MB." }, 422);
  }
  try {
    const source = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(source, { limitInputPixels: 24_000_000 }).metadata();
    if (!meta.width || !meta.height || !isSupportedStartupImageFormat(meta.format)) return authResponse({ error: "The selected file is not a supported image. Try JPG, PNG, WebP, GIF, TIFF, AVIF or HEIC." }, 422);
    const output = kind === "directory"
      ? await sharp(source).rotate().resize(1200, 900, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 88, effort: 5 }).toBuffer()
      : await sharp(source).rotate().resize(640, 640, { fit: "inside", withoutEnlargement: true }).webp({ quality: 90, effort: 5 }).toBuffer();
    const admin = createAdminClient();
    let publishedEdit = false;
    if (revisionId) {
      if (!/^[0-9a-f-]{36}$/i.test(revisionId)) return authResponse({ error: "Invalid startup revision." }, 422);
      const { data: startup } = await admin.from("directory_startups").select("id,status").eq("id", startupId).eq("user_id", ctx.user!.id).maybeSingle();
      if (!startup || startup.status !== "published") return authResponse({ error: "Only the owner of a published startup can upload revision media." }, 403);
      publishedEdit = true;
    }
    const suffix = kind === "directory" ? "directory-startup" : "startup-logo";
    const path = publishedEdit
      ? `${ctx.user!.id}/${startupId}-revision-${revisionId}-${suffix}.webp`
      : `${ctx.user!.id}/${startupId}-${suffix}.webp`;
    const { error } = await admin.storage.from("member-portraits").upload(path, output, { contentType: "image/webp", upsert: true, cacheControl: "3600" });
    if (error) return authResponse({ error: "The startup image could not be saved. Please try again." }, 503);
    const { data: preview } = await admin.storage.from("member-portraits").createSignedUrl(path, 1800);
    return NextResponse.json({ ok: true, path, previewUrl: preview?.signedUrl ?? "" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return authResponse({ error: "The image could not be processed. Please choose a smaller valid image." }, 422);
  }
}
