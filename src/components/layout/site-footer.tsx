import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ShieldCheck } from "lucide-react";
import { Container } from "@/components/common/container";
import { BrandLogo } from "@/components/layout/brand-logo";
import { CtaLink } from "@/components/common/cta-link";
import { InstagramIcon, WhatsappIcon } from "@/components/common/brand-icons";
import { brandAssets, routes, siteConfig } from "@/lib/content/site";

const helpLinks = [
  { href: "/help", label: "Help & FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/community-guidelines", label: "Community Guidelines" },
  { href: "/membership", label: "Membership Guide" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms and Conditions" },
];

const socialLinkClass =
  "flex size-11 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink";

export function SiteFooter() {
  const year = siteConfig.established;
  return (
    <footer className="mt-auto border-t border-brand-border bg-brand-cloud">
      <Container className="py-8 sm:py-10 lg:py-12">
        {/* Help & legal links — above the three columns, wrap gracefully on mobile. */}
        <nav
          aria-label="Help and legal"
          data-testid="footer-legal"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pb-6 text-xs sm:gap-x-6 sm:text-sm"
        >
          {helpLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-semibold text-brand-ink underline decoration-brand-border decoration-1 underline-offset-4 transition-colors hover:text-brand-accent hover:decoration-brand-accent"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/security"
            className="inline-flex items-center gap-1 font-semibold text-brand-ink underline decoration-brand-border decoration-1 underline-offset-4 transition-colors hover:text-brand-accent hover:decoration-brand-accent"
          >
            <ShieldCheck aria-hidden="true" className="size-3.5 sm:size-4" /> Security
          </Link>
        </nav>

        <div className="grid gap-10 border-t border-brand-border pt-8 md:grid-cols-3 md:gap-8">
          {/* LEFT — Stay Connected */}
          <section data-testid="footer-connect" aria-label="Stay connected" className="flex flex-col items-center text-center md:items-start md:text-left">
            <h2 className="text-sm font-bold text-brand-ink">Stay Connected</h2>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-brand-muted sm:text-sm">
              Follow CSC Circle, stay informed about community activities, and connect with founders and builders across Coimbatore.
            </p>
            <ul data-testid="footer-social" className="mt-4 flex items-center gap-3">
              <li>
                <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="CSC Circle on Instagram" className={socialLinkClass}>
                  <InstagramIcon className="size-4" />
                </a>
              </li>
              <li>
                <a href={siteConfig.social.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Join the CSC Circle WhatsApp community" className={socialLinkClass}>
                  <WhatsappIcon className="size-4" />
                </a>
              </li>
              <li>
                <a href={`mailto:${siteConfig.social.email}`} aria-label="Email CSC Circle" className={socialLinkClass}>
                  <Mail className="size-4" />
                </a>
              </li>
            </ul>
            <CtaLink href={routes.join} size="md" className="mt-4 h-11 rounded-xl px-6 text-sm">
              Join CSC Circle
            </CtaLink>
          </section>

          {/* CENTER — Community information */}
          <section data-testid="footer-info" aria-label="About CSC Circle" className="flex flex-col items-center text-center">
            <h2 className="text-sm font-bold text-brand-ink">Connecting Coimbatore&apos;s Startup Ecosystem</h2>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-brand-muted sm:text-sm">
              CSC Circle brings together entrepreneurs, startup founders, aspiring innovators, students, professionals, and builders to
              exchange ideas, discover opportunities, and grow through meaningful collaboration. Explore founder and startup profiles,
              discover community events, and take part in initiatives that strengthen Coimbatore&apos;s entrepreneurial ecosystem.
            </p>
            <p className="mt-3 font-mono text-xs font-semibold tracking-[0.18em] text-brand-accent uppercase">
              Connect. Build. Grow.
            </p>
          </section>

          {/* RIGHT — CSC identity (centered glassmorphism card) */}
          <section data-testid="footer-brand" aria-label="CSC Circle identity" className="flex flex-col items-center text-center">
            <div className="flex w-full max-w-xs flex-col items-center rounded-2xl border border-brand-white/60 bg-brand-white/55 p-5 text-center shadow-sm ring-1 ring-brand-border/40 backdrop-blur-md">
              <BrandLogo className="justify-center" markSize={48} priority={false} />
              <p className="mt-3 text-sm font-semibold text-brand-ink">{siteConfig.legalName}</p>
              <p className="mt-1 text-xs text-brand-muted">{siteConfig.city}, {siteConfig.region}</p>
              <p className="mt-1 text-[10px] font-medium tracking-wide text-brand-muted sm:text-xs">estd {year}</p>
            </div>
          </section>
        </div>

        {/* Bottom strip */}
        <div className="mt-8 flex flex-col items-center gap-1.5 border-t border-brand-border pt-5 text-center text-[10px] leading-relaxed text-brand-muted sm:flex-row sm:justify-between sm:text-xs">
          <p>© {year} {siteConfig.legalName}. Community-led initiative.</p>
          <p className="inline-flex items-center gap-1.5">
            Platform by
            <a
              href={siteConfig.technologyPartner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-brand-secondary underline-offset-4 hover:text-brand-ink hover:underline"
            >
              <Image src={brandAssets.litLogo} alt="" width={18} height={18} className="rounded-full" />
              {siteConfig.technologyPartner.name}
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
}
