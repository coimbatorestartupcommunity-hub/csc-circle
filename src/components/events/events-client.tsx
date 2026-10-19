"use client";

import * as React from "react";
import { LayoutGrid, CalendarRange, CalendarX } from "lucide-react";
import { cn } from "cn";
import { EventCard } from "@/components/events/event-card";
import { EventCalendar } from "@/components/events/event-calendar";
import { EventDetailsPanel } from "@/components/events/event-details-panel";
import { ConsultationForm } from "@/components/events/rsvp-form";
import { EmptyState } from "@/components/common/empty-state";
import { CtaLink } from "@/components/common/cta-link";
import { eventCategoryLabels } from "@/lib/content/taxonomy";
import type { EventCategory, EventRecord } from "@/types";

type View = "list" | "calendar";
type Mode = "events" | "consultation";

export function EventsClient({ events }: { events: EventRecord[] }) {
  const [mode, setMode] = React.useState<Mode>("events");
  const [view, setView] = React.useState<View>("list");
  const [category, setCategory] = React.useState<EventCategory | "all">("all");
  const [selectedId, setSelectedId] = React.useState<string | undefined>(
    events[0]?.id,
  );

  const categories = React.useMemo(() => {
    const set = new Set<EventCategory>();
    events.forEach((e) => set.add(e.category));
    return Array.from(set);
  }, [events]);

  const filtered = React.useMemo(
    () =>
      category === "all"
        ? events
        : events.filter((e) => e.category === category),
    [events, category],
  );

  const selected =
    events.find((e) => e.id === selectedId) ?? filtered[0] ?? events[0];

  if (events.length === 0) {
    return (
      <div className="flex flex-col gap-10">
        <EmptyState
          icon={CalendarX}
          title="The Next CSC Gathering Is in the Works."
          description="Join the community to hear about upcoming opportunities to connect and collaborate. In the meantime, you can still request a consultation below."
        >
          <CtaLink href="/login" size="md">
            Join the Community
          </CtaLink>
        </EmptyState>

        <div className="mx-auto w-full max-w-2xl rounded-[2rem] bg-brand-cloud p-6 ring-1 ring-brand-border sm:p-8">
          <h3 className="mb-4 text-lg font-semibold text-brand-ink">
            Request a consultation
          </h3>
          <ConsultationForm />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Mode switch */}
      <div
        className="inline-flex w-fit gap-1 rounded-full bg-brand-cloud p-1 ring-1 ring-brand-border"
        role="tablist"
        aria-label="Events or consultation"
      >
        {(
          [
            ["events", "Browse events"],
            ["consultation", "Request a consultation"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              mode === value
                ? "bg-brand-white text-brand-ink shadow-sm"
                : "text-brand-muted hover:text-brand-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "consultation" ? (
        <div className="mx-auto w-full max-w-2xl rounded-[2rem] bg-brand-cloud p-6 ring-1 ring-brand-border sm:p-8">
          <h3 className="mb-4 text-lg font-semibold text-brand-ink">
            Request a consultation
          </h3>
          <ConsultationForm />
        </div>
      ) : (
        <>
          {/* Category filters + view toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              <CategoryChip
                active={category === "all"}
                onClick={() => setCategory("all")}
              >
                All
              </CategoryChip>
              {categories.map((c) => (
                <CategoryChip
                  key={c}
                  active={category === c}
                  onClick={() => setCategory(c)}
                >
                  {eventCategoryLabels[c]}
                </CategoryChip>
              ))}
            </div>

            <div className="inline-flex gap-1 rounded-full bg-brand-cloud p-1 ring-1 ring-brand-border">
              <ViewToggle
                active={view === "list"}
                onClick={() => setView("list")}
                label="List view"
              >
                <LayoutGrid className="size-4" />
              </ViewToggle>
              <ViewToggle
                active={view === "calendar"}
                onClick={() => setView("calendar")}
                label="Calendar view"
              >
                <CalendarRange className="size-4" />
              </ViewToggle>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
            <div>
              {filtered.length === 0 ? (
                <EmptyState
                  title="No events in this category."
                  description="Try a different category to see more."
                />
              ) : view === "list" ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {filtered.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      selected={event.id === selected?.id}
                      onSelect={(e) => setSelectedId(e.id)}
                    />
                  ))}
                </div>
              ) : (
                <EventCalendar
                  events={filtered}
                  selectedId={selected?.id}
                  onSelect={(e) => setSelectedId(e.id)}
                />
              )}
            </div>

            <div className="lg:sticky lg:top-24">
              {selected ? (
                <EventDetailsPanel
                  event={selected}
                  events={events}
                  onEventChange={setSelectedId}
                />
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-brand-ink text-brand-white"
          : "bg-brand-cloud text-brand-secondary ring-1 ring-brand-border hover:text-brand-ink",
      )}
    >
      {children}
    </button>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-brand-white text-brand-ink shadow-sm"
          : "text-brand-muted hover:text-brand-ink",
      )}
    >
      {children}
    </button>
  );
}
