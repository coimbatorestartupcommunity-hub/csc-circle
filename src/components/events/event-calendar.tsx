"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { eventCategoryLabels } from "@/lib/content/taxonomy";
import {
  eventDayParts,
  formatEventTime,
} from "@/lib/format";
import { siteConfig } from "@/lib/content/site";
import type { EventRecord } from "@/types";

function monthKey(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: siteConfig.timezone,
  }).format(new Date(iso));
}

/** Agenda-style calendar: events grouped by month, each with a date rail. */
export function EventCalendar({
  events,
  selectedId,
  onSelect,
}: {
  events: EventRecord[];
  selectedId?: string;
  onSelect?: (event: EventRecord) => void;
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, EventRecord[]>();
    for (const e of events) {
      const key = monthKey(e.startsAt);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [events]);

  return (
    <div className="flex flex-col gap-8">
      {groups.map(([month, monthEvents]) => (
        <section key={month} className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold tracking-wide text-brand-muted uppercase">
            {month}
          </h3>
          <ul className="flex flex-col gap-3">
            {monthEvents.map((event) => {
              const { day, month: mon } = eventDayParts(event.startsAt);
              const selected = event.id === selectedId;
              const content = (
                <>
                  <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-purple text-brand-ink">
                    <span className="text-lg leading-none font-bold">{day}</span>
                    <span className="text-[10px] font-semibold">{mon}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-base font-semibold text-brand-ink">
                        {event.title}
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-brand-cloud text-brand-secondary"
                      >
                        {eventCategoryLabels[event.category]}
                      </Badge>
                    </span>
                    <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-muted">
                      <span>{formatEventTime(event.startsAt)} IST</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" aria-hidden />
                        {event.format === "online" ? "Online (Google Meet)" : event.location}
                      </span>
                    </span>
                  </span>
                </>
              );

              const className = cn(
                "flex w-full items-center gap-4 rounded-2xl bg-brand-white p-4 text-left ring-1 transition-colors outline-none hover:bg-brand-cloud focus-visible:ring-3 focus-visible:ring-ring/50",
                selected ? "ring-2 ring-brand-accent" : "ring-brand-border",
              );

              return (
                <li key={event.id}>
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(event)}
                      aria-pressed={selected}
                      className={className}
                    >
                      {content}
                    </button>
                  ) : (
                    <Link
                      href={`/events/${event.slug}`}
                      className={className}
                    >
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
