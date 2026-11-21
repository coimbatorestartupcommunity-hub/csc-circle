import type { Metadata } from "next";
import { Handshake } from "lucide-react";
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
  title: "Collaborations",
  description:
    "Discover the communities, startups, organizations and people collaborating with CSC Circle through shared experiences, networking opportunities and joint initiatives.",
  alternates: { canonical: "/collaborations" },
  openGraph: {
    title: "Collaborations · CSC Circle",
    description:
      "Communities, startups and organizations building stronger connections together with CSC Circle.",
    url: `${siteConfig.url}/collaborations`,
  },
};

export default async function CollaborationsPage() {
  const collaborations = await getPublicCollaborations();

  return (
    <>
      <PageHero
        eyebrow="Collaborations"
        title="Building Stronger Connections Together"
        description="Discover the communities, startups, organizations, and people collaborating with CSC Circle through shared experiences, networking opportunities, and joint initiatives."
      />

      <section className="py-14 sm:py-16 lg:py-20">
        <Container>
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

          {/* Partner & Ecosystem Collaboration Intake Form */}
          <div
            id="propose"
            className="mt-16 flex flex-col gap-6 rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-10 shadow-xs ring-1 ring-brand-border"
          >
            <div className="flex flex-col gap-2">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
                <Handshake className="size-3.5" /> Institutional &amp; Partner Intake
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-brand-ink">
                Propose a Strategic Collaboration with CSC Circle
              </h2>
              <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-brand-secondary">
                Are you an incubator, university innovation cell, angel network, corporate accelerator, or maker space? Partner with Coimbatore Startup Community to co-host hackathons, mentorship tracks, pitch days, and founder fellowships.
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
