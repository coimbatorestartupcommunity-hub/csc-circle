import type { Metadata } from "next";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { CtaLink } from "@/components/common/cta-link";
import { Icon, type IconName } from "@/components/common/icon";
import { InstagramIcon, WhatsappIcon } from "@/components/common/brand-icons";
import { Mail } from "lucide-react";
import { RevealOnScroll } from "@/components/motion";
import { memberExperience } from "@/lib/content/home";
import { routes, siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Join CSC Circle",
  description:
    "Member accounts and the CSC Circle portal are launching soon. Explore what membership will offer and stay close to the community in the meantime.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function JoinPage() {
  return (
    <>
      <PageHero
        eyebrow="Join CSC Circle"
        title="Membership Is Almost Here."
        description="Member accounts, the digital CSC membership and the founder portal are in active development. Here's what you'll be able to do — and how to stay close until it opens."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={siteConfig.social.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="group/cta inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-ink px-6 text-[15px] font-medium text-brand-white shadow-sm transition-all hover:bg-brand-ink/90 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <WhatsappIcon className="size-4.5" />
            Join the WhatsApp community
          </a>
          <CtaLink href={routes.events} variant="outline" size="lg">
            Explore upcoming events
          </CtaLink>
        </div>
      </PageHero>

      <section className="py-14 sm:py-20">
        <Container>
          <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
            {memberExperience.cards.map((card) => (
              <RevealOnScroll key={card.title} className="h-full">
                <div className="flex h-full flex-col gap-3 rounded-3xl bg-brand-cloud p-6 ring-1 ring-brand-border">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-white text-brand-accent ring-1 ring-brand-border">
                    <Icon name={card.icon as IconName} className="size-5" />
                  </span>
                  <h2 className="text-base font-semibold text-brand-ink">
                    {card.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-brand-secondary">
                    {card.body}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          <RevealOnScroll className="mx-auto mt-10 max-w-2xl rounded-3xl bg-brand-blue/50 p-6 text-center ring-1 ring-brand-border sm:p-8">
            <h2 className="text-lg font-semibold text-brand-ink">
              Secure sign-in is coming in a later phase.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-secondary">
              We&apos;re building authentication and the member database with
              care, so there&apos;s no temporary or insecure login here. Until
              it&apos;s ready, the best way to get involved is to join an event
              and meet the community in person.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a
                href={siteConfig.social.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join the CSC Circle WhatsApp community"
                className="flex size-10 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <WhatsappIcon className="size-5" />
              </a>
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow CSC Circle on Instagram"
                className="flex size-10 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <InstagramIcon className="size-5" />
              </a>
              <a
                href={`mailto:${siteConfig.social.email}`}
                aria-label="Email CSC Circle"
                className="flex size-10 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-purple focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Mail className="size-5" />
              </a>
            </div>
          </RevealOnScroll>

          <p className="mt-8 text-center text-sm text-brand-muted">
            Have a partnership or technology question? Reach the platform team at{" "}
            <a
              href={siteConfig.technologyPartner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-accent underline-offset-4 hover:underline"
            >
              {siteConfig.technologyPartner.name}
            </a>
            .
          </p>
        </Container>
      </section>
    </>
  );
}
