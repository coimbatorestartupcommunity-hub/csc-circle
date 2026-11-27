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
  Rocket,
  Briefcase,
  Settings,
  ShieldCheck,
  Zap,
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
import { CircularSocialIcon } from "@/components/common/brand-icons";
import { siteConfig } from "@/lib/content/site";
import { MemberVisualAnalytics } from "@/components/member/member-visual-analytics";

export const metadata = {
  title: "Member Command Center & Dashboard — CSC Circle",
  description: "Ecosystem overview, verified digital membership credentials, confirmed event passes, and startup directory activity.",
};

const subPages = [
  {
    href: "/profile/id-card",
    label: "Member ID Card",
    desc: "Digital cryptographic ID with Apple & Google Wallet pass sync.",
    icon: IdCard,
    badge: "Credential",
  },
  {
    href: "/profile/events",
    label: "Events Pass",
    desc: "Confirmed meetup passes, QR tokens, and 60-min Google Meet gate.",
    icon: Ticket,
    badge: "RSVP",
  },
  {
    href: "/profile/account",
    label: "Account Profile",
    desc: "Founder bio, designations, portrait, and public directory visibility.",
    icon: UserCircle,
    badge: "Identity",
  },
  {
    href: "/profile/startups",
    label: "My Startups",
    desc: "Manage up to 4 venture profiles, logos, and directory listings.",
    icon: Rocket,
    badge: "Ventures",
  },
  {
    href: "/profile/opportunities",
    label: "Opportunities Desk",
    desc: "Post co-founder calls, engineering hiring, and seed grant alerts.",
    icon: Briefcase,
    badge: "Ecosystem",
  },
  {
    href: "/profile/consultations",
    label: "1:1 Consultations",
    desc: "Book complimentary virtual guidance with veteran startup mentors.",
    icon: MessagesSquare,
    badge: "Advisory",
  },
  {
    href: "/profile/reviews",
    label: "Community Reviews",
    desc: "Rate attended workshops, give testimonials, and build reputation.",
    icon: Star,
    badge: "Feedback",
  },
  {
    href: "/profile/settings",
    label: "Settings & Security",
    desc: "Multi-channel phone/email binding, DPDP privacy, and password.",
    icon: Settings,
    badge: "Security",
  },
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

  const isPhoneVerified = Boolean(
    (profile?.consent as Record<string, unknown> | undefined)?.phone_verified ||
    (profile as any)?.phone_verified
  );

  const isEmailVerified = Boolean(
    profile?.email && !profile.email.endsWith("@login.csc.internal")
  );

  const hasPublishedStartup = Boolean(
    profile?.startup?.name?.trim()
  );

  const summary = [
    { label: "Member ID Status", value: statusMeta.label, icon: IdCard, accent: "text-brand-accent bg-purple-50" },
    { label: "Active Event Passes", value: String(passes.length), icon: Ticket, accent: "text-emerald-700 bg-emerald-50" },
    { label: "Upcoming Meetups", value: String(upcoming.length), icon: CalendarDays, accent: "text-blue-700 bg-blue-50" },
    { label: "Mentorship Sessions", value: String(consults.length), icon: MessagesSquare, accent: "text-amber-700 bg-amber-50" },
    { label: "Community Reviews", value: String(reviews.length), icon: Star, accent: "text-rose-700 bg-rose-50" },
  ];

  return (
    <>
      <MemberPageHeader
        title={`Welcome${profile?.displayName ? `, ${profile.displayName}` : ""}.`}
        description="Your Coimbatore Startup Community member command center and real-time ecosystem telemetry."
        action={
          profile && profile.profileCompletion < 100 ? (
            <Link
              href="/profile/account"
              prefetch={true}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-purple px-3.5 py-2 text-sm font-medium text-brand-ink hover:bg-brand-lilac shadow-xs"
            >
              Profile {profile.profileCompletion}% complete
              <ArrowRight className="size-4" />
            </Link>
          ) : profile ? (
            <Link
              href="/profile/account"
              prefetch={true}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100 shadow-xs"
            >
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
              Profile 100% Complete
            </Link>
          ) : null
        }
      />

      {/* Primary KPI Dual-Stat Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summary.map((s) => (
          <div
            key={s.label}
            className="flex flex-col justify-between rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-muted">{s.label}</span>
              <span className={`flex size-8 items-center justify-center rounded-xl ${s.accent}`}>
                <s.icon className="size-4" aria-hidden />
              </span>
            </div>
            <span className="mt-3 text-xl font-bold tracking-tight text-brand-ink">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Visual Analytics & Graphs Section */}
      <MemberVisualAnalytics
        profileCompletion={profile?.profileCompletion ?? 0}
        totalPasses={passes.length}
        upcomingEvents={upcoming.length}
        consultationsCount={consults.length}
        reviewsCount={reviews.length}
        hasPublishedStartup={hasPublishedStartup}
        isPhoneVerified={isPhoneVerified}
        isEmailVerified={isEmailVerified}
      />

      {/* 24/7 WhatsApp AI Assistant (Powered by Logic Intelligence Technologies) */}
      <section className="mt-8 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white p-5 sm:p-7 ring-1 ring-emerald-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <CircularSocialIcon network="ai_agent" size={52} className="shadow-xs shrink-0" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">24/7 WhatsApp Community AI Concierge</h3>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  Online · Powered by Logic Intelligence Technologies (LIT)
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                Need immediate answers about your digital pass QR, membership status, or Google Meet links? Chat anytime with our AI Concierge on WhatsApp at <strong className="text-slate-900">{siteConfig.social.whatsappAgentPhone}</strong>.
              </p>
            </div>
          </div>
          <a
            href={siteConfig.social.whatsappAgent}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
          >
            Chat on WhatsApp
            <ArrowRight className="size-4" />
          </a>
        </div>
      </section>

      {/* 8 Sub-Pages Hub — Perfectly Balanced, Centralized Grid */}
      <section className="mt-8 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-accent">
              Member Workspace Modules
            </h2>
            <p className="text-xs text-brand-secondary">
              Direct access to all 8 specialized sub-modules of your CSC profile workspace.
            </p>
          </div>
          <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-ink">
            8 Modules
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {subPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              prefetch={true}
              className="group flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-5 shadow-xs transition hover:border-brand-ink/20 hover:shadow-md"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-cloud text-brand-accent transition-colors group-hover:bg-brand-purple group-hover:text-brand-ink">
                    <page.icon className="size-5" />
                  </span>
                  <span className="rounded-full bg-brand-cloud/60 px-2 py-0.5 text-[10px] font-semibold text-brand-muted">
                    {page.badge}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-bold text-brand-ink group-hover:text-brand-accent transition-colors">
                  {page.label}
                </h3>
                <p className="text-xs leading-relaxed text-brand-secondary line-clamp-2">
                  {page.desc}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1.5 border-t border-brand-border/60 pt-3 text-xs font-semibold text-brand-accent">
                Open module <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Registrations Spotlight */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide text-brand-muted uppercase">
            Active Event Passes &amp; Upcoming Sessions
          </h2>
          {upcoming.length > 0 && (
            <Link href="/profile/events" className="text-xs font-semibold text-brand-accent hover:underline">
              View all ({upcoming.length}) &rarr;
            </Link>
          )}
        </div>

        {upcoming.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {upcoming.map((r) => {
              const meta = registrationStatusMeta[r.status];
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-white p-4 sm:p-5 ring-1 ring-brand-border shadow-xs"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-bold text-brand-ink sm:text-base">
                      {r.eventTitle}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs sm:text-sm text-brand-muted mt-0.5">
                      <Clock className="size-3.5 text-brand-accent" />
                      {formatEventDate(r.startsAt)} · {r.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge label={meta.label} tone={meta.tone} />
                    {isPassEligible(r.status) ? (
                      <Link
                        href={`/profile/events/${r.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-ink/90"
                      >
                        <Ticket className="size-3.5" /> View Pass
                      </Link>
                    ) : (
                      <Link
                        href={`/profile/events/${r.id}`}
                        className="text-xs font-medium text-brand-secondary hover:underline"
                      >
                        Details &rarr;
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
            description="Browse CSC events and claim your pass for upcoming founder meetups and masterclasses."
          >
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-4 py-2 text-xs sm:text-sm font-semibold text-brand-white hover:bg-brand-ink/90 shadow-xs"
            >
              Explore CSC Events &rarr;
            </Link>
          </EmptyState>
        )}
      </section>
    </>
  );
}
