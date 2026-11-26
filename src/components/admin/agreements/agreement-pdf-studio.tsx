"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, ExternalLink, FileText, Layout, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AGREEMENT_TYPE_META,
  LEADERSHIP_PROFILES,
  buildAgreementSections,
  type AgreementType,
  type LeadershipRoleKey,
} from "@/lib/agreements/templates";
import { brandAssets } from "@/lib/content/site";
import { FormattedLegalSection } from "@/components/agreements/formatted-legal-section";
import { CommunityShowcaseDeck } from "@/components/agreements/community-showcase-deck";
import { SigningFooter } from "@/components/agreements/signing-footer";

const AGREEMENT_TYPES = Object.values(AGREEMENT_TYPE_META);
const LEADER_OPTIONS = Object.values(LEADERSHIP_PROFILES);

export function AgreementPdfStudio() {
  const [selectedType, setSelectedType] = React.useState<AgreementType>("tech_partner");
  const [leadershipRole, setLeadershipRole] = React.useState<LeadershipRoleKey>("cto");
  const [viewMode, setViewMode] = React.useState<"web" | "pdf">("web");
  const [pdfLoading, setPdfLoading] = React.useState(true);

  const meta = AGREEMENT_TYPE_META[selectedType];
  const leader = LEADERSHIP_PROFILES[leadershipRole];

  const sampleName =
    selectedType === "tech_partner"
      ? "Vikash Saravanan"
      : selectedType === "leadership_charter"
        ? leader.defaultName
        : "Arjun Krishnan";

  const sampleOrg =
    selectedType === "tech_partner"
      ? "Logic Intelligence Technologies"
      : selectedType === "leadership_charter"
        ? "Coimbatore Startup Community"
        : "Coimbatore Innovation Hub";

  const sampleRole =
    selectedType === "tech_partner"
      ? "Founder & CEO, LIT / CTO, CSC"
      : selectedType === "leadership_charter"
        ? leader.roleTitle
        : "Managing Partner";

  const effectiveDate = new Date().toISOString().slice(0, 10);

  const sections = React.useMemo(() => {
    return buildAgreementSections({
      agreementType: selectedType,
      recipientName: sampleName,
      recipientRole: sampleRole,
      recipientOrg: sampleOrg,
      recipientEmail: "partner@example.com",
      effectiveDate,
      durationLabel: meta.defaultDuration,
      leadershipRole,
    });
  }, [selectedType, sampleName, sampleRole, sampleOrg, effectiveDate, meta.defaultDuration, leadershipRole]);

  const pdfUrl = `/api/admin/agreements/preview-pdf?type=${encodeURIComponent(selectedType)}&role=${encodeURIComponent(leadershipRole)}`;

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-brand-ink">Agreement Template &amp; Design Studio</h2>
            <p className="mt-0.5 text-xs text-brand-muted">
              Live preview of the official CSC Circle web signing layout and downloadable PDF matching the website design.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-brand-cloud p-1 ring-1 ring-brand-border/60">
              <button
                type="button"
                onClick={() => setViewMode("web")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "web"
                    ? "bg-white text-brand-ink shadow-2xs"
                    : "text-brand-muted hover:text-brand-ink"
                }`}
              >
                <Layout className="size-3.5" />
                <span>Web Signing Layout</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("pdf");
                  setPdfLoading(true);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "pdf"
                    ? "bg-white text-brand-ink shadow-2xs"
                    : "text-brand-muted hover:text-brand-ink"
                }`}
              >
                <FileText className="size-3.5" />
                <span>Compiled PDF</span>
              </button>
            </div>
            <Button render={<a href={pdfUrl} target="_blank" rel="noopener noreferrer" />} variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="size-3.5" />
              <span>Open PDF</span>
            </Button>
            <Button render={<a href={pdfUrl} download />} size="sm" className="gap-1.5">
              <Download className="size-3.5" />
              <span>Download PDF</span>
            </Button>
          </div>
        </div>

        {/* Agreement Type Pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {AGREEMENT_TYPES.map((tMeta) => (
            <button
              key={tMeta.type}
              type="button"
              onClick={() => {
                setSelectedType(tMeta.type);
                setPdfLoading(true);
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                selectedType === tMeta.type
                  ? "bg-brand-ink text-white"
                  : "bg-brand-cloud text-brand-secondary hover:bg-brand-border/60"
              }`}
            >
              {tMeta.shortLabel}
            </button>
          ))}
        </div>

        {selectedType === "leadership_charter" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brand-border pt-3">
            <span className="text-xs font-semibold text-brand-muted">Leader Mandate:</span>
            {LEADER_OPTIONS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => {
                  setLeadershipRole(l.key);
                  setPdfLoading(true);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  leadershipRole === l.key
                    ? "bg-brand-accent text-white"
                    : "bg-white text-brand-secondary ring-1 ring-brand-border hover:bg-brand-cloud"
                }`}
              >
                {l.key.toUpperCase().replace("_", "-")} ({l.defaultName})
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Viewport Card */}
      {viewMode === "web" ? (
        <div className="rounded-2xl border border-brand-border bg-brand-cloud/40 p-4 sm:p-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {/* Header Card */}
            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-2xs sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border pb-4">
                <div className="flex items-center gap-3">
                  <Image
                    src={brandAssets.cscLogo}
                    alt="CSC Logo"
                    width={44}
                    height={44}
                    className="rounded-full ring-1 ring-brand-border"
                  />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
                      {meta.defaultEyebrow}
                    </p>
                    <h1 className="text-lg font-bold tracking-tight text-brand-ink sm:text-xl">
                      {meta.defaultTitle}
                    </h1>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  Digitally Signed &amp; Sealed
                </span>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl bg-brand-cloud/50 p-4 text-xs text-brand-secondary sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-brand-ink">Reference &amp; Effective Date</p>
                  <p className="mt-0.5 font-mono text-[11px] text-brand-accent">
                    CSC-AGR-{new Date().getFullYear()}-SAMPLE
                  </p>
                  <p className="mt-0.5">
                    Effective: {effectiveDate} · Term: {meta.defaultDuration}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-brand-ink">Addressed To</p>
                  <p className="mt-0.5 font-medium text-brand-ink">
                    {sampleName} — {sampleOrg}
                  </p>
                  <p className="mt-0.5 text-brand-muted">{sampleRole}</p>
                </div>
              </div>
            </div>

            {/* Terms Card */}
            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-2xs sm:p-7">
              <div className="mb-4 flex items-center justify-between border-b border-brand-border pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
                  {meta.defaultSubtitle}
                </p>
                <span className="text-[11px] text-brand-muted">Laws of India · Coimbatore Jurisdiction</span>
              </div>

              <div className="flex flex-col gap-6 text-xs leading-relaxed text-brand-secondary sm:text-[13px]">
                {sections.map((section) => (
                  <FormattedLegalSection key={section.heading} section={section} />
                ))}
              </div>
            </div>

            {/* Signature Block */}
            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-2xs sm:p-7">
              <p className="border-b border-brand-border pb-3 text-xs font-bold uppercase tracking-wider text-brand-ink">
                Digital Execution &amp; Verified Signatures
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-brand-border bg-brand-cloud/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                    For Coimbatore Startup Community
                  </p>
                  <p className="mt-2 font-serif text-2xl italic text-blue-800">K. N. Reyash</p>
                  <p className="mt-1 text-xs font-semibold text-brand-ink">K. N. Reyash</p>
                  <p className="text-[11px] text-brand-muted">Founder &amp; President, CSC</p>
                </div>
                <div className="rounded-xl border border-brand-border bg-brand-cloud/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                    For Counterparty / Recipient
                  </p>
                  <p className="mt-2 font-serif text-2xl italic text-blue-800">{sampleName}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-ink">{sampleName}</p>
                  <p className="text-[11px] text-brand-muted">{sampleRole} · {sampleOrg}</p>
                </div>
              </div>
            </div>

            {/* 7-Slide Deck */}
            <CommunityShowcaseDeck />

            {/* Custom Footer */}
            <SigningFooter />
          </div>
        </div>
      ) : (
        <div className="relative min-h-[820px] overflow-hidden rounded-2xl border border-brand-border bg-white shadow-xs">
          {pdfLoading ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 backdrop-blur-xs">
              <Loader2 className="size-6 animate-spin text-brand-accent" />
              <p className="text-xs font-medium text-brand-muted">Rendering compiled agreement PDF...</p>
            </div>
          ) : null}

          <object
            data={pdfUrl}
            type="application/pdf"
            className="h-[820px] w-full"
            onLoad={() => setPdfLoading(false)}
          >
            <iframe
              key={pdfUrl}
              src={pdfUrl}
              title="Compiled Agreement PDF"
              className="h-[820px] w-full bg-white"
              onLoad={() => setPdfLoading(false)}
            />
          </object>
        </div>
      )}
    </div>
  );
}
