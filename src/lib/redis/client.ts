import "server-only";

import { Redis } from "@upstash/redis";
import { redisRestConfig } from "./config";

/**
 * Server-only Upstash Redis client.
 *
 * - Explicit `new Redis({ url, token })` from CSC_KV_REST_API_URL/TOKEN
 *   (never `fromEnv`, never the TCP URL, never the read-only token).
 * - Lazy singleton: zero network I/O at import; `null` when vars are missing.
 * - Every helper is bounded (timeout) and never throws for missing config.
 */

/** Minimal surface used by this codebase; also the seam for test doubles. */
export interface RedisCommands {
  ping(): Promise<string>;
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ex?: number; nx?: boolean }): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>;
  scan(cursor: number, options?: { match?: string; count?: number }): Promise<[number, string[]]>;
}

export type TypedRedis = Pick<
  Redis,
  "ping" | "get" | "set" | "del" | "incr" | "expire" | "ttl" | "eval" | "scan"
>;

/** Default per-command bound so Redis can never hang a request. */
export const REDIS_COMMAND_TIMEOUT_MS = 2_000;

let singleton: TypedRedis | RedisCommands | null | undefined;
let testDouble: RedisCommands | null = null;

function createClient(): TypedRedis | null {
  const config = redisRestConfig();
  if (!config) return null;
  return new Redis({ url: config.url, token: config.token });
}

/** Lazy singleton. Returns `null` when credentials are not configured. */
export function getRedisClient(): TypedRedis | RedisCommands | null {
  if (testDouble) return testDouble;
  if (singleton === undefined) singleton = createClient();
  return singleton;
}

export function isRedisConfigured(): boolean {
  return getRedisClient() !== null;
}

/** Test seam: inject an in-memory double. Never used in production code. */
export function __setRedisTestDouble(double: RedisCommands | null): void {
  testDouble = double;
  singleton = undefined;
}

/** Test seam: drop the cached singleton so env changes take effect. */
export function __resetRedisClientForTests(): void {
  testDouble = null;
  singleton = undefined;
}

export async function withRedisTimeout<T>(work: Promise<T>, timeoutMs = REDIS_COMMAND_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Redis command timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* --- Recent-error ring for admin diagnostics (no keys, no values) --- */

export interface RedisErrorSample {
  at: string;
  operation: string;
  message: string;
}

const recentErrors: RedisErrorSample[] = [];
const MAX_RECENT_ERRORS = 20;

export function recordRedisError(operation: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  recentErrors.unshift({
    at: new Date().toISOString(),
    operation,
    message: message.slice(0, 200),
  });
  if (recentErrors.length > MAX_RECENT_ERRORS) recentErrors.length = MAX_RECENT_ERRORS;
}

export function getRecentRedisErrors(): RedisErrorSample[] {
  return [...recentErrors];
}

export function __clearRedisErrorsForTests(): void {
  recentErrors.length = 0;
}
