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
import { createClient } from "@/lib/supabase/server";

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
  const startupDetails = startup.details ?? {};
  const db = await createClient();
  const { data: memberContacts } = await db.rpc("get_directory_startup_contacts", { p_startup_id: startup.id });
  const contacts = (memberContacts && typeof memberContacts === "object" && !Array.isArray(memberContacts) ? memberContacts : {}) as Record<string, unknown>;

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
                {startup.logoUrl ? <Image src={startup.logoUrl} alt={`${startup.name} logo`} width={72} height={72} className="mt-4 size-16 rounded-2xl bg-white p-2 object-contain ring-1 ring-brand-border" /> : null}
                <h1 className="mt-2 break-words text-3xl font-bold text-brand-ink sm:text-4xl">{startup.name}</h1>
                <p className="mt-2 text-lg text-brand-secondary">Founded by {startup.founder.name}{startup.founder.role ? ` · ${startup.founder.role}` : ""}</p>
                {startup.tagline ? <p className="mt-3 text-lg font-medium text-brand-accent">{startup.tagline}</p> : null}
                {startup.city ? <p className="mt-2 text-sm text-brand-muted">{startup.city}{startup.stage ? ` · ${startup.stage}` : ""}</p> : null}
                <p className="mt-5 inline-flex rounded-full bg-brand-cloud px-3 py-1 text-sm font-medium text-brand-secondary">{industryLabel(startup.industry)}</p>
                <h2 className="mt-8 text-xl font-semibold text-brand-ink">About the startup</h2>
                <p className="mt-3 whitespace-pre-line break-words leading-7 text-brand-secondary">{startup.description}</p>
                {([["What we do", "whatWeDo"], ["How we work", "howWeWork"], ["Our mission", "mission"], ["Our vision", "vision"], ["Problems we solve", "problemsSolved"], ["Who we serve", "targetAudience"], ["Our approach", "approach"], ["Founder", "founderDescription"]] as const).map(([label, key]) => typeof startupDetails[key] === "string" && startupDetails[key] ? <section key={key} className="mt-7"><h2 className="text-lg font-semibold text-brand-ink">{label}</h2><p className="mt-2 whitespace-pre-wrap break-words leading-7 text-brand-secondary">{startupDetails[key] as string}</p></section> : null)}
                {(["coreSkills", "technologies", "technicalExpertise", "services", "capabilities", "industriesServed"] as const).map((key) => Array.isArray(startupDetails[key]) && (startupDetails[key] as unknown[]).length ? <section key={key} className="mt-7"><h2 className="text-lg font-semibold text-brand-ink">{key.replaceAll(/([A-Z])/g, " $1")}</h2><ul className="mt-3 flex flex-wrap gap-2">{(startupDetails[key] as string[]).map((item) => <li key={item} className="rounded-full bg-brand-cloud px-3 py-1 text-sm text-brand-secondary">{item}</li>)}</ul></section> : null)}
                {Object.keys(contacts).length ? <section className="mt-8 rounded-2xl bg-brand-cloud p-5"><h2 className="font-semibold text-brand-ink">Contact</h2><div className="mt-3 flex flex-col gap-2 text-sm">{typeof contacts.website === "string" ? <a href={contacts.website} target="_blank" rel="noreferrer" className="break-all font-medium text-brand-accent">{displayHost(String(contacts.website)) ?? "Company website"}</a> : null}{["companyEmail", "supportEmail", "additionalSupportEmail", "founderEmail"].filter((key) => typeof contacts[key] === "string").map((key) => <a key={key} href={`mailto:${contacts[key]}`} className="break-all font-medium text-brand-accent">{String(contacts[key])}</a>)}{["companyMobile", "founderMobile"].filter((key) => typeof contacts[key] === "string").map((key) => <a key={key} href={`tel:${String(contacts[key]).replace(/[^+\d]/g, "")}`} className="font-medium text-brand-accent">{String(contacts[key])}</a>)}{["companyWhatsapp", "founderWhatsapp"].filter((key) => typeof contacts[key] === "string").map((key) => <a key={key} href={`https://wa.me/${String(contacts[key]).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="font-medium text-brand-accent">WhatsApp: {String(contacts[key])}</a>)}</div></section> : null}
                {startup.collaboration.length > 0 ? (
                  <div className="mt-8">
                    <h2 className="text-xl font-semibold text-brand-ink">Open to</h2>
                    <ul className="mt-3 flex flex-wrap gap-2">{startup.collaboration.map((item) => <li key={item} className="rounded-full bg-brand-lilac px-3 py-1.5 text-sm text-brand-ink">{collaborationLabels[item] ?? item}</li>)}</ul>
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
