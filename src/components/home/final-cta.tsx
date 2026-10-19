import * as React from "react";
import { Container } from "@/components/common/container";
import { CtaLink } from "@/components/common/cta-link";
import { RevealOnScroll, AmbientPastelBackground } from "@/components/motion";
import { finalCta } from "@/lib/content/home";

export function FinalCta() {
  return (
    <section className="py-14 sm:py-20 lg:py-28">
      <Container>
        <RevealOnScroll className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-purple via-brand-lilac to-brand-blue px-6 py-16 text-center ring-1 ring-brand-border sm:px-12 sm:py-20">
          <AmbientPastelBackground intensity="subtle" />
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
            <h2 className="text-[length:var(--text-section)] leading-[1.08] font-bold tracking-tight text-balance text-brand-ink">
              {finalCta.headline}
            </h2>
            <p className="text-base leading-relaxed text-brand-secondary sm:text-[17px]">
              {finalCta.body}
            </p>
            <CtaLink href={finalCta.cta.href} size="lg" className="mt-2">
              {finalCta.cta.label}
            </CtaLink>
          </div>
        </RevealOnScroll>
      </Container>
    </section>
  );
}
