import type { Metadata } from "next";
import Link from "next/link";
import {
  Handshake,
  Building2,
  GraduationCap,
  Briefcase,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { EmptyState } from "@/components/common/empty-state";
import { CtaLink } from "@/components/common/cta-link";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { CollaborationCard } from "@/components/collaborations/collaboration-card";
import { CollaborationProposalForm } from "@/components/collaborations/collaboration-proposal-form";
import { getPublicCollaborations } from "@/lib/services/public-data";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Collaborations & Institutional Partnerships — CSC Circle",
  description:
    "Discover the communities, startups, academic institutions and industrial bodies collaborating with CSC Circle through joint initiatives, summits, and founder programs.",
  alternates: { canonical: "/collaborations" },
  openGraph: {
    title: "Collaborations · CSC Circle",
    description:
      "Communities, startups and organizations building stronger connections together with CSC Circle.",
    url: `${siteConfig.url}/collaborations`,
  },
};

const partnershipPillars = [
  {
    icon: GraduationCap,
    title: "Academic Incubators & Universities",
    desc: "Establishing student startup cells, campus ambassador cohorts, collegiate hackathons, and guest masterclasses.",
  },
  {
    icon: Building2,
    title: "Government & Nodal Agencies",
    desc: "Collaborating with StartupTN, EDII, and MSME Development Institute for grant distribution and policy outreach.",
  },
  {
    icon: Briefcase,
    title: "Industry & Trade Associations",
    desc: "Bridging traditional manufacturing leaders (CODISSIA, CII, Nativelead) with innovative software and deeptech startups.",
  },
  {
    icon: Layers,
    title: "Corporate & Technology Partners",
    desc: "Delivering cloud infrastructure credits, software tooling sponsorships, and API access grants for early-stage builders.",
  },
];

export default async function CollaborationsPage() {
  const collaborations = await getPublicCollaborations();

  return (
    <>
      <PageHero
        eyebrow="Strategic Alliances"
        title="Building Stronger Connections Together"
        description="Discover the communities, startups, organizations, and people collaborating with CSC Circle through shared experiences, networking opportunities, and joint initiatives."
      />

      <section className="py-14 sm:py-16 lg:py-20">
        <Container className="flex flex-col gap-14">
          {/* 4 Partnership Pillars */}
          <div className="rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8 shadow-xs">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                  Ecosystem Alliances
                </span>
                <h3 className="text-lg font-bold text-brand-ink mt-0.5">
                  Institutional Partnership Pillars
                </h3>
              </div>
              <span className="text-xs text-brand-muted">48h Dedicated Review SLA</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {partnershipPillars.map((p) => (
                <div key={p.title} className="rounded-2xl bg-brand-cloud/40 p-4 border border-brand-border/60">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-white text-brand-ink ring-1 ring-brand-border">
                    <p.icon className="size-4" />
                  </span>
                  <h4 className="mt-2 text-sm font-bold text-brand-ink">{p.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-brand-secondary">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Collaborations List */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Alliances &amp; Programs
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">
                Active Community Collaborations
              </h2>
            </div>

            {collaborations.length > 0 ? (
              <StaggerContainer className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {collaborations.map((c) => (
                  <StaggerItem key={c.id} className="h-full">
                    <CollaborationCard collaboration={c} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            ) : (
              <EmptyState
                icon={Handshake}
                title="Collaborations are on the way."
                description="CSC Circle's community partnerships and joint events will appear here soon."
              >
                <CtaLink href="/events" size="md">
                  Explore CSC Events
                </CtaLink>
              </EmptyState>
            )}
          </div>

          {/* Partner & Ecosystem Collaboration Intake Form */}
          <div
            id="propose"
            className="flex flex-col gap-6 rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-10 shadow-xs ring-1 ring-brand-border"
          >
            <div className="flex flex-col gap-2">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
                <Handshake className="size-3.5" /> Institutional &amp; Partner Intake
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-brand-ink">
                Propose a Strategic Collaboration with CSC Circle
              </h2>
              <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-brand-secondary">
                Are you an incubator, university innovation cell, angel network, corporate accelerator, or maker space? Partner with Coimbatore Startup Community to co-host hackathons, mentorship tracks, pitch days, and founder fellowships. Proposals are reviewed directly by the Vice President &amp; Strategic Alliances Desk.
              </p>
            </div>

            <div className="border-t border-brand-border/60 pt-4">
              <CollaborationProposalForm />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
