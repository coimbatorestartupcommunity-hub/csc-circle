import { requireAdminPagePermission } from "@/lib/admin/gate";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AgreementPdfStudio } from "@/components/admin/agreements/agreement-pdf-studio";

export const instant = false;
export const metadata = { title: "Agreement PDF Studio — Admin" };

export default async function AdminAgreementPdfStudioPage() {
  await requireAdminPagePermission("settings.manage");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Agreement PDF Studio"
        description="Preview the official white editorial PDF layout, typography, CSC circular logo, ink-blue digital signature, and Section 65B audit certificate across all 7 agreement templates."
      />
      <AgreementPdfStudio />
    </div>
  );
}
