import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import { verifyGuestEmailToken } from "@/lib/payments/guest-email-verification";

const schema = z.object({
  verificationId: z.string().uuid(),
  token: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, error: "JSON content type required." }, { status: 415 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid verification parameters." }, { status: 422 });
  }

  const admin = createAdminClient();
  const limited = await distributedRateLimit(
    admin,
    "guest-email-verify-token",
    `${clientIp(request)}:${parsed.data.verificationId}`,
    15,
    15 * 60_000
  );
  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many verification attempts." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter), "Cache-Control": "no-store" } }
    );
  }

  try {
    const verified = await verifyGuestEmailToken(admin, parsed.data.verificationId, parsed.data.token);
    if (!verified) {
      return NextResponse.json(
        { ok: false, error: "This email verification link has expired or has already been used." },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        verificationId: parsed.data.verificationId,
        verificationToken: verified.verificationToken,
        email: verified.email,
        eventId: verified.eventId,
        eventSlug: verified.eventSlug,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Email verification is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
