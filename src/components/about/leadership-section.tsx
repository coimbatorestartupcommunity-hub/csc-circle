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
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
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

function LeaderCard({ leader }: { leader: Leader }) {
  return (
    <article className="flex h-full w-full flex-col overflow-hidden rounded-[2rem] bg-brand-white ring-1 ring-brand-border shadow-sm transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-4/5 overflow-hidden bg-brand-cloud">
        <LeaderPortrait leader={leader} />
        {leader.org ? (
          <a
            href={leader.org.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-brand-white/95 px-3.5 py-1.5 text-xs font-semibold text-brand-ink shadow-md ring-1 ring-brand-border backdrop-blur-sm whitespace-nowrap z-10 transition-all hover:bg-brand-white hover:shadow-lg"
          >
            <Image
              src={leader.org.logo}
              alt={`${leader.org.name} logo`}
              width={18}
              height={18}
              className="rounded-full shrink-0"
            />
            <span>{leader.org.name}</span>
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
  );
}

export function LeadershipSection() {
  const ordered = [...leaders].sort((a, b) => a.order - b.order);
  // Group in 3, 2, 2 flow:
  // Row 1 (3): Founder, Co-Founder, CEO
  // Row 2 (2): CTO, CCO
  // Row 3 (2): COO, CBO
  const row1 = ordered.slice(0, 3);
  const row2 = ordered.slice(3, 5);
  const row3 = ordered.slice(5, 7);

  return (
    <Section className="bg-brand-white">
      <SectionHeading
        eyebrow={leadershipSection.eyebrow}
        title={leadershipSection.heading}
        description={leadershipSection.description}
      />
      <StaggerContainer className="mx-auto mt-12 flex flex-col gap-8 lg:gap-10 items-center w-full max-w-6xl">
        {/* Row 1: Founder, Co-Founder, Chief Executive Officer (3) */}
        <div className="flex flex-wrap justify-center gap-8 w-full">
          {row1.map((leader) => (
            <StaggerItem
              key={leader.id}
              className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-sm flex"
            >
              <LeaderCard leader={leader} />
            </StaggerItem>
          ))}
        </div>

        {/* Row 2: Chief Technology Officer, Chief Community Officer (2) */}
        <div className="flex flex-wrap justify-center gap-8 w-full">
          {row2.map((leader) => (
            <StaggerItem
              key={leader.id}
              className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-sm flex"
            >
              <LeaderCard leader={leader} />
            </StaggerItem>
          ))}
        </div>

        {/* Row 3: Chief Operating Officer, Chief Brand Officer (2) */}
        <div className="flex flex-wrap justify-center gap-8 w-full">
          {row3.map((leader) => (
            <StaggerItem
              key={leader.id}
              className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-sm flex"
            >
              <LeaderCard leader={leader} />
            </StaggerItem>
          ))}
        </div>
      </StaggerContainer>
    </Section>
  );
}
