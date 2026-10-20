import type { Metadata } from "next";
import { Handshake } from "lucide-react";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { EmptyState } from "@/components/common/empty-state";
import { CtaLink } from "@/components/common/cta-link";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { CollaborationCard } from "@/components/collaborations/collaboration-card";
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
        </Container>
      </section>
    </>
  );
}
