import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ShieldCheck } from "lucide-react";
import { Container } from "@/components/common/container";
import { BrandLogo } from "@/components/layout/brand-logo";
import { CtaLink } from "@/components/common/cta-link";
import { InstagramIcon, WhatsappIcon } from "@/components/common/brand-icons";
import { brandAssets, routes, siteConfig } from "@/lib/content/site";

export function SiteFooter() {
  const year = siteConfig.established;
  return (
    <footer className="mt-auto border-t border-brand-border bg-brand-cloud">
      <Container className="py-8 sm:py-10 lg:py-12">
        <div className="flex flex-col items-center gap-6">
          <section
            aria-label="About CSC Circle"
            data-testid="footer-brand"
            className="flex w-full min-w-0 flex-col items-center text-center"
          >
            <BrandLogo className="justify-center" markSize={48} priority={false} />
            <p className="mt-3 max-w-[26rem] text-xs leading-relaxed text-brand-muted sm:mt-4 sm:text-sm">
              {siteConfig.description}
            </p>
            <p className="mt-2 text-[10px] font-medium tracking-wide text-brand-muted sm:text-xs">
              {siteConfig.city}, {siteConfig.region} · estd {year}
            </p>
            <ul data-testid="footer-social" className="mt-4 flex items-center justify-center gap-3 sm:gap-3.5">
              <li>
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="CSC Circle on Instagram"
                  className="flex size-11 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
                >
                  <InstagramIcon className="size-4" />
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join the CSC Circle WhatsApp community"
                  className="flex size-11 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
                >
                  <WhatsappIcon className="size-4" />
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.social.email}`}
                  aria-label="Email CSC Circle"
                  className="flex size-11 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
                >
                  <Mail className="size-4" />
                </a>
              </li>
            </ul>
            <CtaLink
              href={routes.join}
              size="md"
              className="mt-4 h-11 rounded-xl px-6 text-sm"
            >
              Join CSC Circle
            </CtaLink>
          </section>

          <nav
            aria-label="Legal and security"
            data-testid="footer-legal"
            className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-brand-border pt-4 text-xs sm:gap-x-6 sm:gap-y-2.5 sm:pt-5 sm:text-sm"
          >
            <Link href="/privacy" className="font-semibold text-brand-ink underline decoration-brand-border decoration-1 underline-offset-4 transition-colors hover:text-brand-accent hover:decoration-brand-accent">
              Privacy Policy
            </Link>
            <Link href="/security" className="inline-flex items-center gap-1 font-semibold text-brand-ink underline decoration-brand-border decoration-1 underline-offset-4 transition-colors hover:text-brand-accent hover:decoration-brand-accent">
              <ShieldCheck aria-hidden="true" className="size-3.5 sm:size-4" /> Security
            </Link>
            <Link href="/terms" className="font-semibold text-brand-ink underline decoration-brand-border decoration-1 underline-offset-4 transition-colors hover:text-brand-accent hover:decoration-brand-accent">
              Terms and Conditions
            </Link>
          </nav>
        </div>

        <div className="mt-5 flex flex-col items-center gap-1.5 border-t border-brand-border pt-4 text-center text-[10px] leading-relaxed text-brand-muted sm:mt-6 sm:flex-row sm:justify-between sm:pt-5 sm:text-xs">
          <p>
            © {year} {siteConfig.legalName}. Community-led initiative.
          </p>
          <p className="inline-flex items-center gap-1.5">
            Platform by
            <a
              href={siteConfig.technologyPartner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-brand-secondary underline-offset-4 hover:text-brand-ink hover:underline"
            >
              <Image
                src={brandAssets.litLogo}
                alt=""
                width={18}
                height={18}
                className="rounded-full"
              />
              {siteConfig.technologyPartner.name}
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
}
