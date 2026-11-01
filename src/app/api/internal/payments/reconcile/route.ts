import { timingSafeEqual } from "node:crypto";
import { reconcilePayments } from "@/lib/payments/reconciler";

export const maxDuration = 300;

function verifyAuth(request: Request): boolean {
  // Allow CSC_PAYMENT_RECONCILE_SECRET or fallback to CRON_SECRET
  const secret = process.env.CSC_PAYMENT_RECONCILE_SECRET || process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");

  if (expected.length !== supplied.length) return false;
  return timingSafeEqual(expected, supplied);
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await reconcilePayments();
    return Response.json(summary, {
      status: summary.ok ? 200 : 207,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      { error: "Payment reconciliation process failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
