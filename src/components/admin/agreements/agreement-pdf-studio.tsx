"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AGREEMENT_TYPE_META,
  LEADERSHIP_PROFILES,
  type AgreementType,
  type LeadershipRoleKey,
} from "@/lib/agreements/templates";

const AGREEMENT_TYPES = Object.values(AGREEMENT_TYPE_META);
const LEADER_OPTIONS = Object.values(LEADERSHIP_PROFILES);

export function AgreementPdfStudio() {
  const [selectedType, setSelectedType] = React.useState<AgreementType>("tech_partner");
  const [leadershipRole, setLeadershipRole] = React.useState<LeadershipRoleKey>("cto");

  const pdfUrl = `/api/admin/agreements/preview-pdf?type=${encodeURIComponent(selectedType)}&role=${encodeURIComponent(leadershipRole)}`;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-brand-ink">Select Agreement Template</h2>
            <p className="mt-0.5 text-xs text-brand-muted">
              Preview the exact crisp white editorial PDF design, typography, and ink-blue signature before issuing.
            </p>
          </div>
          <Button render={<a href={pdfUrl} download />} className="gap-2">
            <Download className="size-4" />
            Download Sample PDF
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {AGREEMENT_TYPES.map((meta) => (
            <button
              key={meta.type}
              type="button"
              onClick={() => setSelectedType(meta.type)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                selectedType === meta.type
                  ? "bg-brand-ink text-white"
                  : "bg-brand-cloud text-brand-secondary hover:bg-brand-border/60"
              }`}
            >
              {meta.shortLabel}
            </button>
          ))}
        </div>

        {selectedType === "leadership_charter" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brand-border pt-3">
            <span className="text-xs font-semibold text-brand-muted">Leader Role:</span>
            {LEADER_OPTIONS.map((leader) => (
              <button
                key={leader.key}
                type="button"
                onClick={() => setLeadershipRole(leader.key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  leadershipRole === leader.key
                    ? "bg-brand-accent text-white"
                    : "bg-white text-brand-secondary ring-1 ring-brand-border hover:bg-brand-cloud"
                }`}
              >
                {leader.key.toUpperCase().replace("_", "-")} ({leader.defaultName})
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-xs">
        <iframe
          key={pdfUrl}
          src={pdfUrl}
          title="Editorial Agreement PDF Studio Preview"
          className="h-[820px] w-full bg-white"
        />
      </div>
    </div>
  );
}
