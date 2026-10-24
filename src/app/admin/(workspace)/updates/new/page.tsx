import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { UpdateEditor } from "@/components/admin/update-editor";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";

export const metadata = { title: "New Community Update" };
export default async function NewUpdatePage() {
  const context = await requireAdminPagePermission("content.manage");
  if (context.mode === "closed") return <AdminUnavailable />;
  if (context.mode === "forbidden" || !can(context, "content.manage")) return <AdminUnavailable forbidden />;
  return <><AdminPageHeader title="New Community Update" description="Create a draft, add approved media and attribution, preview it privately, then publish when ready." /><UpdateEditor /></>;
}
