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

export type SubsystemKey = "payments" | "eventRegistrations" | "idCardGeneration" | "whatsappBot" | "whatsappOutbound" | "messagingAutomations";

export interface SubsystemStatus {
  paused: boolean;
  reason?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface SubsystemMaintenanceConfig {
  payments: SubsystemStatus;
  eventRegistrations: SubsystemStatus;
  idCardGeneration: SubsystemStatus;
  whatsappBot: SubsystemStatus;
  whatsappOutbound: SubsystemStatus;
  messagingAutomations: SubsystemStatus;
}

export interface ScheduledDowntimeConfig {
  scheduled: boolean;
  startEpochMs: number | null;
  endEpochMs: number | null;
  showNotice24h: boolean;
  title: string;
  tamilTitle: string;
  message: string;
  tamilMessage: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface MaintenanceAuditLogEntry {
  id: string;
  action: string;
  subsystem?: string;
  adminEmail?: string;
  adminName: string;
  ip?: string;
  timestamp: string;
  details: string;
}

const REDIS_KEY_WA_LOCK = "system:whatsapp:lock_config";
const REDIS_KEY_MAINTENANCE = "system:platform:maintenance_config";
const REDIS_KEY_SUBSYSTEMS = "system:subsystems:maintenance";
const REDIS_KEY_DOWNTIME = "system:scheduled:downtime";
const REDIS_KEY_AUDIT_LOGS = "system:maintenance:audit_logs";

const CONTENT_KEY_WA_LOCK = "system.whatsapp_lock";
const CONTENT_KEY_MAINTENANCE = "system.website_maintenance";
const CONTENT_KEY_SUBSYSTEMS = "system.subsystems_maintenance";
const CONTENT_KEY_DOWNTIME = "system.scheduled_downtime";
const CONTENT_KEY_AUDIT_LOGS = "system.maintenance_audit_logs";

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

// Default Subsystem Kill-Switches: all operational (paused: false)
const DEFAULT_SUBSYSTEMS: SubsystemMaintenanceConfig = {
  payments: {
    paused: false,
    reason: "Payment & UTR verification gateway paused for scheduled ledger audit.",
    updatedAt: new Date().toISOString(),
  },
  eventRegistrations: {
    paused: false,
    reason: "Event registrations & RSVPs paused while organizers adjust venue seat quotas.",
    updatedAt: new Date().toISOString(),
  },
  idCardGeneration: {
    paused: false,
    reason: "Digital ID Card wallet generation paused for batch credential renewal.",
    updatedAt: new Date().toISOString(),
  },
  whatsappBot: {
    paused: false,
    reason: "Inbound AI Assistant paused during live event check-in peak.",
    updatedAt: new Date().toISOString(),
  },
  whatsappOutbound: {
    paused: false,
    reason: "Outbound AI Assistant & Lifecycle Router paused for routine maintenance.",
    updatedAt: new Date().toISOString(),
  },
  messagingAutomations: {
    paused: false,
    reason: "Automated WhatsApp notifications & Team Group alerts temporarily paused.",
    updatedAt: new Date().toISOString(),
  },
};

// Default Scheduled Downtime Planner: inactive
const DEFAULT_DOWNTIME: ScheduledDowntimeConfig = {
  scheduled: false,
  startEpochMs: null,
  endEpochMs: null,
  showNotice24h: true,
  title: "Scheduled System Maintenance Window",
  tamilTitle: "திட்டமிடப்பட்ட முறைமை பராமரிப்பு அறிவிப்பு",
  message: "CSC Circle will undergo scheduled platform enhancements on Sunday from 02:00 AM to 04:00 AM IST. All member profiles, digital credentials, and tickets remain safe.",
  tamilMessage: "ஞாயிறு அதிகாலை 2:00 மணி முதல் 4:00 மணி வரை பராமரிப்பு பணி நடைபெறும். உங்கள் உறுப்பினர் தரவுகள் அனைத்தும் பாதுகாப்பாக இருக்கும்.",
  updatedAt: new Date().toISOString(),
};

/**
 * In-memory fallback cache in case both Redis & Supabase are unreachable
 */
let memoryWaLock: WhatsAppLockConfig = { ...DEFAULT_WA_LOCK };
let memoryMaintenance: WebsiteMaintenanceConfig = { ...DEFAULT_MAINTENANCE };
let memorySubsystems: SubsystemMaintenanceConfig = { ...DEFAULT_SUBSYSTEMS };
let memoryDowntime: ScheduledDowntimeConfig = { ...DEFAULT_DOWNTIME };
let memoryAuditLogs: MaintenanceAuditLogEntry[] = [
  {
    id: "init-seed-1",
    action: "System Initialization",
    adminName: "Chief Technology Officer",
    adminEmail: "vikash@logicintelligencetechnologies.in",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    details: "High-impact maintenance operations suite engaged with zero-ban rate-limiting protocol.",
  },
];

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

/**
 * Subsystems Granular Kill-Switches (Feature 1)
 */
export async function getSubsystemMaintenanceConfig(): Promise<SubsystemMaintenanceConfig> {
  function normalizeSubsystems(cfg: any): SubsystemMaintenanceConfig {
    return {
      ...DEFAULT_SUBSYSTEMS,
      ...(cfg || {}),
      whatsappOutbound: cfg?.whatsappOutbound || DEFAULT_SUBSYSTEMS.whatsappOutbound,
      messagingAutomations: cfg?.messagingAutomations || DEFAULT_SUBSYSTEMS.messagingAutomations,
    };
  }

  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await withRedisTimeout(redis.get<SubsystemMaintenanceConfig>(REDIS_KEY_SUBSYSTEMS), 1000);
      if (cached && typeof cached === "object" && "payments" in cached) {
        const norm = normalizeSubsystems(cached);
        memorySubsystems = norm;
        return norm;
      }
    } catch {}
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("content_blocks")
      .select("value")
      .eq("key", CONTENT_KEY_SUBSYSTEMS)
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value) as SubsystemMaintenanceConfig;
      const norm = normalizeSubsystems(parsed);
      memorySubsystems = norm;
      if (redis) {
        try {
          await redis.set(REDIS_KEY_SUBSYSTEMS, norm, { ex: 300 });
        } catch {}
      }
      return norm;
    }
  } catch {}

  return normalizeSubsystems(memorySubsystems);
}

