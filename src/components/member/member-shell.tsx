"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  IdCard,
  Ticket,
  CalendarDays,
  UserCircle,
  MessagesSquare,
  Star,
  Settings,
  FileText,
  LogOut,
  Rocket,
  UsersRound,
  Menu,
  Home,
  Briefcase,
} from "lucide-react";
import { cn } from "cn";
import { Container } from "@/components/common/container";
import { BrandLogo } from "@/components/layout/brand-logo";
import { StatusBadge } from "@/components/member/status-badge";
import { AccountAvatar } from "@/components/layout/account-avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MemberNotificationMenu } from "@/components/member/member-notification-menu";

const nav = [
  { href: "/member", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/member/id-card", label: "Member ID", icon: IdCard },
  { href: "/member/events", label: "Events Pass", icon: Ticket },
  { href: "/member/profile", label: "Profile", icon: UserCircle },
  { href: "/member/startups", label: "My Startups", icon: Rocket },
  { href: "/member/opportunities", label: "Post Opportunities", icon: Briefcase },
  { href: "/members", label: "View CSC Profiles", icon: UsersRound },
  { href: "/member/consultations", label: "Consultations", icon: MessagesSquare },
  { href: "/member/settings", label: "Settings", icon: Settings },
];

export interface MemberShellProps {
  memberName: string;
  avatarUrl?: string;
  statusLabel: string;
  statusTone: string;
  accountHref: string;
  accountLabel: string;
  children: React.ReactNode;
}

export function MemberShell({
  memberName,
  avatarUrl,
  statusLabel,
  statusTone,
  accountHref,
  accountLabel,
  children,
}: MemberShellProps) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact || href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-brand-cloud">
      {/* Member top bar */}
      <div className="w-full border-b border-brand-border bg-brand-white">
        <Container className="flex h-16 items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open member navigation" className="lg:hidden shrink-0"><Menu /></Button>} />
              <SheetContent side="left" className="w-[min(86vw,22rem)] overflow-y-auto p-4">
                <SheetHeader className="border-b border-brand-border px-0"><SheetTitle>Member navigation</SheetTitle></SheetHeader>
                <nav className="flex flex-col gap-1 py-3" aria-label="Member">
                  {nav.map((item) => {
                    const active = isActive(item.href, item.exact);
                    return <SheetClose key={item.href} render={<Link href={item.href} prefetch={true} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium", active ? "bg-brand-ink text-brand-white" : "text-brand-secondary hover:bg-brand-cloud")} />}>
                      <item.icon className="size-4" aria-hidden />{item.label}
                    </SheetClose>;
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            <BrandLogo showWordmark={false} markSize={36} />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <MemberNotificationMenu />
            <div className="hidden shrink-0 items-center gap-2 text-right lg:flex">
              <p className="whitespace-nowrap text-sm font-semibold text-brand-ink">{memberName}</p>
              <StatusBadge label={statusLabel} tone={statusTone} className="shrink-0 whitespace-nowrap" />
            </div>
            <Link
              href="/"
              aria-label="Back to Home Page"
              title="Back to Home Page"
              className="inline-flex size-9 sm:h-9 sm:w-auto shrink-0 items-center justify-center gap-2 rounded-full sm:rounded-lg border border-brand-border bg-brand-white text-brand-muted hover:text-brand-ink sm:text-xs sm:font-semibold sm:text-brand-ink transition hover:bg-brand-cloud focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-3"
            >
              <Home className="size-4" aria-hidden="true" />
              <span className="hidden lg:inline">Back to Home Page</span>
              <span className="sr-only lg:hidden">Back to Home Page</span>
            </Link>
            <Link
              href={accountHref}
              aria-label="View Profile"
              title="View Profile"
              className="shrink-0 rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink"
            >
              <AccountAvatar name={memberName} src={avatarUrl} className="size-8 sm:size-9" />
            </Link>
            <Link
              href={accountHref}
              className="hidden sm:inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-brand-ink px-2.5 text-xs font-semibold whitespace-nowrap text-brand-white outline-none transition hover:bg-brand-ink/90 focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-3"
              aria-current={pathname === accountHref ? "page" : undefined}
            >
              {accountLabel}
            </Link>
            <form action="/auth/signout" method="post" className="shrink-0">
              <button
                type="submit"
                aria-label="Sign out"
                className="flex size-9 items-center justify-center rounded-full text-brand-muted ring-1 border border-brand-border ring-brand-border transition-colors hover:bg-brand-cloud hover:text-brand-ink"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </Container>
      </div>

      <div className="mx-auto flex w-full max-w-[96rem] overflow-x-hidden flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8 lg:py-8 xl:px-8">
        {/* Nav */}
        <nav
          aria-label="Member"
          className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1"
        >
          {nav.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-ink text-brand-white"
                    : "text-brand-secondary hover:bg-brand-white hover:text-brand-ink",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="w-full min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
