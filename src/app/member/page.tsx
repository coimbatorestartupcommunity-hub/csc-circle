import Link from "next/link";
import {
  IdCard,
  CalendarDays,
  UserCircle,
  Compass,
  MessagesSquare,
  Star,
  CheckCircle2,
  Clock,
  ArrowRight,
  Ticket,
} from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { StatusBadge } from "@/components/member/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { memberServices } from "@/lib/services/member/services";
import {
  membershipStatusMeta,
  registrationStatusMeta,
} from "@/lib/content/member-taxonomy";
import { isPassEligible } from "@/types/member";
import { formatEventDate } from "@/lib/format";

const quickActions = [
  { href: "/member/id-card", label: "View Digital ID", icon: IdCard },
  { href: "/member/events", label: "Browse Events", icon: CalendarDays },
  { href: "/member/profile", label: "Complete Profile", icon: UserCircle },
  { href: "/directory", label: "Founder Directory", icon: Compass },
  { href: "/member/consultations", label: "Request Consultation", icon: MessagesSquare },
  { href: "/member/reviews", label: "Write a Review", icon: Star },
];

export default async function MemberDashboard() {
  const [profileRes, regsRes, consultRes, reviewsRes] = await Promise.all([
    memberServices.getProfile(),
    memberServices.listRegistrations(),
    memberServices.listConsultations(),
    memberServices.listReviews(),
  ]);

  const profile = profileRes.ok ? profileRes.data : null;
  const regs = regsRes.ok ? regsRes.data : [];
  const consults = consultRes.ok ? consultRes.data : [];
  const reviews = reviewsRes.ok ? reviewsRes.data : [];

  const status = profile?.membership.status ?? "not_started";
  const statusMeta = membershipStatusMeta[status];
  const upcoming = regs.filter((r) =>
    ["confirmed", "waitlisted", "pending", "pending_review"].includes(r.status),
  );
  const passes = regs.filter((r) => isPassEligible(r.status));

  const summary = [
    { label: "Membership", value: statusMeta.label, icon: IdCard },
    { label: "Upcoming events", value: String(upcoming.length), icon: CalendarDays },
    { label: "Event passes", value: String(passes.length), icon: Ticket },
    { label: "Consultations", value: String(consults.length), icon: MessagesSquare },
    { label: "Reviews", value: String(reviews.length), icon: Star },
  ];

  return (
    <>
      <MemberPageHeader
        title={`Welcome${profile?.displayName ? `, ${profile.displayName}` : ""}.`}
        description="Your CSC Circle member overview."
        action={
          profile && profile.profileCompletion < 100 ? (
            <Link
              href="/member/profile"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-purple px-3.5 py-2 text-sm font-medium text-brand-ink hover:bg-brand-lilac"
            >
              Profile {profile.profileCompletion}% complete
              <ArrowRight className="size-4" />
            </Link>
          ) : null
        }
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summary.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-2 rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-cloud text-brand-accent">
              <s.icon className="size-4.5" aria-hidden />
            </span>
            <span className="text-lg font-bold text-brand-ink">{s.value}</span>
            <span className="text-xs text-brand-muted">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-brand-muted uppercase">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center justify-between gap-3 rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition-colors hover:bg-brand-cloud"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-purple text-brand-accent">
                  <a.icon className="size-4.5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-brand-ink">{a.label}</span>
              </span>
              <ArrowRight className="size-4 text-brand-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming registrations */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-brand-muted uppercase">
          Upcoming registrations
        </h2>
        {upcoming.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {upcoming.map((r) => {
              const meta = registrationStatusMeta[r.status];
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold text-brand-ink">
                      {r.eventTitle}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-brand-muted">
                      <Clock className="size-3.5" />
                      {formatEventDate(r.startsAt)} · {r.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge label={meta.label} tone={meta.tone} />
                    {isPassEligible(r.status) ? (
                      <Link
                        href={`/member/events/${r.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand-accent hover:underline"
                      >
                        <CheckCircle2 className="size-4" /> View pass
                      </Link>
                    ) : (
                      <Link
                        href={`/member/events/${r.id}`}
                        className="text-sm font-medium text-brand-secondary hover:underline"
                      >
                        Details
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming event registrations."
            description="Browse CSC events and register for the ones that fit your goals."
          >
            <Link
              href="/member/events"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-ink px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-ink/90"
            >
              Explore CSC Events
            </Link>
          </EmptyState>
        )}
      </section>
    </>
  );
}