export async function setSubsystemMaintenanceConfig(
  updates: Partial<{ [K in SubsystemKey]?: Partial<SubsystemStatus> }>,
  adminUser?: { name: string; email?: string }
): Promise<SubsystemMaintenanceConfig> {
  const current = await getSubsystemMaintenanceConfig();
  const now = new Date().toISOString();

  const updated: SubsystemMaintenanceConfig = {
    payments: {
      ...current.payments,
      ...(updates.payments || {}),
      updatedAt: updates.payments ? now : current.payments.updatedAt,
      updatedBy: updates.payments ? adminUser?.name : current.payments.updatedBy,
    },
    eventRegistrations: {
      ...current.eventRegistrations,
      ...(updates.eventRegistrations || {}),
      updatedAt: updates.eventRegistrations ? now : current.eventRegistrations.updatedAt,
      updatedBy: updates.eventRegistrations ? adminUser?.name : current.eventRegistrations.updatedBy,
    },
    idCardGeneration: {
      ...current.idCardGeneration,
      ...(updates.idCardGeneration || {}),
      updatedAt: updates.idCardGeneration ? now : current.idCardGeneration.updatedAt,
      updatedBy: updates.idCardGeneration ? adminUser?.name : current.idCardGeneration.updatedBy,
    },
    whatsappBot: {
      ...current.whatsappBot,
      ...(updates.whatsappBot || {}),
      updatedAt: updates.whatsappBot ? now : current.whatsappBot.updatedAt,
      updatedBy: updates.whatsappBot ? adminUser?.name : current.whatsappBot.updatedBy,
    },
    whatsappOutbound: {
      ...(current.whatsappOutbound || DEFAULT_SUBSYSTEMS.whatsappOutbound),
      ...(updates.whatsappOutbound || {}),
      updatedAt: updates.whatsappOutbound ? now : current.whatsappOutbound?.updatedAt || now,
      updatedBy: updates.whatsappOutbound ? adminUser?.name : current.whatsappOutbound?.updatedBy,
    },
    messagingAutomations: {
      ...current.messagingAutomations,
      ...(updates.messagingAutomations || {}),
      updatedAt: updates.messagingAutomations ? now : current.messagingAutomations?.updatedAt || now,
      updatedBy: updates.messagingAutomations ? adminUser?.name : current.messagingAutomations?.updatedBy,
    },
  };

  memorySubsystems = updated;

  const admin = createAdminClient();
  await admin.from("content_blocks").upsert(
    {
      key: CONTENT_KEY_SUBSYSTEMS,
      label: "System: Subsystems Maintenance Kill-Switches",
      value: JSON.stringify(updated),
      status: "published",
      updated_at: now,
      updated_by: adminUser?.name || null,
    },
    { onConflict: "key" }
  );

  const redis = getRedisClient();
  if (redis) {
    try {
      await withRedisTimeout(redis.set(REDIS_KEY_SUBSYSTEMS, updated, { ex: 86400 }), 1000);
    } catch {}
  }

  return updated;
}

