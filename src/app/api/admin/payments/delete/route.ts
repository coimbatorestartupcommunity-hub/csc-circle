import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { distributedRateLimit, clientIp } from "@/lib/rate-limit";

const deletePaymentSchema = z.object({
  orderId: z.string().uuid("Valid order ID is required."),
});

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.userId) {
      return authResponse({ error: "Administrator session required." }, 403);
    }

    // Role & Permission Guard: super_admin, finance_reviewer, event_manager
    const hasPermission =
      can(ctx, "payments.verify") ||
      can(ctx, "events.update") ||
      can(ctx, "registrations.approve");
    const hasRole = ctx.roles.some((r) =>
      ["super_admin", "finance_reviewer", "event_manager"].includes(r)
    );
    if (!hasPermission && !hasRole) {
      return authResponse(
        { error: "Permission denied: Deleting payment records requires administrator authority." },
        403
      );
    }

    const admin = createAdminClient();
    const dynamicDb = admin as unknown as SupabaseClient;

    // Distributed Rate Limiting
    const rateLimit = await distributedRateLimit(
      admin,
      "admin-delete-payment",
      `${ctx.userId}:${clientIp(request)}`,
      30,
      60_000
    );
    if (!rateLimit.allowed) {
      return authResponse(
        { error: "Too many delete requests. Please slow down and try again shortly." },
        429
      );
    }

    const body = await readAuthBody(request);
    const parsed = deletePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return authResponse(
        { error: parsed.error.issues[0]?.message || "Invalid order parameters." },
        400
      );
    }

    const { orderId } = parsed.data;

    // Fetch order first to check existence
    const { data: order, error: fetchErr } = await admin
      .from("event_payment_orders")
      .select("id, order_reference, amount_paise, user_id, event_id")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchErr || !order) {
      return authResponse({ error: "Payment transaction record not found." }, 404);
    }

    // 1. Unlink any bank evidence referencing this order
    await admin
      .from("event_payment_evidence")
      .update({
        matched_order_id: null,
      })
      .eq("matched_order_id", orderId);

    // 2. Remove attribution entries (if any exist)
    try {
      await dynamicDb
        .from("event_payment_attributions")
        .delete()
        .eq("order_id", orderId);
    } catch {
      // Table may not have matching row
    }

    // 3. Remove reconciliation entries (if any exist)
    try {
      await dynamicDb
        .from("event_payment_reconciliation")
        .delete()
        .eq("order_id", orderId);
    } catch {
      // Table may not have matching row
    }

    // 4. Remove audit events
    try {
      await dynamicDb
        .from("event_payment_events")
        .delete()
        .eq("order_id", orderId);
    } catch {
      // Cascade or missing
    }

    // 5. Delete the payment order
    const { error: deleteErr } = await admin
      .from("event_payment_orders")
      .delete()
      .eq("id", orderId);

    if (deleteErr) {
      return authResponse(
        { error: `Could not delete order: ${deleteErr.message}` },
        500
      );
    }

    // 6. Record admin audit action
    try {
      await dynamicDb.from("admin_audit_logs").insert({
        actor_id: ctx.userId,
        action: "payment_order.delete",
        target_id: orderId,
        metadata: {
          orderReference: order.order_reference,
          amountPaise: order.amount_paise,
          deletedBy: ctx.userId,
        },
      });
    } catch {
      // Non-blocking
    }

    // Revalidate paths & tags
    revalidatePath("/admin/payments");
    revalidateTag("payments", { expire: 0 });

    return authResponse({
      ok: true,
      message: `Payment order ${order.order_reference} deleted successfully.`,
      deletedOrderId: orderId,
    });
  } catch (err) {
    return authResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500
    );
  }
}
