import { NextResponse } from "next/server";

export function authResponse(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
export async function readAuthBody(request: Request): Promise<Record<string, unknown> | null> {
  if (request.headers.get("origin") !== new URL(request.url).origin) return null;
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  if (Number(request.headers.get("content-length") ?? 0) > 16384) return null;
  const text = await request.text();
  if (Buffer.byteLength(text) > 16384) return null;
  try { const data = JSON.parse(text); return data && typeof data === "object" && !Array.isArray(data) ? data : null; }
  catch { return null; }
}
