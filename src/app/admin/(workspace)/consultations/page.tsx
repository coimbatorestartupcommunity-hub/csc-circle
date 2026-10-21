import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { requireAdminPagePermission } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Consultations" };

const columns: Column[] = [
  { key: "reference", header: "Reference", type: "mono" },
  { key: "fullName", header: "Name", sortable: true },
  { key: "startup", header: "Startup" },
  { key: "requested", header: "Requested" },
  { key: "submittedAt", header: "Submitted", type: "date", sortable: true },
  { key: "assignedTo", header: "Assigned" },
  { key: "status", header: "Status", type: "statusConsultation", sortable: true },
];

const facets: Facet[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "Submitted", value: "submitted" },
      { label: "Under review", value: "under_review" },
      { label: "More info required", value: "more_info_required" },
      { label: "Approved", value: "approved" },
      { label: "Scheduled", value: "scheduled" },
      { label: "Completed", value: "completed" },
      { label: "Declined", value: "declined" },
    ],
  },
];

export default async function AdminConsultationsPage() {
  const ctx = await requireAdminPagePermission("consultations.manage");
  const res = await adminServices.listConsultations();
  const rows = res.ok ? res.data : [];

  return (
    <>
      <AdminPageHeader
        title="Consultation management"
        description="Review and manage consultation requests from the website."
        isDemo={ctx.mode === "preview"}
      />
      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["fullName", "reference", "startup", "requested"]}
        rowHrefBase="/admin/consultations"
        emptyMessage={res.ok ? "No consultation requests." : res.error.message}
      />
    </>
  );
}
