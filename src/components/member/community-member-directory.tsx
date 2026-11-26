"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, MapPin, ArrowUpRight, UsersRound, Loader2, Sparkles, Building2, Award } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { designationLabels } from "@/lib/content/member-taxonomy";
import type { MemberDesignation } from "@/types/member";

type CommunityMember = {
  member_id: string;
  display_name: string;
  city: string | null;
  designation: string | null;
  about_me: string | null;
  skills: string[];
  startup_name: string | null;
  whatsapp: string | null;
  has_photo: boolean;
  member_number?: string | null;
  membership_status?: string | null;
};

type PersonaFilter = "all" | "founders" | "idea_stage" | "entrepreneurs" | "investors_mentors" | "innovators";

const personaTabs: { id: PersonaFilter; label: string }[] = [
  { id: "all", label: "All Builders" },
  { id: "founders", label: "Founders & Co-Founders" },
  { id: "idea_stage", label: "Idea Stage / Aspiring" },
  { id: "entrepreneurs", label: "Entrepreneurs & Business Leaders" },
  { id: "investors_mentors", label: "Investors & Mentors" },
  { id: "innovators", label: "Innovators" },
];

function matchesPersona(designation: string | null, filter: PersonaFilter): boolean {
  if (filter === "all") return true;
  if (!designation) return false;
  const d = designation.toLowerCase();

  switch (filter) {
    case "founders":
      return (
        d.includes("founder") ||
        d.includes("co_founder") ||
        d.includes("co-founder") ||
        d.includes("startup_founder")
      );
    case "idea_stage":
      return (
        d.includes("aspiring") ||
        d.includes("idea") ||
        d.includes("student_entrepreneur")
      );
    case "entrepreneurs":
      return (
        d.includes("entrepreneur") ||
        d.includes("business") ||
        d.includes("leader")
      );
    case "investors_mentors":
      return (
        d.includes("investor") ||
        d.includes("angel") ||
        d.includes("mentor") ||
        d.includes("advisor")
      );
    case "innovators":
      return (
        d.includes("innovator") ||
        d.includes("developer") ||
        d.includes("builder")
      );
    default:
      return true;
  }
}

