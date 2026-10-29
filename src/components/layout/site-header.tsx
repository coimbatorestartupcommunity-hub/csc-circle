"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { CtaLink } from "@/components/common/cta-link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { AccountAvatar } from "@/components/layout/account-avatar";
import { MemberNotificationMenu } from "@/components/member/member-notification-menu";
import { primaryNav, routes } from "@/lib/content/site";

/** Sticky, responsive site header with primary nav + Join / Login CTAs. */
export function SiteHeader() {
  const pathname = usePathname();
  const authenticationFlow = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth"]
    .some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const [scrolled, setScrolled] = React.useState(false);
  const [account, setAccount] = React.useState<{
    authenticated: boolean; loading: boolean; name?: string; avatarUrl?: string | null;
    isAdmin?: boolean; accountHref?: string; accountLabel?: string; membershipLabel?: string;
  }>({ authenticated: false, loading: true });

  React.useEffect(() => {
    let current = true;
    if (authenticationFlow) return () => { current = false; };
    const loadAccount = async () => {
      try {
        const response = await fetch("/api/member/header", { cache: "no-store" });
        const next = await response.json();
        if (current) setAccount({ ...next, loading: false });
      } catch {
        if (current) setAccount({ authenticated: false, loading: false });
      }
    };
    void loadAccount();
    window.addEventListener("focus", loadAccount);
    return () => { current = false; window.removeEventListener("focus", loadAccount); };
  }, [pathname, authenticationFlow]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    if (authenticationFlow) return;
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [authenticationFlow]);

  if (authenticationFlow || pathname === "/member" || pathname.startsWith("/member/") || pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors duration-200",
        scrolled
          ? "border-brand-border bg-brand-white/85 backdrop-blur-md supports-backdrop-filter:bg-brand-white/70"
          : "border-transparent bg-brand-white/0",
      )}
    >
      <div className="mx-auto flex h-16 w-full items-center justify-between gap-2 px-3 sm:gap-3 sm:px-5 lg:h-18 lg:px-7 2xl:px-9">
        <BrandLogo className="shrink-0" />

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-0 xl:flex"
          aria-label="Primary"
        >
          {primaryNav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-1.5 py-2 text-xs font-medium whitespace-nowrap transition-colors 2xl:px-2 2xl:text-[13px]",
                  active
                    ? "text-brand-ink"
                    : "text-brand-secondary hover:text-brand-ink",
                )}
              >
                {item.label}
                {active ? (
                  <span className="mx-1.5 block h-0.5 rounded-full bg-brand-accent" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {account.loading ? <span className="hidden h-8 w-20 animate-pulse rounded-lg bg-brand-cloud xl:inline-flex" aria-label="Loading account" /> : account.authenticated ? (
            <div className="hidden shrink-0 items-center gap-1.5 xl:flex">
              <AccountAvatar name={account.name ?? "Member"} src={account.avatarUrl} className="size-7 shrink-0" />
              <span className="hidden max-w-28 truncate text-xs font-semibold text-brand-ink 2xl:inline">{account.name}</span>
              {account.isAdmin ? <CtaLink href="/member/profile" variant="outline" size="md" arrow={false} className="h-8 px-2.5 text-[11px]">Profile</CtaLink> : null}
              <CtaLink href={account.accountHref ?? "/member/profile"} size="md" arrow={false} className="h-8 px-2.5 text-[11px]">
                {account.accountLabel ?? "Profile"}
              </CtaLink>
            </div>
          ) : (
            <CtaLink href={routes.login} variant="ghost" size="md" arrow={false} className="hidden h-8 whitespace-nowrap px-2.5 text-xs xl:inline-flex">
              Log In
            </CtaLink>
          )}
          {!account.authenticated && !account.loading ? <CtaLink href={routes.join} size="md" arrow={false} className="hidden h-8 whitespace-nowrap px-3 text-xs xl:inline-flex">Join Community</CtaLink> : null}
          {account.authenticated ? <MemberNotificationMenu /> : null}
          <MobileNavigation account={account} />
        </div>
      </div>
    </header>
  );
}
