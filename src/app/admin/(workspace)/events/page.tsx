import Link from "next/link";
import { Plus, ExternalLink, ArrowUpRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { CompleteContentButton } from "@/components/admin/complete-content-button";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
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
  const ctx = await requireAdminPagePermission(["events.create", "events.update", "events.publish"]);
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
      {rows.length > 0 ? (
        <div className="mt-6 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-brand-ink">Event Actions &amp; Lifecycle</h3>
          <div className="grid gap-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-brand-border bg-white p-4 text-sm shadow-xs transition hover:shadow-sm"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-brand-ink">{row.title}</span>
                    <span className="rounded-full bg-brand-cloud px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-secondary">
                      {row.isCompleted ? "Completed" : row.status}
                    </span>
                  </div>
                  <span className="text-xs text-brand-muted">
                    {row.startsAt ? new Date(row.startsAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"} · {row.venue || "Online"} · {row.confirmed} confirmed attendee{row.confirmed === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                  <Link
                    href={`/admin/events/${row.id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-brand-ink px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-ink/90"
                  >
                    Open <ArrowUpRight className="size-3.5" />
                  </Link>
                  {can(ctx, "registrations.read") ? (
                    <Link
                      href={`/admin/events/${row.id}/registrations`}
                      className="inline-flex items-center gap-1 rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-secondary hover:bg-brand-cloud"
                    >
                      Registrations ({row.confirmed})
                    </Link>
                  ) : null}
                  <Link
                    href={`/admin/events/${row.id}/edit`}
                    className="inline-flex items-center gap-1 rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-accent hover:bg-brand-cloud"
                  >
                    Edit
                  </Link>
                  {row.slug ? (
                    <Link
                      href={`/events/${row.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs text-brand-muted hover:text-brand-ink hover:underline"
                    >
                      Public <ExternalLink className="size-3" />
                    </Link>
                  ) : null}
                  {can(ctx, "events.publish") ? (
                    <CompleteContentButton
                      kind="event"
                      id={row.id}
                      isCompleted={row.isCompleted}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
