import { z } from "zod";
import { revalidateTag } from "next/cache";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { distributedRateLimit, clientIp } from "@/lib/rate-limit";
import { ensureEventPassEmail } from "@/lib/admin/event-pass-email";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";

const reconcileSchema = z.object({
  orderId: z.string().uuid("Valid order ID is required."),
  evidenceId: z.string().uuid("Valid bank evidence ID is required."),
  notes: z
    .string()
    .min(5, "Audit verification rationale of at least 5 characters is required.")
    .max(1000, "Audit notes cannot exceed 1000 characters."),
});

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.userId) {
      return authResponse({ error: "Administrator session required." }, 403);
    }

    // Role & Permission Guard: payments.verify or registrations.approve (super_admin, finance_reviewer, event_manager)
    const hasPermission = can(ctx, "payments.verify") || can(ctx, "registrations.approve");
    const hasRole = ctx.roles.some((r) =>
      ["super_admin", "finance_reviewer", "event_manager"].includes(r)
    );
    if (!hasPermission || !hasRole) {
      return authResponse(
        {
          error:
            "Permission denied: Manual payment reconciliation requires finance reviewer or event manager authority.",
        },
        403
      );
    }

    // Distributed Rate Limiting
    const admin = createAdminClient();
    const rateLimit = await distributedRateLimit(
      admin,
      "admin-reconcile",
      `${ctx.userId}:${clientIp(request)}`,
      20,
      60_000
    );
    if (!rateLimit.allowed) {
      return authResponse(
        { error: "Too many manual reconciliation requests. Please wait." },
        429
      );
    }

    const body = await readAuthBody(request);
    const parsed = reconcileSchema.safeParse(body);
    if (!parsed.success) {
      return authResponse(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload." },
        422
      );
    }

    const { orderId, evidenceId, notes } = parsed.data;

    // 1. Verify Order State
    const { data: order, error: orderError } = await admin
      .from("event_payment_orders")
      .select(
        "id, status, amount_paise, currency, expected_account_suffix, order_reference, event_id"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return authResponse({ error: "Payment order could not be located." }, 404);
    }

    if (order.status === "reconciled" || order.status === "verified") {
      return authResponse({ ok: true, message: "Order is already reconciled." });
    }

    if (!["pending", "processing", "needs_review", "underpaid", "unmatched"].includes(order.status)) {
      return authResponse(
        { error: `Cannot manually reconcile order currently in ${order.status} state.` },
        409
      );
    }

    // 2. Verify Evidence State & Invariants
    const { data: evidence, error: evError } = await admin
      .from("event_payment_evidence")
      .select(
        "id, bank, direction, currency, amount_paise, receiving_account_suffix, utr, auth_status, reconciliation_state, matched_order_id"
      )
      .eq("id", evidenceId)
      .maybeSingle();

    if (evError || !evidence) {
      return authResponse({ error: "Bank payment evidence could not be located." }, 404);
    }

    if (evidence.direction !== "CREDIT") {
      return authResponse({ error: "Evidence direction is not CREDIT." }, 422);
    }

    if (evidence.amount_paise !== order.amount_paise) {
      return authResponse(
        {
          error: `Amount mismatch: evidence amount ₹${(evidence.amount_paise / 100).toFixed(
            2
          )} does not equal order amount ₹${(order.amount_paise / 100).toFixed(2)}.`,
        },
        422
      );
    }

    if (evidence.receiving_account_suffix !== order.expected_account_suffix) {
      return authResponse(
        {
          error: `Account mismatch: evidence credited to XX${evidence.receiving_account_suffix}, expected XX${order.expected_account_suffix}.`,
        },
        422
      );
    }

    // 3. Reject Untrusted or Forged Evidence
    if (evidence.auth_status === "untrusted" || evidence.auth_status === "forged") {
      return authResponse(
        {
          error: `Settlement rejected: evidence authentication failed with status '${evidence.auth_status}'. Untrusted evidence cannot be settled.`,
        },
        422
      );
    }

    // 4. Double-Spend Check
    if (evidence.matched_order_id && evidence.matched_order_id !== order.id) {
      return authResponse(
        { error: "This bank evidence has already been attributed to another order." },
        409
      );
    }

    // 5. Upsert Attribution Record
    const { error: attrError } = await admin.from("event_payment_attributions").upsert(
      {
        order_id: order.id,
        evidence_id: evidence.id,
        attribution_method: "admin_bank_record_review",
        bank_order_reference: null,
        verification_source: "admin_manual_settlement",
        policy_version: "csc-manual-attribution-v1",
        verified_by: ctx.userId,
        supporting_evidence: {
          notes,
          actor_role: ctx.roles[0],
          actor_id: ctx.userId,
          linked_at: new Date().toISOString(),
        },
        eligible_for_settlement: true,
      },
      { onConflict: "order_id" }
    );

    if (attrError) {
      return authResponse(
        { error: `Could not record manual attribution: ${attrError.message}` },
        409
      );
    }

    // 6. Invoke Atomic Fulfillment RPC under p_matched_by = 'admin_manual'
    const { data: fulfillmentResult, error: rpcError } = await admin.rpc(
      "csc_fulfill_confirmed_payment",
      {
        p_order_id: order.id,
        p_evidence_id: evidence.id,
        p_matched_by: "admin_manual",
        p_notes: notes,
        p_user_id: ctx.userId,
      }
    );

    if (
      rpcError ||
      !fulfillmentResult ||
      typeof fulfillmentResult !== "object" ||
      !(fulfillmentResult as { ok?: boolean }).ok
    ) {
      return authResponse(
        {
          error:
            rpcError?.message ??
            "Manual reconciliation failed to fulfill payment atomically.",
        },
        409
      );
    }

    // 7. Enqueue Pass Email & Record Audit Log
    const primaryPassId = (fulfillmentResult as { primary_pass_id?: string })
      .primary_pass_id;
    if (primaryPassId) {
      await ensureEventPassEmail(admin, primaryPassId);
    }

    await admin.from("audit_logs").insert({
      action: "payment.manual_reconciliation.verified",
      actor_id: ctx.userId,
      actor_role: ctx.roles[0] || "finance_reviewer",
      target_type: "event_payment_orders",
      target_id: order.id,
      after: {
        status: "reconciled",
        evidence_id: evidence.id,
        utr: evidence.utr,
        notes,
      },
    });

    scheduleNotificationDelivery();
    revalidateTag("registrations", "max");
    revalidateTag("payments", "max");

    return authResponse({ ok: true, data: fulfillmentResult });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return authResponse({ error: msg }, 500);
  }
}
