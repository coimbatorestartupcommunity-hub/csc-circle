import "server-only";
import { after } from "next/server";
import { dispatchNotifications } from "@/lib/notifications/dispatcher";

/**
 * Drain in short bounded batches after a committed request. On Hobby Vercel a
 * cron can only run daily, so this catches up immediately while the durable
 * queue remains the recovery path for any remainder.
 */
export async function drainNotificationQueue(maxRounds = 6) {
  let claimed = 0;
  let accepted = 0;
  let deferred = 0;
  let state = "processed";
  for (let round = 0; round < Math.min(Math.max(maxRounds, 1), 10); round++) {
    const result = await dispatchNotifications(15);
    state = result.state;
    claimed += result.claimed;
    accepted += result.accepted;
    deferred += result.deferred;
    if (result.state !== "processed" || result.deferred > 0 || result.claimed < 15) break;
  }
  const rounds = Math.min(Math.max(maxRounds, 1), 10);
  const saturated = state === "processed" && deferred === 0 && claimed === rounds * 15;
  const secret = process.env.CRON_SECRET;
  const base = process.env.APP_BASE_URL;
  if (saturated && process.env.VERCEL_ENV === "production" && secret && secret.length >= 32 && base) {
    try {
      const endpoint = new URL("/api/internal/notifications?continuation=1", base);
      await fetch(endpoint, {
        method: "GET",
        headers: { authorization: `Bearer ${secret}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      console.error("CSC_NOTIFICATION_CONTINUATION_REQUEST_FAILED");
    }
  }
  return { state, claimed, accepted, deferred };
}

export function scheduleNotificationDelivery() {
  after(async () => {
    try { const result=await drainNotificationQueue(); if (["configuration_error","database_configuration_error","queue_unavailable"].includes(result.state)) console.error("CSC_NOTIFICATION_"+result.state.toUpperCase()); }
    catch { console.error("CSC_NOTIFICATION_DISPATCH_FAILED"); }
  });
}
