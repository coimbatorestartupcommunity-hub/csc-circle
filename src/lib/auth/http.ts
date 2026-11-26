import { NextResponse } from "next/server";

export function authResponse(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

export function isSafeOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const reqUrl = new URL(request.url);

    if (originUrl.origin === reqUrl.origin) return true;

    const fwdHost = request.headers.get("x-forwarded-host");
    const host = request.headers.get("host");
    if (fwdHost && (originUrl.host === fwdHost || originUrl.host === fwdHost.split(":")[0])) return true;
    if (host && (originUrl.host === host || originUrl.host === host.split(":")[0])) return true;

    const allowedHosts = new Set([
      "csc.logicintelligencetechnologies.in",
      "localhost:3000",
      "127.0.0.1:3000",
    ]);

    if (process.env.NEXT_PUBLIC_SITE_URL) {
      try { allowedHosts.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).host); } catch {}
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      allowedHosts.add(process.env.VERCEL_PROJECT_PRODUCTION_URL);
    }
    if (process.env.VERCEL_URL) {
      allowedHosts.add(process.env.VERCEL_URL);
    }

    if (allowedHosts.has(originUrl.host)) return true;
    if (originUrl.hostname.endsWith(".vercel.app")) return true;
  } catch {
    return false;
  }
  return false;
}

export async function readAuthBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!isSafeOrigin(request)) return null;
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  if (Number(request.headers.get("content-length") ?? 0) > 16384) return null;
  const text = await request.text();
  if (Buffer.byteLength(text) > 16384) return null;
  try {
    const data = JSON.parse(text);
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}
