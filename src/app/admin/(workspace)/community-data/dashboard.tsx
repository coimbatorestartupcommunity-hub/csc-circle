"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Clipboard, Download, Search, X } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CommunityDataFilter } from "@/lib/community-data/schema";
import {
  allCurrentStages,
  industrySectors,
  memberCategories,
  supportNeededOptions,
} from "@/lib/community-data/schema";
import type {
  CommunityDataSummary,
  CommunityMember,
  CommunityMemberPage,
} from "@/lib/community-data/service";

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
] as const;

const NOT_PROVIDED = "Not provided";

function queryString(filter: CommunityDataFilter, overrides: Partial<CommunityDataFilter> = {}) {
  const next = { ...filter, ...overrides };
  const params = new URLSearchParams();
  if (next.category) params.set("category", next.category);
  if (next.search) params.set("search", next.search.trim());
  if (next.city) params.set("city", next.city.trim());
  if (next.industry) params.set("industry", next.industry);
  if (next.stage) params.set("stage", next.stage);
  if (next.support) params.set("support", next.support);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.sort !== "newest") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.pageSize !== 25) params.set("pageSize", String(next.pageSize));
  return params.toString();
}
function exportQuery(filter: CommunityDataFilter, format: "csv" | "pdf") {
  const params = new URLSearchParams();
  params.set("format", format);
  if (filter.category) params.set("category", filter.category);
  if (filter.search) params.set("search", filter.search);
  if (filter.city) params.set("city", filter.city);
  if (filter.industry) params.set("industry", filter.industry);
  if (filter.stage) params.set("stage", filter.stage);
  if (filter.support) params.set("support", filter.support);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.sort !== "newest") params.set("sort", filter.sort);
  return params.toString();
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function text(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return NOT_PROVIDED;
  const trimmed = String(value).trim();
  return trimmed ? String(value) : NOT_PROVIDED;
}

function list(value: readonly string[] | null | undefined): string {
  return value && value.length > 0 ? value.join("; ") : NOT_PROVIDED;
}

function withOther(value: string | null | undefined, other: string | null | undefined): string {
  if (!value) return NOT_PROVIDED;
  if (value === "Other") return other?.trim() ? `Other — ${other.trim()}` : "Other";
  return value;
}

function listWithOther(value: readonly string[] | null | undefined, other: string | null | undefined): string {
  if (!value || value.length === 0) return NOT_PROVIDED;
  const shown = value.includes("Other") && other?.trim()
    ? value.map((item) => (item === "Other" ? `Other (${other.trim()})` : item))
    : value;
  return shown.join("; ");
}

