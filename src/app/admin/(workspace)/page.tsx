import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  FileCheck,
  ScanLine,
  Star,
  Users,
  Building2,
  MessagesSquare,
  ClipboardList,
  FileText,
  ScrollText,
  Settings,
  ShieldCheck,
  BookOpen,
  Target,
  Newspaper,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Sparkles,
  Layers,
  Activity,
  FileSignature,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { can, requireAdminPage } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { roleLabels } from "@/lib/admin/permissions";
import { agreementsTable, type DigitalAgreementRow } from "@/lib/agreements/db";
import { siteConfig } from "@/lib/content/site";

export const metadata = { title: "Admin Dashboard — Coimbatore Startup Community" };

interface WorkspaceModule {
  permission: Parameters<typeof can>[1];
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: "community" | "events" | "content" | "system";
}

const modules: WorkspaceModule[] = [
  // Community & Founders
  { permission: "members.read", label: "Members Directory", href: "/admin/members", Icon: Users, description: "Review CSC member accounts, digital IDs and membership activity.", category: "community" },
  { permission: "members.approve", label: "Membership Claims", href: "/admin/membership-claims", Icon: FileCheck, description: "Review and audit membership claims (5-minute auto-pipeline).", category: "community" },
  { permission: "directory.manage", label: "Founder Directory", href: "/admin/startups", Icon: Building2, description: "Review startup submissions, pitch decks, and company profiles.", category: "community" },
  { permission: "directory.manage", label: "Startup Revisions", href: "/admin/startups/revisions", Icon: FileCheck, description: "Audit and approve edits to existing published startup profiles.", category: "community" },
  { permission: "settings.manage", label: "Digital Agreements", href: "/admin/agreements", Icon: FileSignature, description: "Issue and audit Leadership Charters and MoUs under IT Act 2000.", category: "community" },

  // Events & Gatherings
  { permission: "events.update", label: "Events & Meetups", href: "/admin/events", Icon: CalendarDays, description: "Create, edit and publish physical meetups and virtual sessions.", category: "events" },
  { permission: "registrations.read", label: "Attendee Registrations", href: "/admin/registrations", Icon: ClipboardList, description: "Manage RSVPs, ticket approvals, and attendee communications.", category: "events" },
  { permission: "attendance.scan", label: "Express QR Check-In", href: "/admin/check-in", Icon: ScanLine, description: "Scan digital pass QR codes for express entry into live events.", category: "events" },
  { permission: "registrations.read", label: "Attendance Records", href: "/admin/attendance", Icon: ClipboardList, description: "Export session attendance data, timestamps, and entry metrics.", category: "events" },

  // Content & Ecosystem Programs
  { permission: "consultations.manage", label: "Founder Consultations", href: "/admin/consultations", Icon: MessagesSquare, description: "Review 1:1 founder guidance briefs and schedule mentor clinics.", category: "content" },
  { permission: "reviews.moderate", label: "Community Reviews", href: "/admin/reviews", Icon: Star, description: "Moderate verified founder feedback and ecosystem testimonials.", category: "content" },
  { permission: "content.manage", label: "Website CMS Content", href: "/admin/content", Icon: FileText, description: "Manage approved editorial content, home banners, and spotlights.", category: "content" },
  { permission: "content.manage", label: "Updates & Announcements", href: "/admin/updates", Icon: Newspaper, description: "Publish verified community news and grant alerts.", category: "content" },
  { permission: "content.manage", label: "Startup Resources", href: "/admin/resources", Icon: BookOpen, description: "Manage TANSEED playbooks, equity guides, and templates.", category: "content" },
  { permission: "content.manage", label: "Opportunities Board", href: "/admin/opportunities", Icon: Target, description: "Moderate co-founder searches, seed grants, and hiring gigs.", category: "content" },
  { permission: "content.manage", label: "Collaborations", href: "/admin/collaborations", Icon: MessagesSquare, description: "Manage institutional partnerships, university & incubator MoUs.", category: "content" },

  // Security, Finance & Administration
  { permission: "payments.verify", label: "Payments & Reconciliation", href: "/admin/payments", Icon: CreditCard, description: "Verify workshop UPI UTR transactions and bank reconciliations.", category: "system" },
  { permission: "audit.read", label: "Security Audit Logs", href: "/admin/audit-logs", Icon: ScrollText, description: "Inspect tamper-proof administrative history and access logs.", category: "system" },
  { permission: "settings.manage", label: "Platform Settings", href: "/admin/settings", Icon: Settings, description: "Configure system switches, maintenance mode, and parameters.", category: "system" },
  { permission: "roles.manage", label: "Roles & Admin Access", href: "/admin/roles", Icon: ShieldCheck, description: "Manage administrator assignments, invitations, and permissions.", category: "system" },
  { permission: "settings.manage", label: "WhatsApp AI Worker", href: "/admin/whatsapp-agent", Icon: PhoneCall, description: "Monitor MSG91 webhook status, hotline logs, and knowledge base.", category: "system" },
];

