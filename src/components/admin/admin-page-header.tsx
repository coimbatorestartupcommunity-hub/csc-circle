import * as React from "react";
import { DemoBadge } from "@/components/admin/demo-badge";

export function AdminPageHeader({
  title,
  description,
  action,
  isDemo,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  isDemo?: boolean;
}) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="break-words text-xl font-bold tracking-tight text-brand-ink sm:text-2xl">
            {title}
          </h1>
          {isDemo ? <DemoBadge /> : null}
        </div>
        {description ? (
          <p className="break-words text-xs sm:text-sm text-brand-muted">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {action}
        </div>
      ) : null}
    </div>
  );
}
