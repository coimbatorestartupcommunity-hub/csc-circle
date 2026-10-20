import * as React from "react";
import { Section, SectionHeading } from "@/components/common/section";
import { FeatureCard } from "@/components/common/feature-card";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import type { IconName } from "@/components/common/icon";
import type { Surface } from "@/components/common/surfaces";
import { whyJoin } from "@/lib/content/home";
import { CtaLink } from "@/components/common/cta-link";

export function FeaturesGrid() {
  return (
    <Section className="bg-brand-cloud">
      <SectionHeading
        eyebrow="Why join CSC?"
        title={whyJoin.heading}
        description={whyJoin.description}
      />
      <StaggerContainer className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {whyJoin.cards.map((card) => (
          <StaggerItem key={card.title} className="h-full">
            <FeatureCard
              icon={card.icon as IconName}
              title={card.title}
              body={card.body}
              surface={card.surface as Surface}
            />
          </StaggerItem>
        ))}
      </StaggerContainer>
      <div className="mt-10 flex justify-center">
        <CtaLink href="/directory" variant="outline" size="lg">
          Founder Directory
        </CtaLink>
      </div>
    </Section>
  );
}
