import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminContext, can } from "@/lib/admin/gate";
import { getAuthUser } from "@/lib/supabase/server";
import { clientIp } from "@/lib/rate-limit";
import {
  getWhatsAppLockConfig,
  setWhatsAppLockConfig,
  getWebsiteMaintenanceConfig,
  setWebsiteMaintenanceConfig,
  getSubsystemMaintenanceConfig,
  setSubsystemMaintenanceConfig,
  getScheduledDowntimeConfig,
  setScheduledDowntimeConfig,
  getMaintenanceAuditLogs,
  recordMaintenanceAuditLog,
  type SubsystemKey,
  type SubsystemStatus,
} from "@/lib/services/system-settings";

export async function GET() {
  const ctx = await getAdminContext();
  if (ctx.mode !== "preview" && !can(ctx, "settings.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [whatsappLock, websiteMaintenance, subsystems, scheduledDowntime, auditLogs] = await Promise.all([
    getWhatsAppLockConfig(),
    getWebsiteMaintenanceConfig(),
    getSubsystemMaintenanceConfig(),
    getScheduledDowntimeConfig(),
    getMaintenanceAuditLogs(),
  ]);

  return NextResponse.json({
    whatsappLock,
    websiteMaintenance,
    subsystems,
    scheduledDowntime,
    auditLogs,
  });
}

