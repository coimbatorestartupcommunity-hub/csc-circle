"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ArrowUpRight } from "lucide-react";
import { HoverLiftCard } from "@/components/motion";
import { FixtureNotice } from "@/components/common/empty-state";
import { industryLabel, collaborationLabels } from "@/lib/content/taxonomy";
import { safeExternalUrl, displayHost, initials } from "@/lib/format";
import { StartupCardName } from "@/components/directory/startup-card-name";
import { StartupDirectoryImage } from "@/components/directory/startup-directory-image";
import type { Startup } from "@/types";

/** Directory startup card: logo/initials, founder, industry, tags, website. */
export function StartupCard({ startup }: { startup: Startup }) {
  const [logoImageFailed, setLogoImageFailed] = useState(false);
  const website = safeExternalUrl(startup.website);
  const host = displayHost(startup.website);
  const profile = safeExternalUrl(startup.founder.profileUrl);
  return (
    <HoverLiftCard>
      <article className="flex h-full min-w-0 w-full max-w-full flex-col gap-4 overflow-hidden rounded-3xl bg-brand-white p-6 ring-1 ring-brand-border">
        {startup.directoryImageUrl ? <StartupDirectoryImage src={startup.directoryImageUrl} alt={`${startup.name} directory image`} sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" containerClassName="relative -mx-6 -mt-6 aspect-[4/3] min-w-0 w-[calc(100%+3rem)] max-w-none shrink-0 overflow-hidden rounded-t-3xl bg-brand-cloud" /> : null}
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {startup.logoUrl && !logoImageFailed ? (
              <Image
                src={startup.logoUrl}
                alt={`${startup.name} logo`}
                width={48}
                height={48}
                className="size-12 shrink-0 rounded-xl object-contain bg-white p-1 ring-1 ring-brand-border"
                onError={() => setLogoImageFailed(true)}
              />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-purple text-base font-bold text-brand-ink ring-1 ring-brand-border">
                {initials(startup.name)}
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <StartupCardName name={startup.name} />
              <p className="truncate text-sm text-brand-muted" title={`${startup.founder.name}${startup.founder.role ? ` · ${startup.founder.role}` : ""}`}>
                {startup.founder.name}
                {startup.founder.role ? ` · ${startup.founder.role}` : ""}
              </p>
            </div>
          </div>
          {startup.isFixture ? <FixtureNotice /> : null}
        </div>

        <span className="inline-flex min-w-0 w-fit max-w-full whitespace-normal break-words [overflow-wrap:anywhere] rounded-full bg-brand-cloud px-3 py-1 text-sm leading-snug text-brand-secondary">
          {industryLabel(startup.industry)}
        </span>

        <p className="min-w-0 max-w-full flex-1 break-words [overflow-wrap:anywhere] text-sm leading-relaxed text-brand-secondary">
          {startup.description}
        </p>

        {startup.collaboration.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {startup.collaboration.map((tag) => (
              <li key={tag}>
                <span className="inline-flex rounded-full bg-brand-lilac px-2.5 py-0.5 text-xs font-medium text-brand-ink">
                {collaborationLabels[tag] ?? tag}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {(website || profile) && (
          <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-brand-border pt-4">
            {website ? (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 max-w-full items-center gap-1.5 break-all text-sm font-medium text-brand-accent underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md"
              >
                <ExternalLink className="size-4" aria-hidden />
                {host ?? "Website"}
              </a>
            ) : null}
            {profile ? (
              <a
                href={profile}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-secondary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md"
              >
                Founder profile
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            ) : null}
          </div>
        )}
        <Link href={`/directory/${encodeURIComponent(startup.slug)}`} className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent">
          View startup details
        </Link>
      </article>
    </HoverLiftCard>
  );
}
