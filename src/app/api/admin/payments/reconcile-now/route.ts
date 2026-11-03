import { getAdminContext, can } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse } from "@/lib/auth/http";
import { distributedRateLimit, clientIp } from "@/lib/rate-limit";
import { reconcilePayments } from "@/lib/payments/reconciler";

/**
 * Admin-triggered bank reconciliation run. Uses the administrator's live
 * session as authorization (no shared secret travels through the browser)
 * and executes the same leased worker pipeline as the scheduled trigger:
 * IMAP fetch, DKIM authentication, parsing, evidence persistence,
 * attribution, settlement, and cursor advancement.
 */
export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.userId) {
      return authResponse({ error: "Administrator session required." }, 403);
    }

    if (!can(ctx, "payments.verify")) {
      return authResponse(
        { error: "Permission denied: running reconciliation requires payment verification authority." },
        403
      );
    }

    const admin = createAdminClient();
    const rateLimit = await distributedRateLimit(
      admin,
      "admin-reconcile-now",
      `${ctx.userId}:${clientIp(request)}`,
      5,
      60_000
    );
    if (!rateLimit.allowed) {
      return authResponse(
        { error: "Too many reconciliation runs. Please wait a minute." },
        429
      );
    }

    try {
      const summary = await reconcilePayments();
      return authResponse(summary, summary.ok ? 200 : 207);
    } catch (error) {
      return authResponse(
        {
          error: "Payment reconciliation run failed",
          details: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  } catch {
    return authResponse({ error: "Unable to run reconciliation." }, 500);
  }
}
