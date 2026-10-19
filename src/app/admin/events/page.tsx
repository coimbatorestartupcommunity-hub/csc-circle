import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Events" };

const columns: Column[] = [
  { key: "title", header: "Event", sortable: true },
  { key: "category", header: "Category", type: "badge" },
  { key: "startsAt", header: "Date", type: "date", sortable: true },
  { key: "venue", header: "Venue" },
  { key: "capacity", header: "Capacity" },
  { key: "confirmed", header: "Confirmed" },
  { key: "waitlisted", header: "Waitlist" },
  { key: "admission", header: "Admission", type: "badge" },
  { key: "status", header: "Status", type: "statusPublication", sortable: true },
];

const facets: Facet[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Published", value: "published" },
      { label: "Cancelled", value: "cancelled" },
      { label: "Archived", value: "archived" },
    ],
  },
  {
    key: "admission",
    label: "Admission",
    options: [
      { label: "Free", value: "free" },
      { label: "Paid", value: "paid" },
    ],
  },
];

export default async function AdminEventsPage() {
  const ctx = await getAdminContext();
  const res = await adminServices.listEvents();
  const rows = res.ok ? res.data : [];

  return (
    <>
      <AdminPageHeader
        title="Event management"
        description="Create, schedule, publish and manage CSC events."
        isDemo={ctx.mode === "preview"}
        action={
          can(ctx, "events.create") ? (
            <Link
              href="/admin/events/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-3.5 py-2 text-sm font-medium text-brand-white hover:bg-brand-ink/90"
            >
              <Plus className="size-4" /> New event
            </Link>
          ) : null
        }
      />
      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["title", "category", "venue"]}
        rowHrefBase="/admin/events"
        emptyMessage={res.ok ? "No events yet." : res.error.message}
      />
    </>
  );
}
