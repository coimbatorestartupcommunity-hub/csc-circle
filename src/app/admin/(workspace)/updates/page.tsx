import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { CompleteContentButton } from "@/components/admin/complete-content-button";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { CtaLink } from "@/components/common/cta-link";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";
import { listCommunityUpdatesAdmin } from "@/lib/admin/cms";

export const metadata = { title: "Updates & Highlights" };
type Row = { id: string; title: string; category: string; publicationStatus: string; featured: string; publishedAt: string; updatedAt: string };
const columns: Column[] = [
  { key: "title", header: "Update", sortable: true }, { key: "category", header: "Category", type: "badge" },
  { key: "publicationStatus", header: "Status", type: "statusPublication", sortable: true },
  { key: "featured", header: "Featured", type: "badge" }, { key: "publishedAt", header: "Published", type: "date", sortable: true },
  { key: "updatedAt", header: "Updated", type: "date", sortable: true },
];
const facets: Facet[] = [{ key: "publicationStatus", label: "Status", options: [{ label: "Published", value: "published" }, { label: "Draft", value: "draft" }, { label: "Archived", value: "archived" }] }];

export default async function AdminUpdatesPage() {
  const context = await requireAdminPagePermission("content.manage");
  if (context.mode === "closed") return <AdminUnavailable />;
  if (context.mode === "forbidden" || !can(context, "content.manage")) return <AdminUnavailable forbidden />;
  const updates = context.mode === "live" ? await listCommunityUpdatesAdmin() : [];
  const rows: Row[] = updates.map((update) => ({
    id: update.id,
    title: update.title,
    category: update.category,
    publicationStatus: update.completedAt ? "completed" : update.status,
    featured: update.featured ? "Yes" : "No",
    publishedAt: update.publishedAt ?? "",
    updatedAt: update.updatedAt ?? "",
  }));
  return (
    <>
      <AdminPageHeader
        title="Updates & Highlights"
        description="Prepare approved CSC stories, event highlights and announcements. Drafts remain private until published."
        isDemo={context.mode === "preview"}
        action={<CtaLink href="/admin/updates/new" size="md">New update</CtaLink>}
      />
      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["title", "category"]}
        rowHrefBase="/admin/updates"
        emptyMessage="No updates yet."
      />
      {updates.length > 0 ? (
        <div className="mt-6 flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-brand-ink">Update Actions &amp; Completion</h3>
          {updates.map((update) => (
            <div
              key={update.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm shadow-sm"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-brand-ink">{update.title}</span>
                <span className="text-xs text-brand-muted">
                  {update.category} · Status: <span className="capitalize">{update.completedAt ? "Completed" : update.status}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/admin/updates/${update.id}/edit`} className="font-medium text-brand-accent hover:underline">
                  Edit
                </Link>
                {update.status === "published" ? (
                  <Link
                    href={`/updates/${update.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-brand-muted hover:underline"
                  >
                    Public <ExternalLink className="size-3" />
                  </Link>
                ) : null}
                <CompleteContentButton
                  kind="update"
                  id={update.id}
                  isCompleted={Boolean(update.completedAt)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