export function CommunityMemberDirectory({
  initialMembers = [],
}: {
  initialMembers?: CommunityMember[];
}) {
  const [query, setQuery] = React.useState("");
  const [activePersona, setActivePersona] = React.useState<PersonaFilter>("all");
  const [members, setMembers] = React.useState<CommunityMember[]>(initialMembers);
  const [hasMore, setHasMore] = React.useState(initialMembers.length >= 50);
  const [busy, setBusy] = React.useState(initialMembers.length === 0);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState("");
  const hasMountedRef = React.useRef(false);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Skip redundant client fetch on first render if initial members present with empty query
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      if (initialMembers.length > 0 && !query) {
        setBusy(false);
        return;
      }
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch(`/api/members?q=${encodeURIComponent(query)}&offset=0`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Member profiles are unavailable.");
        const rows = (payload.members ?? []) as CommunityMember[];
        setMembers(rows);
        setHasMore(Boolean(payload.hasMore ?? rows.length >= 50));
      } catch (cause) {
        if (!controller.signal.aborted) {
          setMembers([]);
          setHasMore(false);
          setError(cause instanceof Error ? cause.message : "Member profiles are unavailable.");
        }
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, query ? 250 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, initialMembers.length]);

  const loadMore = React.useCallback(async () => {
    if (loadingMore || busy || !hasMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/members?q=${encodeURIComponent(query)}&offset=${members.length}`,
      );
      const payload = await response.json();
      if (!response.ok) return;
      const next = (payload.members ?? []) as CommunityMember[];
      setMembers((prev) => {
        const seen = new Set(prev.map((item) => item.member_id));
        return [...prev, ...next.filter((item) => !seen.has(item.member_id))];
      });
      setHasMore(Boolean(payload.hasMore ?? next.length >= 50));
    } finally {
      setLoadingMore(false);
    }
  }, [busy, hasMore, loadingMore, members.length, query]);

  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || busy) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [busy, hasMore, loadMore]);

  const filteredMembers = React.useMemo(() => {
    return members.filter((m) => matchesPersona(m.designation, activePersona));
  }, [members, activePersona]);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6">
      {/* Search Bar */}
      <label className="relative block w-full min-w-0">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-brand-muted sm:left-4" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search founders, co-founders, entrepreneurs, investors, or mentors..."
          className="h-12 w-full min-w-0 rounded-2xl pl-11 pr-3 text-sm sm:h-14 sm:pl-12 sm:pr-4 sm:text-base ring-1 ring-brand-border/80 focus-visible:ring-brand-ink"
          aria-label="Search CSC members"
        />
      </label>

      {/* Persona Filter Chips */}
      <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {personaTabs.map((tab) => {
          const isActive = activePersona === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePersona(tab.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-brand-ink text-brand-white shadow-xs"
                  : "bg-brand-cloud text-brand-secondary hover:bg-brand-border/60 hover:text-brand-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Member Profiles List */}
      {busy ? (
        <div className="flex justify-center py-12" role="status">
          <Loader2 className="size-6 animate-spin text-brand-accent" />
          <span className="sr-only">Loading founder profiles</span>
        </div>
      ) : error ? (
        <p role="alert" className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900">
          {error}
        </p>
      ) : filteredMembers.length ? (
        <ul className="flex min-w-0 flex-col gap-3">
          {filteredMembers.map((m) => (
            <li key={m.member_id} className="min-w-0">
              <Link
                href={`/members/${m.member_id}`}
                className="group grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 rounded-2xl bg-white p-3 ring-1 ring-brand-border transition hover:-translate-y-0.5 hover:shadow-xs sm:flex sm:gap-5 sm:p-5"
              >
                <span className="relative row-span-2 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-purple text-sm font-bold text-brand-ink ring-1 ring-brand-border sm:size-16">
                  {m.has_photo ? (
                    <Image
                      src={`/api/members/${m.member_id}/portrait`}
                      alt=""
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    m.display_name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("")
                  )}
                </span>
                <span className="min-w-0 sm:flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="break-words text-sm font-semibold leading-snug text-brand-ink sm:text-base">
                      {m.display_name}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      <Award className="size-3 shrink-0" />
                      Active Member
                    </span>
                    {m.member_number ? (
                      <span className="rounded-full bg-brand-cloud px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-ink ring-1 ring-brand-border">
                        #{m.member_number}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-snug text-brand-muted sm:gap-x-3 sm:text-sm">
                    {m.designation && (
                      <span className="font-medium text-brand-accent break-words">
                        {designationLabels[m.designation as MemberDesignation] ?? m.designation.replaceAll("_", " ")}
                      </span>
                    )}
                    {m.city && (
                      <span className="inline-flex items-center gap-1 text-brand-secondary">
                        <MapPin className="size-3.5 shrink-0" />
                        {m.city}
                      </span>
                    )}
                  </span>
                  {m.startup_name && (
                    <span className="mt-1 flex items-center gap-1.5 line-clamp-1 break-words text-xs font-semibold leading-snug text-brand-ink sm:text-sm">
                      <Building2 className="size-3.5 shrink-0 text-brand-muted" />
                      {m.startup_name}
                    </span>
                  )}
                  {m.skills && m.skills.length > 0 && (
                    <span className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
                      {m.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-brand-cloud px-2.5 py-0.5 text-xs text-brand-secondary"
                        >
                          {skill}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="col-start-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-accent sm:ml-auto sm:shrink-0 sm:text-sm">
                  View Profile{" "}
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {!busy && !error && hasMore ? (
        <div ref={sentinelRef} className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="gap-2 rounded-xl"
          >
            {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
            {loadingMore ? "Loading more profiles..." : "Load More Profiles"}
          </Button>
        </div>
      ) : null}

      {!busy && !error && !filteredMembers.length ? (
        <section className="rounded-2xl bg-white p-10 text-center ring-1 ring-brand-border">
          <UsersRound className="mx-auto size-8 text-brand-muted" />
          <h2 className="mt-3 font-semibold text-brand-ink">No matching founder profiles found</h2>
          <p className="mt-1 text-sm text-brand-muted">
            {activePersona === "all"
              ? "Members appear here after they choose to share a profile with the CSC community."
              : "Try switching to 'All Builders' or a different persona filter."}
          </p>
        </section>
      ) : null}
    </div>
  );
}
