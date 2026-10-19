"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { Container } from "@/components/common/container";
import { CtaLink } from "@/components/common/cta-link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { primaryNav, routes } from "@/lib/content/site";

/** Sticky, responsive site header with primary nav + Join / Login CTAs. */
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
          className="hidden items-center gap-1 md:flex"
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
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
          <CtaLink
            href={routes.login}
            variant="ghost"
            size="md"
            arrow={false}
            className="hidden sm:inline-flex"
          >
            Login
          </CtaLink>
          <CtaLink
            href={routes.join}
            size="md"
            arrow={false}
            className="hidden sm:inline-flex"
          >
            Join Community
          </CtaLink>
          <MobileNavigation />
        </div>
      </Container>
    </header>
  );
}
