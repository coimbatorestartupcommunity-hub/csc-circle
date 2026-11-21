import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Compass,
  Cpu,
  Award,
  Users,
  CheckCircle2,
  Calendar,
  Building2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
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
  aboutClosing,
} from "@/lib/content/about";

export const metadata: Metadata = {
  title: "About CSC Circle — Mission, Vision & Ecosystem",
  description:
    "CSC Circle is a founder-first community uniting Coimbatore's entrepreneurs, builders, creators, and students. Discover our core pillars, collaborators, and milestones.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About CSC Circle",
    description:
      "Building a more connected startup ecosystem in Coimbatore — our mission, vision, leadership, and partners.",
    url: `${siteConfig.url}/about`,
  },
};

const pillars = [
  {
    icon: Compass,
    title: "Idea to MVP Bootstrapping",
    body: "Guidance on turning raw concepts into shippable prototypes. We host design critiques, code reviews, and lean product workshops to help builders launch quickly.",
  },
  {
    icon: Users,
    title: "Co-founder & Talent Matching",
    body: "Connecting technical engineers, growth marketers, and domain specialists in Coimbatore so great founders never have to build in isolation.",
  },
  {
    icon: Award,
    title: "Grant & Seed Readiness",
    body: "Hands-on playbooks for regional government grants (TANSEED, EDII-TN, Startup India) and early pitch reviews before founders approach angel syndicates.",
  },
  {
    icon: Cpu,
    title: "Open Technology & Architecture",
    body: "Supported by Logic Intelligence Technologies, providing founders with battle-tested architectures, cloud cost optimizations, and AI integration best practices.",
  },
];

const partners = [
  {
    name: "Logic Intelligence Technologies",
    role: "Platform Architecture & Engineering Partner",
    desc: "Architects of the CSC Circle digital portal, real-time verification pipeline, and infrastructure security.",
    link: "https://logicintelligencetechnologies.in",
  },
];

const milestones = [
  {
    date: "Early 2026",
    title: "Community Inception & Founding Circle",
    description: "Young founders and engineers across Coimbatore unified to establish a transparent, non-transactional ecosystem hub.",
  },
  {
    date: "Mid 2026",
    title: "Digital Platform Rollout",
    description: "Launch of CSC Circle with cryptographic Digital ID Cards, automated 5-minute issuance, and Google Meet integration.",
  },
  {
    date: "Late 2026",
    title: "500+ Builders & Collaborative Network",
    description: "Expansion across regional engineering institutions, incubation cells, and co-working spaces with ongoing founder circles.",
  },
  {
    date: "Looking Ahead",
    title: "Regional Seed Syndicate & Demo Days",
    description: "Fostering direct investment pathways, institutional partnerships, and global market access for Coimbatore-born startups.",
  },
];

export default function AboutPage() {
  return (
    <div data-no-copy="true">
      <PageHero
        eyebrow={aboutHero.eyebrow}
        title={aboutHero.headline}
        description={aboutHero.statement}
      />

      {/* Approved community photograph */}
      <div className="bg-brand-white pt-12 sm:pt-16">
        <Container>
          <RevealOnScroll className="relative overflow-hidden rounded-[2rem] bg-brand-white p-2.5 sm:p-3.5 shadow-xl ring-1 ring-brand-border">
            <div className="overflow-hidden rounded-[1.4rem] sm:rounded-[1.6rem]">
              <Image
                src={brandAssets.communityPhoto}
                alt="The CSC Circle community gathered in Coimbatore"
                width={2000}
                height={1398}
                priority
                className="h-auto w-full object-cover"
                sizes="(max-width: 1280px) 100vw, 1200px"
              />
            </div>
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

      {/* Core Ecosystem Pillars */}
      <Section className="bg-brand-cloud/60">
        <SectionHeading
          eyebrow="Ecosystem Pillars"
          title="How We Support Coimbatore's Founders"
          description="A comprehensive support network designed to help ideas progress into sustainable, revenue-generating businesses."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs transition hover:border-brand-ink/20"
            >
              <div className="flex flex-col gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-cloud text-brand-accent">
                  <pillar.icon className="size-5" />
                </span>
                <h3 className="text-base font-bold text-brand-ink">{pillar.title}</h3>
                <p className="text-xs leading-relaxed text-brand-secondary">{pillar.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Suspense fallback={null}>
        <MissionVision />
      </Suspense>

      <LeadershipSection />

      {/* Collaborator Showcase */}
      <Section className="bg-brand-white">
        <SectionHeading
          eyebrow="Ecosystem Collaborators"
          title="Strategic Partners & Collaborating Organizations"
          description="CSC Circle thrives through trusted partnerships with forward-thinking organizations across technology, design, and industry."
        />
        <div className="mt-12 flex justify-center">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex w-full max-w-2xl flex-col justify-between rounded-3xl border border-brand-border bg-brand-cloud/40 p-6 sm:p-8 transition hover:bg-brand-white hover:shadow-xs"
            >
              <div className="flex flex-col gap-2">
                <span className="w-fit rounded-full bg-brand-white px-2.5 py-1 text-[11px] font-semibold text-brand-accent ring-1 ring-brand-border">
                  {partner.role}
                </span>
                <h3 className="mt-2 text-lg font-bold text-brand-ink">{partner.name}</h3>
                <p className="text-sm leading-relaxed text-brand-secondary">{partner.desc}</p>
              </div>
              {partner.link && (
                <div className="mt-6 border-t border-brand-border/60 pt-4">
                  <a
                    href={partner.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
                  >
                    Visit partner portal <ArrowRight className="size-3.5" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Values */}
      <Section className="bg-brand-cloud">
        <SectionHeading eyebrow="Our values" title={values.heading} />
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

      {/* Milestone Trajectory */}
      <Section className="bg-brand-white">
        <SectionHeading
          eyebrow="Trajectory"
          title="Our Journey & Growth Milestones"
          description="From an informal founders meetup to a structured regional innovation circle."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {milestones.map((m, idx) => (
            <div
              key={m.title}
              className="relative flex flex-col gap-3 rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                {m.date}
              </span>
              <h3 className="text-sm font-bold text-brand-ink">{m.title}</h3>
              <p className="text-xs leading-relaxed text-brand-secondary">{m.description}</p>
            </div>
          ))}
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
    </div>
  );
}
