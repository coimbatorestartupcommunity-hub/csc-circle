import * as React from "react";
import { Section } from "@/components/common/section";
import { Icon, type IconName } from "@/components/common/icon";
import { CtaLink } from "@/components/common/cta-link";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { memberExperience } from "@/lib/content/home";

export function MemberExperience() {
  return (
    <Section className="bg-brand-ink text-brand-white">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-white/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-brand-white/80 uppercase">
          Member experience · in development
        </span>
        <h2 className="text-[length:var(--text-section)] leading-[1.08] font-bold tracking-tight text-balance">
          {memberExperience.heading}
        </h2>
        <p className="text-base leading-relaxed text-brand-white/70 sm:text-[17px]">
          {memberExperience.description}
        </p>
      </div>

      <StaggerContainer className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {memberExperience.cards.map((card) => (
          <StaggerItem key={card.title} className="h-full">
            <div className="flex h-full flex-col gap-3 rounded-3xl bg-brand-white/5 p-6 ring-1 ring-brand-white/10 backdrop-blur-sm">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-white/10 text-brand-white">
                <Icon name={card.icon as IconName} className="size-5" />
              </span>
              <h3 className="text-base font-semibold text-brand-white">
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed text-brand-white/65">
                {card.body}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <div className="mt-10 flex justify-center">
        <CtaLink href={memberExperience.cta.href} variant="accent" size="lg">
          {memberExperience.cta.label}
        </CtaLink>
      </div>
    </Section>
  );
}
