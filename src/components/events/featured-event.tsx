import * as React from "react";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FixtureNotice } from "@/components/common/empty-state";
import { eventCategoryLabels } from "@/lib/content/taxonomy";
import { formatEventRange } from "@/lib/format";
import type { EventRecord } from "@/types";

/** Prominent featured event banner for the top of the Events page. */
export function FeaturedEvent({ event }: { event: EventRecord }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-purple via-brand-blue to-brand-pink p-8 ring-1 ring-brand-border sm:p-12">
      <div className="flex max-w-2xl flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-white/90 px-3 py-1 text-xs font-semibold text-brand-ink ring-1 ring-brand-border">
          <Sparkles className="size-3.5 text-brand-accent" aria-hidden />
          Featured event
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-brand-white/80 text-brand-secondary">
            {eventCategoryLabels[event.category]}
          </Badge>
          {event.isFixture ? <FixtureNotice /> : null}
        </div>
        <h2 className="text-3xl leading-tight font-bold text-brand-ink text-balance sm:text-4xl">
          {event.title}
        </h2>
        <p className="text-[15px] leading-relaxed text-brand-secondary sm:text-base">
          {event.description}
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-brand-ink">
          <li className="inline-flex items-center gap-2">
            <CalendarDays className="size-4 text-brand-accent" aria-hidden />
            {formatEventRange(event.startsAt, event.endsAt)}
          </li>
          <li className="inline-flex items-center gap-2">
            <MapPin className="size-4 text-brand-accent" aria-hidden />
            {event.venue ? `${event.venue}, ${event.location}` : event.location}
          </li>
        </ul>
      </div>
    </div>
  );
}
