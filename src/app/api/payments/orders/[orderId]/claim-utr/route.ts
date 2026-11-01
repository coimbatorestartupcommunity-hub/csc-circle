import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fulfillConfirmedPayment } from "@/lib/payments/reconciler";

const claimUtrSchema = z.object({
  utr: z.string().trim().regex(/^\d{12}$/, "UTR must be a 12-digit numeric reference"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!z.string().uuid().safeParse(orderId).success) {
      return NextResponse.json({ ok: false, error: "Invalid order ID." }, { status: 404 });
    }

    const ip = clientIp(request);
    if (!rateLimit(`claim-utr:${orderId}:${ip}`, 5, 60_000).allowed) {
      return NextResponse.json({ ok: false, error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = claimUtrSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Invalid UTR format." }, { status: 422 });
    }

    const utr = parsed.data.utr;
    const admin = createAdminClient();

    // 1. Fetch Order
    const { data: order, error: orderError } = await admin
      .from("event_payment_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }

    if (order.status === "reconciled" || order.status === "verified") {
      return NextResponse.json({ ok: true, status: order.status, message: "Order is already verified." });
    }

    // 2. Check if this UTR has already been claimed and consumed by another confirmed order
    const { data: duplicateClaim } = await admin
      .from("event_payment_orders")
      .select("id")
      .eq("claimed_utr", utr)
      .neq("id", orderId)
      .in("status", ["verified", "reconciled"])
      .maybeSingle();

    if (duplicateClaim) {
      return NextResponse.json({ ok: false, error: "This UTR reference has already been utilized." }, { status: 409 });
    }

    // 3. Update order with claimed UTR
    await admin
      .from("event_payment_orders")
      .update({ claimed_utr: utr, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    // 4. Check if bank credit evidence for this UTR already exists
    const { data: matchingEvidence } = await admin
      .from("event_payment_evidence")
      .select("*")
      .eq("utr", utr)
      .eq("direction", "CREDIT")
      .eq("amount_paise", order.amount_paise)
      .maybeSingle();

    if (matchingEvidence && matchingEvidence.reconciliation_state !== "matched") {
      // Immediate match!
      const fulfilled = await fulfillConfirmedPayment(admin, { ...order, claimed_utr: utr }, matchingEvidence);
      if (fulfilled.ok) {
        return NextResponse.json({
          ok: true,
          status: "reconciled",
          message: "Payment successfully matched and confirmed with Axis Bank record!",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      status: "processing",
      message: "UTR reference recorded. Bank alert verification in progress.",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to record UTR claim." }, { status: 500 });
  }
}
