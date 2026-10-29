import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { CommunityUpdateAdminPreview } from "@/components/admin/cms-preview";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";
import { getCommunityUpdateAdmin } from "@/lib/admin/cms";

export const metadata = { title: "Preview Community Update", robots: { index: false, follow: false } };
export default async function UpdateAdminPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAdminPagePermission("content.manage");
  if (context.mode === "closed") return <AdminUnavailable />;
  if (context.mode === "forbidden" || !can(context, "content.manage")) return <AdminUnavailable forbidden />;
  const { id } = await params;
  const update = context.mode === "live" ? await getCommunityUpdateAdmin(id) : null;
  if (context.mode === "live" && !update) notFound();
  return <><AdminPageHeader title="Update preview" description="Private preview available only to administrators with content management permission." />{update ? <CommunityUpdateAdminPreview update={update} /> : null}</>;
}
