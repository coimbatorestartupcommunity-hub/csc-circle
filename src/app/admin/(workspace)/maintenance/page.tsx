import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminPagePermission } from "@/lib/admin/gate";
import {
  getWebsiteMaintenanceConfig,
  getWhatsAppLockConfig,
  getSubsystemMaintenanceConfig,
  getScheduledDowntimeConfig,
  getMaintenanceAuditLogs,
} from "@/lib/services/system-settings";
import { WebsiteMaintenanceControl } from "@/components/admin/maintenance/website-maintenance-control";
import { WhatsAppLockControl } from "@/components/admin/whatsapp/whatsapp-lock-control";
import { SubsystemsKillSwitchControl } from "@/components/admin/maintenance/subsystems-kill-switch-control";
import { InfrastructureHealthMonitor } from "@/components/admin/maintenance/infrastructure-health-monitor";
import { ScheduledDowntimePlanner } from "@/components/admin/maintenance/scheduled-downtime-planner";
import { MaintenanceAuditAndCacheOps } from "@/components/admin/maintenance/maintenance-audit-and-cache-ops";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Radio, Layers, Activity, CalendarCheck, FileText } from "lucide-react";

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
    <div className="space-y-8 pb-12 w-full max-w-full overflow-x-hidden min-w-0">
      <AdminPageHeader
        title="Operations &amp; Maintenance Command Center"
        description="Comprehensive operations suite: Manage global downtime screens, toggle granular subsystem kill-switches, audit live infrastructure health, plan scheduled downtime windows, and inspect immutable audit logs."
        isDemo={ctx.mode === "preview"}
      />

      <Tabs defaultValue="subsystems" className="w-full space-y-6 min-w-0">
        {/* Precision 3 + 3 Operational Action Grid (Zero Horizontal Scroll Across All Devices) */}
        <div className="w-full">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-xl w-full grid grid-cols-3 gap-1.5 sm:gap-2 h-auto border border-zinc-200 dark:border-zinc-800/80">
            <TabsTrigger value="subsystems" className="gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold py-2.5 px-1 sm:px-2 w-full justify-center text-center">
              <Layers className="size-3.5 shrink-0 hidden xs:inline" />
              <span className="truncate">Kill-Switches</span>
            </TabsTrigger>

            <TabsTrigger value="website" className="gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold py-2.5 px-1 sm:px-2 w-full justify-center text-center">
              <Globe className="size-3.5 shrink-0 hidden xs:inline" />
              <span className="truncate">Global Screen</span>
            </TabsTrigger>

            <TabsTrigger value="health" className="gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold py-2.5 px-1 sm:px-2 w-full justify-center text-center">
              <Activity className="size-3.5 shrink-0 hidden xs:inline" />
              <span className="truncate">Service Health</span>
            </TabsTrigger>

            <TabsTrigger value="planner" className="gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold py-2.5 px-1 sm:px-2 w-full justify-center text-center">
              <CalendarCheck className="size-3.5 shrink-0 hidden xs:inline" />
              <span className="truncate">Downtime Plan</span>
            </TabsTrigger>

            <TabsTrigger value="whatsapp" className="gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold py-2.5 px-1 sm:px-2 w-full justify-center text-center">
              <Radio className="size-3.5 shrink-0 hidden xs:inline" />
              <span className="truncate">WhatsApp Lock</span>
            </TabsTrigger>

            <TabsTrigger value="audit" className="gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold py-2.5 px-1 sm:px-2 w-full justify-center text-center">
              <FileText className="size-3.5 shrink-0 hidden xs:inline" />
              <span className="truncate">Audit &amp; Ops</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Feature 1: Granular Subsystem Kill-Switches */}
        <TabsContent value="subsystems" className="space-y-4 min-w-0">
          <SubsystemsKillSwitchControl initialConfig={subsystemsConfig} />
        </TabsContent>

        {/* Feature 0: Global Website Maintenance Screen */}
        <TabsContent value="website" className="space-y-4 min-w-0">
          <WebsiteMaintenanceControl initialConfig={websiteConfig} />
        </TabsContent>

        {/* Feature 2: Real-time Infrastructure & Health Monitor */}
        <TabsContent value="health" className="space-y-4 min-w-0">
          <InfrastructureHealthMonitor />
        </TabsContent>

        {/* Feature 3: Scheduled Downtime Planner */}
        <TabsContent value="planner" className="space-y-4 min-w-0">
          <ScheduledDowntimePlanner initialConfig={downtimeConfig} />
        </TabsContent>

        {/* Feature: WhatsApp Gateway Lock */}
        <TabsContent value="whatsapp" className="space-y-4 min-w-0">
          <WhatsAppLockControl initialConfig={waConfig} />
        </TabsContent>

        {/* Feature 4 & 5: Maintenance Audit Trail & Emergency Cache Ops */}
        <TabsContent value="audit" className="space-y-4 min-w-0">
          <MaintenanceAuditAndCacheOps initialLogs={auditLogs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
