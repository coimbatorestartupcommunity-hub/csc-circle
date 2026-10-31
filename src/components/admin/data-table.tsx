"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/member/status-badge";
import { ActionButton } from "@/components/admin/action-button";
import {
  membershipStatusMeta,
  registrationStatusMeta,
  consultationStatusMeta,
  reviewModerationMeta,
} from "@/lib/content/member-taxonomy";
import {
  paymentStatusMeta,
  notificationStatusMeta,
  publicationStatusMeta,
} from "@/lib/admin/status-meta";
import { formatEventDate } from "@/lib/format";

export type ColType =
  | "text"
  | "mono"
  | "date"
  | "stars"
  | "list"
  | "statusMembership"
  | "statusRegistration"
  | "statusConsultation"
  | "statusReview"
  | "statusPayment"
  | "statusNotification"
  | "statusPublication"
  | "badge"
  | "link";

export interface Column {
  key: string;
  header: string;
  type?: ColType;
  sortable?: boolean;
  className?: string;
}

export interface Facet {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

export interface ActionDef {
  label: string;
  operation?: { kind: string; decision: string };
  message?: string;
  confirm?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  visibleForStatuses?: string[];
}

const get = (row: { id: string }, key: string): unknown =>
  (row as Record<string, unknown>)[key];

function renderCell(value: unknown, type?: ColType): React.ReactNode {
  const meta = (map: Record<string, { label: string; tone: string }>) => {
    const m = map[String(value)];
    return m ? <StatusBadge label={m.label} tone={m.tone} /> : String(value ?? "—");
  };
  switch (type) {
    case "mono":
      return <span className="font-mono text-xs">{String(value ?? "—")}</span>;
    case "date":
      return value ? formatEventDate(String(value)) : "—";
    case "stars":
      return `${value ?? 0}★`;
    case "list":
      return Array.isArray(value) ? (value as string[]).join(", ") || "—" : "—";
    case "statusMembership":
      return meta(membershipStatusMeta);
    case "statusRegistration":
      return meta(registrationStatusMeta);
    case "statusConsultation":
      return meta(consultationStatusMeta);
    case "statusReview":
      return meta(reviewModerationMeta);
    case "statusPayment":
      return meta(paymentStatusMeta);
    case "statusNotification":
      return meta(notificationStatusMeta);
    case "statusPublication":
      return meta(publicationStatusMeta);
    case "badge":
      return value ? (
        <span className="inline-flex rounded-full bg-brand-cloud px-2 py-0.5 text-xs text-brand-secondary">
          {String(value)}
        </span>
      ) : (
        "—"
      );
    case "link": {
      const link = value && typeof value === "object" ? value as { href?: unknown; label?: unknown } : {};
      return typeof link.href === "string" && link.href.startsWith("/api/admin/")
        ? <a href={link.href} target="_blank" rel="noreferrer" className="font-medium text-brand-ink underline underline-offset-2">{typeof link.label === "string" ? link.label : "View"}</a>
        : "—";
    }
    default:
      return value === null || value === undefined || value === "" ? "—" : String(value);
  }
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchKeys,
  facets,
  pageSize = 10,
  emptyMessage = "No records found.",
  rowHrefBase,
  rowHrefKey = "id",
  actions,
}: {
  rows: T[];
  columns: Column[];
  searchKeys?: string[];
  facets?: Facet[];
  pageSize?: number;
  emptyMessage?: string;
  rowHrefBase?: string;
  rowHrefKey?: string;
  actions?: ActionDef[];
}) {
  const [query, setQuery] = React.useState("");
  const [facetValues, setFacetValues] = React.useState<Record<string, string>>({});
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (q && searchKeys) {
      out = out.filter((r) =>
        searchKeys.some((k) => String(get(r, k) ?? "").toLowerCase().includes(q)),
      );
    }
    for (const [k, v] of Object.entries(facetValues)) {
      if (v && v !== "all") out = out.filter((r) => String(get(r, k)) === v);
    }
    if (sortKey) {
      out = [...out].sort((a, b) => {
        const av = get(a, sortKey) as string | number;
        const bv = get(b, sortKey) as string | number;
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return out;
  }, [rows, query, searchKeys, facetValues, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {(searchKeys || facets) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {searchKeys ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-muted" aria-hidden />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search…"
                className="h-9 pl-9"
              />
            </div>
          ) : null}
          {facets?.map((f) => (
            <Select
              key={f.key}
              value={facetValues[f.key] ?? "all"}
              onValueChange={(v) => {
                setFacetValues((prev) => ({ ...prev, [f.key]: (v as string) ?? "all" }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-auto sm:min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{f.label}: All</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-brand-white ring-1 ring-brand-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-brand-border text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn("px-4 py-3 text-xs font-semibold tracking-wide text-brand-muted uppercase", col.className)}
                >
                  {col.sortable ? (
                    <button type="button" onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 hover:text-brand-ink">
                      {col.header}
                      {sortKey === col.key ? (sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />) : null}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
              {actions || rowHrefBase ? (
                <th className="sticky right-0 z-20 min-w-36 bg-brand-white px-4 py-3 text-right text-xs font-semibold tracking-wide text-brand-muted uppercase shadow-[-10px_0_12px_-12px_rgba(18,24,38,0.35)]">
                  Action
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions || rowHrefBase ? 1 : 0)} className="px-4 py-10 text-center text-brand-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const href = rowHrefBase ? `${rowHrefBase}/${get(row, rowHrefKey)}` : undefined;
                return (
                  <tr key={row.id} className="border-b border-brand-border/60 last:border-0 hover:bg-brand-cloud/60">
                    {columns.map((col, ci) => (
                      <td key={col.key} className={cn("px-4 py-3 align-middle text-brand-secondary", col.className)}>
                        {href && ci === 0 ? (
                          <Link href={href} className="font-medium text-brand-ink hover:underline">
                            {renderCell(get(row, col.key), col.type)}
                          </Link>
                        ) : (
                          renderCell(get(row, col.key), col.type)
                        )}
                      </td>
                    ))}
                    {actions || rowHrefBase ? (
                      <td className="sticky right-0 z-10 min-w-36 bg-brand-white px-4 py-3 text-right shadow-[-10px_0_12px_-12px_rgba(18,24,38,0.25)]">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {href ? (
                            <Link
                              href={href}
                              className="inline-flex items-center gap-1 rounded-lg border border-brand-border bg-white px-2.5 py-1 text-xs font-semibold text-brand-ink shadow-2xs transition hover:border-brand-ink/40 hover:bg-brand-cloud"
                            >
                              Open <ArrowUpRight className="size-3" />
                            </Link>
                          ) : null}
                          {actions?.filter((a) => !a.visibleForStatuses || a.visibleForStatuses.includes(String(get(row, "status")))).map((a) => (
                            <ActionButton
                              key={a.label}
                              label={a.label}
                              operation={a.operation ? { ...a.operation, target: row.id } : undefined}
                              message={a.message}
                              confirm={a.confirm}
                              details={row as unknown as Record<string, unknown>}
                              variant={a.variant}
                              size="xs"
                            />
                          ))}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-brand-muted">
          <span>{filtered.length} record{filtered.length === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={current === 1} className="flex size-8 items-center justify-center rounded-lg ring-1 ring-brand-border hover:bg-brand-cloud disabled:opacity-40">
              <ChevronLeft className="size-4" />
            </button>
            <span className="tabular-nums">{current} / {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={current === totalPages} className="flex size-8 items-center justify-center rounded-lg ring-1 ring-brand-border hover:bg-brand-cloud disabled:opacity-40">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
