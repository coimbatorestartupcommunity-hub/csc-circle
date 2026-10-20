import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/member/status-badge";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { registrationStatusMeta } from "@/lib/content/member-taxonomy";
import { isPassEligible } from "@/types/member";
import { formatEventRange } from "@/lib/format";

export const metadata = { title: "Registration detail" };

export default async function RegistrationDetail({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = await params;
  const ctx = await getAdminContext();
  const list = await adminServices.listRegistrations();
  const reg = list.ok ? list.data.find((r) => r.id === registrationId) : null;

  if (!reg) {
    return (
      <>
        <AdminPageHeader title="Registration" isDemo={ctx.mode === "preview"} />
        <p className="text-brand-muted">Registration not found.</p>
      </>
    );
  }
  const meta = registrationStatusMeta[reg.status];

  return (
    <>
      <Link href="/admin/registrations" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
        <ArrowLeft className="size-4" /> Back to registrations
      </Link>
      <AdminPageHeader title={reg.eventTitle} description={reg.reference} isDemo={ctx.mode === "preview"} action={<StatusBadge label={meta.label} tone={meta.tone} />} />

      <div className="flex flex-col gap-4 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <Field label="Attendee" value={reg.memberName || "—"} />
          <Field label="Reference" value={reg.reference} mono />
          <Field label="When" value={formatEventRange(reg.startsAt, reg.endsAt)} />
          <Field label="Payment" value={reg.payment} />
          <Field label="Attendance" value={reg.attendance} />
          <Field label="Pass eligible" value={isPassEligible(reg.status) ? "Yes" : "No"} />
        </dl>
        {can(ctx, "registrations.approve") ? (
          <div className="flex flex-wrap gap-2 border-t border-brand-border pt-4">
            {["pending", "pending_review", "waitlisted"].includes(reg.status) ? <ActionButton operation={ctx.mode === "live" ? { kind: "registration", target: registrationId, decision: "confirmed" } : undefined} label="Approve" message="Capacity and any paid-event verification are checked atomically." /> : null}
            {["pending", "pending_review"].includes(reg.status) ? <ActionButton operation={ctx.mode === "live" ? { kind: "registration", target: registrationId, decision: "waitlisted" } : undefined} label="Move to waitlist" /> : null}
            {["pending", "pending_review", "pending_payment", "payment_verification", "confirmed", "waitlisted"].includes(reg.status) ? <ActionButton operation={ctx.mode === "live" ? { kind: "registration", target: registrationId, decision: "cancelled" } : undefined} label="Cancel registration" variant="destructive" confirm="Cancel this registration?" /> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs tracking-wide text-brand-muted uppercase">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-brand-ink" : "text-brand-ink"}>{value}</dd>
    </div>
  );
}
