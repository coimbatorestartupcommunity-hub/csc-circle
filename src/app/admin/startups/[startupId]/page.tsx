import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/member/status-badge";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { publicationStatusMeta } from "@/lib/admin/status-meta";
import { displayHost, formatEventDate } from "@/lib/format";

export const metadata = { title: "Startup detail" };

export default async function AdminStartupDetail({
  params,
}: {
  params: Promise<{ startupId: string }>;
}) {
  const { startupId } = await params;
  const ctx = await getAdminContext();
  const res = await adminServices.getStartup(startupId);

  if (!res.ok) {
    return (
      <>
        <AdminPageHeader title="Startup" isDemo={ctx.mode === "preview"} />
        <p className="text-brand-muted">{res.error.message}</p>
      </>
    );
  }
  const s = res.data;
  const meta = publicationStatusMeta[s.status];
  const host = displayHost(s.website);

  return (
    <>
      <Link href="/admin/startups" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
        <ArrowLeft className="size-4" /> Back to startups
      </Link>
      <AdminPageHeader
        title={s.name}
        description={`Founder: ${s.founder}`}
        isDemo={ctx.mode === "preview"}
        action={<StatusBadge label={meta.label} tone={meta.tone} />}
      />

      <div className="flex flex-col gap-4 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Field label="Industry" value={s.industry} />
          <Field label="Website" value={host ?? "—"} />
          <Field label="Collaboration" value={s.collaboration.join(", ") || "—"} />
          <Field label="Updated" value={formatEventDate(s.updatedAt)} />
        </dl>
        {can(ctx, "directory.manage") ? (
          <div className="flex flex-wrap gap-2 border-t border-brand-border pt-4">
            <ActionButton operation={ctx.mode === "live" ? { kind: "startup", target: startupId, decision: "published" } : undefined} label="Approve & publish" message="Publishes to the public directory after persistence + approval (Phase 1)." />
            <ActionButton label="Edit details" />
            <ActionButton operation={ctx.mode === "live" ? { kind: "startup", target: startupId, decision: "archived" } : undefined} label="Unpublish" variant="destructive" confirm="Unpublish this listing from the public directory?" />
          </div>
        ) : null}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs tracking-wide text-brand-muted uppercase">{label}</dt>
      <dd className="text-sm text-brand-ink">{value}</dd>
    </div>
  );
}
