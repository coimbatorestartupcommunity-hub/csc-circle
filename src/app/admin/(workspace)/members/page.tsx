import { Download } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { InviteMemberForm } from "@/components/admin/invite-member-form";

export const metadata = { title: "Members" };

const columns: Column[] = [
  { key: "fullName", header: "Name", sortable: true },
  { key: "memberNumber", header: "Member ID", type: "mono" },
  { key: "email", header: "Email" },
  { key: "designation", header: "Designation", type: "badge" },
  { key: "startup", header: "Startup" },
  { key: "status", header: "Status", type: "statusMembership", sortable: true },
  { key: "joinedAt", header: "Joined", type: "date", sortable: true },
];

const facets: Facet[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "Active", value: "active" },
      { label: "Pending verification", value: "pending_verification" },
      { label: "Claim submitted", value: "claim_submitted" },
      { label: "Suspended", value: "suspended" },
      { label: "Rejected", value: "rejected" },
      { label: "Revoked", value: "revoked" },
    ],
  },
  {
    key: "designation",
    label: "Founder Persona",
    options: [
      { label: "Startup Founder", value: "startup_founder" },
      { label: "Founder", value: "founder" },
      { label: "Co-Founder", value: "co_founder" },
      { label: "Idea Stage / Aspiring", value: "aspiring_entrepreneur" },
      { label: "Early-Stage Entrepreneur", value: "early_entrepreneur" },
      { label: "Entrepreneur", value: "entrepreneur" },
      { label: "Business Leader", value: "business_person" },
      { label: "Investor / Angel", value: "investor" },
      { label: "Innovator", value: "innovator" },
      { label: "Mentor", value: "mentor" },
    ],
  },
];

export default async function AdminMembersPage() {
  const ctx = await requireAdminPagePermission("members.read");
  const res = await adminServices.listMembers();
  const rows = res.ok ? res.data : [];

  return (
    <>
      <AdminPageHeader
        title="Member management"
        description="Search, filter and manage CSC community members."
        isDemo={ctx.mode === "preview"}
        action={
          can(ctx, "members.read") ? (
            <a
              href="/api/admin/members/export"
              download
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 text-sm font-semibold text-white hover:bg-brand-secondary transition"
            >
              <Download className="size-4" /> Export CSV
            </a>
          ) : undefined
        }
      />
      {can(ctx, "members.approve") ? <InviteMemberForm disabled={ctx.mode !== "live"} /> : null}
      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["fullName", "email", "memberNumber", "startup"]}
        rowHrefBase="/admin/members"
        emptyMessage={res.ok ? "No members yet." : res.error.message}
      />
    </>
  );
}
