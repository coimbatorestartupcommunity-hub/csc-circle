import { describe, it, expect } from "vitest";
import { filterStartups, emptyDirectoryFilters } from "@/lib/services/directory";
import type { Startup } from "@/types";

const startups: Startup[] = [
  {
    id: "1",
    slug: "a",
    name: "Alpha AI",
    industry: "ai",
    description: "An AI company for builders.",
    collaboration: ["open-to-collaboration", "looking-for-co-founder"],
    founder: { id: "f1", name: "Asha", role: "Founder" },
    status: "published",
  },
  {
    id: "2",
    slug: "b",
    name: "Beta SaaS",
    industry: "saas",
    description: "B2B workspace tooling.",
    collaboration: ["seeking-technology-support"],
    founder: { id: "f2", name: "Bala", role: "Co-Founder" },
    status: "published",
  },
  {
    id: "3",
    slug: "c",
    name: "Gamma Health",
    industry: "healthtech",
    description: "Healthcare for everyone.",
    collaboration: ["offering-mentorship"],
    founder: { id: "f3", name: "Gita", role: "Founder" },
    status: "published",
  },
];

describe("directory filtering", () => {
  it("returns all with empty filters", () => {
    const r = filterStartups(startups, emptyDirectoryFilters);
    expect(r.total).toBe(3);
    expect(r.items).toHaveLength(3);
  });

  it("searches name, founder, industry and description", () => {
    expect(filterStartups(startups, { ...emptyDirectoryFilters, search: "alpha" }).total).toBe(1);
    expect(filterStartups(startups, { ...emptyDirectoryFilters, search: "bala" }).total).toBe(1);
    expect(filterStartups(startups, { ...emptyDirectoryFilters, search: "healthcare" }).total).toBe(1);
    expect(filterStartups(startups, { ...emptyDirectoryFilters, search: "zzz" }).total).toBe(0);
  });

  it("searches founder-entered industry names", () => {
    const custom = { ...startups[0], industry: "Climate technology" };
    expect(filterStartups([custom], { ...emptyDirectoryFilters, search: "climate" }).total).toBe(1);
  });

  it("filters by industry", () => {
    const r = filterStartups(startups, { ...emptyDirectoryFilters, industry: "ai" });
    expect(r.total).toBe(1);
    expect(r.items[0].name).toBe("Alpha AI");
  });

  it("filters by collaboration intent", () => {
    const r = filterStartups(startups, {
      ...emptyDirectoryFilters,
      collaboration: "offering-mentorship",
    });
    expect(r.total).toBe(1);
    expect(r.items[0].name).toBe("Gamma Health");
  });

  it("paginates with hasMore", () => {
    const r = filterStartups(startups, emptyDirectoryFilters, 1, 2);
    expect(r.items).toHaveLength(2);
    expect(r.hasMore).toBe(true);
    const r2 = filterStartups(startups, emptyDirectoryFilters, 2, 2);
    expect(r2.items).toHaveLength(1);
    expect(r2.hasMore).toBe(false);
  });
});
