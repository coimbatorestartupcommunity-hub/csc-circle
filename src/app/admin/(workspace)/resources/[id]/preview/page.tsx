import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { ResourceAdminPreview } from "@/components/admin/cms-preview";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";
import { getResourceAdmin } from "@/lib/admin/cms";

export const metadata = { title: "Preview Resource" };

export default async function ResourcePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAdminPagePermission("content.manage");
  if (context.mode === "closed") return <AdminUnavailable />;
  if (context.mode === "forbidden" || !can(context, "content.manage")) return <AdminUnavailable forbidden />;
  const { id } = await params;
  const resource = context.mode === "live" ? await getResourceAdmin(id) : null;
  if (context.mode === "live" && !resource) notFound();
  return <><AdminPageHeader title="Resource preview" description="Private preview visible to administrators with content management permission." />{resource ? <ResourceAdminPreview resource={resource} /> : null}</>;
}
