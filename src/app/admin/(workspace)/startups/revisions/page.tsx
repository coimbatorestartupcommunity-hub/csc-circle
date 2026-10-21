import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminPagePermission } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEventDate } from "@/lib/format";

export const metadata = { title: "Pending Startup Changes" };

export default async function PendingStartupRevisionsPage() {
  const ctx = await requireAdminPagePermission("directory.manage");
  if (ctx.mode !== "live" || !ctx.permissions.has("directory.manage")) {
    return <><AdminPageHeader title="Pending startup changes" /><p className="rounded-2xl border border-brand-border bg-white p-5 text-sm text-brand-muted">A live administrator with startup directory permission is required to view revisions.</p></>;
  }

  const admin = createAdminClient();
  const { data: revisions, error } = await admin.from("directory_startup_revisions").select("id,startup_id,submitted_by,submitted_at,base_version").eq("status", "pending").order("submitted_at", { ascending: true });
  if (error) {
    return <><AdminPageHeader title="Pending startup changes" description="Review founder edits before they replace approved directory information." /><p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Pending changes could not be loaded. Please retry.</p></>;
  }
  const startupIds = [...new Set((revisions ?? []).map((revision) => revision.startup_id))];
  const userIds = [...new Set((revisions ?? []).map((revision) => revision.submitted_by))];
  const [{ data: startups }, { data: profiles }] = await Promise.all([
    startupIds.length ? admin.from("directory_startups").select("id,name,industry,status").in("id", startupIds) : Promise.resolve({ data: [] }),
    userIds.length ? admin.from("profiles").select("id,full_name,display_name").in("id", userIds) : Promise.resolve({ data: [] }),
  ]);
  const startupById = new Map((startups ?? []).map((startup) => [startup.id, startup]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return <>
    <AdminPageHeader title="Pending startup changes" description="Review founder edits before they replace approved directory information." action={<Link href="/admin/startups" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-ink hover:bg-brand-cloud">All startups</Link>} />
    {revisions?.length ? <div className="grid gap-3">
      {revisions.map((revision) => {
        const startup = startupById.get(revision.startup_id);
        const profile = profileById.get(revision.submitted_by);
        return <article key={revision.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-brand-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-brand-ink">{startup?.name ?? "Startup"}</h2>
            <p className="mt-1 text-sm text-brand-secondary">{profile?.display_name || profile?.full_name || "Startup owner"} · {startup?.industry ?? "Industry not set"}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-muted"><Clock3 className="size-3.5" />Submitted {revision.submitted_at ? formatEventDate(revision.submitted_at) : "date unavailable"}</p>
          </div>
          <Link href={`/admin/startups/revisions/${revision.id}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 text-sm font-semibold text-white hover:bg-brand-secondary">Compare changes <ArrowRight className="size-4" /></Link>
        </article>;
      })}
    </div> : <p className="rounded-2xl border border-brand-border bg-white p-8 text-center text-sm text-brand-muted">No startup changes are waiting for approval.</p>}
  </>;
}
