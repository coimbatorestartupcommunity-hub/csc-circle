import Link from "next/link";
import { ArrowRight, Clock3, GitCompare, Building2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type ActionDef, type Column, type Facet } from "@/components/admin/data-table";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEventDate } from "@/lib/format";
import { cn } from "cn";

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

interface AdminStartupsPageProps {
  searchParams?: Promise<{ view?: string }>;
}

export default async function AdminStartupsPage({ searchParams }: AdminStartupsPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const isRevisionsView = resolvedParams.view === "revisions";

  const ctx = await requireAdminPagePermission("directory.manage");
  const res = await adminServices.listStartups();
  const rows = res.ok ? res.data : [];

  const admin = createAdminClient();
  const { data: revisions } = ctx.mode === "live" && can(ctx, "directory.manage")
    ? await admin.from("directory_startup_revisions").select("id,startup_id,submitted_by,submitted_at,base_version").eq("status", "pending").order("submitted_at", { ascending: true })
    : { data: [] };

  const pendingRevisions = revisions ?? [];
  const pendingCount = pendingRevisions.length;

  const startupIds = [...new Set(pendingRevisions.map((revision) => revision.startup_id))];
  const userIds = [...new Set(pendingRevisions.map((revision) => revision.submitted_by))];
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

      {/* Unified Tab Switcher: All Startups vs Startup Revisions */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-brand-border pb-4">
        <Link
          href="/admin/startups"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
            !isRevisionsView
              ? "bg-brand-ink text-white shadow-xs"
              : "bg-white text-brand-secondary ring-1 ring-brand-border hover:bg-brand-cloud hover:text-brand-ink"
          )}
        >
          <Building2 className="size-4" />
          <span>All Startups</span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-bold",
            !isRevisionsView ? "bg-white/20 text-white" : "bg-brand-cloud text-brand-muted"
          )}>
            {rows.length}
          </span>
        </Link>

        <Link
          href="/admin/startups?view=revisions"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
            isRevisionsView
              ? "bg-brand-ink text-white shadow-xs"
              : pendingCount > 0
                ? "bg-amber-50 text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
                : "bg-white text-brand-secondary ring-1 ring-brand-border hover:bg-brand-cloud hover:text-brand-ink"
          )}
        >
          <GitCompare className="size-4" />
          <span>Startup Revisions</span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-bold",
            pendingCount > 0
              ? isRevisionsView ? "bg-amber-400 text-amber-950" : "bg-amber-200 text-amber-900"
              : isRevisionsView ? "bg-white/20 text-white" : "bg-brand-cloud text-brand-muted"
          )}>
            {pendingCount}
          </span>
        </Link>
      </div>

      {isRevisionsView ? (
        /* Revisions View */
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-ink">
              Pending Founder Edits ({pendingCount})
            </h2>
            <p className="text-xs text-brand-muted">
              Review and approve founder-submitted revisions before updating public directory listings.
            </p>
          </div>

          {pendingCount > 0 ? (
            <div className="grid gap-3">
              {pendingRevisions.map((revision) => {
                const startup = startupById.get(revision.startup_id);
                const profile = profileById.get(revision.submitted_by);
                return (
                  <article
                    key={revision.id}
                    className="flex min-w-0 flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 transition hover:bg-amber-50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-bold text-brand-ink">
                          {startup?.name ?? "Startup"}
                        </h3>
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                          Pending Revision
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-brand-secondary">
                        {profile?.display_name || profile?.full_name || "Startup owner"} · {startup?.industry ?? "Industry not set"}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-muted">
                        <Clock3 className="size-3.5 text-amber-700" />
                        Submitted {revision.submitted_at ? formatEventDate(revision.submitted_at) : "recently"}
                      </p>
                    </div>
                    <Link
                      href={`/admin/startups/revisions/${revision.id}`}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 text-sm font-semibold text-white hover:bg-brand-secondary transition"
                    >
                      Compare changes &amp; Approve <ArrowRight className="size-4" />
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-brand-border bg-white p-12 text-center">
              <GitCompare className="mx-auto size-8 text-brand-muted mb-2" />
              <p className="text-base font-semibold text-brand-ink">No startup changes waiting for approval</p>
              <p className="mt-1 text-xs text-brand-muted">
                When founders edit their approved directory profile, their revisions will appear here for review.
              </p>
            </div>
          )}
        </section>
      ) : (
        /* All Startups View */
        <>
          {pendingCount > 0 ? (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <GitCompare className="size-4 text-amber-700" />
                <span className="text-xs font-semibold text-amber-900">
                  {pendingCount === 1
                    ? "1 founder has updated their startup profile and is waiting for review."
                    : `${pendingCount} founders have updated their startup profiles and are waiting for review.`}
                </span>
              </div>
              <Link
                href="/admin/startups?view=revisions"
                className="inline-flex items-center gap-1 rounded-lg bg-amber-200/80 px-3 py-1 text-xs font-bold text-amber-950 hover:bg-amber-300 transition"
              >
                Review Revisions ({pendingCount}) <ArrowRight className="size-3" />
              </Link>
            </div>
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
      )}
    </>
  );
}
