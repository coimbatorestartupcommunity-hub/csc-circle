import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { ResourceEditor } from "@/components/admin/resource-editor";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { getResourceAdmin } from "@/lib/admin/cms";

export const metadata = { title: "Edit Resource" };
export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminPagePermission("content.manage");
  if (ctx.mode === "closed") return <AdminUnavailable />;
  if (ctx.mode === "forbidden" || !can(ctx, "content.manage")) return <AdminUnavailable forbidden />;
  const { id } = await params;
  const resource = ctx.mode === "live" ? await getResourceAdmin(id) : null;
  if (ctx.mode === "live" && !resource) notFound();
  return (
    <>
      <AdminPageHeader title="Edit Resource" description="Update details, manage media, and control publication." />
      <ResourceEditor initial={resource ?? undefined} />
    </>
  );
}
