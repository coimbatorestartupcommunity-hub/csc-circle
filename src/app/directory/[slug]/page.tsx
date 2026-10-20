import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Container } from "@/components/common/container";
import { getPublicStartups } from "@/lib/services/public-data";
import { safeExternalUrl, displayHost, initials } from "@/lib/format";
import { collaborationLabels, industryLabel } from "@/lib/content/taxonomy";
import type { Startup } from "@/types";

// Startup detail data is looked up at request time from the consent-filtered
// public directory; unknown slugs return a real 404 instead of prerender data.
export const instant = false;

async function startupForSlug(slug: string): Promise<Startup | undefined> {
  const startups = await getPublicStartups();
  return startups.find((startup) => startup.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const startup = await startupForSlug(slug);
  if (!startup) return { title: "Startup not found" };
  return {
    title: `${startup.name} · Founder Directory`,
    description: startup.description,
    alternates: { canonical: `/directory/${encodeURIComponent(startup.slug)}` },
    openGraph: { title: `${startup.name} · CSC Circle`, description: startup.description },
  };
}

export default async function StartupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const startup = await startupForSlug(slug);
  if (!startup) notFound();
  const website = safeExternalUrl(startup.website);
  const host = displayHost(startup.website);
  const founderPhoto = startup.founder.avatarUrl;

  return (
    <section className="py-10 sm:py-14">
      <Container>
        <div className="mx-auto w-full max-w-5xl">
          <Link href="/directory" className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-brand-secondary hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-4">
            <ArrowLeft className="size-4" aria-hidden /> Back to Founder Directory
          </Link>
          <article className="overflow-hidden rounded-3xl bg-white ring-1 ring-brand-border">
            {founderPhoto ? (
              <div className="relative aspect-[4/3] w-full bg-brand-cloud sm:max-h-[640px]">
                <Image src={founderPhoto} alt={`${startup.founder.name}, founder of ${startup.name}`} fill priority sizes="(max-width: 1024px) 100vw, 960px" className="object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center bg-brand-lilac text-6xl font-bold text-brand-ink sm:max-h-[640px]" aria-label="Founder photo not available">
                {initials(startup.founder.name)}
              </div>
            )}
            <div className="mx-auto grid max-w-4xl gap-8 p-6 sm:p-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-accent">Founder Directory</p>
                <h1 className="mt-2 break-words text-3xl font-bold text-brand-ink sm:text-4xl">{startup.name}</h1>
                <p className="mt-2 text-lg text-brand-secondary">Founded by {startup.founder.name}{startup.founder.role ? ` · ${startup.founder.role}` : ""}</p>
                <p className="mt-5 inline-flex rounded-full bg-brand-cloud px-3 py-1 text-sm font-medium text-brand-secondary">{industryLabel(startup.industry)}</p>
                <h2 className="mt-8 text-xl font-semibold text-brand-ink">About the startup</h2>
                <p className="mt-3 whitespace-pre-line break-words leading-7 text-brand-secondary">{startup.description}</p>
                {startup.collaboration.length > 0 ? (
                  <div className="mt-8">
                    <h2 className="text-xl font-semibold text-brand-ink">Open to</h2>
                    <ul className="mt-3 flex flex-wrap gap-2">{startup.collaboration.map((item) => <li key={item} className="rounded-full bg-brand-lilac px-3 py-1.5 text-sm text-brand-ink">{collaborationLabels[item]}</li>)}</ul>
                  </div>
                ) : null}
              </div>
              {website ? (
                <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 py-3 text-sm font-semibold text-white hover:bg-brand-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent">
                  Visit {host ?? "website"}<ExternalLink className="size-4" aria-hidden />
                </a>
              ) : null}
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
}
