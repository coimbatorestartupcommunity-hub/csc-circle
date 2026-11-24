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
        {/* Responsive Tabs Navigation Bar */}
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-1 min-w-[560px] sm:min-w-0">
            <TabsTrigger value="subsystems" className="gap-1.5 text-xs font-semibold px-2.5 py-2.5 w-full justify-center">
              <Layers className="size-3.5 shrink-0" />
              <span>Kill-Switches</span>
            </TabsTrigger>

            <TabsTrigger value="website" className="gap-1.5 text-xs font-semibold px-2.5 py-2.5 w-full justify-center">
              <Globe className="size-3.5 shrink-0" />
              <span>Global Screen</span>
            </TabsTrigger>

            <TabsTrigger value="health" className="gap-1.5 text-xs font-semibold px-2.5 py-2.5 w-full justify-center">
              <Activity className="size-3.5 shrink-0" />
              <span>Service Health</span>
            </TabsTrigger>

            <TabsTrigger value="planner" className="gap-1.5 text-xs font-semibold px-2.5 py-2.5 w-full justify-center">
              <CalendarCheck className="size-3.5 shrink-0" />
              <span>Downtime Plan</span>
            </TabsTrigger>

            <TabsTrigger value="whatsapp" className="gap-1.5 text-xs font-semibold px-2.5 py-2.5 w-full justify-center">
              <Radio className="size-3.5 shrink-0" />
              <span>WhatsApp Lock</span>
            </TabsTrigger>

            <TabsTrigger value="audit" className="gap-1.5 text-xs font-semibold px-2.5 py-2.5 w-full justify-center">
              <FileText className="size-3.5 shrink-0" />
              <span>Audit &amp; Ops</span>
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
