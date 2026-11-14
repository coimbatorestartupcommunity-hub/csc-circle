import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyOrderAccess, containsExactOrderReference } from "@/lib/payments/orders";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import { ensureEventPassEmail } from "@/lib/admin/event-pass-email";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!z.string().uuid().safeParse(orderId).success) {
      return NextResponse.json({ ok: false, error: "Invalid order ID." }, { status: 404 });
    }

    const admin = createAdminClient();
    const ip = clientIp(request);
    const limited = await distributedRateLimit(admin, "order-status", `${orderId}:${ip}`, 40, 60_000);
    if (!limited.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many status requests. Please wait a moment." },
        { status: 429, headers: { "Cache-Control": "private, no-store" } }
      );
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
        isAdmin = (roles ?? []).some(({ role }) => role === "super_admin" || role === "finance_reviewer");
      }
    } catch {
      // Unauthenticated session
    }

    const cookieToken = request.headers.get("cookie")?.match(/(?:^|;\s*)csc_payment_guest=([^;]+)/)?.[1];
    const guestToken = cookieToken ? decodeURIComponent(cookieToken) : null;

    const { data: order, error } = await admin
      .from("event_payment_orders")
      .select("id,order_reference,status,amount_paise,paid_registration_id,claimed_utr,matched_at,verification_started_at,event_id,user_id,guest_token_hash,expected_account_suffix")
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

    // Opportunistic auto-reconciliation during polling if genuine bank evidence has arrived
    const isAutoConfirm = process.env.CSC_PAYMENT_AUTO_CONFIRM === "true" || process.env.NODE_ENV === "production";
    if (["pending", "processing"].includes(order.status) && order.claimed_utr && isAutoConfirm) {
      const { data: matchedEvidence } = await admin
        .from("event_payment_evidence")
        .select("*")
        .eq("utr", order.claimed_utr)
        .eq("auth_status", "authenticated")
        .eq("direction", "CREDIT")
        .eq("currency", "INR")
        .maybeSingle();

      if (
        matchedEvidence &&
        Number(matchedEvidence.amount_paise) === Number(order.amount_paise) &&
        (matchedEvidence.receiving_account_suffix ?? "") === (order.expected_account_suffix ?? "") &&
        !matchedEvidence.matched_order_id &&
        (!matchedEvidence.reconciliation_state || ["pending", "unmatched"].includes(matchedEvidence.reconciliation_state))
      ) {
        // Check for conflicting order reference in memo
        const memoConflict = matchedEvidence.transaction_info_raw?.match(/CSC-ORD-[A-Z0-9]+/i);
        if (!memoConflict || memoConflict[0].toUpperCase() === order.order_reference.toUpperCase()) {
          const isExactMemo = Boolean(
            matchedEvidence.transaction_info_raw &&
            containsExactOrderReference(matchedEvidence.transaction_info_raw, order.order_reference)
          );
          const method = isExactMemo ? "bank_order_reference" : "utr_exact_match";
          await admin.from("event_payment_attributions").upsert(
            {
              order_id: order.id,
              evidence_id: matchedEvidence.id,
              attribution_method: method,
              bank_order_reference: order.order_reference,
              verification_source: "status_poll_genuine_evidence",
              policy_version: "csc-axis-attribution-v1",
              supporting_evidence: {
                utr: order.claimed_utr,
                evidence_id: matchedEvidence.id,
                auto_confirmed: true,
              },
              eligible_for_settlement: true,
            },
            { onConflict: "order_id" }
          );

          const { data: fulfillmentResult } = await admin.rpc("csc_fulfill_confirmed_payment", {
            p_order_id: order.id,
            p_evidence_id: matchedEvidence.id,
            p_matched_by: "user_utr_claim",
            p_notes: `Status poll automated settlement: UTR ${order.claimed_utr}`,
            p_user_id: null,
          });

          if ((fulfillmentResult as { ok?: boolean })?.ok) {
            order.status = "verified";
            const resObj = fulfillmentResult as { primary_pass_id?: string; paid_registration_id?: string };
            if (resObj.paid_registration_id) {
              order.paid_registration_id = resObj.paid_registration_id;
              const { data: passes } = await admin
                .from("event_registrations")
                .select("id")
                .eq("paid_registration_id", resObj.paid_registration_id);
              if (passes) {
                for (const p of passes) {
                  await ensureEventPassEmail(admin, p.id);
                }
              }
            } else if (resObj.primary_pass_id) {
              await ensureEventPassEmail(admin, resObj.primary_pass_id);
            }
          }
        }
      }
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
        verificationStartedAt: (order as { verification_started_at?: string | null }).verification_started_at ?? null,
        serverNow: new Date().toISOString(),
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
