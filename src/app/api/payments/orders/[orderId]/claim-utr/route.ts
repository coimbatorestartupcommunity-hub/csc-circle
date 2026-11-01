import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyOrderAccess } from "@/lib/payments/orders";
import { ensureEventPassEmail } from "@/lib/admin/event-pass-email";

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

    // 2. Resolve caller identity and enforce authorization
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
    const guestToken = headerToken?.trim() || bearerToken || null;

    const isAuthorized = isAdmin || verifyOrderAccess(order, sessionUserId, guestToken);
    if (!isAuthorized) {
      if (!sessionUserId && !guestToken) {
        return NextResponse.json({ ok: false, error: "Authentication or guest token required to claim UTR." }, { status: 401 });
      }
      return NextResponse.json({ ok: false, error: "Access denied to this payment order." }, { status: 403 });
    }

    if (order.status === "reconciled" || order.status === "verified") {
      return NextResponse.json({ ok: true, status: order.status, message: "Order is already verified." });
    }

    // 3. Check if this UTR has already been claimed and consumed by another confirmed order
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

    // 4. Update order with claimed UTR and set status to processing
    await admin
      .from("event_payment_orders")
      .update({ claimed_utr: utr, status: "processing", updated_at: new Date().toISOString() })
      .eq("id", orderId);

    // Audit log UTR claim
    await admin.from("event_payment_events").insert({
      order_id: orderId,
      event_type: "utr_claimed",
      details: { utr, ip },
    });

    // 5. Automatic confirmation only if CSC_PAYMENT_AUTO_CONFIRM is true
    const isAutoConfirmEnabled = process.env.CSC_PAYMENT_AUTO_CONFIRM === "true";

    if (isAutoConfirmEnabled) {
      // Check if bank credit evidence for this UTR already exists
      const { data: matchingEvidence } = await admin
        .from("event_payment_evidence")
        .select("*")
        .eq("utr", utr)
        .eq("direction", "CREDIT")
        .eq("amount_paise", order.amount_paise)
        .eq("receiving_account_suffix", order.expected_account_suffix)
        .eq("auth_status", "authenticated")
        .maybeSingle();

      if (matchingEvidence && matchingEvidence.reconciliation_state !== "matched") {
        // Execute atomic PostgreSQL fulfillment RPC
        const { data: fulfillResult, error: fulfillError } = await admin.rpc("csc_fulfill_confirmed_payment", {
          p_order_id: order.id,
          p_evidence_id: matchingEvidence.id,
          p_matched_by: "user_utr_claim",
          p_notes: `User claimed UTR ${utr} matched with authenticated Axis Bank credit evidence ${matchingEvidence.id}`,
          p_user_id: sessionUserId || order.user_id || null,
        });

        if (!fulfillError && fulfillResult && (fulfillResult as { ok?: boolean }).ok) {
          const primaryPassId = (fulfillResult as { primary_pass_id?: string }).primary_pass_id;
          if (primaryPassId) {
            await ensureEventPassEmail(admin, primaryPassId);
          }

          return NextResponse.json({
            ok: true,
            status: "reconciled",
            message: "Payment successfully matched and confirmed with Axis Bank record!",
          });
        }
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
