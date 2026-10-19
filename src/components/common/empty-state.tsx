import * as React from "react";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

/** Accessible, well-designed empty / no-results state. */
export function EmptyState({
  icon: IconCmp,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-3xl border border-dashed border-brand-border bg-brand-cloud/60 px-6 py-14 text-center",
        className,
      )}
    >
      {IconCmp ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-white text-brand-accent ring-1 ring-brand-border">
          <IconCmp className="size-6" aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="text-xl font-semibold text-brand-ink text-balance">
        {title}
      </h3>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-brand-muted">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** Small visible marker shown on development fixture content. */
export function FixtureNotice({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-gold px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-brand-ink uppercase",
        className,
      )}
      title="Development fixture — not real CSC content"
    >
      Sample data
    </span>
  );
}
