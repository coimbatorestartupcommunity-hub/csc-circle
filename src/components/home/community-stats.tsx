import * as React from "react";
import { Section, SectionHeading } from "@/components/common/section";
import { StaggerContainer, StaggerItem, AnimatedCounter } from "@/components/motion";
import { getCommunityStats, statPropositions } from "@/lib/services/stats";
import { statsSection } from "@/lib/content/home";

/**
 * Community statistics. Numbers are shown ONLY when an admin has published a
 * verified value; otherwise the community proposition is shown instead — no
 * unverified figures appear as facts.
 */
export function CommunityStats() {
  const stats = getCommunityStats();
  return (
    <Section className="bg-brand-white">
      <SectionHeading
        eyebrow="Our community"
        title={statsSection.title}
        description={statsSection.description}
      />
      <StaggerContainer className="mt-12 grid gap-5 sm:grid-cols-3">
        {stats.map((stat) => (
          <StaggerItem key={stat.id}>
            <div className="flex h-full flex-col items-center gap-2 rounded-3xl bg-brand-cloud px-6 py-10 text-center ring-1 ring-brand-border">
              {stat.published ? (
                <span className="text-5xl font-extrabold tracking-tight text-brand-ink">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </span>
              ) : (
                <span
                  className="text-sm leading-relaxed text-brand-muted"
                  aria-label={`${stat.label}: figure not yet published`}
                >
                  {statPropositions[stat.id]}
                </span>
              )}
              <span className="text-sm font-semibold tracking-wide text-brand-secondary uppercase">
                {stat.label}
              </span>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </Section>
  );
}
