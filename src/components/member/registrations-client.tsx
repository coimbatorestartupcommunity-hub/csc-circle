"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Clock, Ticket, Hash } from "lucide-react";
import { cn } from "cn";
import { StatusBadge } from "@/components/member/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { registrationStatusMeta, registrationTabs } from "@/lib/content/member-taxonomy";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { isPassEligible, type EventRegistration } from "@/types/member";

export function RegistrationsClient({
  registrations,
}: {
  registrations: EventRegistration[];
}) {
  const [tab, setTab] = React.useState(registrationTabs[0].key);
  const active = registrationTabs.find((t) => t.key === tab)!;
  const items = registrations.filter((r) => active.statuses.includes(r.status));

  return (
    <div className="flex flex-col gap-5">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {registrationTabs.map((t) => {
          const count = registrations.filter((r) =>
            t.statuses.includes(r.status),
          ).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                tab === t.key
                  ? "bg-brand-ink text-brand-white"
                  : "bg-brand-white text-brand-secondary ring-1 ring-brand-border hover:text-brand-ink",
              )}
            >
              {t.label}
              {count > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    tab === t.key ? "bg-brand-white/20" : "bg-brand-cloud",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {items.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((r) => {
            const meta = registrationStatusMeta[r.status];
            const eligible = isPassEligible(r.status);
            return (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-brand-ink">{r.eventTitle}</h3>
                  <StatusBadge label={meta.label} tone={meta.tone} />
                </div>
                <ul className="flex flex-col gap-1.5 text-sm text-brand-muted">
                  <li className="flex items-center gap-2">
                    <Clock className="size-4" aria-hidden />
                    {formatEventDate(r.startsAt)} · {formatEventTime(r.startsAt)} IST
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPin className="size-4" aria-hidden />
                    {r.venue ? `${r.venue}, ${r.location}` : r.location}
                  </li>
                  <li className="flex items-center gap-2">
                    <Hash className="size-4" aria-hidden />
                    <span className="font-mono text-xs">{r.reference}</span>
                  </li>
                </ul>
                <div className="mt-1 border-t border-brand-border pt-3">
                  {eligible ? (
                    <Link
                      href={`/member/events/${r.id}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-brand-accent hover:underline"
                    >
                      <Ticket className="size-4" /> View event pass
                    </Link>
                  ) : (
                    <span className="text-sm text-brand-muted">
                      A pass becomes available once this registration is confirmed.
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title={`No ${active.label.toLowerCase()} registrations.`}
          description="When you register for CSC events, they'll appear here by status."
        >
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-ink px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-ink/90"
          >
            Explore CSC Events
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
