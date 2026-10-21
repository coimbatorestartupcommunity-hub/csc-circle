import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { AdminRoleManager } from "@/components/admin/admin-role-manager";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";

export const metadata: Metadata = { title: "Administrator Roles & Permissions" };
export default async function AdminRolesPage() {
  const context = await requireAdminPagePermission("roles.manage");
  if (!can(context, "roles.manage")) return <AdminUnavailable forbidden />;
  return <><AdminPageHeader title="Administrator Roles & Permissions" description="Review active administrator assignments, permissions and access history." action={<Button render={<Link href="/admin/invitations" />} nativeButton={false}><ArrowRight className="size-4" />Administrator invitations</Button>} isDemo={context.mode === "preview"} /><AdminRoleManager isDemo={context.mode !== "live"} /></>;
}
