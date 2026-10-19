/**
 * Directory data provider.
 *
 * A typed abstraction over the directory data source. Today it serves the
 * development fixtures (when enabled); Phase 1 swaps the body for Supabase
 * queries without changing these signatures or the consuming UI.
 */

import type {
  DirectoryFilters,
  PaginatedResult,
  Startup,
} from "@/types";
import { industryLabels, collaborationLabels } from "@/lib/content/taxonomy";
import { startupFixtures, USE_FIXTURES } from "@/lib/services/fixtures";

/** All approved, published startups eligible for the public directory. */
export function getPublishedStartups(): Startup[] {
  const source = USE_FIXTURES ? startupFixtures : [];
  return source.filter((s) => s.status === "published");
}

/** A small approved subset for the Home page preview. */
export function getFeaturedStartups(limit = 3): Startup[] {
  return getPublishedStartups().slice(0, limit);
}

function matchesSearch(startup: Startup, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    startup.name,
    startup.description,
    startup.founder.name,
    industryLabels[startup.industry],
    ...startup.collaboration.map((c) => collaborationLabels[c]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/**
 * Filter + paginate an in-memory startup list against the active filters.
 * Pure and synchronous so it can run on the server or client.
 */
export function filterStartups(
  startups: Startup[],
  filters: DirectoryFilters,
  page = 1,
  pageSize = 24,
): PaginatedResult<Startup> {
  const filtered = startups.filter((startup) => {
    if (!matchesSearch(startup, filters.search)) return false;
    if (filters.industry !== "all" && startup.industry !== filters.industry) {
      return false;
    }
    if (
      filters.collaboration !== "all" &&
      !startup.collaboration.includes(filters.collaboration)
    ) {
      return false;
    }
    return true;
  });

  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return {
    items,
    total: filtered.length,
    page,
    pageSize,
    hasMore: start + pageSize < filtered.length,
  };
}

export const emptyDirectoryFilters: DirectoryFilters = {
  search: "",
  industry: "all",
  collaboration: "all",
};
