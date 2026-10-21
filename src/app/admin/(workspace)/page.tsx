import Link from "next/link";
import { ArrowRight, CalendarDays, CreditCard, FileCheck, ScanLine, Star, Users, Building2, MessagesSquare, ClipboardList, FileText, Image as ImageIcon, ScrollText, Settings, ShieldCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { can, requireAdminPage } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { roleLabels } from "@/lib/admin/permissions";

export const metadata = { title: "Admin Dashboard" };

const modules = [
  { permission: "members.read" as const, label: "Members", href: "/admin/members", Icon: Users, description: "Review CSC member accounts and membership activity." },
  { permission: "members.approve" as const, label: "Membership Claims", href: "/admin/membership-claims", Icon: FileCheck, description: "Review membership claims awaiting a decision." },
  { permission: "directory.manage" as const, label: "Founder Directory", href: "/admin/startups", Icon: Building2, description: "Review startup submissions and proposed changes." },
  { permission: "directory.manage" as const, label: "Startup Revisions", href: "/admin/startups/revisions", Icon: FileCheck, description: "Compare and review proposed changes to published listings." },
  { permission: "events.update" as const, label: "Events", href: "/admin/events", Icon: CalendarDays, description: "Create, edit and publish CSC events." },
  { permission: "registrations.read" as const, label: "Registrations", href: "/admin/registrations", Icon: ClipboardList, description: "Review event registrations and permitted actions." },
  { permission: "attendance.scan" as const, label: "Event Check-In", href: "/admin/check-in", Icon: ScanLine, description: "Scan tickets and verify attendee entry." },
  { permission: "registrations.read" as const, label: "Attendance Records", href: "/admin/attendance", Icon: ClipboardList, description: "Review permitted attendance records and reports." },
  { permission: "consultations.manage" as const, label: "Consultations", href: "/admin/consultations", Icon: MessagesSquare, description: "Manage community consultation requests." },
  { permission: "payments.verify" as const, label: "Payments", href: "/admin/payments", Icon: CreditCard, description: "Verify submitted event payments." },
  { permission: "reviews.moderate" as const, label: "Reviews", href: "/admin/reviews", Icon: Star, description: "Moderate member reviews." },
  { permission: "content.manage" as const, label: "Website Content", href: "/admin/content", Icon: FileText, description: "Manage approved editorial content." },
  { permission: "media.manage" as const, label: "Media Library", href: "/admin/media", Icon: ImageIcon, description: "Manage authorized website media." },
  { permission: "content.manage" as const, label: "Collaborations", href: "/admin/collaborations", Icon: MessagesSquare, description: "Manage authorized collaboration listings." },
  { permission: "audit.read" as const, label: "Audit Logs", href: "/admin/audit-logs", Icon: ScrollText, description: "Inspect permitted administrative history." },
  { permission: "settings.manage" as const, label: "Settings", href: "/admin/settings", Icon: Settings, description: "Review CSC platform settings." },
  { permission: "roles.manage" as const, label: "Roles & Invitations", href: "/admin/roles", Icon: ShieldCheck, description: "Manage administrator assignments and invitations." },
];

export default async function AdminOverview() {
  const ctx = await requireAdminPage();
  const isDemo = ctx.mode === "preview";
  const title = ctx.mode === "preview" ? "Super Admin Overview" : ctx.roles.map((role) => roleLabels[role]).join(" · ");
  const add = <T,>(permission: Parameters<typeof can>[1], run: () => Promise<T>) => can(ctx, permission) ? run() : Promise.resolve(null);
  const [claims, startups, events, registrations, consultations, payments, reviews, content, media, audit] = await Promise.all([
    add("members.approve", () => adminServices.listClaims()),
    add("directory.manage", () => adminServices.listStartups()),
    add("events.update", () => adminServices.listEvents()),
    add("registrations.read", () => adminServices.listRegistrations()),
    add("consultations.manage", () => adminServices.listConsultations()),
    add("payments.verify", () => adminServices.listPayments()),
    add("reviews.moderate", () => adminServices.listReviews()),
    add("content.manage", () => adminServices.listContent()),
    add("media.manage", () => adminServices.listMedia()),
    add("audit.read", () => adminServices.listAudit()),
  ]);
  const metric = (key: string, label: string, value: number | string, href: string) => ({ key, label, value, href });
  const metrics = [
    claims && metric("claims", "Membership claims", claims.ok ? claims.data.filter((row) => ["claim_submitted", "pending_verification"].includes(row.status)).length : "—", "/admin/membership-claims"),
    startups && metric("startups", "Startup reviews", startups.ok ? startups.data.filter((row) => (row.status as string) === "pending" || (row.status as string) === "pending_approval").length : "—", "/admin/startups"),
    events && metric("events", "Events", events.ok ? events.data.filter((row) => row.status === "published").length : "—", "/admin/events"),
    registrations && metric("registrations", "Registrations", registrations.ok ? registrations.data.filter((row) => ["pending", "pending_approval"].includes(row.status)).length : "—", "/admin/registrations"),
    consultations && metric("consultations", "Consultations", consultations.ok ? consultations.data.filter((row) => ["submitted", "under_review"].includes(row.status)).length : "—", "/admin/consultations"),
    payments && metric("payments", "Payments to verify", payments.ok ? payments.data.filter((row) => row.status === "pending_verification").length : "—", "/admin/payments"),
    reviews && metric("reviews", "Reviews to moderate", reviews.ok ? reviews.data.filter((row) => row.status === "submitted").length : "—", "/admin/reviews"),
    content && metric("content", "Editorial items", content.ok ? content.data.length : "—", "/admin/content"),
    media && metric("media", "Media assets", media.ok ? media.data.length : "—", "/admin/media"),
    audit && metric("audit", "Recent audit records", audit.ok ? audit.data.length : "—", "/admin/audit-logs"),
  ].filter((value): value is NonNullable<typeof value> => Boolean(value));
  const allowedModules = modules.filter((item) => can(ctx, item.permission));
  const checkinOnly = can(ctx, "attendance.scan") && !can(ctx, "events.update") && !can(ctx, "registrations.read");

  return <>
    <AdminPageHeader title={checkinOnly ? "Event Check-In" : `${title || "Administrator"} Dashboard`} description={checkinOnly ? "Scan and verify CSC event tickets. You will only see attendee details needed to confirm a ticket." : "Your CSC administrative workspace is limited to the permissions currently assigned to your verified account."} isDemo={isDemo} />
    {checkinOnly ? <section className="rounded-2xl bg-white p-6 ring-1 ring-brand-border sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold text-brand-ink">Event Check-In</h2><p className="mt-1 max-w-xl text-sm text-brand-secondary">Open the QR scanner to validate tickets for events assigned to your account.</p></div><Link href="/admin/check-in" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 font-semibold text-white"><ScanLine className="size-4" />Open QR Scanner<ArrowRight className="size-4" /></Link></div></section> : null}
    {metrics.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{metrics.map((item) => <StatCard key={item.key} label={item.label} value={item.value} href={item.href} />)}</div> : null}
    <section className="mt-7"><h2 className="mb-3 text-lg font-semibold text-brand-ink">Authorized workspaces</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{allowedModules.map(({ Icon, ...item }) => <Link key={item.href} href={item.href} className="group rounded-2xl bg-white p-5 ring-1 ring-brand-border transition hover:-translate-y-0.5 hover:shadow-sm"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-purple/40 text-brand-ink"><Icon className="size-5" /></span><h3 className="mt-4 font-semibold text-brand-ink">{item.label}</h3><p className="mt-1 text-sm leading-relaxed text-brand-secondary">{item.description}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-accent">Open workspace <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span></Link>)}</div></section>
  </>;
}
