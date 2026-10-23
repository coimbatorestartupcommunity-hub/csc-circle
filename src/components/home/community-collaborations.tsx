import * as React from "react";
import Image from "next/image";
import { Section, SectionHeading } from "@/components/common/section";
import { CtaLink } from "@/components/common/cta-link";
import { RevealOnScroll } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { getPublicCollaborations } from "@/lib/services/public-data";

export async function CommunityCollaborations() {
  const collaborations = await getPublicCollaborations();
  const featured = collaborations[0];
  if (!featured) return null;

  return (
    <Section className="bg-brand-cloud">
      <SectionHeading
        eyebrow="Community collaborations"
        title="Building Meaningful Connections Together"
        description="Through shared ideas, communities, and experiences — here's who we've been building with."
      />

      <RevealOnScroll className="mt-10">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] bg-brand-white ring-1 ring-brand-border lg:grid-cols-2">
          <div className="relative aspect-[4/3] w-full">
            {featured.featuredImagePath ? (
              <Image
                src={featured.featuredImagePath}
                alt={`${featured.title} meetup`}
                fill
                sizes="(max-width: 1024px) 100vw, 600px"
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-4 p-7 sm:p-10">
            <div className="flex items-center gap-2">
              {featured.partners.slice(0, 3).map((p) =>
                p.organization.logoPath ? (
                  <span key={p.organization.id} className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-brand-white ring-1 ring-brand-border">
                    <Image src={p.organization.logoPath} alt={p.organization.name} width={36} height={36} className="size-full object-contain p-0.5" />
                  </span>
                ) : null,
              )}
              <Badge className="bg-brand-purple text-brand-ink">{featured.category}</Badge>
            </div>
            <h3 className="text-2xl font-bold text-brand-ink">{featured.title}</h3>
            {featured.tagline ? <p className="font-serif text-lg text-brand-accent">{featured.tagline}</p> : null}
            <p className="text-[15px] leading-relaxed text-brand-secondary">{featured.summary}</p>
            <div className="mt-1 flex flex-col gap-3 sm:flex-row">
              <CtaLink href={`/collaborations/${featured.slug}`} size="md">View story</CtaLink>
              <CtaLink href="/collaborations" variant="outline" size="md">Explore collaborations</CtaLink>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </Section>
  );
}
