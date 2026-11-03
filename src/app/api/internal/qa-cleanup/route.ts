import { timingSafeEqual } from "node:crypto";
import { purgeAllQaTestHistoryAutomated } from "@/lib/testing/payment-test-manager";

export const maxDuration = 60;

function verifyCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET || process.env.CSC_PAYMENT_RECONCILE_SECRET;
  if (!secret || secret.length < 32) return false;
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(authHeader);
  if (expected.length === supplied.length && timingSafeEqual(expected, supplied)) return true;
  // Vercel cron sends this header
  if (request.headers.get("x-vercel-cron") === "1") {
    // Still require secret unless explicitly allowed for cron
    return false;
  }
  return false;
}

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await purgeAllQaTestHistoryAutomated({ adminUserId: "system-cron" });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
