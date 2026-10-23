"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { cn } from "cn";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CtaLink } from "@/components/common/cta-link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { primaryNav, routes } from "@/lib/content/site";
import { AccountAvatar } from "@/components/layout/account-avatar";

/** Mobile navigation drawer. Keeps the Join CTA visible (not hidden). */
export function MobileNavigation({ account }: { account: { authenticated: boolean; loading: boolean; name?: string; avatarUrl?: string | null; isAdmin?: boolean; accountHref?: string; accountLabel?: string } }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Open menu"
            className="2xl:hidden"
          />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="right" className="w-[86%] max-w-sm">
        <SheetHeader className="border-b border-brand-border">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <BrandLogo />
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
          {primaryNav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <SheetClose
                key={item.href}
                render={
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-3 text-[15px] font-medium transition-colors",
                      active
                        ? "bg-brand-purple text-brand-ink"
                        : "text-brand-secondary hover:bg-brand-cloud hover:text-brand-ink",
                    )}
                  />
                }
              >
                {item.label}
              </SheetClose>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t border-brand-border p-4">
          {account.loading ? (
            <p className="text-center text-sm text-brand-muted" aria-live="polite">Checking your account…</p>
          ) : account.authenticated ? (
            <>
              <div className="flex items-center gap-3 px-1">
                <AccountAvatar name={account.name ?? "Member"} src={account.avatarUrl} className="size-9" />
                <span className="min-w-0 truncate text-sm font-medium text-brand-ink">{account.name}</span>
              </div>
              {account.isAdmin ? <CtaLink href="/member/profile" variant="outline" arrow={false} className="w-full" onClick={() => setOpen(false)}>Profile</CtaLink> : null}
              <CtaLink href={account.accountHref ?? "/member/profile"} className="w-full" onClick={() => setOpen(false)} arrow={false}>
                {account.accountLabel ?? "Profile"}
              </CtaLink>
              <form action="/auth/signout" method="post">
                <button type="submit" className="w-full rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-ink">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <CtaLink href={routes.join} className="w-full" onClick={() => setOpen(false)}>Join the Community</CtaLink>
              <CtaLink href={routes.login} variant="outline" arrow={false} className="w-full" onClick={() => setOpen(false)}>Log In</CtaLink>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
