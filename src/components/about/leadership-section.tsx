import * as React from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { Section, SectionHeading } from "@/components/common/section";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { leaders, leadershipSection, type Leader } from "@/lib/content/leadership";

/** 4:5 portrait: the verified photo where supplied, otherwise an intentional
 *  blank placeholder — no stock photo, no fictional portrait, no fake initials. */
function LeaderPortrait({ leader }: { leader: Leader }) {
  if (leader.portrait) {
    return (
      <Image
        src={leader.portrait}
        alt={`${leader.honorific ? `${leader.honorific} ` : ""}${leader.name ?? "CSC leader"}, ${leader.role}`}
        fill
        sizes="(max-width: 640px) 100vw, 320px"
        className="object-cover object-top"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex size-full items-center justify-center bg-gradient-to-br from-brand-purple/40 via-brand-lilac/30 to-brand-blue/30"
    >
      <span className="flex size-20 items-center justify-center rounded-full bg-brand-white/70 text-brand-muted ring-1 ring-brand-border backdrop-blur-sm">
        <UserRound className="size-10" aria-hidden="true" />
      </span>
    </div>
  );
}

export function LeadershipSection() {
  const ordered = [...leaders].sort((a, b) => a.order - b.order);
  return (
    <Section className="bg-brand-white">
      <SectionHeading
        eyebrow={leadershipSection.eyebrow}
        title={leadershipSection.heading}
        description={leadershipSection.description}
      />
      <StaggerContainer className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-2">
        {ordered.map((leader) => (
          <StaggerItem key={leader.id} className="w-full">
            <article className="flex h-full flex-col overflow-hidden rounded-[2rem] bg-brand-white ring-1 ring-brand-border shadow-sm transition-transform duration-300 hover:-translate-y-1">
              <div className="relative aspect-4/5 overflow-hidden bg-brand-cloud">
                <LeaderPortrait leader={leader} />
                {leader.org ? (
                  <a
                    href={leader.org.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-brand-white/90 px-3 py-1.5 text-xs font-semibold text-brand-ink shadow-sm ring-1 ring-brand-border backdrop-blur-sm"
                  >
                    <Image
                      src={leader.org.logo}
                      alt={`${leader.org.name} logo`}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                    {leader.org.name}
                  </a>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-6">
                <h3
                  className={`text-xl font-bold tracking-tight ${leader.name ? "text-brand-ink" : "text-brand-muted"}`}
                >
                  {leader.honorific && leader.name ? `${leader.honorific} ` : ""}
                  {leader.name ?? "To be announced"}
                </h3>
                <p className="text-sm font-medium text-brand-accent">{leader.role}</p>
                {leader.additionalRole ? (
                  <p className="text-sm font-medium text-brand-accent">{leader.additionalRole}</p>
                ) : null}
                <p className="mt-1 text-sm leading-relaxed text-brand-secondary">
                  {leader.responsibility}
                </p>
              </div>
            </article>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </Section>
  );
}
