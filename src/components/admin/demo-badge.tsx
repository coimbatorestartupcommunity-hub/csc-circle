import * as React from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "cn";

/** Marks admin data as DEMO (dev preview). Never shown in production. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-gold px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-brand-ink uppercase",
        className,
      )}
      title="Development demo data — not real CSC records"
    >
      <FlaskConical className="size-3" /> Demo
    </span>
  );
}
