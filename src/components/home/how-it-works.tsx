import * as React from "react";
import { Section, SectionHeading } from "@/components/common/section";
import { Icon, type IconName } from "@/components/common/icon";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { howItWorks } from "@/lib/content/home";

export function HowItWorks() {
  return (
    <Section className="bg-brand-white">
      <SectionHeading
        eyebrow="How CSC works"
        title={howItWorks.heading}
        description={howItWorks.description}
      />
      <StaggerContainer className="mt-12 grid gap-6 md:grid-cols-3">
        {howItWorks.steps.map((step, i) => (
          <StaggerItem key={step.title} className="relative h-full">
            <div className="flex h-full flex-col gap-4 rounded-3xl bg-brand-cloud p-7 ring-1 ring-brand-border">
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-white text-brand-accent ring-1 ring-brand-border">
                  <Icon name={step.icon as IconName} className="size-6" />
                </span>
                <span className="font-mono text-sm font-semibold text-brand-muted">
                  0{i + 1}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-brand-ink">
                {step.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-brand-secondary">
                {step.body}
              </p>
            </div>
            {i < howItWorks.steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-1/2 -right-3 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full bg-brand-accent text-brand-white md:flex"
              >
                →
              </span>
            ) : null}
          </StaggerItem>
        ))}
      </StaggerContainer>
    </Section>
  );
}
