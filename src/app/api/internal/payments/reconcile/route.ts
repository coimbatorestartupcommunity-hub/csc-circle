import { timingSafeEqual } from "node:crypto";
import { reconcilePayments } from "@/lib/payments/reconciler";

export const maxDuration = 300;

function verifyAuth(request: Request): boolean {
  const secret = process.env.CSC_PAYMENT_RECONCILE_SECRET || process.env.RECONCILIATION_CRON_SECRET;
  if (!secret || secret.length < 32) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  const expectedBearer = Buffer.from(`Bearer ${secret}`);
  const suppliedBearer = Buffer.from(authHeader);
  if (expectedBearer.length === suppliedBearer.length && timingSafeEqual(expectedBearer, suppliedBearer)) {
    return true;
  }

  const customSecret = request.headers.get("x-reconcile-secret") ?? "";
  const expectedSecret = Buffer.from(secret);
  const suppliedSecret = Buffer.from(customSecret);
  if (expectedSecret.length === suppliedSecret.length && timingSafeEqual(expectedSecret, suppliedSecret)) {
    return true;
  }

  return false;
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
