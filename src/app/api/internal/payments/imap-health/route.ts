import { timingSafeEqual } from "node:crypto";
import { checkImapConnection } from "@/lib/payments/imap-client";
import { getAdminContext } from "@/lib/admin/gate";

function verifySecret(request: Request): boolean {
  const secret = process.env.CSC_PAYMENT_RECONCILE_SECRET || process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");

  if (expected.length !== supplied.length) return false;
  return timingSafeEqual(expected, supplied);
}

export async function GET(request: Request) {
  // Allow authorized admin OR secret-authenticated caller
  let isAuthorized = verifySecret(request);
  if (!isAuthorized) {
    try {
      const ctx = await getAdminContext();
      if (ctx.mode === "live" && ctx.permissions.has("payments.verify")) {
        isAuthorized = true;
      }
    } catch {
      // not admin session
    }
  }

  if (!isAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkImapConnection();
  return Response.json(result, {
    status: result.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
