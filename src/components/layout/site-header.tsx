"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { Container } from "@/components/common/container";
import { CtaLink } from "@/components/common/cta-link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { AccountAvatar } from "@/components/layout/account-avatar";
import { primaryNav, routes } from "@/lib/content/site";

/** Sticky, responsive site header with primary nav + Join / Login CTAs. */
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [account, setAccount] = React.useState<{
    authenticated: boolean; loading: boolean; name?: string; avatarUrl?: string | null;
    accountHref?: string; accountLabel?: string; membershipLabel?: string;
  }>({ authenticated: false, loading: true });

  React.useEffect(() => {
    let current = true;
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
  }, [pathname]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname === "/member" || pathname.startsWith("/member/") || pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors duration-200",
        scrolled
          ? "border-brand-border bg-brand-white/85 backdrop-blur-md supports-backdrop-filter:bg-brand-white/70"
          : "border-transparent bg-brand-white/0",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4 lg:h-18">
        <BrandLogo />

        <nav
          className="hidden items-center gap-0.5 xl:flex"
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
                  "rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "text-brand-ink"
                    : "text-brand-secondary hover:text-brand-ink",
                )}
              >
                {item.label}
                {active ? (
                  <span className="mx-3 block h-0.5 rounded-full bg-brand-accent" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {account.loading ? <span className="hidden h-9 w-24 animate-pulse rounded-lg bg-brand-cloud xl:inline-flex" aria-label="Loading account" /> : account.authenticated ? (
            <div className="hidden items-center gap-2 xl:flex">
              <AccountAvatar name={account.name ?? "Member"} src={account.avatarUrl} className="size-8" />
              <span className="hidden max-w-36 truncate text-sm font-medium text-brand-ink 2xl:block">{account.name}</span>
              <span className="hidden max-w-32 text-right text-xs text-brand-muted 2xl:block">
                {account.membershipLabel}
              </span>
              <CtaLink href={account.accountHref ?? "/member/profile"} size="md" arrow={false} className="whitespace-nowrap">
                {account.accountLabel ?? "Profile"}
              </CtaLink>
            </div>
          ) : (
            <CtaLink href={routes.login} variant="ghost" size="md" arrow={false} className="hidden whitespace-nowrap xl:inline-flex">
              Log In
            </CtaLink>
          )}
          {!account.authenticated && !account.loading ? <CtaLink href={routes.join} size="md" arrow={false} className="hidden whitespace-nowrap xl:inline-flex">Join Community</CtaLink> : null}
          <MobileNavigation account={account} />
        </div>
      </Container>
    </header>
  );
}
