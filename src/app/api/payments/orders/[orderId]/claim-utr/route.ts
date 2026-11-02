import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import { verifyOrderAccess } from "@/lib/payments/orders";

const claimUtrSchema = z.object({
  utr: z.string().trim().regex(/^\d{12}$/, "UTR must be a 12-digit numeric reference"),
});

/**
 * Extracts guest capability token from order-scoped cookie, general cookie, or optional header.
 */
function extractGuestToken(request: Request, orderId: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";

  // 1. Scoped guest capability cookie (PROJECT.md F13 contract)
  const scopedMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)csc_guest_order_token_${orderId}=([^;]+)`));
  if (scopedMatch?.[1]) return decodeURIComponent(scopedMatch[1]);

  // 2. Standard payment guest capability cookie
  const generalMatch = cookieHeader.match(/(?:^|;\s*)csc_payment_guest=([^;]+)/);
  if (generalMatch?.[1]) return decodeURIComponent(generalMatch[1]);

  // 3. Optional header for programmatic / testing clients
  const headerToken = request.headers.get("x-guest-token");
  if (headerToken) return headerToken.trim();

  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!z.string().uuid().safeParse(orderId).success) {
      return NextResponse.json({ ok: false, error: "Invalid order ID." }, { status: 404 });
    }

    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
    }

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ ok: false, error: "JSON content type required." }, { status: 415 });
    }

    if (Number(request.headers.get("content-length") ?? 0) > 4096) {
      return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
    }

    const admin = createAdminClient();
    const ip = clientIp(request);

    // 1. Distributed rate limiting: 5 requests per 15 minutes (900 seconds) per order/IP
    const limited = await distributedRateLimit(admin, "claim-utr", `${orderId}:${ip}`, 5, 15 * 60 * 1000);
    if (!limited.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many claim attempts. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limited.retryAfter || 60),
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // 2. Validate UTR format (12 numeric digits strictly)
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
    }

    const parsed = claimUtrSchema.safeParse(body);
    if (!parsed.success) {
      // NOTE: Status 422 matches tests/e2e-opaque-upi-reconciliation.test.ts:1347 (F16-1)
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "UTR must be a 12-digit numeric reference." },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    const utr = parsed.data.utr;

    // 3. Resolve caller identity
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

    const guestToken = extractGuestToken(request, orderId);

    // Pre-flight authorization check: reject callers possessing zero credentials before querying DB (satisfies test F16-B1)
    if (!isAdmin && !sessionUserId && !guestToken) {
      return NextResponse.json(
        { ok: false, error: "Authentication or guest token required to claim UTR." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 4. Fetch Order Record
    const { data: order, error: orderError } = await admin
      .from("event_payment_orders")
      .select("id,order_reference,status,claimed_utr,user_id,guest_token_hash")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }

    // 5. Enforce authorization against order record
    const isAuthorized = isAdmin || verifyOrderAccess(order, sessionUserId, guestToken);
    if (!isAuthorized) {
      return NextResponse.json(
        { ok: false, error: "Access denied to this payment order." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 6. Check order status lifecycle
    if (order.status === "reconciled" || order.status === "verified") {
      return NextResponse.json(
        { ok: true, status: order.status, message: "Order is already verified." },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!["pending", "processing", "needs_review", "unmatched"].includes(order.status)) {
      return NextResponse.json(
        { ok: false, error: "This payment order cannot accept a transaction claim." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 7. Check for existing claim on this order
    if (order.claimed_utr) {
      if (order.claimed_utr === utr) {
        return NextResponse.json(
          { ok: true, status: order.status, message: "Your transaction claim is already recorded for review." },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
      return NextResponse.json(
        { ok: false, error: "A transaction claim is already recorded for this order. Contact support for corrections." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 8. Prevent duplicate claims across different orders
    const { data: duplicateClaim } = await admin
      .from("event_payment_orders")
      .select("id")
      .eq("claimed_utr", utr)
      .neq("id", orderId)
      .maybeSingle();

    if (duplicateClaim) {
      return NextResponse.json(
        { ok: false, error: "This transaction reference (UTR) has already been submitted for another order." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 9. Atomic Order Transition to 'processing'
    // NON-SETTLING INVARIANT: This endpoint strictly DOES NOT call csc_fulfill_confirmed_payment,
    // does NOT create paid registrations, and does NOT generate admission passes.
    const { data: updated, error: updateError } = await admin
      .from("event_payment_orders")
      .update({
        claimed_utr: utr,
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .is("claimed_utr", null)
      .in("status", ["pending", "processing", "needs_review", "unmatched"])
      .select("id")
      .maybeSingle();

    if (updateError || !updated) {
      return NextResponse.json(
        { ok: false, error: "The transaction claim could not be recorded. Contact support if it was already submitted." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 10. Audit event logging: event_type 'utr_claimed' with { claimed_utr, ip, user_agent }
    const userAgent = request.headers.get("user-agent") ?? "unknown";
    await admin.from("event_payment_events").insert({
      order_id: orderId,
      event_type: "utr_claimed",
      details: {
        claimed_utr: utr,
        utr, // Retained for test backward-compatibility
        ip,
        user_agent: userAgent,
        claim_source: isAdmin
          ? "admin_override"
          : sessionUserId
            ? "authenticated_member"
            : "guest_capability_holder",
      },
    });

    return NextResponse.json(
      {
        ok: true,
        status: "processing",
        message: "Transaction claim recorded. It will remain pending until independently verified bank evidence is attributed to this order.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to record UTR claim." }, { status: 500 });
  }
}
