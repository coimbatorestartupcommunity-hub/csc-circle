import { NextResponse } from "next/server";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import {
  GUEST_VERIFICATION_COOKIE_NAME,
  signGuestVerificationCookie,
} from "@/lib/payments/orders";

const confirmGuestEmailSchema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().trim().regex(/^\d{6}$/, "Must be a 6-digit code"),
  eventId: z.string().uuid().optional(),
  verificationId: z.string().uuid().optional(),
});

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

  const body = await request.json().catch(() => null);
  const parsed = confirmGuestEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid verification code." }, { status: 422 });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const admin = createAdminClient();
  const ip = clientIp(request);

  // 1. Rate limited: 5 attempts per verification record / email / IP
  const limited = await distributedRateLimit(
    admin,
    "confirm-guest-email",
    `${ip}:${normalizedEmail}`,
    5,
    10 * 60 * 1000
  );

  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many verification attempts. Please wait a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfter || 60),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    // 2. Fetch pending verification record
    let query = admin
      .from("guest_email_verifications")
      .select("*")
      .eq("email", normalizedEmail)
      .is("verified_at", null)
      .is("consumed_at", null)
      .order("created_at", { ascending: false });

    if (parsed.data.verificationId) {
      query = query.eq("id", parsed.data.verificationId);
    }
    if (parsed.data.eventId) {
      query = query.eq("event_id", parsed.data.eventId);
    }

    const { data: rows } = await query.limit(5);
    const row = rows?.[0];

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "No pending verification found for this email." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 3. Expiry and attempts checks
    if (Date.parse(row.expires_at) <= Date.now()) {
      return NextResponse.json(
        { ok: false, error: "Verification code has expired. Please request a new code." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (row.attempts >= 5) {
      return NextResponse.json(
        { ok: false, error: "Maximum verification attempts exceeded. Please request a new code." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const nextAttempts = row.attempts + 1;
    const providedCodeHash = createHash("sha256").update(parsed.data.code).digest("hex");

    // 4. Validate OTP against SHA-256 code_hash in constant time
    const isMatch =
      row.code_hash.length === providedCodeHash.length &&
      timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(providedCodeHash));

    if (!isMatch) {
      await admin
        .from("guest_email_verifications")
        .update({ attempts: nextAttempts })
        .eq("id", row.id)
        .eq("attempts", row.attempts);

      return NextResponse.json(
        { ok: false, error: "Invalid verification code." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 5. Successful verification: generate 32-byte (64 hex chars) high-entropy verification_token
    const verificationToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(verificationToken).digest("hex");

    const { data: verifiedRow } = await admin
      .from("guest_email_verifications")
      .update({
        attempts: nextAttempts,
        verified_at: new Date().toISOString(),
        token_hash: tokenHash,
      })
      .eq("id", row.id)
      .eq("attempts", row.attempts)
      .is("verified_at", null)
      .select("id, event_id")
      .maybeSingle();

    if (!verifiedRow) {
      return NextResponse.json(
        { ok: false, error: "Verification could not be recorded. Please try again." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 6. Issue signed HttpOnly, SameSite=Lax, Secure cookie csc_guest_verification
    const cookieValue = signGuestVerificationCookie({
      email: normalizedEmail,
      eventId: verifiedRow.event_id || undefined,
      token: verificationToken,
    });

    const response = NextResponse.json(
      {
        ok: true,
        token: verificationToken,
        email: normalizedEmail,
        verified: true,
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    response.cookies.set(GUEST_VERIFICATION_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Email verification is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
