import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import {
  createPaymentOrder,
  GUEST_VERIFICATION_COOKIE_NAME,
  hashGuestVerificationToken,
  verifyGuestVerificationCookie,
} from "@/lib/payments/orders";
import { validateGuestEmailVerification } from "@/lib/payments/guest-email-verification";

const createOrderSchema = z.object({
  eventId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  whatsapp: z.string().trim().min(10).max(20),
  organization: z.string().trim().min(2).max(100),
  role: z.enum([
    "Startup Founder / Co-Founder",
    "Entrepreneur / Business Owner",
    "Working Professional",
    "Student",
    "Freelancer / Creator",
    "Aspiring Entrepreneur",
    "Other",
  ]),
  attendeeCount: z.coerce.number().int().min(1).max(10),
  additionalAttendeeNames: z.string().optional(),
  referralSource: z.enum([
    "Instagram",
    "WhatsApp",
    "LinkedIn",
    "Friends / Referral",
    "CSC Community",
    "Other",
  ]).optional(),
  dietaryAccessibilityNotes: z.string().max(500).optional(),
  consentContact: z.boolean().default(false),
  consentPaymentTerms: z.boolean().refine((val) => val === true, {
    message: "You must affirmatively accept the event registration and payment terms.",
  }),
  guestVerificationId: z.string().uuid().optional(),
  guestVerificationToken: z.string().min(32).max(128).optional(),
  guestEmailVerificationToken: z.string().min(32).max(128).optional(),
});

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, error: "JSON content type required." }, { status: 415 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 16_384) {
    return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
  }

  try {
    const json = await request.json();
    const parsed = createOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Check the registration details and try again.", details: parsed.error.format() },
        { status: 422 }
      );
    }

    // Require distinct attendee names for every seat booked in group registrations (Section 11)
    if (parsed.data.attendeeCount > 1) {
      const additional = (parsed.data.additionalAttendeeNames || "")
        .split(/[\r\n;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (additional.length < parsed.data.attendeeCount - 1) {
        return NextResponse.json(
          {
            ok: false,
            error: `Please provide all ${parsed.data.attendeeCount} attendee names. Currently provided: ${additional.length + 1}.`,
          },
          { status: 422 }
        );
      }
    }

    const admin = createAdminClient();
    const ip = clientIp(request);
    const limited = await distributedRateLimit(admin, "create-payment-order", ip, 10, 60_000);
    if (!limited.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter || 60), "Cache-Control": "no-store" } }
      );
    }

    // Authenticated checkout is bound to the session's verified email.
    let userId: string | undefined;
    let sessionEmail: string | undefined;
    try {
      const session = await createClient();
      const { data: { user } } = await session.auth.getUser();
      if (user?.id) {
        userId = user.id;
        sessionEmail = user.email?.trim().toLowerCase();
        if (!user.email_confirmed_at || !sessionEmail || sessionEmail !== parsed.data.email.trim().toLowerCase()) {
          return NextResponse.json(
            { ok: false, error: "Use the verified email address on your signed-in CSC account." },
            { status: 403, headers: { "Cache-Control": "no-store" } }
          );
        }
      }
    } catch {
      // Guest order is supported
    }

    const cookieHeader = request.headers.get("cookie") ?? "";
    const existingGuestToken =
      request.cookies?.get("csc_payment_guest")?.value ||
      cookieHeader.match(/(?:^|;\s*)csc_payment_guest=([^;]+)/)?.[1];

    let guestVerificationRecordId: string | undefined;

    if (!userId) {
      let isVerifiedGuest = false;

      // 1. Check for signed HttpOnly csc_guest_verification cookie (F12)
      const guestCookie =
        request.cookies?.get(GUEST_VERIFICATION_COOKIE_NAME)?.value ||
        cookieHeader.match(new RegExp(`(?:^|;\\s*)${GUEST_VERIFICATION_COOKIE_NAME}=([^;]+)`))?.[1];

      const verifiedCookie = verifyGuestVerificationCookie(guestCookie, parsed.data.email);

      if (verifiedCookie.valid && verifiedCookie.token) {
        const tokenHash = hashGuestVerificationToken(verifiedCookie.token);
        const { data: record } = await admin
          .from("guest_email_verifications")
          .select("id, token_hash, verified_at, consumed_at, expires_at, email, event_id")
          .eq("email", parsed.data.email.trim().toLowerCase())
          .eq("token_hash", tokenHash)
          .is("consumed_at", null)
          .maybeSingle();

        if (
          record &&
          record.verified_at &&
          Date.parse(record.expires_at) > Date.now() &&
          (!record.event_id || record.event_id === parsed.data.eventId)
        ) {
          isVerifiedGuest = true;
          guestVerificationRecordId = record.id;
        }
      }

      // 2. Check for verification token in request payload (backward compatibility)
      const bodyToken = parsed.data.guestVerificationToken || parsed.data.guestEmailVerificationToken;
      if (!isVerifiedGuest && bodyToken) {
        const tokenHash = hashGuestVerificationToken(bodyToken);
        let query = admin
          .from("guest_email_verifications")
          .select("id, token_hash, verified_at, consumed_at, expires_at, email, event_id")
          .eq("email", parsed.data.email.trim().toLowerCase())
          .is("consumed_at", null);

        if (parsed.data.guestVerificationId) {
          query = query.eq("id", parsed.data.guestVerificationId);
        }

        const { data: rows } = await query.limit(5);
        const matched = rows?.find((r) => {
          if (!r.verified_at || Date.parse(r.expires_at) <= Date.now()) return false;
          if (r.event_id && r.event_id !== parsed.data.eventId) return false;
          if (r.token_hash === tokenHash) return true;
          return false;
        });

        if (matched) {
          isVerifiedGuest = true;
          guestVerificationRecordId = matched.id;
        } else if (parsed.data.guestVerificationId) {
          const legacyValid = await validateGuestEmailVerification(
            admin,
            parsed.data.guestVerificationId,
            parsed.data.email,
            parsed.data.eventId,
            bodyToken
          );
          if (legacyValid) {
            isVerifiedGuest = true;
            guestVerificationRecordId = parsed.data.guestVerificationId;
          }
        }
      }

      // Check if this is an authorized test event
      const { data: targetEvent } = await admin
        .from("events")
        .select("settings, admission")
        .eq("id", parsed.data.eventId)
        .maybeSingle();

      const isTestEvent = Boolean(
        (targetEvent?.settings as Record<string, unknown> | null)?.is_test_event
      );

      if (!isVerifiedGuest && !isTestEvent) {
        return NextResponse.json(
          { ok: false, error: "Verify your email before creating a guest payment order." },
          { status: 403, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    const result = await createPaymentOrder(admin, {
      ...parsed.data,
      userId,
      existingGuestToken,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    // Single-use guard: atomically consume guest email verification
    if (!userId && guestVerificationRecordId) {
      const { data: consumed } = await admin
        .from("guest_email_verifications")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", guestVerificationRecordId)
        .is("consumed_at", null)
        .select("id")
        .maybeSingle();

      if (!consumed) {
        await admin.from("event_payment_orders").update({ status: "cancelled" }).eq("id", result.order.id);
        return NextResponse.json(
          { ok: false, error: "Guest email verification was already used." },
          { status: 409, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    const response = NextResponse.json(
      {
        ok: true,
        order: {
          id: result.order.id,
          orderReference: result.order.order_reference,
          amountPaise: result.order.amount_paise,
          totalRupees: Number(result.order.amount_paise) / 100,
          payeeName: result.order.payee_name,
          payeeVpa: result.order.payee_vpa,
          upiUri: result.order.upi_uri,
          status: result.order.status,
          expiresAt: result.order.expires_at,
        },
        deepLinks: result.deepLinks,
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    if (!userId && result.guestCheckoutToken) {
      // General capability cookie (backward compatibility)
      response.cookies.set("csc_payment_guest", result.guestCheckoutToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/api/payments",
        maxAge: 30 * 60,
      });

      // Scoped capability cookie per Interface Contract §2 / F13
      response.cookies.set(`csc_guest_order_token_${result.order.id}`, result.guestCheckoutToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/api/payments",
        maxAge: 30 * 60,
      });

      // Clear guest verification cookie
      response.cookies.delete(GUEST_VERIFICATION_COOKIE_NAME);
    }

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to create payment order. Please try again." },
      { status: 500 }
    );
  }
}
