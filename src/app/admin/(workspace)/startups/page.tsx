import Link from "next/link";
import { ArrowRight, Clock3, GitCompare } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type ActionDef, type Column, type Facet } from "@/components/admin/data-table";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEventDate } from "@/lib/format";

export const metadata = { title: "Startups" };

const columns: Column[] = [
  { key: "name", header: "Startup", sortable: true },
  { key: "founder", header: "Founder" },
  { key: "industry", header: "Industry", type: "badge" },
  { key: "collaboration", header: "Collaboration", type: "list" },
  { key: "status", header: "Status", type: "statusPublication", sortable: true },
  { key: "updatedAt", header: "Updated", type: "date", sortable: true },
];

const facets: Facet[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "Published", value: "published" },
      { label: "Pending", value: "pending" },
      { label: "Draft", value: "draft" },
      { label: "Archived", value: "archived" },
    ],
  },
];

export default async function AdminStartupsPage() {
  const ctx = await requireAdminPagePermission("directory.manage");
  const res = await adminServices.listStartups();
  const rows = res.ok ? res.data : [];

  const admin = createAdminClient();
  const { data: revisions } = ctx.mode === "live" && can(ctx, "directory.manage")
    ? await admin.from("directory_startup_revisions").select("id,startup_id,submitted_by,submitted_at,base_version").eq("status", "pending").order("submitted_at", { ascending: true })
    : { data: [] };

  const startupIds = [...new Set((revisions ?? []).map((revision) => revision.startup_id))];
  const userIds = [...new Set((revisions ?? []).map((revision) => revision.submitted_by))];
  const [{ data: revisionStartups }, { data: revisionProfiles }] = await Promise.all([
    startupIds.length ? admin.from("directory_startups").select("id,name,industry,status").in("id", startupIds) : Promise.resolve({ data: [] }),
    userIds.length ? admin.from("profiles").select("id,full_name,display_name").in("id", userIds) : Promise.resolve({ data: [] }),
  ]);
  const startupById = new Map((revisionStartups ?? []).map((startup) => [startup.id, startup]));
  const profileById = new Map((revisionProfiles ?? []).map((profile) => [profile.id, profile]));

  const actions: ActionDef[] | undefined = can(ctx, "directory.manage")
    ? [
        { label: "Approve & publish", operation: ctx.mode === "live" ? { kind: "startup", decision: "published" } : undefined, message: "Review the founder-submitted information before publishing this startup.", visibleForStatuses: ["pending", "draft"] },
        { label: "Cancel submission", operation: ctx.mode === "live" ? { kind: "startup", decision: "archived" } : undefined, variant: "destructive", confirm: "Cancel this startup submission and keep it out of the public directory?", visibleForStatuses: ["pending", "draft"] },
        { label: "Unpublish", operation: ctx.mode === "live" ? { kind: "startup", decision: "archived" } : undefined, variant: "destructive", confirm: "Unpublish this startup from the public directory?", visibleForStatuses: ["published"] },
        { label: "Return to review", operation: ctx.mode === "live" ? { kind: "startup", decision: "pending" } : undefined, confirm: "Return this archived startup to the pending review queue?", visibleForStatuses: ["archived"] },
      ]
    : undefined;

  return (
    <>
      <AdminPageHeader
        title="Startup directory management"
        description="Unified review for initial startup submissions and founder profile revisions."
        isDemo={ctx.mode === "preview"}
      />

      {/* Unified Pending Founder Revisions Queue */}
      {revisions && revisions.length > 0 ? (
        <section className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="size-5 text-amber-700" />
              <h2 className="text-base font-bold text-amber-900">
                Pending Founder Profile Revisions ({revisions.length})
              </h2>
            </div>
            <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              Action Required
            </span>
          </div>
          <p className="mb-4 text-xs text-amber-800">
            Approved startups edited by their founders are held in this review queue until approved. Compare changes and merge or reject directly.
          </p>
          <div className="grid gap-3">
            {revisions.map((revision) => {
              const startup = startupById.get(revision.startup_id);
              const profile = profileById.get(revision.submitted_by);
              return (
                <article
                  key={revision.id}
                  className="flex min-w-0 flex-col gap-3 rounded-xl border border-amber-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-brand-ink">
                      {startup?.name ?? "Startup"}
                    </h3>
                    <p className="mt-0.5 text-xs text-brand-secondary">
                      {profile?.display_name || profile?.full_name || "Startup owner"} · {startup?.industry ?? "Industry not set"}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-brand-muted">
                      <Clock3 className="size-3" /> Submitted {revision.submitted_at ? formatEventDate(revision.submitted_at) : "recently"}
                    </p>
                  </div>
                  <Link
                    href={`/admin/startups/revisions/${revision.id}`}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-ink px-3.5 text-xs font-semibold text-white hover:bg-brand-secondary transition"
                  >
                    Compare changes <ArrowRight className="size-3.5" />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["name", "founder", "industry"]}
        rowHrefBase="/admin/startups"
        actions={actions}
        emptyMessage={res.ok ? "No startups submitted." : res.error.message}
      />
    </>
  );
}
