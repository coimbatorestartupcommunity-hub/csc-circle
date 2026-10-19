import * as React from "react";
import { cn } from "cn";

/** Small pill rendering a label + tone from a status meta map. */
export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
