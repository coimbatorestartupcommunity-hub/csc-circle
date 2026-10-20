import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { Container } from "@/components/common/container";
import { StartupDirectoryImage } from "@/components/directory/startup-directory-image";
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

const narrativeFields = [
  ["What we do", "whatWeDo"],
  ["How we work", "howWeWork"],
  ["Our mission", "mission"],
  ["Our vision", "vision"],
  ["Problems we solve", "problemsSolved"],
  ["Who we serve", "targetAudience"],
  ["Our approach", "approach"],
  ["Founder", "founderDescription"],
] as const;

const listFields = [
  ["Core skills", "coreSkills"],
  ["Technologies", "technologies"],
  ["Technical expertise", "technicalExpertise"],
  ["Products and services", "services"],
  ["Capabilities", "capabilities"],
  ["Industries served", "industriesServed"],
] as const;

export default async function StartupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const startup = await startupForSlug(slug);
  if (!startup) notFound();

  const website = safeExternalUrl(startup.website);
  const details = startup.details ?? {};
  const db = await createClient();
  const { data: memberContacts } = await db.rpc("get_directory_startup_contacts", { p_startup_id: startup.id });
  const contacts = (memberContacts && typeof memberContacts === "object" && !Array.isArray(memberContacts) ? memberContacts : {}) as Record<string, unknown>;
  const contactWebsite = typeof contacts.website === "string" ? safeExternalUrl(contacts.website) : null;

  return (
    <section className="py-7 sm:py-10 lg:py-14">
      <Container>
        <div className="mx-auto w-full max-w-7xl">
          <Link href="/directory" className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-brand-secondary hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-4">
            <ArrowLeft className="size-4" aria-hidden /> Back to Founder Directory
          </Link>
          <article className="overflow-hidden rounded-3xl bg-white ring-1 ring-brand-border shadow-sm">
            <header className="p-5 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent sm:text-sm">Founder Directory</p>
                {website ? (
                  <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 py-3 text-sm font-semibold text-white hover:bg-brand-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent sm:w-auto">
                    Visit Company Website <ExternalLink className="size-4" aria-hidden />
                  </a>
                ) : null}
              </div>

              <div className="mt-5 flex min-w-0 items-center gap-4 sm:gap-5">
                {startup.logoUrl ? (
                  <Image src={startup.logoUrl} alt={`${startup.name} logo`} width={88} height={88} unoptimized className="size-16 shrink-0 rounded-2xl bg-white p-2 object-contain ring-1 ring-brand-border sm:size-20" />
                ) : (
                  <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-lilac text-xl font-bold text-brand-ink ring-1 ring-brand-border sm:size-20">{initials(startup.name)}</span>
                )}
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-bold leading-tight text-brand-ink sm:text-3xl lg:text-4xl">{startup.name}</h1>
                  <p className="mt-2 break-words text-sm leading-relaxed text-brand-secondary sm:text-base">
                    Founded by <span className="font-semibold text-brand-ink">{startup.founder.name}</span>{startup.founder.role ? ` · ${startup.founder.role}` : ""}
                  </p>
                </div>
              </div>

              {startup.tagline ? <p className="mt-6 max-w-4xl text-lg font-semibold leading-relaxed text-brand-accent sm:text-xl">{startup.tagline}</p> : null}
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Startup details">
                {startup.city ? <li className="inline-flex items-center gap-1.5 rounded-full bg-brand-cloud px-3 py-1.5 text-sm text-brand-secondary"><MapPin className="size-4" aria-hidden />{startup.city}</li> : null}
                {startup.stage ? <li className="rounded-full bg-brand-cloud px-3 py-1.5 text-sm text-brand-secondary">{startup.stage}</li> : null}
                <li className="rounded-full bg-brand-cloud px-3 py-1.5 text-sm text-brand-secondary">{industryLabel(startup.industry)}</li>
                {Array.isArray(details.coreSkills) ? (details.coreSkills as string[]).map((skill) => <li key={`skill-${skill}`} className="rounded-full bg-brand-lilac px-3 py-1.5 text-sm text-brand-ink">{skill}</li>) : null}
              </ul>
            </header>

            {startup.directoryImageUrl ? (
              <StartupDirectoryImage
                src={startup.directoryImageUrl}
                alt={`${startup.name} startup directory photograph`}
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
                containerClassName="relative mx-auto aspect-[4/3] w-[calc(100%-2.5rem)] max-w-6xl overflow-hidden rounded-2xl bg-brand-cloud sm:w-[calc(100%-4rem)] lg:w-[calc(100%-5rem)]"
              />
            ) : null}

            <div className="grid gap-4 p-5 sm:gap-5 sm:p-8 lg:grid-cols-2 lg:gap-6 lg:p-10">
              <section className="rounded-2xl bg-brand-cloud/70 p-5 sm:p-6 lg:col-span-2">
                <h2 className="text-xl font-semibold text-brand-ink">About the startup</h2>
                <p className="mt-3 max-w-5xl whitespace-pre-line break-words text-[15px] leading-7 text-brand-secondary sm:text-base">{startup.description}</p>
              </section>

              {narrativeFields.map(([label, key]) => typeof details[key] === "string" && details[key] ? (
                <section key={key} className="min-w-0 rounded-2xl border border-brand-border p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-brand-ink">{label}</h2>
                  <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-brand-secondary sm:text-base">{details[key] as string}</p>
                </section>
              ) : null)}

              {listFields.map(([label, key]) => Array.isArray(details[key]) && (details[key] as unknown[]).length ? (
                <section key={key} className="min-w-0 rounded-2xl border border-brand-border p-5 sm:p-6">
                  <h2 className="text-lg font-semibold capitalize text-brand-ink">{label}</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">{(details[key] as string[]).map((item) => <li key={item} className="max-w-full break-words rounded-full bg-brand-cloud px-3 py-1.5 text-sm text-brand-secondary">{item}</li>)}</ul>
                </section>
              ) : null)}

              {startup.collaboration.length ? (
                <section className="min-w-0 rounded-2xl border border-brand-border p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-brand-ink">Open to collaboration</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">{startup.collaboration.map((item) => <li key={item} className="rounded-full bg-brand-lilac px-3 py-1.5 text-sm text-brand-ink">{collaborationLabels[item] ?? item}</li>)}</ul>
                </section>
              ) : null}

              {Object.keys(contacts).length ? (
                <section className="min-w-0 rounded-2xl border border-brand-border bg-white p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-brand-ink">Contact</h2>
                  <div className="mt-3 flex flex-col items-start gap-2 text-sm">
                    {contactWebsite ? <a href={contactWebsite} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-brand-accent">{displayHost(contactWebsite) ?? "Company website"}</a> : null}
                    {["companyEmail", "supportEmail", "additionalSupportEmail", "founderEmail"].filter((key) => typeof contacts[key] === "string").map((key) => <a key={key} href={`mailto:${contacts[key]}`} className="break-all font-medium text-brand-accent">{String(contacts[key])}</a>)}
                    {["companyMobile", "founderMobile"].filter((key) => typeof contacts[key] === "string").map((key) => <a key={key} href={`tel:${String(contacts[key]).replace(/[^+\d]/g, "")}`} className="font-medium text-brand-accent">{String(contacts[key])}</a>)}
                    {["companyWhatsapp", "founderWhatsapp"].filter((key) => typeof contacts[key] === "string").map((key) => <a key={key} href={`https://wa.me/${String(contacts[key]).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-accent">WhatsApp: {String(contacts[key])}</a>)}
                  </div>
                </section>
              ) : null}
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
}
