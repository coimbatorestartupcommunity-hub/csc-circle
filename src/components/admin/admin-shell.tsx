"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  Building2,
  CalendarDays,
  ClipboardList,
  ScanLine,
  CheckSquare,
  MessagesSquare,
  CreditCard,
  Star,
  FileText,
  Bell,
  ScrollText,
  Settings,
  Handshake,
  UserPlus,
  ShieldCheck,
  Menu,
  LogOut,
  Home,
  UserRound,
} from "lucide-react";
import { cn } from "cn";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { AccountAvatar } from "@/components/layout/account-avatar";
import type { Permission } from "@/lib/admin/permissions";
import { isAdminRouteActive } from "@/lib/admin/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  perm?: Permission;
  anyPerm?: Permission[];
}

const navGroups: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Community",
    items: [
      { href: "/admin/members", label: "Members", icon: Users, perm: "members.read" },
      { href: "/admin/membership-claims", label: "Claims", icon: FileCheck, perm: "members.approve" },
      { href: "/admin/startups", label: "Startups", icon: Building2, perm: "directory.manage" },
      { href: "/admin/startups/revisions", label: "Startup Revisions", icon: FileCheck, perm: "directory.manage" },
      { href: "/admin/collaborations", label: "Collaborations", icon: Handshake, perm: "content.manage" },
    ],
  },
  {
    heading: "Events",
    items: [
      { href: "/admin/events", label: "Events", icon: CalendarDays, perm: "events.update" },
      { href: "/admin/registrations", label: "Registrations", icon: ClipboardList, perm: "registrations.read" },
      { href: "/admin/check-in", label: "Check-in", icon: ScanLine, perm: "attendance.scan" },
      { href: "/admin/attendance", label: "Attendance", icon: CheckSquare, perm: "registrations.read" },
    ],
  },
  {
    heading: "Operations",
    items: [
      { href: "/admin/consultations", label: "Consultations", icon: MessagesSquare, perm: "consultations.manage" },
      { href: "/admin/payments", label: "Payments", icon: CreditCard, perm: "payments.verify" },
      { href: "/admin/reviews", label: "Reviews", icon: Star, perm: "reviews.moderate" },
    ],
  },
  {
    heading: "Platform",
    items: [
      { href: "/admin/content", label: "Content", icon: FileText, perm: "content.manage" },
      { href: "/admin/notifications", label: "Notifications", icon: Bell, anyPerm: ["roles.manage", "events.publish"] },
      { href: "/admin/audit-logs", label: "Audit logs", icon: ScrollText, perm: "audit.read" },
      { href: "/admin/settings", label: "Settings", icon: Settings, perm: "settings.manage" },
      { href: "/admin/invitations", label: "Administrator Invitations", icon: UserPlus, perm: "roles.manage" },
      { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck, perm: "roles.manage" },
    ],
  },
];

function NavList({
  permissions,
  onNavigate,
}: {
  permissions: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const allowed = new Set(permissions);
  return (
    <nav className="flex flex-col gap-4" aria-label="Admin">
      {navGroups.map((group) => {
        const items = group.items.filter((i) => (!i.perm || allowed.has(i.perm)) && (!i.anyPerm || i.anyPerm.some((permission) => allowed.has(permission))));
        if (items.length === 0) return null;
        return (
          <div key={group.heading} className="flex flex-col gap-1">
            <p className="px-3 text-[10px] font-semibold tracking-[0.12em] text-brand-muted uppercase">
              {group.heading}
            </p>
            {items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : isAdminRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-ink text-brand-white"
                      : "text-brand-secondary hover:bg-brand-purple/50 hover:text-brand-ink",
                  )}
                >
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  displayName,
  roleLabel,
  permissions,
  children,
}: {
  displayName: string;
  roleLabel: string;
  permissions: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const crumbs = pathname.split("/").filter(Boolean);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    void fetch("/api/member/header", { cache: "no-store" }).then((response) => response.json()).then((account) => {
      if (alive && account.authenticated) setAvatarUrl(account.avatarUrl ?? null);
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  return (
    <div className="flex min-h-screen bg-brand-cloud">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-brand-border bg-brand-white p-4 lg:flex">
        <BrandLogo showWordmark={false} markSize={34} />
        <NavList permissions={permissions} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center justify-between gap-3 border-b border-brand-border bg-brand-white/90 px-3 backdrop-blur-md sm:px-4">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger
                render={<Button variant="outline" size="icon" aria-label="Open menu" className="lg:hidden" />}
              >
                <Menu />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto p-4">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                <div className="mb-4">
                  <BrandLogo showWordmark={false} markSize={34} />
                </div>
                <NavList permissions={permissions} />
              </SheetContent>
            </Sheet>
            <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm text-brand-muted sm:flex">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 ? <span className="text-brand-border">/</span> : null}
                  <span className={cn(i === crumbs.length - 1 && "font-medium text-brand-ink")}>
                    {c.replace(/-/g, " ")}
                  </span>
                </span>
              ))}
            </nav>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              aria-label="Back to Home Page"
              title="Back to Home Page"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-white px-2.5 text-xs font-semibold whitespace-nowrap text-brand-ink transition hover:bg-brand-cloud focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-3"
            >
              <Home className="size-4" aria-hidden="true" />
              <span className="hidden lg:inline">Back to Home Page</span>
              <span className="sr-only lg:hidden">Back to Home Page</span>
            </Link>
            <div className="hidden shrink-0 items-center gap-2 text-right xl:flex">
              <p className="whitespace-nowrap text-sm font-semibold text-brand-ink">{displayName}</p>
              <p className="whitespace-nowrap text-xs text-brand-muted">{roleLabel}</p>
            </div>
            <AccountAvatar name={displayName} src={avatarUrl} className="hidden size-8 shrink-0 sm:block" />
            <Link href="/member/profile" aria-current={pathname === "/member/profile" ? "page" : undefined} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-white px-2.5 text-xs font-semibold whitespace-nowrap text-brand-ink transition hover:bg-brand-cloud focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-3">
              <UserRound className="size-4" aria-hidden="true" />
              <span className="hidden lg:inline">Profile</span>
              <span className="sr-only lg:hidden">Profile</span>
            </Link>
            <Link href="/admin" aria-current={pathname === "/admin" ? "page" : undefined} className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-brand-ink px-2.5 text-xs font-semibold whitespace-nowrap text-brand-white outline-none transition hover:bg-brand-ink/90 focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-3">
              Admin Dashboard
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                aria-label="Sign out"
                className="flex size-9 items-center justify-center rounded-full text-brand-muted ring-1 ring-brand-border transition-colors hover:bg-brand-cloud hover:text-brand-ink"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
