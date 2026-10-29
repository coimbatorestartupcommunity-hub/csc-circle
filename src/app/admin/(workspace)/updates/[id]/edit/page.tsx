import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { UpdateEditor } from "@/components/admin/update-editor";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";
import { getCommunityUpdateAdmin } from "@/lib/admin/cms";

export const metadata = { title: "Edit Community Update" };
export default async function EditUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAdminPagePermission("content.manage");
  if (context.mode === "closed") return <AdminUnavailable />;
  if (context.mode === "forbidden" || !can(context, "content.manage")) return <AdminUnavailable forbidden />;
  const { id } = await params;
  const update = context.mode === "live" ? await getCommunityUpdateAdmin(id) : null;
  if (context.mode === "live" && !update) notFound();
  return <><AdminPageHeader title="Edit Community Update" description="Edit the content, manage approved media, preview privately and control publication." /><UpdateEditor initial={update ?? undefined} /></>;
}
