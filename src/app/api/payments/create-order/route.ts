import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createPaymentOrder } from "@/lib/payments/orders";

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
});

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }

  const ip = clientIp(request);
  if (!rateLimit(`create-payment-order:${ip}`, 10, 60_000).allowed) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please wait a moment." }, { status: 429 });
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

    // Optional user session
    let userId: string | undefined;
    try {
      const session = await createClient();
      const { data: { user } } = await session.auth.getUser();
      if (user?.id) userId = user.id;
    } catch {
      // Guest order is supported
    }

    const admin = createAdminClient();
    const result = await createPaymentOrder(admin, {
      ...parsed.data,
      userId,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({
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
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to create payment order. Please try again." },
      { status: 500 }
    );
  }
}
