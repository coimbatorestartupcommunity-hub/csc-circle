import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { ResourceEditor } from "@/components/admin/resource-editor";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";

export const metadata = { title: "New Resource" };

export default async function NewResourcePage() {
  const ctx = await requireAdminPagePermission("content.manage");
  if (ctx.mode === "closed") return <AdminUnavailable />;
  if (ctx.mode === "forbidden" || !can(ctx, "content.manage")) return <AdminUnavailable forbidden />;
  return (
    <>
      <AdminPageHeader title="New Resource" description="Save a draft, then publish when it's ready. Drafts and uploaded files stay private until published." />
      <ResourceEditor />
    </>
  );
}
