import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import { verifyGuestEmailCode } from "@/lib/payments/guest-email-verification";

const schema = z.object({
  verificationId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, error: "JSON content type required." }, { status: 415 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid verification code." }, { status: 422 });
  const admin = createAdminClient();
  const limited = await distributedRateLimit(admin, "guest-email-verify", `${clientIp(request)}:${parsed.data.verificationId}`, 8, 15 * 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, error: "Too many verification attempts." }, { status: 429, headers: { "Retry-After": String(limited.retryAfter), "Cache-Control": "no-store" } });
  }
  try {
    const token = await verifyGuestEmailCode(admin, parsed.data.verificationId, parsed.data.email, parsed.data.code);
    if (!token) return NextResponse.json({ ok: false, error: "The code is invalid or expired." }, { status: 422, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ ok: true, verificationToken: token }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Email verification is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
