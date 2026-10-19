import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/member/status-badge";
import { getAdminContext } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import {
  membershipStatusMeta,
  registrationStatusMeta,
  consultationStatusMeta,
} from "@/lib/content/member-taxonomy";
import { formatEventDate } from "@/lib/format";

export const metadata = { title: "Operations" };

function Bars({
  data,
  color = "bg-brand-accent",
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-brand-muted">{d.label}</span>
          <div className="h-5 flex-1 overflow-hidden rounded-full bg-brand-cloud">
            <div
              className={`h-full rounded-full ${color}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-medium text-brand-ink tabular-nums">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brand-ink">{title}</h2>
        {href ? (
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline">
            View all <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default async function AdminOverview() {
  const ctx = await getAdminContext();
  const res = await adminServices.getDashboard();
  const data = res.ok ? res.data : null;
  const isDemo = ctx.mode === "preview";

  return (
    <>
      <AdminPageHeader
        title="CSC Community Operations"
        description="Manage memberships, startups, events, registrations, enquiries, and engagement from one connected workspace."
        isDemo={isDemo}
      />

      {!data ? (
        <p className="text-brand-muted">{res.ok ? "" : res.error.message}</p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.metrics.map((m) => (
              <StatCard key={m.key} label={m.label} value={m.value} href={m.href} />
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Recent membership applications" href="/admin/membership-claims">
              {data.recentClaims.length ? (
                <ul className="flex flex-col divide-y divide-brand-border">
                  {data.recentClaims.slice(0, 4).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="truncate text-brand-ink">{c.applicantName}</span>
                      <StatusBadge {...membershipStatusMeta[c.status]} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-brand-muted">No pending applications.</p>
              )}
            </Panel>

            <Panel title="RSVP approvals needing attention" href="/admin/registrations">
              {data.pendingRegistrations.length ? (
                <ul className="flex flex-col divide-y divide-brand-border">
                  {data.pendingRegistrations.slice(0, 4).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="truncate text-brand-ink">{r.eventTitle}</span>
                      <StatusBadge {...registrationStatusMeta[r.status]} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-brand-muted">Nothing awaiting approval.</p>
              )}
            </Panel>

            <Panel title="Recent consultation submissions" href="/admin/consultations">
              {data.recentConsultations.length ? (
                <ul className="flex flex-col divide-y divide-brand-border">
                  {data.recentConsultations.slice(0, 4).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="truncate text-brand-ink">{c.fullName} · {c.requested}</span>
                      <StatusBadge {...consultationStatusMeta[c.status]} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-brand-muted">No recent consultations.</p>
              )}
            </Panel>

            <Panel title="Review moderation queue" href="/admin/reviews">
              {data.reviewQueue.length ? (
                <ul className="flex flex-col divide-y divide-brand-border">
                  {data.reviewQueue.slice(0, 4).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="truncate text-brand-ink">{r.reviewer} · {r.rating}★</span>
                      <span className="truncate text-brand-muted">{r.excerpt}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-brand-muted">Queue is clear.</p>
              )}
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Review rating distribution">
              <Bars
                data={data.ratingDistribution.map((r) => ({ label: `${r.rating} star`, value: r.count }))}
                color="bg-green-500"
              />
            </Panel>
            <Panel title="Registrations by event">
              {data.registrationsByEvent.length ? (
                <Bars data={data.registrationsByEvent.map((r) => ({ label: r.event, value: r.count }))} />
              ) : (
                <p className="py-4 text-sm text-brand-muted">No registration data yet.</p>
              )}
            </Panel>
          </div>

          <Panel title="Recent administrative actions" href="/admin/audit-logs">
            {data.recentAudit.length ? (
              <ul className="flex flex-col divide-y divide-brand-border">
                {data.recentAudit.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-mono text-xs text-brand-ink">{a.action}</span>
                    <span className="text-brand-muted">{formatEventDate(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-sm text-brand-muted">No recorded actions.</p>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
