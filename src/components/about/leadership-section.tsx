import * as React from "react";
import Image from "next/image";
import { Section, SectionHeading } from "@/components/common/section";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { brandAssets, siteConfig } from "@/lib/content/site";
import { initials } from "@/lib/format";
import { leadership } from "@/lib/content/about";

interface Leader {
  name: string;
  role: string;
  responsibility: string;
  surface: string;
  photo?: string;
  org?: { name: string; logo: string; url: string };
  profileUrl?: string;
}

export function LeadershipSection() {
  const leaders: Leader[] = [
    {
      name: siteConfig.people.founder.name,
      role: siteConfig.people.founder.role,
      responsibility: siteConfig.people.founder.responsibility,
      surface: "from-brand-purple to-brand-pink",
      photo: brandAssets.reyashPortrait,
      org: {
        name: "Belvoria",
        logo: brandAssets.belvoriaLogo,
        url: "https://belvoria.vercel.app/",
      },
    },
    {
      name: siteConfig.people.technicalPartner.name,
      role: siteConfig.people.technicalPartner.role,
      responsibility: siteConfig.people.technicalPartner.responsibility,
      surface: "from-brand-blue to-brand-lilac",
      photo: brandAssets.vikashPortrait,
      org: {
        name: siteConfig.technologyPartner.name,
        logo: brandAssets.litLogo,
        url: siteConfig.technologyPartner.url,
      },
    },
  ];

  return (
    <Section className="bg-brand-white">
      <SectionHeading
        eyebrow="Leadership"
        title={leadership.heading}
        description={leadership.description}
      />
      <StaggerContainer className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        {leaders.map((leader) => (
          <StaggerItem key={leader.name} className="h-full">
            <article className="flex h-full flex-col overflow-hidden rounded-[2rem] bg-brand-white ring-1 ring-brand-border">
              {/* 4:5 portrait frame — approved photo where supplied, initials otherwise */}
              <div
                className={`relative flex aspect-4/5 items-center justify-center overflow-hidden bg-gradient-to-br ${leader.surface}`}
              >
                {leader.photo ? (
                  <Image
                    src={leader.photo}
                    alt={`${leader.name}, ${leader.role}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className="object-cover object-top"
                  />
                ) : (
                  <span className="flex size-28 items-center justify-center rounded-full bg-brand-white/80 text-3xl font-bold text-brand-ink shadow-md ring-1 ring-brand-border backdrop-blur-sm">
                    {initials(leader.name)}
                  </span>
                )}
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
                <h3 className="text-xl font-bold text-brand-ink">
                  {leader.name}
                </h3>
                <p className="text-sm font-medium text-brand-accent">
                  {leader.role}
                </p>
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