/**
 * Scheduled Downtime Planner (Feature 3)
 */
export async function getScheduledDowntimeConfig(): Promise<ScheduledDowntimeConfig> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await withRedisTimeout(redis.get<ScheduledDowntimeConfig>(REDIS_KEY_DOWNTIME), 1000);
      if (cached && typeof cached === "object" && "scheduled" in cached) {
        memoryDowntime = cached;
        return cached;
      }
    } catch {}
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("content_blocks")
      .select("value")
      .eq("key", CONTENT_KEY_DOWNTIME)
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value) as ScheduledDowntimeConfig;
      memoryDowntime = parsed;
      if (redis) {
        try {
          await redis.set(REDIS_KEY_DOWNTIME, parsed, { ex: 300 });
        } catch {}
      }
      return parsed;
    }
  } catch {}

  return memoryDowntime;
}

export async function setScheduledDowntimeConfig(
  config: Partial<ScheduledDowntimeConfig> & { updatedBy?: string }
): Promise<ScheduledDowntimeConfig> {
  const current = await getScheduledDowntimeConfig();
  const updated: ScheduledDowntimeConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  };

  memoryDowntime = updated;

  const admin = createAdminClient();
  await admin.from("content_blocks").upsert(
    {
      key: CONTENT_KEY_DOWNTIME,
      label: "System: Scheduled Platform Downtime Planner",
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
      await withRedisTimeout(redis.set(REDIS_KEY_DOWNTIME, updated, { ex: 86400 }), 1000);
    } catch {}
  }

  return updated;
}

/**
 * Maintenance Audit Trail & Incident Logs (Feature 5)
 */
export async function getMaintenanceAuditLogs(): Promise<MaintenanceAuditLogEntry[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("content_blocks")
      .select("value")
      .eq("key", CONTENT_KEY_AUDIT_LOGS)
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value) as MaintenanceAuditLogEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryAuditLogs = parsed;
        return parsed;
      }
    }
  } catch {}

  return memoryAuditLogs;
}

export async function recordMaintenanceAuditLog(
  entry: Omit<MaintenanceAuditLogEntry, "id" | "timestamp">
): Promise<MaintenanceAuditLogEntry> {
  const current = await getMaintenanceAuditLogs();
  const newEntry: MaintenanceAuditLogEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  // Keep last 100 entries
  const updated = [newEntry, ...current].slice(0, 100);
  memoryAuditLogs = updated;

  try {
    const admin = createAdminClient();
    await admin.from("content_blocks").upsert(
      {
        key: CONTENT_KEY_AUDIT_LOGS,
        label: "System: Platform Maintenance Audit Logs",
        value: JSON.stringify(updated),
        status: "published",
        updated_at: new Date().toISOString(),
        updated_by: entry.adminName || null,
      },
      { onConflict: "key" }
    );
  } catch {}

  return newEntry;
}
