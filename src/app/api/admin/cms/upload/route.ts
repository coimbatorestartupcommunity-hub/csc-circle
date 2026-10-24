import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { can, getAdminContext } from "@/lib/admin/gate";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeCollaborationImage, sanitizeCollaborationLogo } from "@/lib/media/images";

const KINDS: Record<string, { prefix: string; mode: "image5x3" | "logo" }> = {
  cover: { prefix: "resource-media", mode: "image5x3" },
  banner: { prefix: "opportunity-media", mode: "image5x3" },
  logo: { prefix: "opportunity-media", mode: "logo" },
  updateImage: { prefix: "updates-media", mode: "image5x3" },
};

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  }
  const context = await getAdminContext();
  if (context.mode !== "live" || !context.userId || !can(context, "content.manage")) {
    return NextResponse.json({ error: "You are not authorized to upload content." }, { status: 403 });
  }
  if (!rateLimit(`cms-upload:${context.userId}:${clientIp(request)}`, 30, 60 * 60_000).allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kindKey = String(form?.get("kind") ?? "");
  const kind = KINDS[kindKey];
  if (!(file instanceof File) || !kind) return NextResponse.json({ error: "Select a file and a valid upload type." }, { status: 422 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();

  try {
    const image = kind.mode === "logo" ? await sanitizeCollaborationLogo(bytes, file.type) : await sanitizeCollaborationImage(bytes, file.type);
    const path = `${kind.prefix}/${randomUUID()}.webp`;
    const { error } = await admin.storage.from("member-portraits").upload(path, image.data, { contentType: "image/webp", upsert: false });
    if (error) return NextResponse.json({ error: "The image could not be stored." }, { status: 503 });
    return NextResponse.json({ ok: true, path, width: image.width, height: image.height });
  } catch {
    return NextResponse.json({ error: "Choose a valid image (JPEG, PNG, or WebP) or a PDF document." }, { status: 422 });
  }
}
