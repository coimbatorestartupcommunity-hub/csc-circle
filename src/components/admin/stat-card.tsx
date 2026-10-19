import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";

export function StatCard({
  label,
  value,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const inner = (
    <div
      className={cn(
        "group flex flex-col gap-1 rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border transition-colors",
        href && "hover:bg-brand-purple/30",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-brand-ink tabular-nums">{value}</span>
        {href ? (
          <ArrowUpRight className="size-4 text-brand-muted transition-transform group-hover:translate-x-0.5" />
        ) : null}
      </div>
      <span className="text-xs text-brand-muted">{label}</span>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
