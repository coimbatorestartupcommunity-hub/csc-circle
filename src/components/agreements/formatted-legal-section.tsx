"use client";

import * as React from "react";
import type { AgreementSection } from "@/lib/agreements/templates";

interface FormattedClauseProps {
  clause: string;
  idx: number;
}

// Regex to identify quoted entities, statutory references, and critical legal keywords
const HIGHLIGHT_REGEX =
  /("(?:Agreement|MoU|Charter|CSC|LIT|Leader|Sponsor)"|Coimbatore Startup Community|Logic Intelligence Technologies(?:\s*\(LIT\))?|Section 10A|Section 65B|Information Technology Act,\s*2000|Indian Contract Act,\s*1872|DPDP Act,\s*2023|sole and exclusive|sole & exclusive|perpetual|thirty \(30\) days'|ninety \(90\) days'|strict confidentiality)/gi;

export function highlightKeywords(text: string): React.ReactNode[] {
  const parts = text.split(HIGHLIGHT_REGEX);
  return parts.map((part, index) => {
    if (HIGHLIGHT_REGEX.test(part)) {
      HIGHLIGHT_REGEX.lastIndex = 0; // reset regex state
      return (
        <strong key={index} className="font-bold text-brand-ink">
          {part}
        </strong>
      );
    }
    HIGHLIGHT_REGEX.lastIndex = 0;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function FormattedLegalClause({ clause, idx }: FormattedClauseProps) {
  // Check for numbered prefix (e.g. "1.1", "2.3", "•", "-")
  const numMatch = clause.match(/^([0-9]+\.[0-9]+(?:\.[0-9]+)?|[•✦\-])\s*([\s\S]*)/);
  let prefix = "";
  let colonTitle = "";
  let body = clause;

  if (numMatch) {
    prefix = numMatch[1];
    const rest = numMatch[2];
    const colonMatch = rest.match(/^([^:]+:)\s*([\s\S]*)/);
    if (colonMatch && colonMatch[1].length < 80) {
      colonTitle = colonMatch[1];
      body = colonMatch[2];
    } else {
      body = rest;
    }
  } else {
    const colonMatch = clause.match(/^([^:]+:)\s*([\s\S]*)/);
    if (colonMatch && colonMatch[1].length < 80) {
      colonTitle = colonMatch[1];
      body = colonMatch[2];
    }
  }

  return (
    <div className="group relative flex items-start gap-3 rounded-xl border border-brand-border/60 bg-white p-3.5 shadow-2xs transition-all hover:border-brand-accent/50 hover:bg-blue-50/20 hover:shadow-xs">
      {/* Numbered Pill / Bullet Badge */}
      {prefix ? (
        <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md border border-brand-accent/30 bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-bold text-brand-accent shadow-2xs">
          {prefix}
        </span>
      ) : (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-accent" />
      )}

      {/* Clause Content */}
      <div className="min-w-0 flex-1 text-xs leading-relaxed text-brand-secondary sm:text-[13px]">
        {colonTitle && (
          <strong className="mr-1.5 font-bold text-brand-ink text-xs sm:text-[13px]">
            {colonTitle}
          </strong>
        )}
        <span className="font-normal text-slate-700 leading-relaxed">
          {highlightKeywords(body)}
        </span>
      </div>
    </div>
  );
}

export function FormattedLegalSection({ section }: { section: AgreementSection }) {
  return (
    <section className="flex flex-col gap-2.5">
      {/* Section Header Bar */}
      <div className="flex items-center justify-between rounded-lg border border-brand-border/70 bg-brand-cloud/60 p-2.5 px-3.5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-1 rounded-full bg-brand-accent" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink sm:text-[13px]">
            {section.heading}
          </h2>
        </div>
        <span className="rounded-full border border-brand-border/70 bg-white px-2 py-0.5 text-[10px] font-medium text-brand-muted">
          {section.clauses.length} {section.clauses.length === 1 ? "Clause" : "Clauses"}
        </span>
      </div>

      {/* Section Clauses List */}
      <div className="flex flex-col gap-2 pl-1 sm:pl-2">
        {section.clauses.map((clause, idx) => (
          <FormattedLegalClause key={idx} clause={clause} idx={idx} />
        ))}
      </div>
    </section>
  );
}
