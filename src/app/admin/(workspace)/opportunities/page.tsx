import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { InboundProposalsManager, type InboundProposal } from "@/components/admin/inbound-proposals-manager";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { CtaLink } from "@/components/common/cta-link";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { listOpportunitiesAdmin } from "@/lib/admin/cms";

export const metadata = { title: "Opportunities" };
interface Row { id: string; title: string; organization: string; category: string; publicationStatus: string; deadline: string; updatedAt: string }

const columns: Column[] = [
  { key: "title", header: "Opportunity", sortable: true },
  { key: "organization", header: "Organization" },
  { key: "category", header: "Category", type: "badge" },
  { key: "publicationStatus", header: "Publication", type: "statusPublication", sortable: true },
  { key: "deadline", header: "Deadline", sortable: true },
  { key: "updatedAt", header: "Updated", type: "date", sortable: true },
];
const facets: Facet[] = [{ key: "publicationStatus", label: "Publication", options: [{ label: "Published", value: "published" }, { label: "Draft", value: "draft" }, { label: "Archived", value: "archived" }] }];

export default async function AdminOpportunitiesPage() {
  const ctx = await requireAdminPagePermission("content.manage");
  if (ctx.mode === "closed") return <AdminUnavailable />;
  if (ctx.mode === "forbidden" || !can(ctx, "content.manage")) return <AdminUnavailable forbidden />;

  let rows: Row[] = [];
  let proposals: InboundProposal[] = [];

  if (ctx.mode === "live") {
    const list = await listOpportunitiesAdmin();
    rows = list.map((o) => ({
      id: o.id,
      title: o.title,
      organization: o.organization ?? "—",
      category: o.category,
      publicationStatus: o.status,
      deadline: o.deadline ?? "—",
      updatedAt: o.updatedAt ?? "",
    }));

    proposals = list.map((o) => ({
      id: o.id,
      slug: o.slug,
      title: o.title,
      organization: o.organization,
      category: o.category,
      email: o.contact,
      deadline: o.deadline,
      summary: o.summary,
      details: o.description,
      publicationStatus: o.status,
      createdAt: o.updatedAt,
    }));
  }

  return (
    <>
      <AdminPageHeader
        title="Opportunities"
        description="Verified startup opportunities. Inbound community and member submissions appear under Review Proposals for one-click approval."
        isDemo={ctx.mode === "preview"}
        action={<CtaLink href="/admin/opportunities/new" size="md">New opportunity</CtaLink>}
      />

      {/* Inbound Community & Member Submissions Review Manager */}
      <InboundProposalsManager
        kind="opportunity"
        proposals={proposals}
        className="mb-6"
      />

      <DataTable rows={rows} columns={columns} facets={facets} searchKeys={["title", "organization", "category"]} rowHrefBase="/admin/opportunities" emptyMessage="No opportunities yet." />
    </>
  );
}
