import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import { verifyOrderAccess } from "@/lib/payments/orders";

/**
 * Records the start of the attendee five-minute UTR verification window on
 * the server. Called when the attendee activates "I Have Paid — Enter UTR".
 *
 * The timestamp is written exactly once per order (`where
 * verification_started_at is null`) and never overwritten, so the countdown
 * survives page refresh, tab suspension, and returning from a UPI app. The
 * client derives remaining time from this server timestamp, not from a
 * browser-only clock.
 */

/** Extracts guest capability token from order-scoped cookie, general cookie, or optional header. */
function extractGuestToken(request: Request, orderId: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const scopedMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)csc_guest_order_token_${orderId}=([^;]+)`));
  if (scopedMatch?.[1]) return decodeURIComponent(scopedMatch[1]);

  const generalMatch = cookieHeader.match(/(?:^|;\s*)csc_payment_guest=([^;]+)/);
  if (generalMatch?.[1]) return decodeURIComponent(generalMatch[1]);

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

    const admin = createAdminClient();
    const ip = clientIp(request);

    const limited = await distributedRateLimit(admin, "start-verification", `${orderId}:${ip}`, 20, 15 * 60 * 1000);
    if (!limited.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many verification requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limited.retryAfter || 60),
            "Cache-Control": "no-store",
          },
        }
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

    const guestToken = extractGuestToken(request, orderId);

    if (!isAdmin && !sessionUserId && !guestToken) {
      return NextResponse.json(
        { ok: false, error: "Authentication or guest token required to start verification." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { data: order, error: orderError } = await admin
      .from("event_payment_orders")
      .select("id,status,verification_started_at,user_id,guest_token_hash")
      .eq("id", orderId)
      .maybeSingle();

    // Graceful degradation when the verification-window migration has not been
    // applied yet: the client falls back to its persisted local countdown.
    if (orderError && (orderError as { code?: string }).code === "42703") {
      const serverNow = new Date().toISOString();
      return NextResponse.json(
        { ok: true, verificationStartedAt: null, serverNow, persisted: false },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (orderError || !order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }

    const isAuthorized = isAdmin || verifyOrderAccess(order, sessionUserId, guestToken);
    if (!isAuthorized) {
      return NextResponse.json(
        { ok: false, error: "Access denied to this payment order." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (["verified", "reconciled", "expired", "failed", "cancelled"].includes(order.status)) {
      return NextResponse.json(
        { ok: false, error: "This payment order is no longer awaiting verification." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    const serverNow = new Date().toISOString();

    // Idempotent: a previously recorded start is returned unchanged.
    if (order.verification_started_at) {
      return NextResponse.json(
        {
          ok: true,
          verificationStartedAt: order.verification_started_at,
          serverNow,
          persisted: true,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const { data: updated, error: updateError } = await admin
      .from("event_payment_orders")
      .update({
        verification_started_at: serverNow,
        updated_at: serverNow,
      })
      .eq("id", orderId)
      .is("verification_started_at", null)
      .select("verification_started_at")
      .maybeSingle();

    if (updateError) {
      // Column missing (migration not applied): degrade to client-side countdown.
      if ((updateError as { code?: string }).code === "42703") {
        return NextResponse.json(
          { ok: true, verificationStartedAt: null, serverNow, persisted: false },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
      return NextResponse.json(
        { ok: false, error: "Could not start the verification window." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    const startedAt = (updated as { verification_started_at?: string } | null)?.verification_started_at ?? serverNow;

    try {
      await admin.from("event_payment_events").insert({
        order_id: orderId,
        event_type: "verification_window_started",
        details: { verification_started_at: startedAt, ip },
      });
    } catch {
      // Audit insert is best effort; the window start itself is committed.
    }

    return NextResponse.json(
      { ok: true, verificationStartedAt: startedAt, serverNow, persisted: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to start verification." }, { status: 500 });
  }
}
