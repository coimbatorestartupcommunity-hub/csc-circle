import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { OpportunityEditor } from "@/components/admin/opportunity-editor";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";

export const metadata = { title: "New Opportunity" };

export default async function NewOpportunityPage() {
  const ctx = await requireAdminPagePermission("content.manage");
  if (ctx.mode === "closed") return <AdminUnavailable />;
  if (ctx.mode === "forbidden" || !can(ctx, "content.manage")) return <AdminUnavailable forbidden />;
  return (
    <>
      <AdminPageHeader title="New Opportunity" description="Save a draft, then publish when verified. Drafts stay private until published." />
      <OpportunityEditor />
    </>
  );
}
