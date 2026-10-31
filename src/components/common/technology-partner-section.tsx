import Image from "next/image";
import { Section } from "@/components/common/section";
import { siteConfig, brandAssets } from "@/lib/content/site";
import { techPartnership } from "@/lib/content/about";
import { cn } from "cn";

export function TechnologyPartnerSection({ className }: { className?: string }) {
  return (
    <Section className={cn("bg-brand-white", className)}>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-[2rem] bg-brand-cloud p-8 text-center ring-1 ring-brand-border sm:gap-8 sm:p-12">
        <a
          href={siteConfig.technologyPartner.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex transition hover:opacity-90"
        >
          <Image
            src={brandAssets.litLogo}
            alt={`${siteConfig.technologyPartner.name} logo`}
            width={88}
            height={88}
            className="size-20 rounded-full bg-white object-contain p-1 ring-1 ring-brand-border shadow-xs"
          />
        </a>
        <div className="flex flex-col gap-3">
          <h2 className="text-[length:var(--text-section)] leading-[1.1] font-bold tracking-tight text-balance text-brand-ink">
            {techPartnership.heading}
          </h2>
          <p className="text-base leading-relaxed text-brand-secondary sm:text-[17px]">
            {techPartnership.body}
          </p>
        </div>
      </div>
    </Section>
  );
}
