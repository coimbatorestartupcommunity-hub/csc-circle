import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { OpportunityEditor } from "@/components/admin/opportunity-editor";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { getOpportunityAdmin } from "@/lib/admin/cms";

export const metadata = { title: "Edit Opportunity" };
export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminPagePermission("content.manage");
  if (ctx.mode === "closed") return <AdminUnavailable />;
  if (ctx.mode === "forbidden" || !can(ctx, "content.manage")) return <AdminUnavailable forbidden />;
  const { id } = await params;
  const opportunity = ctx.mode === "live" ? await getOpportunityAdmin(id) : null;
  if (ctx.mode === "live" && !opportunity) notFound();
  return (
    <>
      <AdminPageHeader title="Edit Opportunity" description="Update details, manage media, and control publication." />
      <OpportunityEditor initial={opportunity ?? undefined} />
    </>
  );
}
