import * as React from "react";
import { Container } from "@/components/common/container";
import { CtaLink } from "@/components/common/cta-link";
import { RevealOnScroll, AmbientPastelBackground } from "@/components/motion";
import { CircularSocialIcon } from "@/components/common/brand-icons";
import { finalCta } from "@/lib/content/home";
import { siteConfig } from "@/lib/content/site";

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
            <div className="mt-2 flex flex-col items-center gap-3">
              <CtaLink href={finalCta.cta.href} size="lg">
                {finalCta.cta.label}
              </CtaLink>

              <div className="mt-4 flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-brand-secondary">
                  Join our official communication circles:
                </span>
                <div className="flex items-center gap-3.5">
                  <a
                    href={siteConfig.social.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp Community Broadcast"
                    title="Join WhatsApp Group"
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <CircularSocialIcon network="whatsapp" size={44} />
                  </a>
                  <a
                    href={siteConfig.social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn Profile"
                    title="Connect on LinkedIn"
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <CircularSocialIcon network="linkedin" size={44} />
                  </a>
                  <a
                    href={siteConfig.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram Highlights"
                    title="Follow on Instagram"
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <CircularSocialIcon network="instagram" size={44} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </Container>
    </section>
  );
}
