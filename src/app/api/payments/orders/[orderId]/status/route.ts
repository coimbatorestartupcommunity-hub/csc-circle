import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!z.string().uuid().safeParse(orderId).success) {
      return NextResponse.json({ ok: false, error: "Invalid order ID." }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("event_payment_orders")
      .select("id,order_reference,status,amount_paise,paid_registration_id,claimed_utr,matched_at,event_id")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
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