function DetailField({ label, value, href }: { label: string; value: string; href?: string }) {
  const missing = value === NOT_PROVIDED;
  return (
    <div className="min-w-0 rounded-xl bg-brand-cloud/70 p-3">
      <dt className="text-xs font-semibold tracking-wide text-brand-muted uppercase">{label}</dt>
      <dd className={`mt-1 break-words text-sm ${missing ? "text-brand-muted italic" : "text-brand-ink"}`}>
        {href && !missing ? <a href={href} className="font-medium underline underline-offset-4">{value}</a> : value}
      </dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="text-xs font-bold tracking-[0.08em] text-brand-accent uppercase">{title}</h3>
      <dl className="grid gap-2 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function CategorySpecificFields({ row }: { row: CommunityMember }) {
  if (row.member_category === "Established Business") {
    return (
      <>
        <DetailField label="Established Year" value={text(row.established_year)} />
        <DetailField label="Business Team Size" value={text(row.business_team_size)} />
        <div className="sm:col-span-2">
          <DetailField label="Business Connections" value={listWithOther(row.business_connections, row.business_connections_other)} />
        </div>
      </>
    );
  }
  if (row.member_category === "Startup Founder") {
    return (
      <>
        <DetailField label="Startup Team Structure" value={text(row.startup_team_structure)} />
        <div className="sm:col-span-2">
          <DetailField label="Startup Support" value={listWithOther(row.startup_support, row.startup_support_other)} />
        </div>
        <div className="sm:col-span-2">
          <DetailField label="Startup Current Focus" value={text(row.startup_current_focus)} />
        </div>
      </>
    );
  }
  return (
    <>
      <DetailField label="Seeking Co-founder" value={text(row.seeking_cofounder)} />
      <div className="sm:col-span-2">
        <DetailField label="Idea Support" value={listWithOther(row.idea_support, row.idea_support_other)} />
      </div>
      <div className="sm:col-span-2">
        <DetailField label="Idea Problem Statement" value={text(row.idea_problem_statement)} />
      </div>
    </>
  );
}

const selectClass = "h-10 w-full min-w-0 rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function CommunityDataDashboard({
  initialFilter,
  page,
  summary,
  canExport,
}: {
  initialFilter: CommunityDataFilter;
  page: CommunityMemberPage;
  summary: CommunityDataSummary;
  canExport: boolean;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(initialFilter.category ?? "");
  const [search, setSearch] = useState(initialFilter.search ?? "");
  const [city, setCity] = useState(initialFilter.city ?? "");
  const [industry, setIndustry] = useState(initialFilter.industry ?? "");
  const [stage, setStage] = useState(initialFilter.stage ?? "");
  const [support, setSupport] = useState(initialFilter.support ?? "");
  const [from, setFrom] = useState(initialFilter.from ?? "");
  const [to, setTo] = useState(initialFilter.to ?? "");
  const [sort, setSort] = useState(initialFilter.sort);
  const [pageSize, setPageSize] = useState(initialFilter.pageSize);
  const [selected, setSelected] = useState<CommunityMember | null>(null);
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize));

  function navigate(overrides: Partial<CommunityDataFilter>) {
    const query = queryString(initialFilter, overrides);
    router.push(`/admin/community-data${query ? `?${query}` : ""}`);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({
      category: category ? category as CommunityDataFilter["category"] : undefined,
      search: search.trim() || undefined,
      city: city.trim() || undefined,
      industry: industry ? industry as CommunityDataFilter["industry"] : undefined,
      stage: stage ? stage as CommunityDataFilter["stage"] : undefined,
      support: support ? support as CommunityDataFilter["support"] : undefined,
      from: from || undefined,
      to: to || undefined,
      sort,
      pageSize,
      page: 1,
    });
  }

  function clearFilters() {
    setCategory("");
    setSearch("");
    setCity("");
    setIndustry("");
    setStage("");
    setSupport("");
    setFrom("");
    setTo("");
    setSort("newest");
    setPageSize(25);
    router.push("/admin/community-data");
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`${label} could not be copied.`);
    }
  }

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Submissions" value={summary.total} />
        <StatCard label="Established Businesses" value={summary.establishedBusiness} />
        <StatCard label="Startup Founders" value={summary.startupFounder} />
        <StatCard label="Idea Stage Members" value={summary.ideaStage} />
      </div>

      <form onSubmit={applyFilters} className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="community-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-muted" aria-hidden />
              <Input id="community-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={120} placeholder="Search by name, email, business, or city..." className="h-10 pr-9 pl-9" />
              {search ? <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-brand-muted hover:bg-brand-cloud"><X className="size-4" /></button> : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-category">Category</Label>
            <select id="community-category" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}>
              <option value="">All Members</option>
              {memberCategories.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-city">City</Label>
            <Input id="community-city" value={city} onChange={(event) => setCity(event.target.value)} maxLength={120} placeholder="Filter by city..." className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-industry">Industry</Label>
            <select id="community-industry" value={industry} onChange={(event) => setIndustry(event.target.value)} className={selectClass}>
              <option value="">All Industries</option>
              {industrySectors.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-stage">Stage</Label>
            <select id="community-stage" value={stage} onChange={(event) => setStage(event.target.value)} className={selectClass}>
              <option value="">All Stages</option>
              {allCurrentStages.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-support">Support Needed</Label>
            <select id="community-support" value={support} onChange={(event) => setSupport(event.target.value)} className={selectClass}>
              <option value="">Any Support</option>
              {supportNeededOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-sort">Sort</Label>
            <select id="community-sort" value={sort} onChange={(event) => setSort(event.target.value as CommunityDataFilter["sort"])} className={selectClass}>
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-from">Submitted From</Label>
            <Input id="community-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-to">Submitted To</Label>
            <Input id="community-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-page-size">Per page</Label>
            <select id="community-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value) as 10 | 25 | 50)} className={selectClass}>
              {[10, 25, 50].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-1">
            <Button type="submit" className="h-10 flex-1 px-4 xl:flex-none">Apply</Button>
            <Button type="button" variant="outline" onClick={clearFilters} className="h-10 flex-1 px-4 xl:flex-none">Clear</Button>
          </div>
        </div>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-brand-secondary"><span className="font-semibold text-brand-ink">{page.total}</span> matching submission{page.total === 1 ? "" : "s"}</p>
        {canExport ? (
          <div className="flex flex-wrap gap-2">
            <Button render={<a href={`/api/admin/community-data/export?${exportQuery(initialFilter, "csv")}`} />} variant="outline" className="h-10 flex-1 gap-2 sm:flex-none"><Download className="size-4" aria-hidden />Export CSV</Button>
            <Button render={<a href={`/api/admin/community-data/export?${exportQuery(initialFilter, "pdf")}`} />} variant="outline" className="h-10 flex-1 gap-2 sm:flex-none"><Download className="size-4" aria-hidden />Export PDF</Button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] border-collapse text-left text-sm">
            <caption className="sr-only">Private CSC Circle member onboarding survey submissions</caption>
            <thead className="bg-brand-cloud text-brand-secondary">
              <tr>
                {["Full Name", "City", "Contact Number", "Email Address", "Member Category", "Industry", "Stage", "Business / Idea Name", "Support Needed", "Description", "Submitted On"].map((label) => (
                  <th key={label} scope="col" className="border-b border-brand-border px-4 py-3 font-semibold">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => (
                <tr key={row.id} className="border-b border-brand-border/70 align-top last:border-0 hover:bg-brand-cloud/50">
                  <td className="px-4 py-3 font-semibold text-brand-ink"><button type="button" onClick={() => setSelected(row)} className="text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{row.full_name}</button></td>
                  <td className="max-w-36 truncate px-4 py-3">{text(row.city)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{row.contact_number}</td>
                  <td className="max-w-52 break-all px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3"><span className="inline-flex whitespace-nowrap rounded-full bg-brand-purple/50 px-2.5 py-1 text-xs font-medium text-brand-ink">{row.member_category}</span></td>
                  <td className="max-w-44 truncate px-4 py-3" title={text(row.industry_sector)}>{text(row.industry_sector)}</td>
                  <td className="max-w-44 truncate px-4 py-3" title={text(row.current_stage)}>{text(row.current_stage)}</td>
                  <td className="max-w-48 break-words px-4 py-3">{row.business_or_idea_name}</td>
                  <td className="max-w-56 px-4 py-3"><span className="line-clamp-2 leading-5">{list(row.support_needed)}</span></td>
                  <td className="max-w-72 px-4 py-3"><button type="button" onClick={() => setSelected(row)} className="line-clamp-3 text-left leading-5 text-brand-secondary hover:text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{row.description}</button></td>
                  <td className="whitespace-nowrap px-4 py-3 text-brand-secondary">{displayDate(row.created_at)}</td>
                </tr>
              ))}
              {page.rows.length === 0 ? <tr><td colSpan={11} className="px-4 py-14 text-center text-brand-muted">No survey submissions match the selected filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm text-brand-secondary sm:flex-row sm:items-center sm:justify-between">
        <span>Page <strong className="text-brand-ink">{page.page}</strong> of <strong className="text-brand-ink">{totalPages}</strong></span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={page.page <= 1} onClick={() => navigate({ page: page.page - 1 })} className="h-10 flex-1 gap-2 sm:flex-none"><ChevronLeft className="size-4" aria-hidden />Previous</Button>
          <Button type="button" variant="outline" disabled={page.page >= totalPages} onClick={() => navigate({ page: page.page + 1 })} className="h-10 flex-1 gap-2 sm:flex-none">Next<ChevronRight className="size-4" aria-hidden /></Button>
        </div>
      </div>

      <p className="rounded-xl bg-brand-cloud px-4 py-3 text-xs leading-5 text-brand-muted">This page contains private contact information. Keep downloaded reports access-controlled and delete local copies when they are no longer needed.</p>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        {selected ? (
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader className="text-left">
              <SheetTitle className="pr-10 text-xl text-brand-ink">{selected.full_name}</SheetTitle>
              <SheetDescription>Survey submission received {displayDate(selected.created_at)}</SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-4">
              <DetailSection title="Personal Details">
                <DetailField label="Full Name" value={text(selected.full_name)} />
                <DetailField label="City" value={text(selected.city)} />
                <DetailField label="Contact Number" value={text(selected.contact_number)} href={`tel:${selected.contact_number}`} />
                <DetailField label="Email Address" value={text(selected.email)} href={`mailto:${selected.email}`} />
              </DetailSection>
              <DetailSection title="Business / Idea">
                <DetailField label="Member Category" value={text(selected.member_category)} />
                <DetailField label="Business / Idea Name" value={text(selected.business_or_idea_name)} />
                <DetailField label="Industry Sector" value={withOther(selected.industry_sector, selected.industry_other)} />
                <DetailField label="Current Stage" value={text(selected.current_stage)} />
                <div className="sm:col-span-2">
                  <DetailField label="Website" value={text(selected.website_url)} href={selected.website_url ?? undefined} />
                </div>
                <div className="sm:col-span-2">
                  <div className="rounded-xl bg-brand-cloud/70 p-3"><dt className="text-xs font-semibold tracking-wide text-brand-muted uppercase">Description</dt><dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-ink">{selected.description}</dd></div>
                </div>
              </DetailSection>
              <DetailSection title={`${selected.member_category} Details`}>
                <CategorySpecificFields row={selected} />
              </DetailSection>
              <DetailSection title="Community & Support">
                <div className="sm:col-span-2">
                  <DetailField label="Support Needed" value={listWithOther(selected.support_needed, selected.support_needed_other)} />
                </div>
                <div className="sm:col-span-2">
                  <DetailField label="Biggest Challenge" value={text(selected.biggest_challenge)} />
                </div>
              </DetailSection>
              <DetailSection title="Additional Details">
                <DetailField label="Discovery Source" value={withOther(selected.discovery_source, selected.discovery_source_other)} />
                <DetailField label="Preferred Contact Method" value={text(selected.preferred_contact_method)} />
              </DetailSection>
              <DetailSection title="Submission">
                <DetailField label="Submitted On" value={displayDate(selected.created_at)} />
                <DetailField label="Privacy Consent Recorded" value={displayDate(selected.consent_at)} />
              </DetailSection>
            </div>
            <SheetFooter className="flex-row flex-wrap justify-end">
              <Button type="button" variant="outline" onClick={() => copy(selected.email, "Email")} className="gap-2"><Clipboard className="size-4" aria-hidden />Copy Email</Button>
              <Button type="button" variant="outline" onClick={() => copy(selected.contact_number, "Phone number")} className="gap-2"><Clipboard className="size-4" aria-hidden />Copy Phone</Button>
              <Button type="button" onClick={() => setSelected(null)} className="gap-2"><Check className="size-4" aria-hidden />Done</Button>
            </SheetFooter>
          </SheetContent>
        ) : null}
      </Sheet>
    </section>
  );
}
