/**
 * Best-effort in-memory sliding-window rate limiter for public API routes.
 *
 * NOTE: per-instance only (serverless instances don't share memory), so it
 * mitigates casual abuse but is not a hard guarantee. A durable limiter
 * (Vercel Firewall rules or a shared KV store) is the production control —
 * tracked as residual risk.
 */

const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    buckets.set(key, hits);
    return { allowed: false, retryAfter };
  }
  hits.push(now);
  buckets.set(key, hits);
  // Opportunistic cleanup to bound memory.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return { allowed: true, retryAfter: 0 };
}

/** Client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
