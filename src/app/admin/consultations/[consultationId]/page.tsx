import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/member/status-badge";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { consultationStatusMeta } from "@/lib/content/member-taxonomy";
import { formatEventDate } from "@/lib/format";

export const metadata = { title: "Consultation detail" };

export default async function ConsultationDetail({
  params,
}: {
  params: Promise<{ consultationId: string }>;
}) {
  const { consultationId } = await params;
  const ctx = await getAdminContext();
  const list = await adminServices.listConsultations();
  const c = list.ok ? list.data.find((x) => x.id === consultationId) : null;

  if (!c) {
    return (
      <>
        <AdminPageHeader title="Consultation" isDemo={ctx.mode === "preview"} />
        <p className="text-brand-muted">Consultation not found.</p>
      </>
    );
  }
  const meta = consultationStatusMeta[c.status];

  return (
    <>
      <Link href="/admin/consultations" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
        <ArrowLeft className="size-4" /> Back to consultations
      </Link>
      <AdminPageHeader title={c.fullName} description={c.reference} isDemo={ctx.mode === "preview"} action={<StatusBadge label={meta.label} tone={meta.tone} />} />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="Startup" value={c.startup ?? "—"} />
            <Field label="Requested" value={c.requested} />
            <Field label="WhatsApp" value={c.whatsapp ?? "—"} />
            <Field label="Email" value={c.email ?? "—"} />
            <Field label="Submitted" value={formatEventDate(c.submittedAt)} />
            <Field label="Assigned" value={c.assignedTo ?? "Unassigned"} />
          </dl>
          <div className="rounded-xl bg-brand-cloud p-4 text-sm text-brand-secondary">
            Internal notes are visible to admins only and are never shown to the
            member. They are persisted and audited in Phase 1.
          </div>
        </div>
        {can(ctx, "consultations.manage") ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
            <h2 className="text-sm font-semibold text-brand-ink">Actions</h2>
            <ActionButton operation={ctx.mode === "live" ? { kind: "consultation", target: consultationId, decision: "under_review" } : undefined} label="Begin review" />
            <ActionButton operation={ctx.mode === "live" ? { kind: "consultation", target: consultationId, decision: "approved" } : undefined} label="Approve" />
            <ActionButton operation={ctx.mode === "live" ? { kind: "consultation", target: consultationId, decision: "more_info_required" } : undefined} label="Request more info" />
            <ActionButton label="Propose meeting" />
            <ActionButton operation={ctx.mode === "live" ? { kind: "consultation", target: consultationId, decision: "completed" } : undefined} label="Mark completed" />
            <ActionButton operation={ctx.mode === "live" ? { kind: "consultation", target: consultationId, decision: "declined" } : undefined} label="Decline" variant="destructive" confirm="Decline this consultation request?" />
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
      <dd className="text-brand-ink">{value}</dd>
    </div>
  );
}
