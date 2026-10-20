import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/member/status-badge";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { membershipStatusMeta } from "@/lib/content/member-taxonomy";
import { formatEventDate } from "@/lib/format";
import { initials } from "@/lib/format";

export const metadata = { title: "Member detail" };

export default async function AdminMemberDetail({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const ctx = await getAdminContext();
  const res = await adminServices.getMember(memberId);

  if (!res.ok) {
    return (
      <>
        <AdminPageHeader title="Member" isDemo={ctx.mode === "preview"} />
        <p className="text-brand-muted">{res.error.message}</p>
      </>
    );
  }
  const m = res.data;
  const meta = membershipStatusMeta[m.status];

  return (
    <>
      <Link href="/admin/members" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
        <ArrowLeft className="size-4" /> Back to members
      </Link>
      <AdminPageHeader
        title={m.fullName}
        description={m.email}
        isDemo={ctx.mode === "preview"}
        action={<StatusBadge label={meta.label} tone={meta.tone} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-4 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
          <span className="flex size-16 items-center justify-center rounded-full bg-brand-purple text-xl font-bold text-brand-ink">
            {initials(m.fullName)}
          </span>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Member ID" value={m.memberNumber ?? "Not issued"} mono />
            <Row label="Email" value={m.email} />
            <Row label="WhatsApp" value={m.whatsapp ?? "—"} />
            <Row label="Designation" value={m.designation ?? "—"} />
            <Row label="Startup" value={m.startup ?? "—"} />
            <Row label="Joined" value={formatEventDate(m.joinedAt)} />
            <Row label="Updated" value={formatEventDate(m.updatedAt)} />
          </dl>

          <div className="flex flex-wrap gap-2 border-t border-brand-border pt-4">
            {can(ctx, "members.suspend") ? (
              <ActionButton operation={ctx.mode === "live" ? { kind: "member", target: memberId, decision: "suspended" } : undefined} label="Suspend" variant="destructive" confirm="Suspend this membership?" />
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {[
            "Membership claim history",
            "Event registration history",
            "Event attendance",
            "Consultation history",
            "Audit history",
          ].map((section) => (
            <section key={section} className="rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border">
              <h2 className="mb-2 text-sm font-semibold text-brand-ink">{section}</h2>
              <p className="text-sm text-brand-muted">
                Populated from the member&apos;s linked records once backend
                operations are connected (Phase 1).
              </p>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-brand-muted">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-brand-ink" : "text-brand-ink"}>{value}</dd>
    </div>
  );
}
