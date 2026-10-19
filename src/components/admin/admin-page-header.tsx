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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-brand-ink sm:text-2xl">
            {title}
          </h1>
          {isDemo ? <DemoBadge /> : null}
        </div>
        {description ? (
          <p className="text-sm text-brand-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
