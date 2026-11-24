import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminPagePermission } from "@/lib/admin/gate";
import { getWebsiteMaintenanceConfig, getWhatsAppLockConfig } from "@/lib/services/system-settings";
import { WebsiteMaintenanceControl } from "@/components/admin/maintenance/website-maintenance-control";
import { WhatsAppLockControl } from "@/components/admin/whatsapp/whatsapp-lock-control";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Radio, ShieldAlert } from "lucide-react";

export const metadata = { title: "Maintenance & Platform Controls" };

export default async function AdminMaintenancePage() {
  const ctx = await requireAdminPagePermission("settings.manage");

  const [websiteConfig, waConfig] = await Promise.all([
    getWebsiteMaintenanceConfig(),
    getWhatsAppLockConfig(),
  ]);

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        title="Platform Controls & Maintenance Mode"
        description="Unified operations center: Instantly toggle global website maintenance screen, configure maintenance downtime notices, or engage the WhatsApp gateway 24-hour rate-limiting lock."
        isDemo={ctx.mode === "preview"}
      />

      <Tabs defaultValue="website" className="w-full space-y-6">
        <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <TabsTrigger value="website" className="gap-2 text-xs font-semibold px-4 py-2">
            <Globe className="size-4" />
            Website Maintenance Mode
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2 text-xs font-semibold px-4 py-2">
            <Radio className="size-4" />
            WhatsApp Gateway Lock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="website" className="space-y-4">
          <WebsiteMaintenanceControl initialConfig={websiteConfig} />
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <WhatsAppLockControl initialConfig={waConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
