import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { OpportunityAdminPreview } from "@/components/admin/cms-preview";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";
import { getOpportunityAdmin } from "@/lib/admin/cms";

export const metadata = { title: "Preview Opportunity" };

export default async function OpportunityPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAdminPagePermission("content.manage");
  if (context.mode === "closed") return <AdminUnavailable />;
  if (context.mode === "forbidden" || !can(context, "content.manage")) return <AdminUnavailable forbidden />;
  const { id } = await params;
  const opportunity = context.mode === "live" ? await getOpportunityAdmin(id) : null;
  if (context.mode === "live" && !opportunity) notFound();
  return <><AdminPageHeader title="Opportunity preview" description="Private preview visible to administrators with content management permission." />{opportunity ? <OpportunityAdminPreview opportunity={opportunity} /> : null}</>;
}
