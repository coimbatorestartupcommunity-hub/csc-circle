import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ShieldCheck } from "lucide-react";
import { Container } from "@/components/common/container";
import { BrandLogo } from "@/components/layout/brand-logo";
import { CtaLink } from "@/components/common/cta-link";
import { InstagramIcon, WhatsappIcon } from "@/components/common/brand-icons";
import { brandAssets, footerNav, routes, siteConfig } from "@/lib/content/site";

function FooterLinkGroup({
  heading,
  links,
  side,
}: {
  heading: string;
  links: (typeof footerNav)[number]["links"];
  side: "left" | "right";
}) {
  const isRight = side === "right";

  return (
    <nav
      aria-label={heading}
      data-testid={isRight ? "footer-community" : "footer-get-involved"}
      className={isRight ? "text-center lg:text-right" : "text-center lg:text-left"}
    >
      <h2 className="text-[10px] font-semibold tracking-[0.12em] text-brand-ink uppercase sm:text-xs">
        {heading}
      </h2>
      <ul className={`mt-2.5 flex flex-col items-center gap-1.5 sm:mt-4 sm:gap-2.5 ${isRight ? "lg:items-end" : "lg:items-start"}`}>
        {links.map((link) => (
          <li key={`${heading}-${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="text-[11px] leading-5 text-brand-secondary transition-colors hover:text-brand-ink focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink sm:text-sm sm:leading-6"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      {!isRight && (
        <div className="mt-3 sm:mt-5">
          <CtaLink
            href={routes.join}
            size="md"
            className="mt-0.5 h-8 gap-1 px-2 text-[10px] sm:h-10 sm:gap-2 sm:px-5 sm:text-sm"
          >
            Join CSC Circle
          </CtaLink>
        </div>
      )}
    </nav>
  );
}

export function SiteFooter() {
  const year = siteConfig.established;
  const community = footerNav.find((group) => group.heading === "Community");
  const getInvolved = footerNav.find((group) => group.heading === "Get involved");

  return (
    <footer className="mt-auto border-t border-brand-border bg-brand-cloud">
      <Container className="py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-2 items-start gap-x-3 gap-y-7 sm:gap-x-8 sm:gap-y-9 lg:grid-cols-[1fr_minmax(18rem,1.35fr)_1fr] lg:gap-10">
          {getInvolved && (
            <div className="order-2 lg:order-1">
              <FooterLinkGroup
                heading={getInvolved.heading}
                links={getInvolved.links}
                side="left"
              />
            </div>
          )}

          <section
            aria-label="About CSC Circle"
            data-testid="footer-brand"
            className="col-span-2 order-1 flex flex-col items-center text-center lg:col-span-1 lg:order-2"
          >
            <BrandLogo className="justify-center" markSize={48} />
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-brand-muted sm:mt-4 sm:text-sm">
              {siteConfig.description}
            </p>
            <p className="mt-2 text-[10px] font-medium tracking-wide text-brand-muted sm:text-xs">
              {siteConfig.city}, {siteConfig.region} · estd {year}
            </p>
            <ul className="mt-3 flex items-center justify-center gap-2 sm:mt-4 sm:gap-2.5">
              <li>
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="CSC Circle on Instagram"
                  className="flex size-8 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:ring-3 focus-visible:ring-ring/50 sm:size-9"
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
                  className="flex size-8 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:ring-3 focus-visible:ring-ring/50 sm:size-9"
                >
                  <WhatsappIcon className="size-4" />
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.social.email}`}
                  aria-label="Email CSC Circle"
                  className="flex size-8 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:ring-3 focus-visible:ring-ring/50 sm:size-9"
                >
                  <Mail className="size-4" />
                </a>
              </li>
            </ul>
          </section>

          {community && (
            <div className="order-3 lg:order-3">
              <FooterLinkGroup
                heading={community.heading}
                links={community.links}
                side="right"
              />
            </div>
          )}

          <nav
            aria-label="Legal and security"
            data-testid="footer-legal"
            className="col-span-2 order-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-brand-border pt-4 text-[10px] sm:gap-x-5 sm:gap-y-2 sm:pt-5 sm:text-sm lg:col-span-3"
          >
            <Link href="/privacy" className="font-medium text-brand-secondary underline-offset-4 hover:text-brand-ink hover:underline">
              Privacy Policy
            </Link>
            <Link href="/security" className="inline-flex items-center gap-1 font-medium text-brand-secondary underline-offset-4 hover:text-brand-ink hover:underline">
              <ShieldCheck aria-hidden="true" className="size-3 sm:size-4" /> Security
            </Link>
            <Link href="/terms" className="font-medium text-brand-secondary underline-offset-4 hover:text-brand-ink hover:underline">
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
