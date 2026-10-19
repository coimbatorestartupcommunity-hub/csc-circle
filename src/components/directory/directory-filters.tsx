"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  industryOptions,
  collaborationOptions,
} from "@/lib/content/taxonomy";
import type {
  CollaborationIntent,
  DirectoryFilters,
  IndustryCategory,
} from "@/types";

export interface DirectoryFiltersProps {
  filters: DirectoryFilters;
  onChange: (next: DirectoryFilters) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
}

export function DirectoryFiltersBar({
  filters,
  onChange,
  onClear,
  resultCount,
  totalCount,
}: DirectoryFiltersProps) {
  const isFiltered =
    filters.search !== "" ||
    filters.industry !== "all" ||
    filters.collaboration !== "all";

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-muted"
          aria-hidden
        />
        <Label htmlFor="directory-search" className="sr-only">
          Search the directory
        </Label>
        <Input
          id="directory-search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search founders, startups, industries, or skills..."
          className="h-11 pl-9"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="industry-filter" className="text-xs text-brand-muted">
            Industry
          </Label>
          <Select
            value={filters.industry}
            onValueChange={(value) =>
              onChange({
                ...filters,
                industry: value as IndustryCategory | "all",
              })
            }
          >
            <SelectTrigger id="industry-filter" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {industryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="collab-filter" className="text-xs text-brand-muted">
            Collaboration intent
          </Label>
          <Select
            value={filters.collaboration}
            onValueChange={(value) =>
              onChange({
                ...filters,
                collaboration: value as CollaborationIntent | "all",
              })
            }
          >
            <SelectTrigger id="collab-filter" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {collaborationOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-10 w-full gap-1.5 sm:w-auto"
            onClick={onClear}
            disabled={!isFiltered}
          >
            <X className="size-4" />
            Clear filters
          </Button>
        </div>
      </div>

      <p className="text-sm text-brand-muted" aria-live="polite">
        Showing <span className="font-semibold text-brand-ink">{resultCount}</span>{" "}
        of {totalCount} {totalCount === 1 ? "startup" : "startups"}
      </p>
    </div>
  );
}
