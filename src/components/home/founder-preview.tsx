import * as React from "react";
import { Compass } from "lucide-react";
import { Section, SectionHeading } from "@/components/common/section";
import { StartupCard } from "@/components/directory/startup-card";
import { CtaLink } from "@/components/common/cta-link";
import { EmptyState } from "@/components/common/empty-state";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { getPublicFeaturedStartups } from "@/lib/services/public-data";
import { founderPreview } from "@/lib/content/home";

export async function FounderPreview() {
  const startups = await getPublicFeaturedStartups(3);
  return (
    <Section className="bg-brand-cloud">
      <SectionHeading
        eyebrow="Founder discovery"
        title={founderPreview.heading}
        description={founderPreview.description}
      />

      {startups.length > 0 ? (
        <StaggerContainer className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {startups.map((startup) => (
            <StaggerItem key={startup.id} className="h-full">
              <StartupCard startup={startup} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <div className="mt-12">
          <EmptyState
            icon={Compass}
            title="The founder directory is just getting started."
            description="As founders join CSC Circle, approved startups will appear here. Be one of the first to put your startup on the map."
          >
            <CtaLink href="/login" size="md">
              Add your startup
            </CtaLink>
          </EmptyState>
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <CtaLink href={founderPreview.cta.href} variant="outline" size="lg">
          {founderPreview.cta.label}
        </CtaLink>
      </div>
    </Section>
  );
}
