import type { Metadata } from "next";
import Image from "next/image";
import { Section, SectionHeading } from "@/components/common/section";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { FeatureCard } from "@/components/common/feature-card";
import { CtaLink } from "@/components/common/cta-link";
import { MissionVision } from "@/components/about/mission-vision";
import { LeadershipSection } from "@/components/about/leadership-section";
import {
  RevealOnScroll,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion";
import type { IconName } from "@/components/common/icon";
import type { Surface } from "@/components/common/surfaces";
import { brandAssets, siteConfig } from "@/lib/content/site";
import {
  aboutHero,
  whyExists,
  values,
  techPartnership,
  aboutClosing,
} from "@/lib/content/about";

export const metadata: Metadata = {
  title: "About CSC Circle",
  description:
    "CSC Circle is a community created to bring together Coimbatore's entrepreneurial minds and encourage meaningful collaboration. Learn about our mission, vision and leadership.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About CSC Circle",
    description:
      "Building a more connected startup ecosystem in Coimbatore — our mission, vision and leadership.",
    url: `${siteConfig.url}/about`,
  },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow={aboutHero.eyebrow}
        title={aboutHero.headline}
        description={aboutHero.statement}
      />

      {/* Approved community photograph */}
      <div className="bg-brand-white pt-12 sm:pt-16">
        <Container>
          <RevealOnScroll className="overflow-hidden rounded-[2rem] bg-brand-white p-2 shadow-sm ring-1 ring-brand-border">
            <Image
              src={brandAssets.communityPhoto}
              alt="The CSC Circle community gathered in Coimbatore"
              width={1179}
              height={823}
              className="h-auto w-full rounded-[1.6rem] object-cover"
              sizes="(max-width: 1280px) 100vw, 1200px"
            />
          </RevealOnScroll>
        </Container>
      </div>

      {/* Why CSC exists */}
      <Section className="bg-brand-white">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <RevealOnScroll>
            <h2 className="text-[length:var(--text-section)] leading-[1.1] font-bold tracking-tight text-balance text-brand-ink">
              {whyExists.heading}
            </h2>
          </RevealOnScroll>
          <RevealOnScroll
            delay={0.1}
            className="flex flex-col gap-4 text-base leading-relaxed text-brand-secondary sm:text-[17px]"
          >
            {whyExists.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </RevealOnScroll>
        </div>
      </Section>

      <Suspense fallback={null}><MissionVision /></Suspense>

      <LeadershipSection />

      {/* Values */}
      <Section className="bg-brand-cloud">
        <SectionHeading
          eyebrow="Our values"
          title={values.heading}
        />
        <StaggerContainer className="mt-12 grid gap-5 md:grid-cols-3">
          {values.cards.map((card) => (
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
      </Section>

      {/* Technology partnership */}
      <Section className="bg-brand-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 rounded-[2rem] bg-brand-cloud p-8 text-center ring-1 ring-brand-border sm:p-12">
          <a
            href={siteConfig.technologyPartner.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Image
              src={brandAssets.litLogo}
              alt={`${siteConfig.technologyPartner.name} logo`}
              width={88}
              height={88}
              className="size-20 rounded-full ring-1 ring-brand-border"
            />
          </a>
          <div className="flex flex-col gap-3">
            <h2 className="text-[length:var(--text-section)] leading-[1.1] font-bold tracking-tight text-balance text-brand-ink">
              {techPartnership.heading}
            </h2>
            <p className="text-base leading-relaxed text-brand-secondary sm:text-[17px]">
              {techPartnership.body}
            </p>
          </div>
        </div>
      </Section>

      {/* Closing CTA */}
      <section className="pb-14 sm:pb-20 lg:pb-28">
        <Container>
          <RevealOnScroll className="flex flex-col items-center gap-5 rounded-[2.5rem] bg-gradient-to-br from-brand-purple via-brand-lilac to-brand-blue px-6 py-16 text-center ring-1 ring-brand-border sm:px-12">
            <h2 className="text-[length:var(--text-section)] leading-[1.08] font-bold tracking-tight text-balance text-brand-ink">
              {aboutClosing.headline}
            </h2>
            <CtaLink href={aboutClosing.cta.href} size="lg">
              {aboutClosing.cta.label}
            </CtaLink>
          </RevealOnScroll>
        </Container>
      </section>
    </>
  );
}
import { Suspense } from "react";
