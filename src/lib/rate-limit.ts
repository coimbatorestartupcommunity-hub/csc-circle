import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Result structure returned by distributed rate limiter.
 * Conforms to PROJECT.md Interface Contract §3:
 * { allowed: boolean, remaining: integer, reset_at: timestamptz } + retryAfter.
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  remaining?: number;
  resetAt?: string;
}

/** Local fallback used only when no shared database client is available. */

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

/**
 * Distributed rate limiter backed by atomic PostgreSQL RPC `csc_check_rate_limit`.
 * Enforces sliding/fixed window request limits across distributed serverless instances.
 */
export async function distributedRateLimit(
  admin: SupabaseClient<Database>,
  scope: string,
  key: string,
  limit = 5,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const digest = createHash("sha256").update(`${scope}:${key}`).digest("hex");
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  const { data, error } = await admin.rpc("csc_check_rate_limit", {
    p_scope: scope,
    p_key: digest,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    // Fail closed for financial mutation routes if the shared database control is down.
    return { allowed: false, retryAfter: 60 };
  }

  const result = data as {
    allowed?: boolean;
    remaining?: number;
    reset_at?: string;
    retry_after?: number;
  };

  const allowed = result.allowed === true;
  const retryAfter = allowed ? 0 : Math.max(1, Number(result.retry_after ?? windowSeconds));

  return {
    allowed,
    retryAfter,
    remaining: typeof result.remaining === "number" ? Math.max(0, result.remaining) : undefined,
    resetAt: typeof result.reset_at === "string" ? result.reset_at : undefined,
  };
}

/**
 * Extracts and validates an IP string from raw input.
 * Strips bracketed IPv6 notation and port numbers (e.g. `203.0.113.195:8080` or `[2001:db8::1]:8080`).
 * Returns a valid IPv4 or IPv6 string, or null if invalid.
 */
export function extractValidIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Bracketed IPv6 with optional port: [2001:db8::1]:8080 or [2001:db8::1]
  const bracketMatch = trimmed.match(/^\[([a-fA-F0-9:]+)\](?::\d+)?$/);
  if (bracketMatch) {
    return isIP(bracketMatch[1]) ? bracketMatch[1] : null;
  }

  // IPv4 with port: 203.0.113.195:8080
  const ipv4WithPort = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) {
    return isIP(ipv4WithPort[1]) ? ipv4WithPort[1] : null;
  }

  return isIP(trimmed) ? trimmed : null;
}

/**
 * Client address supplied by the deployment's trusted proxy.
 * Checks in order:
 * 1. x-forwarded-for: split comma-separated multi-IPs, trim, validate each; take the leftmost valid IP (satisfies test F14-4)
 * 2. x-real-ip: fallback if x-forwarded-for has no valid IP (satisfies test F14-5)
 * 3. x-vercel-forwarded-for / cf-connecting-ip
 * 4. Default fallback: "unknown"
 */
export function clientIp(req: Request): string {
  const headers = req.headers;

  // 1. Check X-Forwarded-For (leftmost valid IP)
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const candidates = xff.split(",");
    for (const raw of candidates) {
      const valid = extractValidIp(raw);
      if (valid) return valid;
    }
  }

  // 2. Check X-Real-IP
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) {
    const valid = extractValidIp(xRealIp);
    if (valid) return valid;
  }

  // 3. Check X-Vercel-Forwarded-For
  const vercelForwarded = headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const candidates = vercelForwarded.split(",");
    for (const raw of candidates) {
      const valid = extractValidIp(raw);
      if (valid) return valid;
    }
  }

  // 4. Check CF-Connecting-IP
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    const valid = extractValidIp(cfConnectingIp);
    if (valid) return valid;
  }

  return "unknown";
}

