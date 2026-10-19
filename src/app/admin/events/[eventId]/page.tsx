import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/member/status-badge";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { publicationStatusMeta } from "@/lib/admin/status-meta";
import { formatEventDate } from "@/lib/format";

export const metadata = { title: "Event detail" };

export default async function AdminEventDetail({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getAdminContext();
  const res = await adminServices.getEvent(eventId);

  if (!res.ok) {
    return (
      <>
        <AdminPageHeader title="Event" isDemo={ctx.mode === "preview"} />
        <p className="text-brand-muted">{res.error.message}</p>
      </>
    );
  }
  const e = res.data;
  const meta = publicationStatusMeta[e.status];

  return (
    <>
      <Link href="/admin/events" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
        <ArrowLeft className="size-4" /> Back to events
      </Link>
      <AdminPageHeader
        title={e.title}
        description={`${e.category} · ${formatEventDate(e.startsAt)}`}
        isDemo={ctx.mode === "preview"}
        action={
          can(ctx, "events.update") ? (
            <Link href={`/admin/events/${e.id}/edit`} className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-3.5 py-2 text-sm font-medium text-brand-white hover:bg-brand-ink/90">
              <Pencil className="size-4" /> Edit
            </Link>
          ) : null
        }
      />

      <div className="flex flex-col gap-4 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge label={meta.label} tone={meta.tone} />
          <span className="text-sm text-brand-muted">
            {e.confirmed} confirmed · {e.waitlisted} waitlisted
            {e.capacity ? ` · capacity ${e.capacity}` : ""}
          </span>
        </div>
        {can(ctx, "events.publish") ? (
          <div className="flex flex-wrap gap-2 border-t border-brand-border pt-4">
            <ActionButton label={e.status === "published" ? "Unpublish" : "Publish"} message="Publication is transactional + audited; the public site updates via cache revalidation (Phase 1)." />
            <ActionButton label="Cancel event" variant="destructive" confirm="Cancel this event? Registrants would be notified." />
            <ActionButton label="Archive" variant="outline" />
          </div>
        ) : null}
      </div>
    </>
  );
}