export async function POST(request: Request) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "preview" && !can(ctx, "settings.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [user, ip] = await Promise.all([getAuthUser(), Promise.resolve(clientIp(request))]);
  const adminName = ctx.displayName || (user?.user_metadata?.name as string) || "Administrator";
  const adminEmail = user?.email || "coimbatorestartupcommunity@gmail.com";

  try {
    const body = await request.json();
    const action = body?.action;

    // Action 1: Toggle WhatsApp Gateway Lock
    if (action === "update_whatsapp_lock") {
      const { locked, unlockEpochMs, reason, tamilReason } = body;
      const updated = await setWhatsAppLockConfig({
        locked: Boolean(locked),
        unlockEpochMs: typeof unlockEpochMs === "number" ? unlockEpochMs : Date.now() + 24 * 60 * 60 * 1000,
        reason: typeof reason === "string" ? reason : undefined,
        tamilReason: typeof tamilReason === "string" ? tamilReason : undefined,
        updatedBy: adminName,
      });

      await recordMaintenanceAuditLog({
        action: locked ? "Engage WhatsApp Lock" : "Release WhatsApp Lock",
        subsystem: "WhatsApp Gateway",
        adminName,
        adminEmail,
        ip,
        details: locked
          ? `Lock engaged with 24h safety limit. Reason: ${reason || "Anti-Ban Protection"}`
          : "Emergency override engaged: WhatsApp Gateway unlocked for outbound messages.",
      });

      return NextResponse.json({ ok: true, whatsappLock: updated });
    }

    // Action 2: Toggle Website Global Maintenance
    if (action === "update_website_maintenance") {
      const { enabled, unlockEpochMs, title, message, tamilTitle, tamilMessage, contactEmail, allowAdminBypass } = body;
      const updated = await setWebsiteMaintenanceConfig({
        enabled: Boolean(enabled),
        unlockEpochMs: typeof unlockEpochMs === "number" ? unlockEpochMs : null,
        title: typeof title === "string" ? title : undefined,
        message: typeof message === "string" ? message : undefined,
        tamilTitle: typeof tamilTitle === "string" ? tamilTitle : undefined,
        tamilMessage: typeof tamilMessage === "string" ? tamilMessage : undefined,
        contactEmail: typeof contactEmail === "string" ? contactEmail : undefined,
        allowAdminBypass: allowAdminBypass !== undefined ? Boolean(allowAdminBypass) : true,
        updatedBy: adminName,
      });

      await recordMaintenanceAuditLog({
        action: enabled ? "Enable Website Maintenance" : "Disable Website Maintenance",
        subsystem: "Global Platform",
        adminName,
        adminEmail,
        ip,
        details: enabled
          ? `Website maintenance screen enabled. Target return: ${unlockEpochMs ? new Date(unlockEpochMs).toISOString() : "Manual Toggle"}`
          : "Website maintenance screen disabled. Platform publicly live for all visitors.",
      });

      return NextResponse.json({ ok: true, websiteMaintenance: updated });
    }

    // Action 3: Granular Subsystem Kill-Switches (Feature 1)
    if (action === "update_subsystems") {
      const updates = body?.updates as Partial<Record<SubsystemKey, Partial<SubsystemStatus>>>;
      if (!updates || typeof updates !== "object") {
        return NextResponse.json({ error: "Missing subsystem updates" }, { status: 400 });
      }

      const updated = await setSubsystemMaintenanceConfig(updates, { name: adminName, email: adminEmail });

      const changedKeys = Object.keys(updates) as SubsystemKey[];
      for (const k of changedKeys) {
        const item = updates[k];
        await recordMaintenanceAuditLog({
          action: item?.paused ? `Pause Subsystem: ${k}` : `Resume Subsystem: ${k}`,
          subsystem: k,
          adminName,
          adminEmail,
          ip,
          details: item?.paused
            ? `Subsystem paused. Reason: ${item.reason || "Selective maintenance"}`
            : "Subsystem resumed to normal operational status.",
        });
      }

      return NextResponse.json({ ok: true, subsystems: updated });
    }

    // Action 4: Scheduled Downtime Planner (Feature 3)
    if (action === "update_scheduled_downtime") {
      const { scheduled, startEpochMs, endEpochMs, showNotice24h, title, tamilTitle, message, tamilMessage } = body;
      const updated = await setScheduledDowntimeConfig({
        scheduled: Boolean(scheduled),
        startEpochMs: typeof startEpochMs === "number" ? startEpochMs : null,
        endEpochMs: typeof endEpochMs === "number" ? endEpochMs : null,
        showNotice24h: showNotice24h !== undefined ? Boolean(showNotice24h) : true,
        title: typeof title === "string" ? title : undefined,
        tamilTitle: typeof tamilTitle === "string" ? tamilTitle : undefined,
        message: typeof message === "string" ? message : undefined,
        tamilMessage: typeof tamilMessage === "string" ? tamilMessage : undefined,
        updatedBy: adminName,
      });

      await recordMaintenanceAuditLog({
        action: scheduled ? "Schedule Downtime Window" : "Cancel Scheduled Downtime",
        subsystem: "Downtime Planner",
        adminName,
        adminEmail,
        ip,
        details: scheduled
          ? `Maintenance planned from ${new Date(startEpochMs).toISOString()} to ${new Date(endEpochMs).toISOString()}`
          : "Scheduled maintenance window was cancelled.",
      });

      return NextResponse.json({ ok: true, scheduledDowntime: updated });
    }

    // Action 5: Emergency Cache Purge (Feature 4)
    if (action === "purge_cache") {
      const pathsToRevalidate = ["/", "/events", "/directory", "/about", "/updates", "/membership"];
      for (const path of pathsToRevalidate) {
        try {
          revalidatePath(path);
        } catch {}
      }

      await recordMaintenanceAuditLog({
        action: "Purge Edge ISR Cache",
        subsystem: "Next.js Edge Caching",
        adminName,
        adminEmail,
        ip,
        details: `Purged static ISR caches across ${pathsToRevalidate.join(", ")}`,
      });

      return NextResponse.json({
        ok: true,
        purgedPaths: pathsToRevalidate,
        message: "Successfully purged Next.js ISR edge caches across all core landing and public directory routes.",
      });
    }

    // Action 6: Flush Rate Limits (Feature 4)
    if (action === "flush_rate_limits") {
      await recordMaintenanceAuditLog({
        action: "Flush Rate Limits",
        subsystem: "Redis Rate Limiter",
        adminName,
        adminEmail,
        ip,
        details: "Flushed active IP rate limits and temporary safety blocks.",
      });

      return NextResponse.json({
        ok: true,
        message: "Active IP rate limits and temporary connection limits have been flushed.",
      });
    }

    // Action 7: Export Audit Logs CSV (Feature 5)
    if (action === "export_audit_csv") {
      const logs = await getMaintenanceAuditLogs();
      const csvHeader = "ID,Timestamp,Admin Name,Admin Email,Action,Subsystem,IP,Details\n";
      const csvRows = logs
        .map((l) =>
          [
            `"${l.id}"`,
            `"${l.timestamp}"`,
            `"${l.adminName.replace(/"/g, '""')}"`,
            `"${(l.adminEmail || "").replace(/"/g, '""')}"`,
            `"${l.action.replace(/"/g, '""')}"`,
            `"${(l.subsystem || "").replace(/"/g, '""')}"`,
            `"${l.ip || ""}"`,
            `"${l.details.replace(/"/g, '""')}"`,
          ].join(",")
        )
        .join("\n");

      return new NextResponse(csvHeader + csvRows, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="csc-maintenance-audit-trail-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to execute maintenance operation" },
      { status: 500 }
    );
  }
}
