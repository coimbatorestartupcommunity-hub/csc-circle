import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Handshake,
  GraduationCap,
  HeartHandshake,
  CalendarRange,
  Trophy,
  Building2,
  Rocket,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  Layers,
} from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { MemberOpportunityForm } from "@/components/member/member-opportunity-form";
import { OpportunityTagsFilter, type OpportunityItem } from "@/components/opportunities/opportunity-tags-filter";
import { listPublishedOpportunities } from "@/lib/services/cms-public";
import { continuousTracks } from "@/lib/opportunities/continuous-tracks";

export const metadata: Metadata = {
  title: "Startup Opportunities & Ecosystem Programs — CSC Circle",
  description:
    "Explore active founder residencies, grant fellowships, demo day nominations, and mentorship opportunities in Coimbatore.",
  alternates: { canonical: "/opportunities" },
  openGraph: {
    title: "Startup Opportunities & Ecosystem Programs — CSC Circle",
    description:
      "Explore active founder residencies, grant fellowships, demo day nominations, and mentorship opportunities in Coimbatore.",
    url: "https://csc.logicintelligencetechnologies.in/opportunities",
    siteName: "Coimbatore Startup Community",
    images: [
      {
        url: "https://csc.logicintelligencetechnologies.in/brand/csc-homepage-banner.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Coimbatore Startup Community Opportunities — The People Behind CSC Circle",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Startup Opportunities & Ecosystem Programs — CSC Circle",
    description:
      "Explore active founder residencies, grant fellowships, demo day nominations, and mentorship opportunities in Coimbatore.",
    images: ["https://csc.logicintelligencetechnologies.in/brand/csc-homepage-banner.png"],
  },
};

const ecosystemTracks = [
  {
    icon: Rocket,
    title: "Co-Founder Searches & Equity",
    desc: "Domain experts connecting with software, AI, and hardware engineers under standard 4-year vesting models.",
  },
  {
    icon: Trophy,
    title: "Seed Grants & Fellowships",
    desc: "Capital radar for TANSEED (₹15L equity-free), Startup India SISFS (₹50L), MeitY TIDE 2.0, and BIRAC BIG.",
  },
  {
    icon: Briefcase,
    title: "High-Impact Roles & Gigs",
    desc: "Early-stage engineering, growth, and product openings directly with Coimbatore startups, free from recruiter spam.",
  },
  {
    icon: Layers,
    title: "Accelerator Fast-Tracks",
    desc: "Direct partner nominations into top incubator cohorts including StartupTN, Forge KCT, and PSG-STEP.",
  },
];

async function OpportunitiesContent() {
  const dynamicOpportunities = await listPublishedOpportunities();

  const staticItems: OpportunityItem[] = continuousTracks.map((t) => ({
    id: t.slug,
    slug: t.slug,
    title: t.title,
    category: t.category,
    organization: t.organization,
    summary: t.summary,
    location: t.mode,
    participationMode: t.participationMode,
    deadline: null,
  }));

  const allItems: OpportunityItem[] = [
    ...(dynamicOpportunities || []).map((o) => ({
      id: o.id,
      slug: o.slug,
      title: o.title,
      category: o.category,
      organization: o.organization,
      summary: o.summary,
      location: o.location,
      participationMode: o.participationMode,
      deadline: o.deadline,
      orgLogoPath: o.orgLogoPath,
    })),
    ...staticItems,
  ];

  return (
    <>
      <PageHero
        eyebrow="Ecosystem Tracks"
        title="Opportunities in the CSC Ecosystem"
        description="Verified collaborations, mentorship fellowships, demo day nominations, and student builder tracks across Coimbatore."
      />

      <section className="py-14 sm:py-16">
        <Container className="mx-auto flex max-w-5xl flex-col gap-12">
          {/* 4 Ecosystem Tracks Cards */}
          <div className="rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8 shadow-xs">
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                Curated Matchmaking Pathways
              </span>
              <h3 className="text-lg font-bold text-brand-ink mt-0.5">The 4 Core Ecosystem Tracks</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ecosystemTracks.map((t) => (
                <div key={t.title} className="rounded-2xl bg-brand-cloud/40 p-4 border border-brand-border/60">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-white text-brand-ink ring-1 ring-brand-border">
                    <t.icon className="size-4" />
                  </span>
                  <h4 className="mt-2 text-sm font-bold text-brand-ink">{t.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-brand-secondary">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Tag-Filtered Listings Board */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Active Matchmaking Board
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">
                Active Listings &amp; Innovation Tracks
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-brand-secondary">
                Filter by co-founder searches, engineering openings, seed grants, and mentorship tracks across Coimbatore.
              </p>
            </div>

            <OpportunityTagsFilter opportunities={allItems} />
          </div>

          {/* Interactive Opportunity Proposal Form */}
          <div className="mx-auto w-full max-w-4xl rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-10 shadow-xs ring-1 ring-brand-border/60">
            <div className="mb-6 border-b border-brand-border/60 pb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-cloud px-3.5 py-1 text-xs font-semibold text-brand-accent">
                <Sparkles className="size-3.5" /> Founder &amp; Startup Intake
              </span>
              <h3 className="mt-3 text-xl font-bold tracking-tight text-brand-ink sm:text-2xl">
                Publish a Founder Opportunity
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-brand-secondary">
                Founders, startups, and business leaders can list co-founder searches, seed grants, hackathons, and technical openings directly with the Coimbatore Startup Community. All postings undergo 24-hour moderation before going live.
              </p>
            </div>

            <MemberOpportunityForm />
          </div>
        </Container>
      </section>
    </>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <section aria-busy="true" className="py-20">
          <Container className="max-w-5xl">
            <p className="text-sm text-brand-muted">Loading opportunities…</p>
          </Container>
        </section>
      }
    >
      <OpportunitiesContent />
    </Suspense>
  );
}
