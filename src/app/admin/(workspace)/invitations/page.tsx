import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { AdminInvitationManager } from "@/components/admin/admin-invitation-manager";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";

export const metadata: Metadata = { title: "Administrator Invitations" };
export default async function AdminInvitationsPage() {
  const context = await requireAdminPagePermission("roles.manage");
  if (!can(context, "roles.manage")) return <AdminUnavailable forbidden />;
  return <><AdminPageHeader title="Administrator Invitations" description="Invite trusted CSC administrators, assign roles and securely manage administrative access." isDemo={context.mode === "preview"} /><AdminInvitationManager isDemo={context.mode !== "live"} /></>;
}
