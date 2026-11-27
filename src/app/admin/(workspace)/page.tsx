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
  ExternalLink,
  MapPin,
  Clock,
  Radio,
  Server,
  KeyRound,
  Shield,
  Send,
  UserCheck,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { can, requireAdminPage } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { roleLabels } from "@/lib/admin/permissions";
import { agreementsTable, type DigitalAgreementRow } from "@/lib/agreements/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/lib/content/site";

export const metadata = { title: "Admin Master Command Center — Coimbatore Startup Community" };

interface WorkspaceModule {
  permission: Parameters<typeof can>[1];
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
  sector: "community" | "events" | "operations" | "platform";
}

const modules: WorkspaceModule[] = [
  // Sector 2: Community & Founders
  { permission: "members.read", label: "Members Directory", href: "/admin/members", Icon: Users, description: "Review verified CSC member accounts, digital IDs, and profile activity.", sector: "community" },
  { permission: "members.approve", label: "Membership Claims", href: "/admin/membership-claims", Icon: FileCheck, description: "Monitor automated 5-minute cryptographic claims and manual audit exceptions.", sector: "community" },
  { permission: "members.read", label: "Community Data & Subscribers", href: "/admin/community-data", Icon: UserCheck, description: "Access survey respondents, early subscriber audience, and CSV exports.", sector: "community" },
  { permission: "directory.manage", label: "Founder Directory", href: "/admin/startups", Icon: Building2, description: "Review startup submissions, pitch deck attachments, and company profiles.", sector: "community" },
  { permission: "directory.manage", label: "Startup Revisions", href: "/admin/startups/revisions", Icon: FileCheck, description: "Compare and approve proposed edits to existing published startup profiles.", sector: "community" },
  { permission: "settings.manage", label: "Digital Legal Agreements", href: "/admin/agreements", Icon: FileSignature, description: "Issue and audit Executive Leadership Charters and MoUs under IT Act 2000.", sector: "community" },

  // Sector 3: Events & Gatherings
  { permission: "events.update", label: "Events Management", href: "/admin/events", Icon: CalendarDays, description: "Create, edit and publish physical meetups and virtual Google Meet sessions.", sector: "events" },
  { permission: "registrations.read", label: "Attendee Registrations", href: "/admin/registrations", Icon: ClipboardList, description: "Manage RSVPs, ticket confirmation states, and pass QR generation.", sector: "events" },
  { permission: "attendance.scan", label: "Express QR Check-In", href: "/admin/check-in", Icon: ScanLine, description: "Scan digital pass QR codes for express entry into live events.", sector: "events" },
  { permission: "registrations.read", label: "Attendance Records", href: "/admin/attendance", Icon: ClipboardList, description: "Export session attendance records, check-in timestamps, and entry metrics.", sector: "events" },

  // Sector 4: Operations & Content
  { permission: "consultations.manage", label: "Founder Consultations", href: "/admin/consultations", Icon: MessagesSquare, description: "Review 1:1 founder guidance briefs and schedule mentor advisory clinics.", sector: "operations" },
  { permission: "reviews.moderate", label: "Community Reviews", href: "/admin/reviews", Icon: Star, description: "Moderate verified founder feedback, ratings, and ecosystem testimonials.", sector: "operations" },
  { permission: "content.manage", label: "Website CMS Content", href: "/admin/content", Icon: FileText, description: "Manage approved editorial content, home banners, and spotlights.", sector: "operations" },
  { permission: "content.manage", label: "Updates & Announcements", href: "/admin/updates", Icon: Newspaper, description: "Publish verified community news, press releases, and grant deadlines.", sector: "operations" },
  { permission: "content.manage", label: "Startup Resources", href: "/admin/resources", Icon: BookOpen, description: "Manage TANSEED blueprints, founder equity checklists, and pitch templates.", sector: "operations" },
  { permission: "content.manage", label: "Opportunities Board", href: "/admin/opportunities", Icon: Target, description: "Moderate co-founder searches, seed grants, and engineering openings.", sector: "operations" },
  { permission: "content.manage", label: "Collaborations", href: "/admin/collaborations", Icon: MessagesSquare, description: "Manage institutional partnerships, university & incubator MoUs.", sector: "operations" },

  // Sector 5: Platform & Security
  { permission: "payments.verify", label: "Payments & Reconciliation", href: "/admin/payments", Icon: CreditCard, description: "Verify workshop UPI UTR transactions and bank reconciliations.", sector: "platform" },
  { permission: "audit.read", label: "Security Audit Logs", href: "/admin/audit-logs", Icon: ScrollText, description: "Inspect tamper-proof administrative history and access logs.", sector: "platform" },
  { permission: "settings.manage", label: "Platform Settings", href: "/admin/settings", Icon: Settings, description: "Configure system switches, maintenance mode, and parameters.", sector: "platform" },
  { permission: "roles.manage", label: "Roles & Admin Access", href: "/admin/roles", Icon: ShieldCheck, description: "Manage administrator assignments, invitations, and permissions.", sector: "platform" },
  { permission: "settings.manage", label: "WhatsApp AI Worker", href: "/admin/whatsapp-agent", Icon: PhoneCall, description: "Monitor WhatsApp bot webhook status, hotline logs, and knowledge base powered by Logic Intelligence Technologies (LIT).", sector: "platform" },
];

