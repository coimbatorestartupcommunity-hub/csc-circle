import * as React from "react";

export function MemberPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex w-full flex-col items-center gap-3 text-center">
      <div className="flex max-w-3xl flex-col items-center gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-brand-ink">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-brand-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 justify-center">{action}</div> : null}
    </div>
  );
}
