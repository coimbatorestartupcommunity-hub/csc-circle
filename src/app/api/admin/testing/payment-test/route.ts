import { getAdminContext, can } from "@/lib/admin/gate";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import {
  createPaymentTestEvent,
  getPaymentTestStatus,
  cleanupPaymentTestEvent,
} from "@/lib/testing/payment-test-manager";

export async function GET() {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !can(ctx, "events.update")) {
    return authResponse({ error: "Administrator authorization required." }, 403);
  }
  const status = await getPaymentTestStatus();
  return authResponse(status);
}

export async function POST(request: Request) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !can(ctx, "events.create") || !can(ctx, "events.publish")) {
    return authResponse({ error: "Permission denied. Event publishing authority required." }, 403);
  }

  const body = (await readAuthBody(request).catch(() => ({}))) as {
    upiVpa?: string;
    upiPayeeName?: string;
  };

  try {
    const result = await createPaymentTestEvent({
      upiVpa: body.upiVpa,
      upiPayeeName: body.upiPayeeName,
      adminUserId: ctx.userId ?? undefined,
    });
    return authResponse(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not create payment test event.";
    return authResponse({ error: msg }, 500);
  }
}

export async function DELETE(request: Request) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !can(ctx, "events.update")) {
    return authResponse({ error: "Permission denied." }, 403);
  }

  const body = (await readAuthBody(request).catch(() => ({}))) as {
    testRunId?: string;
    eventId?: string;
    forceStagingPurge?: boolean;
  };

  try {
    const receipt = await cleanupPaymentTestEvent({
      testRunId: body.testRunId,
      eventId: body.eventId,
      adminUserId: ctx.userId ?? undefined,
      forceStagingPurge: body.forceStagingPurge,
    });
    return authResponse(receipt);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Test cleanup failed.";
    return authResponse({ error: msg }, 500);
  }
}
