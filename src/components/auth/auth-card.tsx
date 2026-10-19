import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { brandAssets, siteConfig } from "@/lib/content/site";

/** Shared branded card shell for auth pages. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex flex-col items-center gap-6 rounded-[2rem] bg-brand-white p-7 text-center shadow-sm ring-1 ring-brand-border sm:p-9">
        <Image
          src={brandAssets.cscIcon}
          alt={`${siteConfig.legalName} logo`}
          width={56}
          height={56}
          className="rounded-full ring-1 ring-brand-border"
          priority
        />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-brand-ink">{title}</h1>
          {description ? (
            <p className="text-sm leading-relaxed text-brand-muted">{description}</p>
          ) : null}
        </div>
        {children}
        {footer}
        <p className="text-xs text-brand-muted"><Link href="/privacy" className="underline">Privacy Policy</Link> · <Link href="/terms" className="underline">Terms</Link></p>
      </div>
      <div className="mt-5 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink"
        >
          <ArrowLeft className="size-4" /> Back to Home
        </Link>
      </div>
    </div>
  );
}
