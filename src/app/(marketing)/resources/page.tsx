import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  Lightbulb,
  Rocket,
  Presentation,
  Cpu,
  Briefcase,
  GraduationCap,
  Users,
  FileText,
  Building2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { ResourceCard } from "@/components/cms/resource-card";
import { ResourceSubmissionModal } from "@/components/resources/resource-submission-form";
import { listPublishedResources } from "@/lib/services/cms-public";

export const metadata: Metadata = {
  title: "Startup Resources & Founder Playbooks — CSC Circle",
  description:
    "Curated guides, TANSEED grant checklists, founder equity agreements, pitch deck blueprints, and regional incubation directories for Coimbatore startups.",
  alternates: { canonical: "/resources" },
  openGraph: {
    title: "Startup Resources & Founder Playbooks — CSC Circle",
    description:
      "Curated guides, TANSEED grant checklists, founder equity agreements, pitch deck blueprints, and regional incubation directories for Coimbatore startups.",
    url: "https://csc.logicintelligencetechnologies.in/resources",
    siteName: "Coimbatore Startup Community",
    images: [
      {
        url: "https://csc.logicintelligencetechnologies.in/brand/csc-homepage-banner.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Coimbatore Startup Community Resources & Playbooks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Startup Resources & Founder Playbooks — CSC Circle",
    description:
      "Curated guides, TANSEED grant checklists, founder equity agreements, pitch deck blueprints, and regional incubation directories for Coimbatore startups.",
    images: ["https://csc.logicintelligencetechnologies.in/brand/csc-homepage-banner.png"],
  },
};

const foundationalGuides = [
  {
    tag: "Government Grants",
    title: "TANSEED 6.0 & Tamil Nadu Seed Grant Playbook",
    description:
      "A complete guide to qualifying for StartupTN's ₹10–₹15 Lakh equity-free seed grant. Covers DPIIT registration, eligibility criteria, scoring matrices, and presentation best practices.",
    checklist: [
      "StartupTN portal onboarding & DPIIT registration verification",
      "Prototype / TRL-4 minimum technical validation requirement",
      "Pitch alignment with regional manufacturing, agri-tech, or deeptech impact",
      "12-month execution budget and fund utilization milestone planning",
    ],
    surface: "border-emerald-200 bg-emerald-50/40",
    badge: "Government Grant",
    format: "PDF Guide",
  },
  {
    tag: "Legal & Equity",
    title: "Founder & Co-Founder Equity Agreement Checklist",
    description:
      "Essential legal clauses every early founding team must document before incorporation to protect intellectual property and ensure equity alignment under Indian company law.",
    checklist: [
      "Standard 4-year reverse vesting schedule with a mandatory 1-year cliff",
      "Pre-incorporation IP assignment & codebase ownership transfer to company",
      "Defined executive roles, deadlock resolution, and board voting thresholds",
      "Departure terms, reverse dilution, and good/bad leaver clauses",
    ],
    surface: "border-brand-border bg-brand-white",
    badge: "Legal Template",
    format: "DOCX / Legal",
  },
  {
    tag: "Fundraising",
    title: "10-Slide Angel & Pre-Seed Pitch Deck Blueprint",
    description:
      "The exact narrative flow proven to resonate with angel syndicates and regional investors without fluff or premature financial projections.",
    checklist: [
      "Slide 1–3: Urgent Problem, Validated Solution, & Working Product Demo",
      "Slide 4–6: TAM/SAM/SOM, Defensible Moat, & Business Model Unit Economics",
      "Slide 7–8: Early Customer Validation, Pilot Letters, & Growth Trajectory",
      "Slide 9–10: Founding Team Superpowers & Transparent Use of Funds Ask",
    ],
    surface: "border-brand-border bg-brand-white",
    badge: "Pitch Deck",
    format: "Presentation",
  },
  {
    tag: "Incubation & Maker Labs",
    title: "Coimbatore Incubation & Prototyping Directory",
    description:
      "Comprehensive index of technology business incubators, maker spaces, and precision prototyping facilities available to CSC founders across the district.",
    checklist: [
      "PSG-STEP (Nanotechnology, Electronics, Healthcare & Biotech)",
      "Forge Innovation & Ventures / KCT Tech Park (Hardware & DeepTech)",
      "AIC-Raise / Rathinam Business Incubator (SDG, AgriTech, FinTech)",
      "CODISSIA Industrial Innovation & Precision Tooling Centres",
    ],
    surface: "border-brand-border bg-brand-white",
    badge: "Regional Hubs",
    format: "Directory",
  },
  {
    tag: "IP & Employment",
    title: "Proprietary Information & Inventions Agreement (PIIA)",
    description:
      "Standard confidentiality and IP assignment framework required for all employees, interns, and contractors working on your core codebase.",
    checklist: [
      "Broad definition of proprietary technical code and trade secrets",
      "Comprehensive assignment of moral and commercial rights to company",
      "Post-termination non-disclosure and non-solicitation covenants",
      "Jurisdiction alignment under Indian Contract Act 1872",
    ],
    surface: "border-brand-border bg-brand-white",
    badge: "IP Safeguard",
    format: "DOCX / Legal",
  },
  {
    tag: "Finance & Cap Table",
    title: "Startup Cap Table & Dilution Spreadsheet Blueprint",
    description:
      "A ready-to-use spreadsheet modeling founder equity dilution across angel rounds, seed tranches, and future convertible notes (iSAFE).",
    checklist: [
      "Pre-money and post-money valuation calculation formulas",
      "ESOP pool creation and dilution distribution across founding rounds",
      "iSAFE note conversion mechanics at discounted valuations",
      "Investor cap-table summary ready for due diligence audits",
    ],
    surface: "border-brand-border bg-brand-white",
    badge: "Financial Model",
    format: "XLSX Model",
  },
];

async function ResourcesContent() {
  const dynamicResources = await listPublishedResources();

  return (
    <>
      <PageHero
        eyebrow="Founder Library"
        title="Resources for Founders & Builders"
        description="Battle-tested guides, grant blueprints, pitch templates, and regional directory listings to support your startup journey across Coimbatore."
      />

      <section className="py-14 sm:py-16">
        <Container className="mx-auto flex max-w-5xl flex-col gap-12">
          {/* Dynamic CMS Resources if published */}
          {dynamicResources && dynamicResources.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold tracking-tight text-brand-ink">Community Publications</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {dynamicResources.map((r) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </div>
            </div>
          )}

          {/* Foundational Founder Playbooks */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Essential Ecosystem Playbooks
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">
                Foundational Startup Guides &amp; Checklists
              </h2>
              <p className="mt-1 text-xs text-brand-secondary">
                Curated by CSC Circle mentors and tech architects to accelerate early execution.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {foundationalGuides.map((guide) => (
                <div
                  key={guide.title}
                  className={`flex flex-col justify-between rounded-3xl border p-6 shadow-xs ${guide.surface}`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-fit rounded-full bg-brand-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-accent ring-1 ring-brand-border">
                        {guide.badge}
                      </span>
                      <span className="text-[11px] font-medium text-brand-muted">{guide.format}</span>
                    </div>

                    <h3 className="text-base font-bold text-brand-ink">{guide.title}</h3>
                    <p className="text-xs leading-relaxed text-brand-secondary">{guide.description}</p>

                    <div className="mt-2 flex flex-col gap-1.5 rounded-2xl bg-brand-white/80 p-3.5 ring-1 ring-brand-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-ink">
                        Core Checklist:
                      </span>
                      {guide.checklist.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-brand-secondary">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Request / Suggest a Resource Banner */}
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-3xl border border-brand-border/80 bg-brand-cloud p-8 text-center sm:p-10 shadow-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-white px-3.5 py-1 text-xs font-semibold text-brand-accent shadow-2xs">
              <FileText className="size-3.5" /> Founder Knowledge Base
            </span>
            <h3 className="mt-3 text-xl font-bold tracking-tight text-brand-ink sm:text-2xl">
              Need a Specific Legal, Pitch, or Technical Template?
            </h3>
            <p className="mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-brand-secondary">
              Suggest documents, financial model spreadsheets, or regulatory checklists you want our advisory team to compile for the ecosystem.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 w-full">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <ResourceSubmissionModal />
                <a
                  href="mailto:coimbatorestartup.tech@gmail.com?subject=Resource%20Request%20or%20Suggestion"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-brand-border bg-brand-white px-5 py-2.5 text-xs font-semibold text-brand-ink shadow-2xs transition hover:bg-brand-cloud"
                >
                  <FileText className="size-3.5 text-brand-secondary" /> Request a Document
                </a>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-brand-muted">
              Peer-reviewed by CSC mentors &amp; regional startup advisors.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense
      fallback={
        <section aria-busy="true" className="py-20">
          <Container className="max-w-5xl">
            <p className="text-sm text-brand-muted">Loading resources…</p>
          </Container>
        </section>
      }
    >
      <ResourcesContent />
    </Suspense>
  );
}
