import { createAdminClient } from "@/lib/supabase/admin";
import { getRedisClient, withRedisTimeout } from "@/lib/redis/client";

export interface WhatsAppLockConfig {
  locked: boolean;
  unlockEpochMs: number;
  reason?: string;
  tamilReason?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface WebsiteMaintenanceConfig {
  enabled: boolean;
  unlockEpochMs: number | null; // null means indefinitely until manually toggled off
  title: string;
  tamilTitle: string;
  message: string;
  tamilMessage: string;
  contactEmail: string;
  allowAdminBypass: boolean;
  updatedAt: string;
  updatedBy?: string;
}

const REDIS_KEY_WA_LOCK = "system:whatsapp:lock_config";
const REDIS_KEY_MAINTENANCE = "system:platform:maintenance_config";
const CONTENT_KEY_WA_LOCK = "system.whatsapp_lock";
const CONTENT_KEY_MAINTENANCE = "system.website_maintenance";

// Default WhatsApp Lock settings: 24h maintenance cooldown
const DEFAULT_WA_LOCK: WhatsAppLockConfig = {
  locked: true,
  // Nov 25, 2026, 04:55 AM IST
  unlockEpochMs: 1795562700000,
  reason: "Scheduled 24-hour maintenance & rate limit cooldown",
  tamilReason: "WhatsApp சேவைகள் பராமரிப்பில் உள்ளன (24 மணி நேரம்)",
  updatedAt: new Date().toISOString(),
};

// Default Website Maintenance settings: disabled
const DEFAULT_MAINTENANCE: WebsiteMaintenanceConfig = {
  enabled: false,
  unlockEpochMs: null,
  title: "We will be right back!",
  tamilTitle: "விரைவில் மீண்டும் வருகிறோம்!",
  message: "Coimbatore Startup Community platform is undergoing scheduled enhancements to serve our founder network better. We will be back online shortly.",
  tamilMessage: "எங்கள் நிறுவனர் தளத்தை மேலும் மேம்படுத்த தளம் தற்போது பராமரிப்பில் உள்ளது. விரைவில் மீண்டும் இயங்கும்.",
  contactEmail: "coimbatorestartupcommunity@gmail.com",
  allowAdminBypass: true,
  updatedAt: new Date().toISOString(),
};

/**
 * In-memory fallback cache in case both Redis & Supabase are unreachable
 */
let memoryWaLock: WhatsAppLockConfig = { ...DEFAULT_WA_LOCK };
let memoryMaintenance: WebsiteMaintenanceConfig = { ...DEFAULT_MAINTENANCE };

export async function getWhatsAppLockConfig(): Promise<WhatsAppLockConfig> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await withRedisTimeout(redis.get<WhatsAppLockConfig>(REDIS_KEY_WA_LOCK), 1000);
      if (cached && typeof cached === "object" && "locked" in cached) {
        memoryWaLock = cached;
        return cached;
      }
    } catch {
      // Redis missed/failed, fallback to Supabase
    }
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("content_blocks")
      .select("value")
      .eq("key", CONTENT_KEY_WA_LOCK)
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value) as WhatsAppLockConfig;
      memoryWaLock = parsed;
      // Populate Redis in background
      if (redis) {
        try {
          await redis.set(REDIS_KEY_WA_LOCK, parsed, { ex: 300 });
        } catch {}
      }
      return parsed;
    }
  } catch {
    // Supabase unreachable, fallback to memory
  }

  return memoryWaLock;
}

export async function setWhatsAppLockConfig(
  config: Partial<WhatsAppLockConfig> & { updatedBy?: string }
): Promise<WhatsAppLockConfig> {
  const current = await getWhatsAppLockConfig();
  const updated: WhatsAppLockConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  };

  memoryWaLock = updated;

  // Persist in Supabase content_blocks
  const admin = createAdminClient();
  await admin.from("content_blocks").upsert(
    {
      key: CONTENT_KEY_WA_LOCK,
      label: "System: WhatsApp Gateway Lock Configuration",
      value: JSON.stringify(updated),
      status: "published",
      updated_at: new Date().toISOString(),
      updated_by: config.updatedBy || null,
    },
    { onConflict: "key" }
  );

  // Update Redis
  const redis = getRedisClient();
  if (redis) {
    try {
      await withRedisTimeout(redis.set(REDIS_KEY_WA_LOCK, updated, { ex: 86400 }), 1000);
    } catch {}
  }

  return updated;
}

export async function getWebsiteMaintenanceConfig(): Promise<WebsiteMaintenanceConfig> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await withRedisTimeout(redis.get<WebsiteMaintenanceConfig>(REDIS_KEY_MAINTENANCE), 1000);
      if (cached && typeof cached === "object" && "enabled" in cached) {
        memoryMaintenance = cached;
        return cached;
      }
    } catch {}
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("content_blocks")
      .select("value")
      .eq("key", CONTENT_KEY_MAINTENANCE)
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value) as WebsiteMaintenanceConfig;
      memoryMaintenance = parsed;
      if (redis) {
        try {
          await redis.set(REDIS_KEY_MAINTENANCE, parsed, { ex: 300 });
        } catch {}
      }
      return parsed;
    }
  } catch {}

  return memoryMaintenance;
}

export async function setWebsiteMaintenanceConfig(
  config: Partial<WebsiteMaintenanceConfig> & { updatedBy?: string }
): Promise<WebsiteMaintenanceConfig> {
  const current = await getWebsiteMaintenanceConfig();
  const updated: WebsiteMaintenanceConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  };

  memoryMaintenance = updated;

  const admin = createAdminClient();
  await admin.from("content_blocks").upsert(
    {
      key: CONTENT_KEY_MAINTENANCE,
      label: "System: Global Website Maintenance Configuration",
      value: JSON.stringify(updated),
      status: "published",
      updated_at: new Date().toISOString(),
      updated_by: config.updatedBy || null,
    },
    { onConflict: "key" }
  );

  const redis = getRedisClient();
  if (redis) {
    try {
      await withRedisTimeout(redis.set(REDIS_KEY_MAINTENANCE, updated, { ex: 86400 }), 1000);
    } catch {}
  }

  return updated;
}
