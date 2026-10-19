import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";
import { Container } from "@/components/common/container";
import { BrandLogo } from "@/components/layout/brand-logo";
import { CtaLink } from "@/components/common/cta-link";
import {
  InstagramIcon,
  WhatsappIcon,
} from "@/components/common/brand-icons";
import {
  brandAssets,
  footerNav,
  routes,
  siteConfig,
} from "@/lib/content/site";

export function SiteFooter() {
  const year = siteConfig.established;
  return (
    <footer className="mt-auto border-t border-brand-border bg-brand-cloud">
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div className="flex flex-col gap-4">
            <BrandLogo />
            <p className="max-w-xs text-sm leading-relaxed text-brand-muted">
              {siteConfig.description}
            </p>
            <p className="text-xs font-medium tracking-wide text-brand-muted">
              {siteConfig.city}, {siteConfig.region} · estd {year}
            </p>
            <ul className="mt-1 flex items-center gap-2.5">
              <li>
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="CSC Circle on Instagram"
                  className="flex size-9 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <InstagramIcon className="size-4.5" />
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join the CSC Circle WhatsApp community"
                  className="flex size-9 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <WhatsappIcon className="size-4.5" />
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.social.email}`}
                  aria-label="Email CSC Circle"
                  className="flex size-9 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Mail className="size-4.5" />
                </a>
              </li>
            </ul>
          </div>

          {footerNav.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="text-xs font-semibold tracking-[0.12em] text-brand-ink uppercase">
                {group.heading}
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={`${group.heading}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-brand-secondary transition-colors hover:text-brand-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="flex flex-col gap-4 lg:items-end">
            <CtaLink href={routes.join} size="md">
              Join CSC Circle
            </CtaLink>
            <a
              href={siteConfig.technologyPartner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-xl border border-brand-border bg-brand-white px-3 py-2 transition-colors hover:border-brand-ink/20"
            >
              <Image
                src={brandAssets.litLogo}
                alt={`${siteConfig.technologyPartner.name} logo`}
                width={28}
                height={28}
                className="rounded-full"
              />
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] tracking-wide text-brand-muted uppercase">
                  Technology partner
                </span>
                <span className="text-xs font-semibold text-brand-ink">
                  {siteConfig.technologyPartner.name}
                </span>
              </span>
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-brand-border pt-6 text-xs text-brand-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.legalName}. Community-led initiative.
          </p>
          <p>
            Platform by{" "}
            <a
              href={siteConfig.technologyPartner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-secondary underline-offset-4 hover:text-brand-ink hover:underline"
            >
              {siteConfig.technologyPartner.name}
            </a>
            .
          </p>
        </div>
      </Container>
    </footer>
  );
}
