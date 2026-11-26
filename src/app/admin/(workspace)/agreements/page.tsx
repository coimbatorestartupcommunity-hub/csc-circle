import { requireAdminPagePermission } from "@/lib/admin/gate";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { agreementsTable, type DigitalAgreementRow } from "@/lib/agreements/db";
import { AdminAgreementsClient } from "@/components/admin/agreements/admin-agreements-client";
import { siteConfig } from "@/lib/content/site";

export const instant = false;
export const metadata = { title: "Digital Agreements — Admin" };

export default async function AdminAgreementsPage() {
  const ctx = await requireAdminPagePermission("settings.manage");
  let rows: DigitalAgreementRow[] = [];
  if (ctx.mode === "live") {
    const { data } = await agreementsTable()
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    rows = (data ?? []) as DigitalAgreementRow[];
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Digital Agreements & Leadership Charters"
        description="Issue formal 3–4 page digital agreements with email-login verification, optional partner logos, automatic PDF email delivery, and Section 65B audit trails."
      />
      <AdminAgreementsClient initialAgreements={rows} siteUrl={siteConfig.url} />
    </div>
  );
}
