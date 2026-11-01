import { timingSafeEqual } from "node:crypto";
import { reconcilePayments } from "@/lib/payments/reconciler";

export const maxDuration = 300;

function verifyAuth(request: Request): boolean {
  // Prefer dedicated CSC_PAYMENT_RECONCILE_SECRET, fallback to CRON_SECRET
  const secret = process.env.CSC_PAYMENT_RECONCILE_SECRET || process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  const directHeader = request.headers.get("x-reconcile-secret") ?? "";

  const expectedBearer = Buffer.from(`Bearer ${secret}`);
  const suppliedBearer = Buffer.from(authHeader);
  if (expectedBearer.length === suppliedBearer.length && timingSafeEqual(expectedBearer, suppliedBearer)) {
    return true;
  }

  const expectedDirect = Buffer.from(secret);
  const suppliedDirect = Buffer.from(directHeader);
  if (expectedDirect.length === suppliedDirect.length && timingSafeEqual(expectedDirect, suppliedDirect)) {
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
