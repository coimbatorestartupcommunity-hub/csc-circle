import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Lightbulb, Rocket, Presentation, Cpu, Briefcase, GraduationCap, Users, FileText } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { ComingSoon } from "@/components/cms/coming-soon";
import { listPublishedResources, cmsImageUrl } from "@/lib/services/cms-public";

export const metadata: Metadata = {
  title: "Startup Resources",
  description:
    "Practical learning materials, founder guides, documents, and startup resources from the CSC Circle community.",
  alternates: { canonical: "/resources" },
};

const previewCategories = [
  { icon: Lightbulb, title: "Startup Planning" },
  { icon: Rocket, title: "MVP & Product Development" },
  { icon: Presentation, title: "Pitching" },
  { icon: Cpu, title: "Technology" },
  { icon: Briefcase, title: "Business Operations" },
  { icon: GraduationCap, title: "Learning Materials" },
  { icon: Users, title: "Community Resources" },
];

async function ResourcesContent() {
  const resources = await listPublishedResources();

  if (resources === null) {
    return <section className="py-20"><Container className="max-w-3xl"><div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm leading-6 text-red-900">Resources are temporarily unavailable. Please try again shortly.</div></Container></section>;
  }

  if (resources.length === 0) {
    return (
      <ComingSoon
        title="Startup Resources"
        description="We're preparing practical startup resources, founder guides, useful documents, and learning materials to support the CSC Circle community. Explore our events, founders, and other ways to connect while we prepare this collection."
        categories={previewCategories}
        iconBg="bg-brand-purple/40"
        note="Resources will appear here as soon as they are published."
        primary={{ href: "/membership", label: "Explore membership" }}
        secondary={{ href: "/help", label: "Visit Help & FAQ" }}
        contactPrompt="Have a resource to suggest?"
      />
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Startup Resources"
        title="Resources for Founders & Builders"
        description="Curated learning materials, guides, and documents shared by the CSC Circle community."
      />
      <section className="py-14">
        <Container className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => {
            const cover = cmsImageUrl(r.coverImagePath);
            return (
              <Link
                key={r.id}
                href={`/resources/${r.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-white transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
              >
                <div className="relative aspect-[5/3] w-full overflow-hidden bg-brand-cloud">
                  {cover ? (
                    <Image src={cover} alt={r.title} fill unoptimized sizes="(max-width: 768px) 100vw, 360px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-brand-muted"><FileText className="size-10" aria-hidden /></span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <span className="text-xs font-semibold text-brand-accent">{r.category}</span>
                  <h2 className="text-base font-bold text-brand-ink">{r.title}</h2>
                  {r.summary ? <p className="line-clamp-3 text-sm leading-relaxed text-brand-secondary">{r.summary}</p> : null}
                  <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-brand-accent">
                    View details
                  </span>
                </div>
              </Link>
            );
          })}
        </Container>
      </section>
    </>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={<section aria-busy="true" className="py-20"><Container className="max-w-5xl"><p className="text-sm text-brand-muted">Loading resources…</p></Container></section>}>
      <ResourcesContent />
    </Suspense>
  );
}
