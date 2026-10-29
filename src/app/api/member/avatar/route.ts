import { getMemberContext } from "@/lib/services/member/context";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Authenticated same-origin proxy for the signed-in member's Google profile image. */
export async function GET() {
  const context = await getMemberContext();
  if (context.mode !== "live" || !context.user) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  const candidate = context.user.user_metadata?.avatar_url ?? context.user.user_metadata?.picture;
  if (typeof candidate !== "string") return new Response("Not found", { status: 404 });

  let imageUrl: URL;
  try {
    imageUrl = new URL(candidate);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (imageUrl.protocol !== "https:" || !/(^|\.)googleusercontent\.com$/i.test(imageUrl.hostname) || imageUrl.username || imageUrl.password) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const upstream = await fetch(imageUrl, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000) });
    const contentType = upstream.headers.get("content-type")?.split(";")[0]?.toLowerCase() ?? "";
    const contentLength = Number(upstream.headers.get("content-length") ?? 0);
    if (!upstream.ok || !ALLOWED_TYPES.has(contentType) || contentLength > MAX_AVATAR_BYTES || !upstream.body) {
      return new Response("Image unavailable", { status: 404, headers: { "Cache-Control": "private, no-store" } });
    }

    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AVATAR_BYTES) {
        await reader.cancel();
        return new Response("Image too large", { status: 413, headers: { "Cache-Control": "private, no-store" } });
      }
      chunks.push(value);
    }

    const image = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { image.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(image, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Image unavailable", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
}
