import Link from "next/link";
import { ArrowLeft, Megaphone, Pencil } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusBadge } from "@/components/member/status-badge";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
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
  const ctx = await requireAdminPagePermission(["events.update", "events.publish"]);
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
          <div className="flex flex-wrap gap-2">
          {can(ctx, "registrations.read") ? <Link href={`/admin/events/${e.id}/registrations`} className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm font-medium text-brand-ink hover:bg-brand-cloud">Registrations</Link> : null}
          {can(ctx, "events.publish") ? <><Link href={`/admin/notifications?eventId=${e.id}`} className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm font-medium text-brand-ink hover:bg-brand-cloud"><Megaphone className="size-4" />Promote This Event</Link><Link href="/admin/events" className="inline-flex items-center rounded-xl px-3.5 py-2 text-sm font-medium text-brand-muted hover:bg-brand-cloud">Skip For Now</Link></> : null}
          {can(ctx, "events.update") ? (
            <Link href={`/admin/events/${e.id}/edit`} className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-3.5 py-2 text-sm font-medium text-brand-white hover:bg-brand-ink/90">
              <Pencil className="size-4" /> Edit
            </Link>
          ) : null
          }
          </div>
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
        {can(ctx, "events.update") ? <p className="border-t border-brand-border pt-4 text-sm text-brand-secondary">To publish, unpublish, or cancel this event, open <Link className="font-semibold text-brand-ink underline underline-offset-2" href={`/admin/events/${e.id}/edit`}>Edit event</Link> and save the selected status. This uses the audited event-save workflow and notifies affected registrants where applicable.</p> : null}
      </div>
    </>
  );
}
