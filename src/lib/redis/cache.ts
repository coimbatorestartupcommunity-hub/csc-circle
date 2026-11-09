import "server-only";

import {
  getRedisClient,
  recordRedisError,
  withRedisTimeout,
  type RedisCommands,
  type TypedRedis,
} from "./client";
import {
  REDIS_TTL,
  clampContentTtl,
  isRedisCacheEnabled,
  publicCacheKey,
  type PublicCacheFeature,
} from "./config";

/**
 * Read-through cache for PUBLISHED public content only.
 *
 * - Supabase stays authoritative; Redis is a 30-120s shared layer.
 * - NEVER caches member PII, exports, PDFs, or secrets (callers pass only
 *   published projections; single-record reads re-verify published status).
 * - Any Redis failure falls back to the loader; cache never breaks the page.
 */

interface CacheEnvelope<T> {
  v: 1;
  storedAt: string;
  data: T;
}

/** Single-instance stampede guard: concurrent misses for one key share a load. */
const inflight = new Map<string, Promise<unknown>>();

export function __clearCacheInflightForTests(): void {
  inflight.clear();
}

type PublishedLike = { status?: unknown; publication_status?: unknown };

function isPublishedRecord(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const status =
    (value as PublishedLike).status ?? (value as PublishedLike).publication_status;
  return status === "published";
}

/** Lists may only surface published rows; singles must be published. */
function sanitizeCached<T>(data: T, guard: (value: unknown) => boolean): T | null {
  if (Array.isArray(data)) {
    return data.filter(guard) as unknown as T;
  }
  return guard(data) ? data : null;
}

function sanitizeFresh<T>(data: T, guard: (value: unknown) => boolean): T | null {
  if (data === null || data === undefined) return null;
  return sanitizeCached(data, guard);
}

/**
 * Per-feature publication guard. Collaborations carry a lifecycle status
 * (upcoming/ongoing/completed) rather than a publication flag, so their query
 * (`publication_status = published`) plus mutation invalidation is the gate.
 */
function guardFor(feature: PublicCacheFeature): (value: unknown) => boolean {
  if (feature === "collaborations") return (value) => value !== null && typeof value === "object";
  return isPublishedRecord;
}

export interface CachedPublicOptions {
  ttlSeconds?: number;
}

export async function cachedPublic<T>(
  feature: PublicCacheFeature,
  id: string,
  loader: () => Promise<T>,
  options: CachedPublicOptions = {},
): Promise<T> {
  if (!isRedisCacheEnabled()) return loader();
  const client = getRedisClient() as TypedRedis | RedisCommands | null;
  if (!client) return loader();

  let key: string;
  try {
    key = publicCacheKey(feature, id);
  } catch (error) {
    recordRedisError(`cache:${feature}:key`, error);
    return loader();
  }

  const guard = guardFor(feature);
  try {
    const raw = await withRedisTimeout(Promise.resolve(client.get<string | CacheEnvelope<T>>(key)));
    let envelope: CacheEnvelope<T> | null = null;
    if (typeof raw === "string" && raw.length > 0) {
      try {
        envelope = JSON.parse(raw) as CacheEnvelope<T>;
      } catch {
        envelope = null; // Corrupt entry: fall through to reload.
      }
    } else if (raw && typeof raw === "object") {
      envelope = raw; // Client already deserialized the envelope.
    }
    if (envelope && envelope.v === 1) {
      const clean = sanitizeCached(envelope.data, guard);
      if (clean !== null) return clean;
    }
  } catch (error) {
    recordRedisError(`cache:${feature}:read`, error);
    return loader();
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const load = (async (): Promise<T> => {
    const fresh = await loader();
    const clean = sanitizeFresh(fresh, guard);
    if (clean === null) {
      // Never cache nulls or unpublished records; still return the fresh value.
      return fresh;
    }
    const envelope: CacheEnvelope<T> = { v: 1, storedAt: new Date().toISOString(), data: clean };
    try {
      await withRedisTimeout(
        Promise.resolve(
          client.set(key, JSON.stringify(envelope), { ex: clampContentTtl(options.ttlSeconds ?? REDIS_TTL.contentSeconds) }),
        ),
      );
    } catch (error) {
      recordRedisError(`cache:${feature}:write`, error);
    }
    return fresh;
  })();

  inflight.set(key, load);
  try {
    return await load;
  } finally {
    if (inflight.get(key) === load) inflight.delete(key);
  }
}

export interface InvalidateResult {
  attempted: boolean;
  deleted: number;
}

/**
 * Invalidate cached public content. Called next to existing
 * revalidateTag/revalidatePath points on create/edit/publish/unpublish/archive.
 * Best-effort: failures are recorded for diagnostics, never thrown.
 */
export async function invalidatePublicContent(
  feature: PublicCacheFeature,
  ids: string[] = ["list"],
): Promise<InvalidateResult> {
  if (!isRedisCacheEnabled()) return { attempted: false, deleted: 0 };
  const client = getRedisClient() as TypedRedis | RedisCommands | null;
  if (!client) return { attempted: false, deleted: 0 };
  const keys: string[] = [];
  for (const id of new Set(["list", ...ids])) {
    try {
      keys.push(publicCacheKey(feature, id));
    } catch (error) {
      recordRedisError(`cache:${feature}:invalidate-key`, error);
    }
  }
  if (keys.length === 0) return { attempted: true, deleted: 0 };
  try {
    const deleted = await withRedisTimeout(Promise.resolve(client.del(...keys)));
    return { attempted: true, deleted: typeof deleted === "number" ? deleted : 0 };
  } catch (error) {
    recordRedisError(`cache:${feature}:invalidate`, error);
    return { attempted: true, deleted: 0 };
  }
}
