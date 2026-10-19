"use client";

import * as React from "react";
import { SearchX, Users } from "lucide-react";
import { DirectoryFiltersBar } from "@/components/directory/directory-filters";
import { StartupCard } from "@/components/directory/startup-card";
import { EmptyState } from "@/components/common/empty-state";
import { CtaLink } from "@/components/common/cta-link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  emptyDirectoryFilters,
  filterStartups,
} from "@/lib/services/directory";
import type { DirectoryFilters, Startup } from "@/types";

function SkeletonGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-3xl bg-brand-white p-6 ring-1 ring-brand-border"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DirectoryClient({ startups }: { startups: Startup[] }) {
  const [filters, setFilters] =
    React.useState<DirectoryFilters>(emptyDirectoryFilters);
  const [loading, setLoading] = React.useState(true);

  // Simulate the initial data fetch so loading skeletons are exercised. Phase 1
  // replaces this with a real async query against Supabase.
  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const result = React.useMemo(
    () => filterStartups(startups, filters),
    [startups, filters],
  );

  // No approved/published profiles at all — invite founders to participate.
  if (startups.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No published founder profiles yet."
        description="The directory opens as founders join CSC Circle and approve their profiles. Add yours to be among the first."
      >
        <CtaLink href="/login" size="md">
          Add your startup
        </CtaLink>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <DirectoryFiltersBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(emptyDirectoryFilters)}
        resultCount={result.total}
        totalCount={startups.length}
      />

      {loading ? (
        <SkeletonGrid />
      ) : result.items.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {result.items.map((startup) => (
            <StartupCard key={startup.id} startup={startup} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No startups match your filters."
          description="Try a different search term, industry or collaboration intent."
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilters(emptyDirectoryFilters)}
          >
            Clear filters
          </Button>
        </EmptyState>
      )}
    </div>
  );
}
