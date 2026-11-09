import "server-only";

import { randomUUID } from "node:crypto";
import {
  getRedisClient,
  recordRedisError,
  withRedisTimeout,
  type RedisCommands,
  type TypedRedis,
} from "./client";
import { REDIS_TTL, isRedisEnabled, lockKey } from "./config";

/**
 * Atomic distributed locks with ownership tokens.
 *
 * - Acquire: SET key token NX EX (atomic).
 * - Release: Lua compare-and-delete — only the owner deletes.
 * - Always bounded; lock TTL auto-releases crashed holders.
 */

export interface AcquiredLock {
  key: string;
  token: string;
}

const COMPARE_DELETE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export async function acquireLock(name: string, ttlSeconds = REDIS_TTL.lockSeconds): Promise<AcquiredLock | null> {
  if (!isRedisEnabled()) return null;
  const client = getRedisClient() as TypedRedis | RedisCommands | null;
  if (!client) return null;
  let key: string;
  try {
    key = lockKey(name);
  } catch (error) {
    recordRedisError("lock:key", error);
    return null;
  }
  const token = randomUUID();
  const ttl = Math.max(1, Math.min(300, Math.floor(ttlSeconds) || REDIS_TTL.lockSeconds));
  try {
    const result = await withRedisTimeout(Promise.resolve(client.set(key, token, { nx: true, ex: ttl })));
    // Upstash REST returns "OK" on set, null when NX blocks.
    if (result === null || result === undefined) return null;
    return { key, token };
  } catch (error) {
    recordRedisError("lock:acquire", error);
    return null;
  }
}

export async function releaseLock(lock: AcquiredLock): Promise<boolean> {
  if (!isRedisEnabled()) return false;
  const client = getRedisClient() as TypedRedis | RedisCommands | null;
  if (!client) return false;
  try {
    const result = await withRedisTimeout(
      Promise.resolve(client.eval(COMPARE_DELETE_SCRIPT, [lock.key], [lock.token])),
    );
    return Number(result) === 1;
  } catch (error) {
    recordRedisError("lock:release", error);
    return false;
  }
}
