import * as React from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Container } from "@/components/common/container";
import { Eyebrow } from "@/components/common/section";
import { CtaLink } from "@/components/common/cta-link";
import {
  AmbientPastelBackground,
  AnimatedHeading,
  FadeIn,
} from "@/components/motion";
import { brandAssets, siteConfig } from "@/lib/content/site";
import { homeHero } from "@/lib/content/home";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <AmbientPastelBackground />
      <Container className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:gap-14 lg:py-28">
        {/* Text column */}
        <div className="flex flex-col items-start gap-6">
          <FadeIn inView={false} direction="up">
            <Eyebrow>{homeHero.eyebrow}</Eyebrow>
          </FadeIn>

          <AnimatedHeading
            as="h1"
            onMount
            text={homeHero.headline}
            className="text-[length:var(--text-hero)] leading-[1.03] font-extrabold tracking-tight text-brand-ink"
          />

          <FadeIn inView={false} delay={0.5} direction="up">
            <p className="font-serif text-2xl font-medium text-brand-accent sm:text-3xl">
              {homeHero.statement}
            </p>
          </FadeIn>

          <FadeIn inView={false} delay={0.6} direction="up">
            <p className="max-w-xl text-base leading-relaxed text-brand-secondary sm:text-[17px]">
              {homeHero.description}
            </p>
          </FadeIn>

          <FadeIn
            inView={false}
            delay={0.75}
            direction="up"
            className="flex flex-col gap-3 sm:flex-row"
          >
            <CtaLink href={homeHero.primaryCta.href} size="lg">
              {homeHero.primaryCta.label}
            </CtaLink>
            <CtaLink
              href={homeHero.secondaryCta.href}
              variant="outline"
              size="lg"
            >
              {homeHero.secondaryCta.label}
            </CtaLink>
          </FadeIn>
        </div>

        {/* Visual column — approved community photograph */}
        <FadeIn
          inView={false}
          delay={0.3}
          direction="left"
          className="relative"
        >
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-white p-2 shadow-xl ring-1 ring-brand-border">
            <Image
              src={brandAssets.communityPhoto}
              alt="The CSC Circle community gathered in Coimbatore"
              width={1179}
              height={823}
              className="h-auto w-full rounded-[1.6rem] object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 460px"
            />
          </div>

          {/* Floating brand badge */}
          <div className="absolute -top-3 -left-3 flex items-center gap-2 rounded-full bg-brand-white px-3 py-1.5 text-xs font-semibold text-brand-ink shadow-md ring-1 ring-brand-border">
            <Sparkles className="size-3.5 text-brand-accent" aria-hidden />
            estd {siteConfig.established}
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
