import type { Redis } from "ioredis";
import { getSupabase } from "./live-queries.js";
import { logger } from "../utils/logger.js";

export interface WhatsAppLockStatus {
  isLocked: boolean;
  unlockEpochMs: number;
  reason?: string;
  tamilReason?: string;
}

const REDIS_KEY_WA_LOCK = "system:whatsapp:lock_config";
const CONTENT_KEY_WA_LOCK = "system.whatsapp_lock";
const HARDCODED_FALLBACK_EPOCH = 1795562700000; // Nov 25, 2026, 04:55 AM IST

let cachedLock: WhatsAppLockStatus = {
  isLocked: Date.now() < HARDCODED_FALLBACK_EPOCH,
  unlockEpochMs: HARDCODED_FALLBACK_EPOCH,
};
let lastFetchTime = 0;

/**
 * Checks whether WhatsApp services are locked dynamically from Redis or Supabase.
 * Caches in memory for 10 seconds to avoid query amplification.
 */
export async function checkWhatsAppLockStatus(redis: Redis | null = null): Promise<WhatsAppLockStatus> {
  const now = Date.now();
  if (now - lastFetchTime < 10000) {
    return {
      ...cachedLock,
      isLocked: cachedLock.isLocked && now < cachedLock.unlockEpochMs,
    };
  }

  // 1. Check Redis if available
  if (redis) {
    try {
      const raw = await redis.get(REDIS_KEY_WA_LOCK);
      if (raw) {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        const unlockEpoch = Number(parsed.unlockEpochMs) || HARDCODED_FALLBACK_EPOCH;
        const locked = Boolean(parsed.locked) && now < unlockEpoch;
        cachedLock = {
          isLocked: locked,
          unlockEpochMs: unlockEpoch,
          reason: parsed.reason,
          tamilReason: parsed.tamilReason,
        };
        lastFetchTime = now;
        return cachedLock;
      }
    } catch (e) {
      logger.error("Redis error fetching WhatsApp lock config", { error: e });
    }
  }

  // 2. Check Supabase content_blocks
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from("content_blocks")
      .select("value")
      .eq("key", CONTENT_KEY_WA_LOCK)
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      const unlockEpoch = Number(parsed.unlockEpochMs) || HARDCODED_FALLBACK_EPOCH;
      const locked = Boolean(parsed.locked) && now < unlockEpoch;
      cachedLock = {
        isLocked: locked,
        unlockEpochMs: unlockEpoch,
        reason: parsed.reason,
        tamilReason: parsed.tamilReason,
      };
      lastFetchTime = now;
      return cachedLock;
    }
  } catch (e) {
    logger.error("Supabase error fetching WhatsApp lock config", { error: e });
  }

  // 3. Fallback to hardcoded epoch
  const fallbackLocked = now < HARDCODED_FALLBACK_EPOCH;
  cachedLock = {
    isLocked: fallbackLocked,
    unlockEpochMs: HARDCODED_FALLBACK_EPOCH,
  };
  lastFetchTime = now;
  return cachedLock;
}
