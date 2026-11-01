import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyOrderAccess } from "@/lib/payments/orders";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!z.string().uuid().safeParse(orderId).success) {
      return NextResponse.json({ ok: false, error: "Invalid order ID." }, { status: 404 });
    }

    // Resolve caller identity
    let sessionUserId: string | null = null;
    let isAdmin = false;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        sessionUserId = user.id;
        const { data: roles } = await supabase.from("admin_roles").select("role").eq("user_id", user.id);
        if (roles && roles.length > 0) {
          isAdmin = true;
        }
      }
    } catch {
      // Unauthenticated session
    }

    const headerToken = request.headers.get("x-guest-token");
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const url = new URL(request.url);
    const queryToken = url.searchParams.get("token");
    const guestToken = headerToken?.trim() || bearerToken || queryToken?.trim() || null;

    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("event_payment_orders")
      .select("id,order_reference,status,amount_paise,paid_registration_id,claimed_utr,matched_at,event_id,user_id,guest_token_hash")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }

    // Authorization check
    const isAuthorized = isAdmin || verifyOrderAccess(order, sessionUserId, guestToken);
    if (!isAuthorized) {
      if (!sessionUserId && !guestToken) {
        return NextResponse.json(
          { ok: false, error: "Authentication or guest token required to view order status." },
          { status: 401, headers: { "Cache-Control": "private, no-store" } }
        );
      }
      return NextResponse.json(
        { ok: false, error: "Access denied to this payment order." },
        { status: 403, headers: { "Cache-Control": "private, no-store" } }
      );
    }

    // If order has been confirmed/reconciled, fetch pass details if available
    let passHref: string | null = null;
    let registrationReference: string | null = null;

    if (order.status === "reconciled" || order.status === "verified") {
      if (order.paid_registration_id) {
        const { data: paidReg } = await admin
          .from("paid_event_registrations")
          .select("member_registration_id,reference")
          .eq("id", order.paid_registration_id)
          .maybeSingle();

        if (paidReg) {
          registrationReference = paidReg.reference;
          if (paidReg.member_registration_id) {
            passHref = `/member/events/${paidReg.member_registration_id}`;
          }
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        orderId: order.id,
        orderReference: order.order_reference,
        status: order.status,
        amountRupees: Number(order.amount_paise) / 100,
        claimedUtr: order.claimed_utr,
        matchedAt: order.matched_at,
        registrationReference,
        passHref,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to retrieve order status." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
