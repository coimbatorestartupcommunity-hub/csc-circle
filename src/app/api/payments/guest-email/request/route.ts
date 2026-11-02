import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import { createGuestEmailVerification } from "@/lib/payments/guest-email-verification";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";

const schema = z.object({ email: z.string().trim().email().max(254), eventId: z.string().uuid() });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, error: "JSON content type required." }, { status: 415 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 4096) {
    return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Check the email and event." }, { status: 422 });
  const admin = createAdminClient();
  const limited = await distributedRateLimit(admin, "guest-email-request", `${clientIp(request)}:${parsed.data.email}`, 5, 15 * 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, error: "Too many verification requests." }, { status: 429, headers: { "Retry-After": String(limited.retryAfter), "Cache-Control": "no-store" } });
  }

  try {
    const result = await createGuestEmailVerification(admin, parsed.data.email, parsed.data.eventId);
    scheduleNotificationDelivery();
    return NextResponse.json({ ok: true, verificationId: result.id, expiresAt: result.expiresAt }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Email verification is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
