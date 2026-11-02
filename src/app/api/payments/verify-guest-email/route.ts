import { NextResponse } from "next/server";
import { randomInt, createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";

const verifyGuestEmailSchema = z.object({
  email: z.string().trim().email().max(254),
  eventId: z.string().uuid(),
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
  const parsed = verifyGuestEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the email and event." }, { status: 422 });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const admin = createAdminClient();
  const ip = clientIp(request);

  // 1. Distributed Rate Limiting: 3 requests per 10 minutes (600 seconds) per email/IP
  const limited = await distributedRateLimit(
    admin,
    "verify-guest-email",
    `${ip}:${normalizedEmail}`,
    3,
    10 * 60 * 1000
  );

  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many verification requests. Please wait a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfter || 60),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // 2. Event validation
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, status, registration_state, starts_at, registration_deadline, admission")
    .eq("id", parsed.data.eventId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  const now = Date.now();
  if (
    event.status !== "published" ||
    event.admission !== "paid" ||
    event.registration_state !== "open" ||
    Date.parse(event.starts_at) <= now ||
    (event.registration_deadline && Date.parse(event.registration_deadline) <= now)
  ) {
    return NextResponse.json(
      { ok: false, error: "Registration is not open for this event." },
      { status: 409, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    // 3. Clear previous unverified records for this email
    await admin
      .from("guest_email_verifications")
      .delete()
      .eq("email", normalizedEmail)
      .is("verified_at", null);

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    // 4. Generate cryptographically secure 6-digit numeric OTP and SHA-256 hash
    let code = randomInt(100000, 1000000).toString();
    let inserted = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      const codeHash = createHash("sha256").update(code).digest("hex");
      const { error: insertError } = await admin.from("guest_email_verifications").insert({
        id,
        email: normalizedEmail,
        event_id: parsed.data.eventId,
        code_hash: codeHash,
        expires_at: expiresAt,
        attempts: 0,
        metadata: { policy_version: "csc-guest-email-v1" },
      });

      if (!insertError) {
        inserted = true;
        break;
      }

      if (insertError.code === "23505") {
        code = randomInt(100000, 1000000).toString();
        continue;
      }

      throw insertError;
    }

    if (!inserted) {
      throw new Error("Could not insert guest email verification record.");
    }

    // 5. Enqueue notification to transactional outbox (GuestEmailVerification template)
    const { error: notificationError } = await admin.from("notifications").insert({
      type: "GuestEmailVerification",
      template_key: "GuestEmailVerification",
      channel: "email",
      recipient: normalizedEmail,
      recipient_user_id: null,
      audience: "member",
      related_record_type: "guest_email_verifications",
      related_record_id: id,
      payload: { verificationCode: code },
      dedupe_key: `GuestEmailVerification:${id}`,
    });

    if (notificationError) {
      throw notificationError;
    }

    scheduleNotificationDelivery();

    // 6. Return success without leaking the OTP
    return NextResponse.json(
      {
        ok: true,
        message: "Verification code sent",
        verificationId: id,
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
