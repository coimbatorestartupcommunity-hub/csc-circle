"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, MapPin, Clock, Search, Filter, Sparkles, ArrowRight, UserPlus, Coins, Code, Award, Users } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface OpportunityItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  organization?: string | null;
  summary?: string | null;
  location?: string | null;
  participationMode?: string | null;
  deadline?: string | null;
  orgLogoPath?: string | null;
}

const CATEGORY_TAGS = [
  { label: "All Opportunities", icon: Sparkles },
  { label: "Co-Founder Search", icon: UserPlus },
  { label: "Core Team & Engineering", icon: Code },
  { label: "Startup Grant & Funding", icon: Coins },
  { label: "Hackathon & Challenge", icon: Award },
  { label: "Mentorship & Fellowship", icon: Users },
];

function toCmsImageUrl(path: string | null | undefined): string | null {
  return path ? `/api/cms/image?path=${encodeURIComponent(path)}` : null;
}

function toDeadline(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(d.getTime())
    ? null
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
}

export function OpportunityTagsFilter({
  opportunities,
}: {
  opportunities: OpportunityItem[];
}) {
  const [selectedTag, setSelectedTag] = React.useState("All Opportunities");
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    return opportunities.filter((item) => {
      const matchesTag =
        selectedTag === "All Opportunities" ||
        item.category.toLowerCase().includes(selectedTag.toLowerCase()) ||
        (selectedTag.includes("Co-Founder") && item.category.toLowerCase().includes("co-founder")) ||
        (selectedTag.includes("Engineering") && (item.category.toLowerCase().includes("tech") || item.category.toLowerCase().includes("engineering"))) ||
        (selectedTag.includes("Grant") && (item.category.toLowerCase().includes("grant") || item.category.toLowerCase().includes("funding"))) ||
        (selectedTag.includes("Fellowship") && (item.category.toLowerCase().includes("fellow") || item.category.toLowerCase().includes("mentor")));

      const matchesQuery =
        !query.trim() ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.organization && item.organization.toLowerCase().includes(query.toLowerCase())) ||
        (item.summary && item.summary.toLowerCase().includes(query.toLowerCase()));

      return matchesTag && matchesQuery;
    });
  }, [opportunities, selectedTag, query]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Search & Tag Pills */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search co-founders, engineering roles, grants, hackathons…"
            className="pl-10 h-11 rounded-2xl border-brand-border bg-white text-xs sm:text-sm"
          />
        </div>

        {/* Filter Pills with smooth horizontal right scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
          {CATEGORY_TAGS.map((tag) => {
            const Icon = tag.icon;
            const isSelected = selectedTag === tag.label;
            return (
              <button
                key={tag.label}
                type="button"
                onClick={() => setSelectedTag(tag.label)}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-98 cursor-pointer ${
                  isSelected
                    ? "bg-brand-ink text-white shadow-xs"
                    : "bg-white text-brand-secondary border border-brand-border hover:bg-brand-cloud hover:text-brand-ink"
                }`}
              >
                <Icon className={`size-3.5 ${isSelected ? "text-white" : "text-brand-muted"}`} />
                <span>{tag.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Results */}
      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => {
            const logo = toCmsImageUrl(o.orgLogoPath);
            const deadline = toDeadline(o.deadline || null);
            return (
              <Link
                key={o.id}
                href={`/opportunities/${o.slug}`}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-brand-border bg-brand-white p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-ink"
              >
                <div className="flex items-center gap-3">
                  {logo ? (
                    <Image
                      src={logo}
                      alt={`${o.organization ?? "Organization"} logo`}
                      width={40}
                      height={40}
                      unoptimized
                      className="size-10 rounded-full object-contain ring-1 ring-brand-border"
                    />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded-full bg-brand-blue/40 text-brand-ink">
                      <Building2 className="size-5" aria-hidden />
                    </span>
                  )}
                  <span className="text-xs font-semibold text-brand-accent">{o.category}</span>
                </div>
                <h3 className="text-base font-bold text-brand-ink group-hover:text-brand-accent transition-colors">{o.title}</h3>
                {o.organization && (
                  <p className="text-sm font-medium text-brand-secondary">{o.organization}</p>
                )}
                {o.summary && (
                  <p className="line-clamp-3 text-sm leading-relaxed text-brand-secondary">
                    {o.summary}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-brand-muted">
                  {o.location || o.participationMode ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden />
                      {[o.location, o.participationMode].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                  {deadline && <span>Apply by {deadline}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-brand-border bg-white p-8 text-center">
          <p className="text-xs text-brand-muted">No listings matching &ldquo;{query || selectedTag}&rdquo;.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedTag("All Opportunities");
              setQuery("");
            }}
            className="mt-3 text-xs font-semibold text-brand-accent hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
