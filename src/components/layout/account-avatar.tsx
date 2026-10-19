"use client";

import * as React from "react";
import { initials } from "@/lib/format";

export function AccountAvatar({ name, src, className = "" }: { name: string; src?: string | null; className?: string }) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const failed = Boolean(src && failedSrc === src);
  const safeSrc = React.useMemo(() => {
    if (!src) return null;
    if (src === "/api/member/portrait" || src.startsWith("/api/member/portrait?")) return src;
    try {
      const url = new URL(src);
      return url.protocol === "https:" && /(^|\.)googleusercontent\.com$/i.test(url.hostname) ? url.toString() : null;
    } catch { return null; }
  }, [src]);
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-purple text-sm font-semibold text-brand-ink ring-1 ring-brand-border ${className}`} aria-hidden="true">
      {safeSrc && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safeSrc} alt="" className="size-full object-cover" onError={() => setFailedSrc(src ?? null)} referrerPolicy="no-referrer" />
      ) : initials(name)}
    </span>
  );
}
