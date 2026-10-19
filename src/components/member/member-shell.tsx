"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  IdCard,
  CalendarDays,
  UserCircle,
  MessagesSquare,
  Star,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "cn";
import { Container } from "@/components/common/container";
import { BrandLogo } from "@/components/layout/brand-logo";
import { StatusBadge } from "@/components/member/status-badge";
import { initials } from "@/lib/format";

const nav = [
  { href: "/member", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/member/id-card", label: "Digital ID", icon: IdCard },
  { href: "/member/events", label: "My Events", icon: CalendarDays },
  { href: "/member/profile", label: "Profile", icon: UserCircle },
  { href: "/member/consultations", label: "Consultations", icon: MessagesSquare },
  { href: "/member/reviews", label: "Reviews", icon: Star },
  { href: "/member/settings", label: "Settings", icon: Settings },
];

export interface MemberShellProps {
  memberName: string;
  avatarUrl?: string;
  statusLabel: string;
  statusTone: string;
  children: React.ReactNode;
}

export function MemberShell({
  memberName,
  avatarUrl,
  statusLabel,
  statusTone,
  children,
}: MemberShellProps) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="bg-brand-cloud">
      {/* Member top bar */}
      <div className="border-b border-brand-border bg-brand-white">
        <Container className="flex h-16 items-center justify-between gap-4">
          <BrandLogo showWordmark={false} markSize={36} />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-brand-ink">{memberName}</p>
              <StatusBadge label={statusLabel} tone={statusTone} />
            </div>
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-brand-purple text-sm font-semibold text-brand-ink ring-1 ring-brand-border">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" width={36} height={36} className="size-full object-cover" />
              ) : (
                initials(memberName)
              )}
            </span>
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
        </Container>
      </div>

      <Container className="flex flex-col gap-6 py-6 lg:flex-row lg:gap-8 lg:py-8">
        {/* Nav */}
        <nav
          aria-label="Member"
          className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:w-56 lg:shrink-0 lg:flex-col lg:px-0"
        >
          {nav.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
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
        <div className="min-w-0 flex-1">{children}</div>
      </Container>
    </div>
  );
}
