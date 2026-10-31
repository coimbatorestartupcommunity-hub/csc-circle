import Link from "next/link";
import Image from "next/image";
import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/member/status-badge";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
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
  const ctx = await requireAdminPagePermission("members.read");
  const [res, historyResult] = await Promise.all([
    adminServices.getMember(memberId),
    adminServices.getMemberDetails(memberId),
  ]);

  if (!res.ok) {
    return (
      <>
        <AdminPageHeader title="Member" isDemo={ctx.mode === "preview"} />
        <p className="text-brand-muted">{res.error.message}</p>
      </>
    );
  }
  const m = res.data;
  const history = historyResult.ok ? historyResult.data : null;
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
          <span className="relative flex size-16 items-center justify-center overflow-hidden rounded-full bg-brand-purple text-xl font-bold text-brand-ink ring-1 ring-brand-border">
            {history?.portraitUrl ? <Image src={history.portraitUrl} alt={`${m.fullName} profile`} fill unoptimized sizes="64px" className="object-cover" /> : initials(m.fullName)}
          </span>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Member ID" value={m.memberNumber ?? "Not issued"} mono />
            <Row label="Email" value={m.email} />
            <Row label="WhatsApp" value={m.whatsapp ?? "—"} />
            <Row label="Designation" value={m.designation ?? "—"} />
            <Row label="Startup" value={m.startup ?? "—"} />
            <Row label="Joined" value={formatEventDate(m.joinedAt)} />
            <Row label="Updated" value={formatEventDate(m.updatedAt)} />
            {history?.profileCompletion !== undefined ? <Row label="Profile completion" value={`${history.profileCompletion}%`} /> : null}
            <Row label="Last sign-in" value={history?.lastSignInAt ? formatEventDate(history.lastSignInAt) : "Not available"} />
          </dl>

          <div className="flex flex-wrap gap-2 border-t border-brand-border pt-4">
            {can(ctx, "members.suspend") ? (
              <ActionButton operation={ctx.mode === "live" ? { kind: "member", target: memberId, decision: "suspended" } : undefined} label="Suspend" variant="destructive" confirm="Suspend this membership?" />
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {!history ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{historyResult.ok ? "Member history is unavailable." : historyResult.error.message}</p> : null}
          {history ? <>
            <HistorySection title="Membership claim history" empty="No membership claims are linked to this account.">
              {history.claims.map((claim) => <HistoryRow key={claim.id} title={claim.applicantType.replaceAll("_", " ")} detail={`${claim.status.replaceAll("_", " ")}${claim.startup ? ` · ${claim.startup}` : ""}`} date={claim.submittedAt} />)}
            </HistorySection>

            <HistorySection title={`Owned startups (${history.startups.length})`} empty="No startup records are linked to this account.">
              {history.startups.map((startup) => <div key={startup.id} className="flex min-w-0 flex-col gap-2 border-b border-brand-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words font-medium text-brand-ink">{startup.name}</p><p className="text-xs text-brand-muted">{startup.industry} · {startup.status.replaceAll("_", " ")} · Updated {formatEventDate(startup.updatedAt)}</p></div><Link href={`/admin/startups/${startup.id}`} className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-brand-border px-3 text-xs font-semibold text-brand-ink hover:bg-brand-cloud">Manage startup</Link></div>)}
            </HistorySection>

            <HistorySection title={`Event registration history (${history.registrations.length})`} empty="No event registrations are linked to this account.">
              {history.registrations.map((registration) => <HistoryRow key={registration.id} title={registration.eventTitle} detail={`${registration.reference} · ${registration.status.replaceAll("_", " ")} · Payment: ${registration.payment.replaceAll("_", " ")} · Attendance: ${registration.attendance.replaceAll("_", " ")}`} date={registration.startsAt ? formatEventDate(registration.startsAt) : formatEventDate(registration.createdAt)} />)}
            </HistorySection>

            <HistorySection title="Event attendance" empty="No event attendance is linked to this account.">
              {history.registrations.filter((registration) => registration.attendance === "checked_in").map((registration) => <HistoryRow key={registration.id} title={registration.eventTitle} detail={`${registration.reference} · Checked in${registration.checkedInAt ? ` at ${formatEventDate(registration.checkedInAt)}` : ""}`} date={registration.checkedInAt ?? registration.createdAt} />)}
            </HistorySection>

            <HistorySection title={`Consultation history (${history.consultations.length})`} empty="No consultation requests are linked to this account.">
              {history.consultations.map((consultation) => <HistoryRow key={consultation.id} title={consultation.title} detail={`${consultation.status.replaceAll("_", " ")}${consultation.scheduledAt ? ` · Scheduled ${formatEventDate(consultation.scheduledAt)}` : ""}`} date={consultation.submittedAt} />)}
            </HistorySection>

            {can(ctx, "audit.read") ? <HistorySection title="Member audit history" empty="No audit events are linked to this account.">
              {history.audit.map((entry, index) => <HistoryRow key={`${entry.action}-${entry.createdAt}-${index}`} title={entry.action.replaceAll(".", " ").replaceAll("_", " ")} detail={[entry.targetType, entry.actorRole].filter(Boolean).join(" · ")} date={entry.createdAt} />)}
            </HistorySection> : null}
          </> : null}
        </div>
      </div>
    </>
  );
}

function HistorySection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasRecords = React.Children.count(children) > 0;
  return <section className="min-w-0 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border">
    <h2 className="mb-2 text-sm font-semibold text-brand-ink">{title}</h2>
    {hasRecords ? <div className="divide-y divide-brand-border">{children}</div> : <p className="text-sm text-brand-muted">{empty}</p>}
  </section>;
}

function HistoryRow({ title, detail, date }: { title: string; detail: string; date: string }) {
  return <article className="min-w-0 py-3 first:pt-1 last:pb-1">
    <p className="break-words font-medium capitalize text-brand-ink">{title}</p>
    <p className="mt-0.5 break-words text-sm text-brand-secondary">{detail}</p>
    {date ? <p className="mt-1 text-xs text-brand-muted">{formatEventDate(date)}</p> : null}
  </article>;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-brand-muted">{label}</dt>
      <dd className={`min-w-0 break-all text-right ${mono ? "font-mono text-xs text-brand-ink" : "text-brand-ink"}`}>{value}</dd>
    </div>
  );
}
