import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminPagePermission } from "@/lib/admin/gate";
import {
  getWebsiteMaintenanceConfig,
  getWhatsAppLockConfig,
  getSubsystemMaintenanceConfig,
  getScheduledDowntimeConfig,
  getMaintenanceAuditLogs,
} from "@/lib/services/system-settings";
import { MaintenanceCommandCenter } from "@/components/admin/maintenance/maintenance-command-center";

export const metadata = { title: "Operations & Maintenance Command Center" };

export default async function AdminMaintenancePage() {
  const ctx = await requireAdminPagePermission("settings.manage");

  const [websiteConfig, waConfig, subsystemsConfig, downtimeConfig, auditLogs] = await Promise.all([
    getWebsiteMaintenanceConfig(),
    getWhatsAppLockConfig(),
    getSubsystemMaintenanceConfig(),
    getScheduledDowntimeConfig(),
    getMaintenanceAuditLogs(),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 w-full max-w-full overflow-x-hidden min-w-0">
      <AdminPageHeader
        title="Operations &amp; Maintenance Command Center"
        description="Comprehensive operations suite: Manage global downtime screens, toggle granular subsystem kill-switches, audit live infrastructure health, plan scheduled downtime windows, and inspect immutable audit logs."
        isDemo={ctx.mode === "preview"}
      />

      <MaintenanceCommandCenter
        websiteConfig={websiteConfig}
        waConfig={waConfig}
        subsystemsConfig={subsystemsConfig}
        downtimeConfig={downtimeConfig}
        auditLogs={auditLogs}
      />
    </div>
  );
}
