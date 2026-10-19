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

/** Mobile navigation drawer. Keeps the Join CTA visible (not hidden). */
export function MobileNavigation() {
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
            className="lg:hidden"
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
          <CtaLink href={routes.join} className="w-full" onClick={() => setOpen(false)}>
            Join the Community
          </CtaLink>
          <CtaLink
            href={routes.login}
            variant="outline"
            arrow={false}
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Member Login
          </CtaLink>
        </div>
      </SheetContent>
    </Sheet>
  );
}
