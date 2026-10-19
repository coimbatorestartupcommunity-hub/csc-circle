import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet, type ActionDef } from "@/components/admin/data-table";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Reviews" };

const columns: Column[] = [
  { key: "reviewer", header: "Reviewer", type: "mono" },
  { key: "rating", header: "Rating", type: "stars", sortable: true },
  { key: "excerpt", header: "Review" },
  { key: "submittedAt", header: "Submitted", type: "date", sortable: true },
  { key: "status", header: "Status", type: "statusReview", sortable: true },
];

const facets: Facet[] = [
  {
    key: "status",
    label: "Moderation",
    options: [
      { label: "Submitted", value: "submitted" },
      { label: "Under review", value: "under_review" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ],
  },
  {
    key: "rating",
    label: "Stars",
    options: [5, 4, 3, 2, 1].map((n) => ({ label: `${n} star`, value: String(n) })),
  },
];

export default async function AdminReviewsPage() {
  const ctx = await getAdminContext();
  const res = await adminServices.listReviews();
  const rows = res.ok ? res.data : [];

  const actions: ActionDef[] | undefined = can(ctx, "reviews.moderate")
    ? [
        { operation: ctx.mode === "live" ? { kind: "review", decision: "approved" } : undefined, label: "Approve", message: "Approving publishes the genuine review to the public carousel and updates the real rating aggregate (Phase 1). Admins cannot edit a member's opinion." },
        { operation: ctx.mode === "live" ? { kind: "review", decision: "rejected" } : undefined, label: "Reject", variant: "destructive", confirm: "Reject this review?" },
      ]
    : undefined;

  return (
    <>
      <AdminPageHeader
        title="Ratings & reviews moderation"
        description="Moderate genuine member reviews. Approved reviews appear in the public testimonials carousel."
        isDemo={ctx.mode === "preview"}
      />
      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["reviewer", "excerpt"]}
        actions={actions}
        emptyMessage={res.ok ? "No reviews." : res.error.message}
      />
    </>
  );
}