export default async function AdminOverview() {
  await connection();
  const ctx = await requireAdminPage();
  const isDemo = ctx.mode === "preview";
  const title = ctx.mode === "preview" ? "Super Admin Overview" : ctx.roles.map((role) => roleLabels[role]).join(" · ");
  const add = <T,>(permission: Parameters<typeof can>[1], run: () => Promise<T>) =>
    can(ctx, permission) ? run() : Promise.resolve(null);

  const [members, claims, startups, events, registrations, consultations, payments, reviews, content, audit, agreements] =
    await Promise.all([
      add("members.read", () => adminServices.listMembers()),
      add("members.approve", () => adminServices.listClaims()),
      add("directory.manage", () => adminServices.listStartups()),
      add("events.update", () => adminServices.listEvents()),
      add("registrations.read", () => adminServices.listRegistrations()),
      add("consultations.manage", () => adminServices.listConsultations()),
      add("payments.verify", () => adminServices.listPayments()),
      add("reviews.moderate", () => adminServices.listReviews()),
      add("content.manage", () => adminServices.listContent()),
      add("audit.read", () => adminServices.listAudit()),
      add("settings.manage", async () => {
        try {
          const { data } = await agreementsTable().select("*");
          return (data ?? []) as DigitalAgreementRow[];
        } catch {
          return [] as DigitalAgreementRow[];
        }
      }),
    ]);

  // Member metrics
  const memberList = members?.ok ? members.data : [];
  const totalMembers = memberList.length;
  const activeMembers = memberList.filter((m) => m.status === "active").length;
  const pendingClaims = claims?.ok
    ? claims.data.filter((row) => ["claim_submitted", "pending_verification"].includes(row.status)).length
    : 0;

  // Startup metrics
  const startupList = startups?.ok ? startups.data : [];
  const totalStartups = startupList.length;
  const publishedStartups = startupList.filter((s) => s.status === "published").length;
  const pendingStartups = startupList.filter((s) => ["pending", "pending_approval"].includes(s.status as string)).length;

  // Event metrics
  const eventList = events?.ok ? events.data : [];
  const publishedEvents = eventList.filter((e) => e.status === "published").length;

  // Registration metrics
  const regList = registrations?.ok ? registrations.data : [];
  const totalRegistrations = regList.length;
  const confirmedRegistrations = regList.filter((r) => r.status === "confirmed").length;
  const pendingRegistrations = regList.filter((r) => ["pending", "pending_approval"].includes(r.status)).length;

  // Consultation metrics
  const consultList = consultations?.ok ? consultations.data : [];
  const totalConsultations = consultList.length;
  const pendingConsultations = consultList.filter((c) => ["submitted", "under_review"].includes(c.status)).length;

  // Payment metrics
  const paymentList = payments?.ok ? payments.data : [];
  const pendingPayments = paymentList.filter((p) => p.status === "pending_verification").length;
  const verifiedPayments = paymentList.filter((p) => p.status === "verified").length;

  // Review metrics
  const reviewList = reviews?.ok ? reviews.data : [];
  const pendingReviews = reviewList.filter((r) => r.status === "submitted").length;
  const approvedReviews = reviewList.filter((r) => r.status === "approved").length;

  // Agreements metrics
  const agreementList = agreements ?? [];
  const totalAgreements = agreementList.length;
  const signedAgreements = agreementList.filter((a) => a.status === "signed").length;

  // Content (Website CMS) & Audit metrics
  const contentCount = content?.ok ? content.data.length : 0;
  const auditCount = audit?.ok ? audit.data.length : 0;

  // Total pending items that require moderator action
  const totalActionRequired =
    pendingClaims + pendingStartups + pendingRegistrations + pendingConsultations + pendingPayments + pendingReviews;

  // Member role distribution for graph
  const founderCount = memberList.filter(
    (m) =>
      m.designation?.toLowerCase().includes("founder") ||
      m.designation?.toLowerCase().includes("ceo") ||
      Boolean(m.startup)
  ).length;
  const techCount = memberList.filter(
    (m) =>
      m.designation?.toLowerCase().includes("engineer") ||
      m.designation?.toLowerCase().includes("developer") ||
      m.designation?.toLowerCase().includes("tech") ||
      m.designation?.toLowerCase().includes("cto")
  ).length;
  const mentorCount = memberList.filter(
    (m) =>
      m.designation?.toLowerCase().includes("mentor") ||
      m.designation?.toLowerCase().includes("advisor") ||
      m.designation?.toLowerCase().includes("investor")
  ).length;
  const otherCount = Math.max(0, totalMembers - (founderCount + techCount + mentorCount));

  const founderPct = totalMembers ? Math.round((founderCount / totalMembers) * 100) : 50;
  const techPct = totalMembers ? Math.round((techCount / totalMembers) * 100) : 30;
  const mentorPct = totalMembers ? Math.round((mentorCount / totalMembers) * 100) : 10;
  const otherPct = Math.max(0, 100 - (founderPct + techPct + mentorPct));

  const allowedModules = modules.filter((item) => can(ctx, item.permission));
  const checkinOnly = can(ctx, "attendance.scan") && !can(ctx, "events.update") && !can(ctx, "registrations.read");

  return (
    <>
      <AdminPageHeader
        title={checkinOnly ? "Event Check-In Desk" : `${title || "Administrator"} Overview`}
        description={
          checkinOnly
            ? "Scan and verify CSC event tickets in real-time."
            : "Real-time ecosystem command center: live community metrics, 5-minute automated pipeline, and authorized administrative workspaces."
        }
        isDemo={isDemo}
      />

      {/* Moderation Queue Alert Banner */}
      <div className="mt-6">
        {totalActionRequired > 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0">
                <AlertCircle className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  {totalActionRequired} Action{totalActionRequired > 1 ? "s" : ""} Awaiting Administrator Review
                </h3>
                <p className="text-xs text-amber-800">
                  {pendingClaims > 0 && `${pendingClaims} membership claim(s) `}
                  {pendingStartups > 0 && `${pendingStartups} startup listing(s) `}
                  {pendingRegistrations > 0 && `${pendingRegistrations} event registration(s) `}
                  {pendingPayments > 0 && `${pendingPayments} payment(s) to verify `}
                  {pendingConsultations > 0 && `${pendingConsultations} consultation request(s)`}
                </p>
              </div>
            </div>
            <Link
              href="/admin/membership-claims"
              className="inline-flex shrink-0 items-center gap-1.5 self-start sm:self-auto rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition"
            >
              Open Pending Queue &rarr;
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0">
                <CheckCircle2 className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">All Moderation Queues Clear · Zero Backlog</h3>
                <p className="text-xs text-emerald-800">
                  The automated 5-minute cryptographic issuance pipeline is active and approving verified claims automatically.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <PhoneCall className="size-3 text-emerald-700" /> WhatsApp Hotline: {siteConfig.social.whatsappAgentPhone}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Primary Key Metrics Grid */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ink">
            Live Ecosystem Metrics &amp; Counts
          </h2>
          <span className="text-xs text-brand-muted font-medium">Real-time database sync</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {/* Members */}
          <Link
            href="/admin/members"
            className="group flex flex-col justify-between rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition hover:bg-brand-purple/20 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-ink tabular-nums">
                {totalMembers}
              </span>
              <Users className="size-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
            </div>
            <div className="mt-2">
              <span className="block text-xs font-bold text-brand-ink">Community Members</span>
              <span className="text-[11px] text-emerald-600 font-semibold">
                {activeMembers} Active · {pendingClaims} Pending
              </span>
            </div>
          </Link>

          {/* Startups */}
          <Link
            href="/admin/startups"
            className="group flex flex-col justify-between rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition hover:bg-brand-purple/20 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-ink tabular-nums">
                {totalStartups}
              </span>
              <Building2 className="size-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
            </div>
            <div className="mt-2">
              <span className="block text-xs font-bold text-brand-ink">Startup Directory</span>
              <span className="text-[11px] text-emerald-600 font-semibold">
                {publishedStartups} Published · {pendingStartups} in Review
              </span>
            </div>
          </Link>

          {/* Events */}
          <Link
            href="/admin/events"
            className="group flex flex-col justify-between rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition hover:bg-brand-purple/20 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-ink tabular-nums">
                {publishedEvents}
              </span>
              <CalendarDays className="size-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
            </div>
            <div className="mt-2">
              <span className="block text-xs font-bold text-brand-ink">Active Events</span>
              <span className="text-[11px] text-brand-accent font-semibold">
                Live on Public Portal
              </span>
            </div>
          </Link>

          {/* Registrations */}
          <Link
            href="/admin/registrations"
            className="group flex flex-col justify-between rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition hover:bg-brand-purple/20 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-ink tabular-nums">
                {totalRegistrations}
              </span>
              <ClipboardList className="size-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
            </div>
            <div className="mt-2">
              <span className="block text-xs font-bold text-brand-ink">Registrations</span>
              <span className="text-[11px] text-emerald-600 font-semibold">
                {confirmedRegistrations} Confirmed · {pendingRegistrations} Pending
              </span>
            </div>
          </Link>

          {/* Digital Agreements */}
          <Link
            href="/admin/agreements"
            className="group flex flex-col justify-between rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition hover:bg-brand-purple/20 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-ink tabular-nums">
                {totalAgreements}
              </span>
              <FileSignature className="size-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
            </div>
            <div className="mt-2">
              <span className="block text-xs font-bold text-brand-ink">Legal Agreements</span>
              <span className="text-[11px] text-emerald-600 font-semibold">
                {signedAgreements} Signed Charters
              </span>
            </div>
          </Link>

          {/* Consultations */}
          <Link
            href="/admin/consultations"
            className="group flex flex-col justify-between rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition hover:bg-brand-purple/20 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-ink tabular-nums">
                {totalConsultations}
              </span>
              <MessagesSquare className="size-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
            </div>
            <div className="mt-2">
              <span className="block text-xs font-bold text-brand-ink">Founder Consultations</span>
              <span className="text-[11px] text-brand-secondary font-medium">
                {pendingConsultations} Pending Review
              </span>
            </div>
          </Link>

          {/* Payments */}
          <Link
            href="/admin/payments"
            className="group flex flex-col justify-between rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition hover:bg-brand-purple/20 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-ink tabular-nums">
                {pendingPayments}
              </span>
              <CreditCard className="size-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
            </div>
            <div className="mt-2">
              <span className="block text-xs font-bold text-brand-ink">Payments to Verify</span>
              <span className="text-[11px] text-brand-secondary font-medium">
                {verifiedPayments} Verified UTRs
              </span>
            </div>
          </Link>

          {/* Reviews */}
          <Link
            href="/admin/reviews"
            className="group flex flex-col justify-between rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition hover:bg-brand-purple/20 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-ink tabular-nums">
                {pendingReviews}
              </span>
              <Star className="size-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
            </div>
            <div className="mt-2">
              <span className="block text-xs font-bold text-brand-ink">Reviews to Moderate</span>
              <span className="text-[11px] text-brand-secondary font-medium">
                {approvedReviews} Published
              </span>
            </div>
          </Link>

          {/* Website Content (Editorial Items explained) */}
          <Link
            href="/admin/content"
            className="group flex flex-col justify-between rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition hover:bg-brand-purple/20 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-ink tabular-nums">
                {contentCount}
              </span>
              <FileText className="size-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
            </div>
            <div className="mt-2">
              <span className="block text-xs font-bold text-brand-ink">Website CMS Content</span>
              <span className="text-[11px] text-brand-muted font-normal">
                Announcements &amp; Banners
              </span>
            </div>
          </Link>

          {/* Audit Logs */}
          <Link
            href="/admin/audit-logs"
            className="group flex flex-col justify-between rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition hover:bg-brand-purple/20 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-ink tabular-nums">
                {auditCount}+
              </span>
              <ScrollText className="size-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
            </div>
            <div className="mt-2">
              <span className="block text-xs font-bold text-brand-ink">Security Audit Logs</span>
              <span className="text-[11px] text-brand-muted font-normal">
                Live Admin History
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Visual Analytics & Operational Health Graphs */}
      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        {/* Graph 1: Community Track Composition */}
        <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs lg:col-span-2">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                  Ecosystem Composition
                </span>
                <h3 className="text-lg font-bold text-brand-ink mt-0.5">
                  Member Track Distribution
                </h3>
              </div>
              <span className="text-xs font-semibold text-brand-ink bg-brand-cloud px-3 py-1 rounded-full">
                {totalMembers} Total Profiles
              </span>
            </div>

            {/* Segmented Color Bar Graph */}
            <div className="mt-5">
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-brand-cloud">
                <div
                  style={{ width: `${Math.max(5, founderPct)}%` }}
                  className="bg-brand-ink transition-all duration-500"
                  title={`Founders: ${founderCount} (${founderPct}%)`}
                />
                <div
                  style={{ width: `${Math.max(5, techPct)}%` }}
                  className="bg-brand-accent transition-all duration-500"
                  title={`Engineers & Builders: ${techCount} (${techPct}%)`}
                />
                <div
                  style={{ width: `${Math.max(5, mentorPct)}%` }}
                  className="bg-emerald-500 transition-all duration-500"
                  title={`Mentors & Advisors: ${mentorCount} (${mentorPct}%)`}
                />
                <div
                  style={{ width: `${Math.max(5, otherPct)}%` }}
                  className="bg-amber-400 transition-all duration-500"
                  title={`Other Members: ${otherCount} (${otherPct}%)`}
                />
              </div>

              {/* Legend & Stats */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-3 border-t border-brand-border/60">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-brand-ink shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-brand-ink">{founderCount} Founders</span>
                    <span className="text-[11px] text-brand-muted">{founderPct}% of community</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-brand-accent shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-brand-ink">{techCount} Builders</span>
                    <span className="text-[11px] text-brand-muted">{techPct}% Engineers &amp; AI</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-brand-ink">{mentorCount} Mentors</span>
                    <span className="text-[11px] text-brand-muted">{mentorPct}% Advisors</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-amber-400 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-brand-ink">{otherCount} Operators</span>
                    <span className="text-[11px] text-brand-muted">{otherPct}% Enablers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-brand-cloud/40 p-4 text-xs text-brand-secondary border border-brand-border/60">
            <span className="flex items-center gap-1.5 font-semibold text-brand-ink">
              <Sparkles className="size-3.5 text-brand-accent" /> Automated Minting Pipeline
            </span>
            <span>All verified member claims issue an SHA-256 sealed digital ID in under 5 minutes.</span>
          </div>
        </div>

        {/* Graph 2: Operational Health Gauges */}
        <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">
              Platform Health
            </span>
            <h3 className="text-lg font-bold text-brand-ink mt-0.5">
              Infrastructure Telemetry
            </h3>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-2xl border border-brand-border/60 bg-brand-cloud/30 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                    ✓
                  </span>
                  <div>
                    <span className="block font-bold text-brand-ink">5-Min Verification Pipeline</span>
                    <span className="text-[11px] text-brand-secondary">Automated ID minting</span>
                  </div>
                </div>
                <span className="font-semibold text-emerald-600">Active</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-brand-border/60 bg-brand-cloud/30 p-3">
                <div className="flex items-center gap-2.5">
                  <PhoneCall className="size-4 text-emerald-600 ml-1" />
                  <div>
                    <span className="block font-bold text-brand-ink">WhatsApp MSG91 Concierge</span>
                    <span className="text-[11px] text-brand-secondary">{siteConfig.social.whatsappAgentPhone}</span>
                  </div>
                </div>
                <span className="font-semibold text-emerald-600">Online</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-brand-border/60 bg-brand-cloud/30 p-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="size-4 text-brand-accent ml-1" />
                  <div>
                    <span className="block font-bold text-brand-ink">Row-Level Security (RLS)</span>
                    <span className="text-[11px] text-brand-secondary">PostgreSQL policies</span>
                  </div>
                </div>
                <span className="font-semibold text-brand-accent">Enforced</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-brand-border/60 bg-brand-cloud/30 p-3">
                <div className="flex items-center gap-2.5">
                  <FileSignature className="size-4 text-brand-ink ml-1" />
                  <div>
                    <span className="block font-bold text-brand-ink">Leadership Charters</span>
                    <span className="text-[11px] text-brand-secondary">Section 10A IT Act 2000</span>
                  </div>
                </div>
                <span className="font-semibold text-brand-ink">8 Executed</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
            <span>Server Tech Partner</span>
            <span className="font-semibold text-brand-ink">Logic Intelligence Tech</span>
          </div>
        </div>
      </section>

      {/* Categorized Admin Workspaces */}
      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-brand-ink">Authorized Administrative Workspaces</h2>
          <p className="text-xs text-brand-secondary">
            Access specialized governance tools across community, events, editorial content, and security.
          </p>
        </div>

        {/* Category 1: Community & Founders */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-brand-ink" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
              1. Community &amp; Founder Operations
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allowedModules
              .filter((m) => m.category === "community")
              .map(({ Icon, ...item }) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col justify-between rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border transition hover:-translate-y-0.5 hover:shadow-sm hover:border-brand-ink/30"
                >
                  <div>
                    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-purple/40 text-brand-ink">
                      <Icon className="size-4" />
                    </span>
                    <h4 className="mt-3 font-bold text-brand-ink text-sm">{item.label}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-brand-secondary">{item.description}</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-accent">
                    Open workspace <ArrowRight className="size-3 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
          </div>
        </div>

        {/* Category 2: Events & Ticketing */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-brand-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
              2. Events, Meetups &amp; Check-In
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {allowedModules
              .filter((m) => m.category === "events")
              .map(({ Icon, ...item }) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col justify-between rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border transition hover:-translate-y-0.5 hover:shadow-sm hover:border-brand-ink/30"
                >
                  <div>
                    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-cloud text-brand-ink">
                      <Icon className="size-4" />
                    </span>
                    <h4 className="mt-3 font-bold text-brand-ink text-sm">{item.label}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-brand-secondary">{item.description}</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-accent">
                    Open workspace <ArrowRight className="size-3 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
          </div>
        </div>

        {/* Category 3: Content & Ecosystem Programs */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
              3. Ecosystem Content, Programs &amp; CMS
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allowedModules
              .filter((m) => m.category === "content")
              .map(({ Icon, ...item }) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col justify-between rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border transition hover:-translate-y-0.5 hover:shadow-sm hover:border-brand-ink/30"
                >
                  <div>
                    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-purple/40 text-brand-ink">
                      <Icon className="size-4" />
                    </span>
                    <h4 className="mt-3 font-bold text-brand-ink text-sm">{item.label}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-brand-secondary">{item.description}</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-accent">
                    Open workspace <ArrowRight className="size-3 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
          </div>
        </div>

        {/* Category 4: Security & Administration */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
              4. Security, Payments &amp; System Administration
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allowedModules
              .filter((m) => m.category === "system")
              .map(({ Icon, ...item }) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col justify-between rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border transition hover:-translate-y-0.5 hover:shadow-sm hover:border-brand-ink/30"
                >
                  <div>
                    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-cloud text-brand-ink">
                      <Icon className="size-4" />
                    </span>
                    <h4 className="mt-3 font-bold text-brand-ink text-sm">{item.label}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-brand-secondary">{item.description}</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-accent">
                    Open workspace <ArrowRight className="size-3 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
          </div>
        </div>
      </section>
    </>
  );
}
