"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Clipboard, Download, Search, X } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CommunityDataFilter } from "@/lib/community-data/schema";
import { memberCategories } from "@/lib/community-data/schema";
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

function queryString(filter: CommunityDataFilter, overrides: Partial<CommunityDataFilter> = {}) {
  const next = { ...filter, ...overrides };
  const params = new URLSearchParams();
  if (next.category) params.set("category", next.category);
  if (next.search) params.set("search", next.search.trim());
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

function DetailField({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-brand-cloud/70 p-3">
      <dt className="text-xs font-semibold tracking-wide text-brand-muted uppercase">{label}</dt>
      <dd className="mt-1 break-words text-sm text-brand-ink">
        {href ? <a href={href} className="font-medium underline underline-offset-4">{value}</a> : value}
      </dd>
    </div>
  );
}
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
      sort,
      pageSize,
      page: 1,
    });
  }

  function clearFilters() {
    setCategory("");
    setSearch("");
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_0.65fr_auto] xl:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="community-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-muted" aria-hidden />
              <Input id="community-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={120} placeholder="Search by name, email, or business..." className="h-10 pr-9 pl-9" />
              {search ? <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-brand-muted hover:bg-brand-cloud"><X className="size-4" /></button> : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-category">Category</Label>
            <select id="community-category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="">All Members</option>
              {memberCategories.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-sort">Sort</Label>
            <select id="community-sort" value={sort} onChange={(event) => setSort(event.target.value as CommunityDataFilter["sort"])} className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-page-size">Per page</Label>
            <select id="community-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value) as 10 | 25 | 50)} className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              {[10, 25, 50].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-1 xl:flex-nowrap">
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
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <caption className="sr-only">Private CSC Circle member onboarding survey submissions</caption>
            <thead className="bg-brand-cloud text-brand-secondary">
              <tr>
                {["Full Name", "Contact Number", "Email Address", "Member Category", "Business / Idea Name", "Description", "Submitted On"].map((label) => (
                  <th key={label} scope="col" className="border-b border-brand-border px-4 py-3 font-semibold">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => (
                <tr key={row.id} className="border-b border-brand-border/70 align-top last:border-0 hover:bg-brand-cloud/50">
                  <td className="px-4 py-3 font-semibold text-brand-ink"><button type="button" onClick={() => setSelected(row)} className="text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{row.full_name}</button></td>
                  <td className="whitespace-nowrap px-4 py-3">{row.contact_number}</td>
                  <td className="max-w-52 break-all px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3"><span className="inline-flex whitespace-nowrap rounded-full bg-brand-purple/50 px-2.5 py-1 text-xs font-medium text-brand-ink">{row.member_category}</span></td>
                  <td className="max-w-48 break-words px-4 py-3">{row.business_or_idea_name}</td>
                  <td className="max-w-72 px-4 py-3"><button type="button" onClick={() => setSelected(row)} className="line-clamp-3 text-left leading-5 text-brand-secondary hover:text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{row.description}</button></td>
                  <td className="whitespace-nowrap px-4 py-3 text-brand-secondary">{displayDate(row.created_at)}</td>
                </tr>
              ))}
              {page.rows.length === 0 ? <tr><td colSpan={7} className="px-4 py-14 text-center text-brand-muted">No survey submissions match the selected filters.</td></tr> : null}
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

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        {selected ? (
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="pr-10 text-xl">{selected.full_name}</DialogTitle>
              <DialogDescription>Survey submission received {displayDate(selected.created_at)}</DialogDescription>
            </DialogHeader>
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Member Category" value={selected.member_category} />
              <DetailField label="Business / Idea" value={selected.business_or_idea_name} />
              <DetailField label="Contact Number" value={selected.contact_number} href={`tel:${selected.contact_number}`} />
              <DetailField label="Email Address" value={selected.email} href={`mailto:${selected.email}`} />
              <div className="rounded-xl bg-brand-cloud/70 p-3 sm:col-span-2"><dt className="text-xs font-semibold tracking-wide text-brand-muted uppercase">Description</dt><dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-ink">{selected.description}</dd></div>
              <DetailField label="Submitted On" value={displayDate(selected.created_at)} />
              <DetailField label="Privacy Consent Recorded" value={displayDate(selected.consent_at)} />
            </dl>
            <DialogFooter className="flex-row flex-wrap justify-end">
              <Button type="button" variant="outline" onClick={() => copy(selected.email, "Email")} className="gap-2"><Clipboard className="size-4" aria-hidden />Copy Email</Button>
              <Button type="button" variant="outline" onClick={() => copy(selected.contact_number, "Phone number")} className="gap-2"><Clipboard className="size-4" aria-hidden />Copy Phone</Button>
              <Button type="button" onClick={() => setSelected(null)} className="gap-2"><Check className="size-4" aria-hidden />Done</Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
