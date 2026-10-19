import * as React from "react";
import { Container } from "@/components/common/container";
import { Eyebrow } from "@/components/common/section";
import { AmbientPastelBackground, AnimatedHeading, FadeIn } from "@/components/motion";

export interface PageHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** Consistent hero band for secondary pages. */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-brand-border">
      <AmbientPastelBackground intensity="subtle" />
      <Container className="flex flex-col items-center gap-5 py-16 text-center sm:py-20 lg:py-24">
        <FadeIn inView={false} direction="up">
          <Eyebrow>{eyebrow}</Eyebrow>
        </FadeIn>
        <AnimatedHeading
          as="h1"
          onMount
          text={title}
          className="max-w-3xl text-[length:var(--text-hero)] leading-[1.05] font-extrabold tracking-tight text-brand-ink"
        />
        {description ? (
          <FadeIn inView={false} delay={0.4} direction="up">
            <p className="max-w-2xl text-base leading-relaxed text-brand-secondary sm:text-[17px]">
              {description}
            </p>
          </FadeIn>
        ) : null}
        {children ? (
          <FadeIn inView={false} delay={0.55} direction="up">
            {children}
          </FadeIn>
        ) : null}
      </Container>
    </section>
  );
}
