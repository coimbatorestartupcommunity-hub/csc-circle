import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Collaborations" };

interface CollabRow {
  id: string;
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
  const ctx = await getAdminContext();
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
        .select("id, title, category, status, publication_status, created_at, collaboration_partners(collaboration_organizations(name))")
        .order("created_at", { ascending: false });
      rows = (data ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        const partners = ((row.collaboration_partners as { collaboration_organizations?: { name?: string } }[]) ?? [])
          .map((p) => p.collaboration_organizations?.name)
          .filter(Boolean)
          .join(" × ");
        return {
          id: String(row.id),
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
      />
      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["title", "partners", "category"]}
        emptyMessage="No collaborations yet."
      />
      <p className="mt-4 text-sm text-brand-muted">
        The first collaboration (CSC × Outlier) is seeded.{" "}
        <Link href="/collaborations/csc-outlier" className="inline-flex items-center gap-1 text-brand-accent hover:underline" target="_blank">
          View public page <ExternalLink className="size-3.5" />
        </Link>
        . A full create/edit editor (partners, gallery upload, publish workflow)
        is the next step for this module.
      </p>
    </>
  );
}
