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
} from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { ResourceCard } from "@/components/cms/resource-card";
import { listPublishedResources } from "@/lib/services/cms-public";

export const metadata: Metadata = {
  title: "Startup Resources & Founder Playbooks — CSC Circle",
  description:
    "Curated guides, TANSEED grant checklists, founder equity agreements, pitch deck blueprints, and regional incubation directories for Coimbatore startups.",
  alternates: { canonical: "/resources" },
};

const foundationalGuides = [
  {
    tag: "Government Grants",
    title: "TANSEED 6.0 & Tamil Nadu Startup Seed Grant Playbook",
    description:
      "A complete guide to qualifying for StartupTN's ₹10 Lakh equity-free seed grant. Covers DPIIT registration, eligibility criteria, scoring matrices, and presentation best practices.",
    checklist: [
      "StartupTN portal onboarding & DPIIT number verification",
      "Prototype / TRL-4 minimum validation requirement",
      "Clear pitch alignment with regional manufacturing or social impact",
      "Financial milestone budget for 12 months execution",
    ],
    surface: "border-emerald-200 bg-emerald-50/40",
    badge: "Government Grant",
  },
  {
    tag: "Legal & Equity",
    title: "Founder & Co-founder Collaboration Agreement Checklist",
    description:
      "Essential legal clauses every early founding team must document before incorporation to protect intellectual property and ensure equity alignment.",
    checklist: [
      "Standard 4-year vesting schedule with a mandatory 1-year cliff",
      "Assignment of all pre-incorporation IP and codebases to company",
      "Defined operational roles, decision-making rights, and deadlock rules",
      "Reverse dilution and departure terms for leaving co-founders",
    ],
    surface: "border-brand-border bg-brand-white",
    badge: "Legal Template",
  },
  {
    tag: "Fundraising",
    title: "10-Slide Angel & Pre-Seed Pitch Deck Blueprint",
    description:
      "The exact narrative flow proven to resonate with angel investors and regional syndicates without fluff or premature financial projections.",
    checklist: [
      "Slide 1–3: Urgent Problem, Validated Solution, & Product Demo",
      "Slide 4–6: TAM/SAM/SOM, Competitive Moat, & Business Model",
      "Slide 7–8: Early Customer Traction, CAC/LTV, & Unit Economics",
      "Slide 9–10: Founding Team Superpowers & Transparent Ask / Use of Funds",
    ],
    surface: "border-brand-border bg-brand-white",
    badge: "Pitch Deck",
  },
  {
    tag: "Incubation & Space",
    title: "Coimbatore Incubation & Co-working Directory",
    description:
      "Comprehensive index of technology business incubators, maker spaces, and prototyping facilities available to CSC founders across the district.",
    checklist: [
      "PSG-STEP (Nanotechnology, Software, Healthcare & Biotech)",
      "Forge Innovation & Ventures / KCT Tech Park (Hardware, DeepTech)",
      "AIC-Raise / Rathinam Business Incubator (SDG, AgriTech, FinTech)",
      "Government Tool Room & Training Centre (Precision Prototyping)",
    ],
    surface: "border-brand-border bg-brand-white",
    badge: "Regional Hubs",
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
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Essential Ecosystem Playbooks
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">
                Foundational Startup Guides & Checklists
              </h2>
              <p className="mt-1 text-xs text-brand-secondary">
                Curated by CSC Circle mentors and tech architects to accelerate early execution.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {foundationalGuides.map((guide) => (
                <div
                  key={guide.title}
                  className={`flex flex-col justify-between rounded-3xl border p-6 sm:p-7 shadow-xs ${guide.surface}`}
                >
                  <div className="flex flex-col gap-3">
                    <span className="w-fit rounded-full bg-brand-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-accent ring-1 ring-brand-border">
                      {guide.badge}
                    </span>
                    <h3 className="text-base font-bold text-brand-ink">{guide.title}</h3>
                    <p className="text-xs leading-relaxed text-brand-secondary">{guide.description}</p>
                    <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-brand-white/80 p-4 ring-1 ring-brand-border/60">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-ink">
                        Key Checklist:
                      </span>
                      {guide.checklist.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-brand-secondary">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-accent" />
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 rounded-3xl bg-brand-cloud p-6 sm:p-8">
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-brand-ink">Need a Specific Legal or Technical Template?</h3>
              <p className="text-xs text-brand-secondary">
                Suggest documents, financial model spreadsheets, or guides you want our advisory team to compile.
              </p>
            </div>
            <a
              href="mailto:coimbatorestartup.csc@gmail.com?subject=Resource%20Request%20or%20Suggestion"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-ink px-5 py-2.5 text-xs font-semibold text-brand-white transition hover:bg-brand-ink/90"
            >
              <FileText className="size-3.5" /> Suggest a Resource
            </a>
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