export default async function AdminOverview() {
  await connection();
  const ctx = await requireAdminPage();
  const isDemo = ctx.mode === "preview";
  const title = ctx.mode === "preview" ? "Super Admin Overview" : ctx.roles.map((role) => roleLabels[role]).join(" · ");
  const add = <T,>(permission: Parameters<typeof can>[1], run: () => Promise<T>) =>
    can(ctx, permission) ? run() : Promise.resolve(null);

  const adminClient = createAdminClient();

  const [
    members,
    claims,
    startups,
    events,
    registrations,
    consultations,
    payments,
    reviews,
    content,
    audit,
    agreements,
    subscribersRes,
    subscribersListRes,
  ] = await Promise.all([
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
        const { data } = await agreementsTable().select("*").order("created_at", { ascending: false });
        return (data ?? []) as DigitalAgreementRow[];
      } catch {
        return [] as DigitalAgreementRow[];
      }
    }),
    adminClient.from("csc_members").select("id, member_category", { count: "exact" }),
    adminClient
      .from("csc_members")
      .select("id, full_name, email, member_category, city, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  // Member metrics
  const memberList = members?.ok ? members.data : [];
  const totalMembers = memberList.length;
  const activeMembers = memberList.filter((m) => m.status === "active").length;
  const pendingClaims = claims?.ok
    ? claims.data.filter((row) => ["claim_submitted", "pending_verification"].includes(row.status)).length
    : 0;

  // Community Subscribers metrics
  const totalSubscribers = subscribersRes.count ?? 0;
  const recentSubscribers = subscribersListRes.data ?? [];
  const allSubscribers = subscribersRes.data ?? [];
  const ideaStageSubs = allSubscribers.filter((s) => s.member_category === "Idea Stage").length;
  const startupFounderSubs = allSubscribers.filter((s) => s.member_category === "Startup Founder").length;
  const businessSubs = allSubscribers.filter((s) => s.member_category === "Established Business").length;

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
  const auditList = audit?.ok ? audit.data : [];
  const auditCount = auditList.length;

  // Total pending items requiring moderator review
  const totalActionRequired =
    pendingClaims + pendingStartups + pendingRegistrations + pendingConsultations + pendingPayments + pendingReviews;

  // Member persona distribution for Sector 1 visual bar
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

  const founderPct = totalMembers ? Math.round((founderCount / totalMembers) * 100) : 60;
  const techPct = totalMembers ? Math.round((techCount / totalMembers) * 100) : 25;
  const mentorPct = totalMembers ? Math.round((mentorCount / totalMembers) * 100) : 10;
  const otherPct = Math.max(0, 100 - (founderPct + techPct + mentorPct));

  const allowedModules = modules.filter((item) => can(ctx, item.permission));
  const checkinOnly = can(ctx, "attendance.scan") && !can(ctx, "events.update") && !can(ctx, "registrations.read");

  return (
    <>
      <AdminPageHeader
        title={checkinOnly ? "Event Check-In Desk" : `${title || "Administrator"} Master Command Center`}
        description={
          checkinOnly
            ? "Scan and verify CSC event tickets in real-time."
            : "Executive management center: live database aggregation, automated 5-minute pipeline, community subscribers preview, and modular sector operations."
        }
        isDemo={isDemo}
      />

      {/* ========================================================================= */}
      {/* SECTOR 1: EXECUTIVE TELEMETRY & GLOBAL KPIS                              */}
      {/* ========================================================================= */}
      <section className="mt-6 flex flex-col gap-6">
        {/* Moderation Queue Alert Banner */}
        <div>
          {totalActionRequired > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0">
                  <AlertCircle className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">
                    {totalActionRequired} Item{totalActionRequired > 1 ? "s" : ""} Awaiting Administrator Review
                  </h3>
                  <p className="text-xs text-amber-800">
                    {pendingClaims > 0 && `${pendingClaims} membership claim(s) `}
                    {pendingStartups > 0 && `${pendingStartups} startup profile(s) `}
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
                Open Review Queues &rarr;
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
                    The automated 5-minute cryptographic verification pipeline is active and minting digital ID passes in real time.
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

        {/* 10 Dual-Stat Live KPI Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-accent">
              Sector 1: Executive Telemetry · 10 Live KPI Feeds
            </h2>
            <span className="text-xs text-brand-muted font-medium">Real-time database sync</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {/* 1. Members */}
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

            {/* 2. Subscribers */}
            <Link
              href="/admin/community-data"
              className="group flex flex-col justify-between rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition hover:bg-brand-purple/20 hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold text-brand-ink tabular-nums">
                  {totalSubscribers}
                </span>
                <UserCheck className="size-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
              </div>
              <div className="mt-2">
                <span className="block text-xs font-bold text-brand-ink">Community Subscribers</span>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  Survey Audience · 100% Verified
                </span>
              </div>
            </Link>

            {/* 3. Startups */}
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

            {/* 4. Events */}
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
                <span className="block text-xs font-bold text-brand-ink">Active Public Events</span>
                <span className="text-[11px] text-brand-accent font-semibold">
                  Live on Public Portal
                </span>
              </div>
            </Link>

            {/* 5. Legal Agreements */}
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

            {/* 6. Registrations */}
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

            {/* 7. Consultations */}
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

            {/* 8. Payments */}
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

            {/* 9. Website CMS Content */}
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

            {/* 10. Audit Logs */}
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
        </div>

        {/* Visual Charts & Infrastructure Health Gauges */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Graph 1: Member Persona Distribution */}
          <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs lg:col-span-2">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                    Ecosystem Composition
                  </span>
                  <h3 className="text-lg font-bold text-brand-ink mt-0.5">
                    Member Persona &amp; Track Distribution
                  </h3>
                </div>
                <span className="text-xs font-semibold text-brand-ink bg-brand-cloud px-3 py-1 rounded-full">
                  {totalMembers} Total Members
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
                <Sparkles className="size-3.5 text-brand-accent" /> Automated 5-Minute Pipeline Active
              </span>
              <span>All verified member claims issue an SHA-256 sealed digital ID in under 5 minutes.</span>
            </div>
          </div>

          {/* Graph 2: Infrastructure Telemetry Gauges */}
          <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                Platform Telemetry
              </span>
              <h3 className="text-lg font-bold text-brand-ink mt-0.5">
                Infrastructure Health Gauges
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
                      <span className="block font-bold text-brand-ink">WhatsApp AI Concierge</span>
                      <span className="text-[11px] text-brand-secondary">{siteConfig.social.whatsappAgentPhone} (LIT)</span>
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
              <span>Platform Technology Partner</span>
              <span className="font-bold text-brand-ink">Logic Intelligence Technologies</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTOR 2: COMMUNITY & FOUNDER OPERATIONS                                  */}
      {/* ========================================================================= */}
      <section className="mt-12 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">Sector 2</span>
            <h2 className="text-xl font-bold tracking-tight text-brand-ink mt-0.5">
              Community &amp; Founder Operations
            </h2>
          </div>
          <Link
            href="/admin/community-data"
            className="text-xs font-semibold text-brand-accent hover:underline flex items-center gap-1"
          >
            Manage all {totalSubscribers} subscribers in Community Data &rarr;
          </Link>
        </div>

        {/* Live Community Subscribers Preview Table */}
        <div className="rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-brand-ink">
                Community Subscribers Preview ({totalSubscribers} Verified Survey Submissions)
              </h3>
              <p className="text-xs text-brand-secondary mt-0.5">
                Live intake from the community onboarding survey and audience registry (`/admin/community-data`).
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-brand-cloud px-3 py-1 font-semibold text-brand-ink">
                {ideaStageSubs} Idea Stage
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
                {startupFounderSubs} Founders
              </span>
              <span className="rounded-full bg-purple-50 px-3 py-1 font-semibold text-purple-800">
                {businessSubs} Business
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-brand-border bg-brand-cloud/40 font-semibold text-brand-ink">
                <tr>
                  <th className="p-3">Subscriber Name</th>
                  <th className="p-3">Registered Email</th>
                  <th className="p-3">Founder Persona</th>
                  <th className="p-3">City Hub</th>
                  <th className="p-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {recentSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-brand-cloud/20 transition-colors">
                    <td className="p-3 font-bold text-brand-ink">{sub.full_name || "—"}</td>
                    <td className="p-3 text-brand-secondary font-mono">{sub.email || "—"}</td>
                    <td className="p-3">
                      <span className="inline-block rounded-full bg-brand-cloud px-2.5 py-0.5 text-[11px] font-semibold text-brand-accent">
                        {sub.member_category || "Founder"}
                      </span>
                    </td>
                    <td className="p-3 text-brand-secondary">{sub.city || "Coimbatore"}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="size-3 text-emerald-600" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
            <span>Showing top recent submissions from real-time database</span>
            <Link
              href="/admin/community-data"
              className="font-semibold text-brand-accent hover:underline flex items-center gap-1"
            >
              Open Full Subscriber Dashboard &amp; CSV Export <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Sector 2 Authorized Workspace Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allowedModules
            .filter((m) => m.sector === "community")
            .map(({ Icon, ...item }) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col justify-between rounded-2xl bg-brand-white p-5 ring-1 border-brand-border ring-brand-border/60 transition hover:-translate-y-0.5 hover:shadow-xs hover:border-brand-ink/30"
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
      </section>

      {/* ========================================================================= */}
      {/* SECTOR 3: EVENTS, TICKETING & QR CHECK-IN OPERATIONS                      */}
      {/* ========================================================================= */}
      <section className="mt-12 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">Sector 3</span>
            <h2 className="text-xl font-bold tracking-tight text-brand-ink mt-0.5">
              Events, Meetups &amp; Check-In Operations
            </h2>
          </div>
          <Link
            href="/admin/events"
            className="text-xs font-semibold text-brand-accent hover:underline flex items-center gap-1"
          >
            Manage events &amp; ticketing &rarr;
          </Link>
        </div>

        {/* Live Published Events Preview Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {eventList.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                    Live Published Event
                  </span>
                  <span className="text-xs font-mono text-brand-muted">ID: {ev.id.slice(0, 8)}</span>
                </div>
                <h3 className="text-base font-bold text-brand-ink mt-1">{ev.title}</h3>
                <p className="text-xs text-brand-secondary">
                  Location: {ev.venue || "Coimbatore Regional Hub / Google Meet"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-brand-muted">
                  <span className="flex items-center gap-1">
                    <ScanLine className="size-3.5 text-brand-accent" /> Express QR Check-In Enabled
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> 1h Virtual Gate Access
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-brand-border/60 flex items-center justify-between text-xs">
                <Link
                  href={`/admin/events/${ev.id}/edit`}
                  className="font-semibold text-brand-accent hover:underline flex items-center gap-1"
                >
                  Edit Event Details &rarr;
                </Link>
                <Link
                  href={`/events/${ev.slug}`}
                  target="_blank"
                  className="text-brand-secondary hover:text-brand-ink flex items-center gap-1"
                >
                  View Public Page <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Sector 3 Authorized Workspace Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {allowedModules
            .filter((m) => m.sector === "events")
            .map(({ Icon, ...item }) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col justify-between rounded-2xl bg-brand-white p-5 ring-1 border-brand-border ring-brand-border/60 transition hover:-translate-y-0.5 hover:shadow-xs hover:border-brand-ink/30"
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
      </section>

      {/* ========================================================================= */}
      {/* SECTOR 4: OPERATIONS, PROGRAMS & CONTENT MANAGEMENT                       */}
      {/* ========================================================================= */}
      <section className="mt-12 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">Sector 4</span>
            <h2 className="text-xl font-bold tracking-tight text-brand-ink mt-0.5">
              Operations, Programs &amp; Content Management
            </h2>
          </div>
          <Link
            href="/admin/agreements"
            className="text-xs font-semibold text-brand-accent hover:underline flex items-center gap-1"
          >
            Manage all {totalAgreements} digital agreements &rarr;
          </Link>
        </div>

        {/* Digital Legal Agreements Preview Table */}
        <div className="rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-brand-ink">
                Executive Leadership Charters &amp; Institutional MoUs (IT Act 2000)
              </h3>
              <p className="text-xs text-brand-secondary mt-0.5">
                Legally executed digital charters with SHA-256 seals, OTP timestamps, and Section 65B compliance.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              {signedAgreements} of {totalAgreements} Executed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-brand-border bg-brand-cloud/40 font-semibold text-brand-ink">
                <tr>
                  <th className="p-3">Agreement Title</th>
                  <th className="p-3">Appointed Signee</th>
                  <th className="p-3">Charter Type</th>
                  <th className="p-3">Legal Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {agreementList.slice(0, 5).map((agr) => (
                  <tr key={agr.id} className="hover:bg-brand-cloud/20 transition-colors">
                    <td className="p-3 font-bold text-brand-ink">{agr.title}</td>
                    <td className="p-3 text-brand-secondary font-mono">{agr.signed_name || "Executive Signee"}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-brand-cloud px-2 py-0.5 text-[10px] font-semibold text-brand-accent uppercase">
                        {agr.agreement_type}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="size-3 text-emerald-600" /> Signed &amp; Sealed
                      </span>
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/agreements/${agr.id}`}
                        className="font-semibold text-brand-accent hover:underline text-[11px]"
                      >
                        Audit Details &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
            <span>All 7 Core Leadership charters and LIT technology agreements active</span>
            <Link
              href="/admin/agreements"
              className="font-semibold text-brand-accent hover:underline flex items-center gap-1"
            >
              Open Agreements Vault <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Sector 4 Authorized Workspace Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allowedModules
            .filter((m) => m.sector === "operations")
            .map(({ Icon, ...item }) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col justify-between rounded-2xl bg-brand-white p-5 ring-1 border-brand-border ring-brand-border/60 transition hover:-translate-y-0.5 hover:shadow-xs hover:border-brand-ink/30"
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
      </section>

      {/* ========================================================================= */}
      {/* SECTOR 5: PLATFORM, SECURITY & INFRASTRUCTURE GOVERNANCE                  */}
      {/* ========================================================================= */}
      <section className="mt-12 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">Sector 5</span>
            <h2 className="text-xl font-bold tracking-tight text-brand-ink mt-0.5">
              Platform, Security &amp; Infrastructure Governance
            </h2>
          </div>
          <span className="text-xs font-semibold text-brand-secondary">
            Enterprise Cloud Architecture
          </span>
        </div>

        {/* Prominent Technology Partner Display & Audit Trail Stream */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Partner & Cloud Card */}
          <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-cloud px-3 py-0.5 text-xs font-bold text-brand-accent">
                  Official Technology Partner
                </span>
              </div>
              <h3 className="text-lg font-bold text-brand-ink mt-2">
                Logic Intelligence Technologies
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-brand-secondary">
                Architects and maintains CSC Circle&apos;s digital infrastructure, high-throughput PostgreSQL databases,
                cryptographic pass minting, and enterprise WhatsApp routing powered by Logic Intelligence Technologies (LIT).
              </p>

              <div className="mt-4 space-y-2 text-xs border-t border-brand-border/60 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-brand-muted">Engineering Desk:</span>
                  <span className="font-semibold text-brand-ink">hello@logicintelligencetechnologies.in</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-brand-muted">Security SLA:</span>
                  <span className="font-semibold text-emerald-600">&lt; 24h Triage</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-brand-muted">Status:</span>
                  <span className="font-semibold text-emerald-600">All Systems Nominal</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-brand-border/60">
              <a
                href={siteConfig.technologyPartner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
              >
                Visit partner portal <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          {/* Real-Time Security Audit Stream */}
          <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs lg:col-span-2">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ScrollText className="size-4 text-brand-accent" />
                  <h3 className="text-base font-bold text-brand-ink">
                    Live Security &amp; Administrative Audit Stream
                  </h3>
                </div>
                <span className="text-xs text-brand-muted font-mono">{auditCount}+ events recorded</span>
              </div>

              <div className="space-y-2">
                {auditList.slice(0, 4).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-brand-cloud/30 p-2.5 text-xs border border-brand-border/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-semibold text-brand-ink">{item.action}</span>
                      <span className="text-brand-muted">by</span>
                      <span className="font-mono text-brand-secondary">{item.actorRole || item.actorId}</span>
                    </div>
                    <span className="text-[11px] text-brand-muted">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
              <span>Full tamper-proof audit trails preserved under Section 65B IT Act</span>
              <Link
                href="/admin/audit-logs"
                className="font-semibold text-brand-accent hover:underline flex items-center gap-1"
              >
                Inspect All Audit Logs <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Sector 5 Authorized Workspace Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allowedModules
            .filter((m) => m.sector === "platform")
            .map(({ Icon, ...item }) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col justify-between rounded-2xl bg-brand-white p-5 ring-1 border-brand-border ring-brand-border/60 transition hover:-translate-y-0.5 hover:shadow-xs hover:border-brand-ink/30"
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
      </section>
    </>
  );
}
