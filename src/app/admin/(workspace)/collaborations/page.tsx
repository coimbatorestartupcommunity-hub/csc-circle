import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { CompleteContentButton } from "@/components/admin/complete-content-button";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { CtaLink } from "@/components/common/cta-link";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Collaborations" };

interface CollabRow {
  id: string;
  slug: string;
  title: string;
  partners: string;
  category: string;
  status: string;
  publicationStatus: string;
  createdAt: string;
}

const columns: Column[] = [
  { key: "title", header: "Collaboration", sortable: true },
  { key: "partners", header: "Partners" },
  { key: "category", header: "Category", type: "badge" },
  { key: "status", header: "Status", type: "badge" },
  { key: "publicationStatus", header: "Publication", type: "statusPublication", sortable: true },
  { key: "createdAt", header: "Created", type: "date", sortable: true },
];

const facets: Facet[] = [
  {
    key: "publicationStatus",
    label: "Publication",
    options: [
      { label: "Published", value: "published" },
      { label: "Draft", value: "draft" },
      { label: "Archived", value: "archived" },
    ],
  },
];

export default async function AdminCollaborationsPage() {
  const ctx = await requireAdminPagePermission("content.manage");
  if (ctx.mode === "closed") return <AdminUnavailable />;
  if (ctx.mode === "forbidden" || !can(ctx, "content.manage")) {
    return <AdminUnavailable forbidden />;
  }

  let rows: CollabRow[] = [];
  if (ctx.mode === "live") {
    try {
      const sb = await createClient();
      const { data } = await sb
        .from("collaborations")
        .select("id, slug, title, category, status, publication_status, created_at, collaboration_partners(collaboration_organizations(name))")
        .order("created_at", { ascending: false });
      rows = (data ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        const partners = ((row.collaboration_partners as { collaboration_organizations?: { name?: string } }[]) ?? [])
          .map((p) => p.collaboration_organizations?.name)
          .filter(Boolean)
          .join(" × ");
        return {
          id: String(row.id),
          slug: String(row.slug ?? ""),
          title: (row.title as string) ?? "—",
          partners: partners || "—",
          category: (row.category as string) ?? "",
          status: (row.status as string) ?? "",
          publicationStatus: (row.publication_status as string) ?? "draft",
          createdAt: (row.created_at as string) ?? "",
        };
      });
    } catch {
      rows = [];
    }
  } else {
    // Dev preview — show the seeded CSC × Outlier so the module is visible.
    rows = [
      {
        id: "demo-csc-outlier",
        slug: "csc-outlier",
        title: "CSC × Outlier",
        partners: "Coimbatore Startup Community × Outlier",
        category: "Community Meetup & Networking",
        status: "completed",
        publicationStatus: "published",
        createdAt: "2026-10-19T00:00:00+05:30",
      },
    ];
  }

  return (
    <>
      <AdminPageHeader
        title="Collaborations"
        description="Community partnerships and joint events shown on the public site. New collaborations appear here and on /collaborations automatically once published."
        isDemo={ctx.mode === "preview"}
        action={<CtaLink href="/admin/collaborations/new" size="md">New collaboration</CtaLink>}
      />
      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["title", "partners", "category"]}
        emptyMessage="No collaborations yet."
      />
      <div className="mt-6 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-brand-ink">Collaboration Actions &amp; Lifecycle</h3>
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
                    {row.status === "completed" ? "Completed" : row.publicationStatus}
                  </span>
                </div>
                <span className="text-xs text-brand-muted">
                  {row.partners} · {row.category || "Partnership"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                <Link
                  href={`/admin/collaborations/${row.id}/edit`}
                  className="h-9 min-h-9 inline-flex items-center justify-center gap-1 rounded-xl border border-brand-border bg-white px-3 text-xs font-semibold text-brand-accent hover:bg-brand-cloud"
                >
                  Edit
                </Link>
                {row.publicationStatus === "published" && row.slug ? (
                  <Link
                    href={`/collaborations/${row.slug}`}
                    target="_blank"
                    className="h-9 min-h-9 inline-flex items-center justify-center gap-1 rounded-xl border border-brand-border bg-white px-2.5 text-xs text-brand-muted hover:text-brand-ink hover:underline"
                  >
                    Public <ExternalLink className="size-3" />
                  </Link>
                ) : null}
                <CompleteContentButton
                  kind="collaboration"
                  id={row.id}
                  isCompleted={row.status === "completed"}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
