import { requireAdminPagePermission } from "@/lib/admin/gate";
import { getAuthUser } from "@/lib/supabase/server";
import { emailConfiguration } from "@/lib/notifications/config";
import { EmailPreviewViewer } from "@/components/admin/email-preview/email-preview-viewer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const instant = false;
export const metadata = { title: "Email Template Studio — Admin" };

export default async function AdminEmailPreviewPage() {
  await requireAdminPagePermission("settings.manage");
  const user = await getAuthUser();
  const config = emailConfiguration();
  const adminEmail = user?.email || config.support;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Email Template Studio"
        description="Inspect and test the official CSC email designs: Meraki Editorial Journal & Nomu High-Conversion Showcase with all 7 Core Leaders."
      />
      <EmailPreviewViewer
        baseUrl={config.base}
        supportEmail={config.support}
        adminEmail={adminEmail}
      />
    </div>
  );
}
