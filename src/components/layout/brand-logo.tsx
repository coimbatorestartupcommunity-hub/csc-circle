import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";
import { brandAssets, siteConfig } from "@/lib/content/site";

export interface BrandLogoProps {
  className?: string;
  /** Show the "CSC Circle" wordmark beside the mark. */
  showWordmark?: boolean;
  markSize?: number;
  href?: string | null;
}

/**
 * The official CSC mark (circular logo) paired with a "CSC Circle" wordmark.
 * The full circular lockup already contains the name + tagline; at nav sizes
 * the tagline is not legible, so we scale the undistorted mark and set the
 * readable wordmark in type beside it.
 */
export function BrandLogo({
  className,
  showWordmark = true,
  markSize = 40,
  href = "/",
}: BrandLogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={brandAssets.cscIcon}
        alt={`${siteConfig.legalName} logo`}
        width={markSize}
        height={markSize}
        className="rounded-full ring-1 ring-brand-border"
        priority
      />
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight whitespace-nowrap text-brand-ink">
            CSC Circle
          </span>
          <span className="mt-0.5 text-[10px] font-medium tracking-[0.14em] whitespace-nowrap text-brand-muted uppercase">
            Coimbatore Startup Community
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;
  return (
    <Link
      href={href}
      aria-label={`${siteConfig.name} — home`}
      className="inline-flex rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {content}
    </Link>
  );
}
