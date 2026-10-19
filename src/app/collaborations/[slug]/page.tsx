import * as React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Users,
  Sparkles,
  MessagesSquare,
  Lightbulb,
  Handshake,
  ChevronRight,
  CalendarDays,
  MapPin,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/common/container";
import { Section, Eyebrow } from "@/components/common/section";
import { Badge } from "@/components/ui/badge";
import { CtaLink } from "@/components/common/cta-link";
import { RevealOnScroll, StaggerContainer, StaggerItem } from "@/components/motion";
import { getCollaborationBySlug } from "@/lib/services/public-data";
import { safeExternalUrl, displayHost, formatEventDate } from "@/lib/format";
import { siteConfig } from "@/lib/content/site";

// Reads the slug param + looks it up, so this route blocks on the server and
// returns a real 404 for unknown slugs.
export const instant = false;

const highlightIcons: Record<string, LucideIcon> = {
  Users,
  Sparkles,
  MessagesSquare,
  Lightbulb,
  Handshake,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollaborationBySlug(slug);
  if (!c) return { title: "Collaboration not found" };
  const title = c.seoTitle ?? `${c.title} · CSC Circle Collaborations`;
  const description = c.metaDescription ?? c.summary ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: `/collaborations/${c.slug}` },
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}/collaborations/${c.slug}`,
      images: c.featuredImagePath ? [c.featuredImagePath] : undefined,
    },
  };
}

export default async function CollaborationDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await getCollaborationBySlug(slug);
  if (!c) notFound();

  const storyParagraphs = (c.story ?? "").split(/\n{2,}/).filter(Boolean);
  const partners = c.partners;

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-brand-border bg-brand-white">
        <Container className="flex items-center gap-1.5 py-3 text-sm text-brand-muted">
          <Link href="/" className="hover:text-brand-ink">Home</Link>
          <ChevronRight className="size-3.5" />
          <Link href="/collaborations" className="hover:text-brand-ink">Collaborations</Link>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-brand-ink">{c.title}</span>
        </Container>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-cloud to-brand-white">
        <Container className="flex flex-col items-center gap-5 py-14 text-center sm:py-16">
          <Eyebrow>{c.category}</Eyebrow>
          <h1 className="text-[length:var(--text-hero)] leading-[1.05] font-extrabold tracking-tight text-brand-ink">
            {c.title}
          </h1>
          {c.tagline ? (
            <p className="font-serif text-2xl font-medium text-[#f97316] sm:text-3xl">{c.tagline}</p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2">
            <Badge className="bg-brand-purple text-brand-ink">{c.category}</Badge>
            <Badge
              className={
                c.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : "bg-brand-blue text-brand-ink"
              }
            >
              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
            </Badge>
          </div>

          {/* Partner branding CSC × Partner */}
          {partners.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
              {partners.map((p, i) => (
                <React.Fragment key={p.organization.id}>
                  {i > 0 ? <span className="text-2xl font-light text-brand-muted">×</span> : null}
                  {p.organization.logoPath ? (
                    <span className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-brand-white p-2 shadow-sm ring-1 ring-brand-border sm:size-24">
                      <Image
                        src={p.organization.logoPath}
                        alt={`${p.organization.name} logo`}
                        width={96}
                        height={96}
                        className="size-full object-contain"
                      />
                    </span>
                  ) : (
                    <span className="text-lg font-semibold text-brand-ink">{p.organization.name}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : null}

          {(c.eventDate || c.venueName) && (
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-brand-muted">
              {c.eventDate ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" /> {formatEventDate(c.eventDate)}
                </span>
              ) : null}
              {c.venueName ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" /> {c.venueName}
                </span>
              ) : null}
            </div>
          )}
        </Container>
      </section>

      {/* Main photograph */}
      {c.featuredImagePath ? (
        <div className="bg-brand-white pb-4">
          <Container>
            <RevealOnScroll className="overflow-hidden rounded-[2rem] bg-brand-white p-2 shadow-sm ring-1 ring-brand-border">
              <Image
                src={c.featuredImagePath}
                alt={`${c.title} meetup`}
                width={1619}
                height={972}
                className="h-auto w-full rounded-[1.6rem] object-cover"
                sizes="(max-width: 1280px) 100vw, 1200px"
                priority
              />
            </RevealOnScroll>
          </Container>
        </div>
      ) : null}

      {/* About */}
      {storyParagraphs.length > 0 ? (
        <Section className="bg-brand-white">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <h2 className="text-[length:var(--text-section)] leading-[1.1] font-bold tracking-tight text-brand-ink">
              About this collaboration
            </h2>
            {storyParagraphs.map((p, i) => (
              <p key={i} className="text-base leading-relaxed text-brand-secondary sm:text-[17px]">
                {p}
              </p>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Highlights */}
      {c.highlights.length > 0 ? (
        <Section className="bg-brand-cloud">
          <h2 className="mb-10 text-center text-[length:var(--text-section)] leading-[1.1] font-bold tracking-tight text-brand-ink">
            Meetup highlights
          </h2>
          <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.highlights.map((h) => {
              const Icon = highlightIcons[h.icon] ?? Sparkles;
              return (
                <StaggerItem key={h.title} className="h-full">
                  <div className="flex h-full flex-col gap-3 rounded-3xl bg-brand-white p-6 ring-1 ring-brand-border">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-[#fff1e6] text-[#f97316]">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <h3 className="text-lg font-semibold text-brand-ink">{h.title}</h3>
                    <p className="text-[15px] leading-relaxed text-brand-secondary">{h.body}</p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </Section>
      ) : null}

      {/* Gallery */}
      {c.media.length > 0 ? (
        <Section className="bg-brand-white">
          <h2 className="mb-8 text-center text-[length:var(--text-section)] leading-[1.1] font-bold tracking-tight text-brand-ink">
            Community gallery
          </h2>
          <div className={c.media.length === 1 ? "mx-auto max-w-3xl" : "grid gap-4 sm:grid-cols-2"}>
            {c.media.map((m) => (
              <figure key={m.id} className="overflow-hidden rounded-3xl bg-brand-cloud ring-1 ring-brand-border">
                <Image
                  src={m.path}
                  alt={m.alt ?? c.title}
                  width={1619}
                  height={972}
                  className="h-auto w-full object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
                {m.caption ? (
                  <figcaption className="px-4 py-3 text-center text-sm text-brand-muted">{m.caption}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Organizations */}
      {partners.length > 0 ? (
        <Section className="bg-brand-cloud">
          <h2 className="mb-8 text-center text-[length:var(--text-section)] leading-[1.1] font-bold tracking-tight text-brand-ink">
            Collaboration organizations
          </h2>
          <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
            {partners.map((p) => {
              const site = safeExternalUrl(p.organization.websiteUrl);
              const host = displayHost(p.organization.websiteUrl);
              return (
                <div key={p.organization.id} className="flex flex-col gap-3 rounded-3xl bg-brand-white p-6 ring-1 ring-brand-border">
                  <div className="flex items-center gap-3">
                    {p.organization.logoPath ? (
                      <span className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-brand-white ring-1 ring-brand-border">
                        <Image src={p.organization.logoPath} alt={p.organization.name} width={48} height={48} className="size-full object-contain p-1" />
                      </span>
                    ) : null}
                    <div className="flex flex-col">
                      <h3 className="font-semibold text-brand-ink">{p.organization.name}</h3>
                      <span className="text-xs text-brand-muted capitalize">{p.organization.organizationType}</span>
                    </div>
                  </div>
                  {p.organization.description ? (
                    <p className="text-sm leading-relaxed text-brand-secondary">{p.organization.description}</p>
                  ) : null}
                  {site ? (
                    <a href={site} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-accent hover:underline">
                      <ExternalLink className="size-4" /> {host ?? "Website"}
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {/* Final CTA */}
      <section className="pb-14 sm:pb-20 lg:pb-28">
        <Container>
          <RevealOnScroll className="flex flex-col items-center gap-5 rounded-[2.5rem] bg-gradient-to-br from-brand-purple via-brand-lilac to-brand-blue px-6 py-16 text-center ring-1 ring-brand-border sm:px-12">
            <h2 className="text-[length:var(--text-section)] leading-[1.08] font-bold tracking-tight text-balance text-brand-ink">
              Join a Community That Builds Together
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <CtaLink href="/events" size="lg">Explore CSC Events</CtaLink>
              <CtaLink href="/login" variant="outline" size="lg">Join CSC Circle</CtaLink>
            </div>
          </RevealOnScroll>
        </Container>
      </section>
    </>
  );
}
