import type { Metadata } from "next";
import { Suspense } from "react";
import { Lightbulb, Rocket, Presentation, Cpu, Briefcase, GraduationCap, Users } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { ComingSoon } from "@/components/cms/coming-soon";
import { ResourceCard } from "@/components/cms/resource-card";
import { listPublishedResources } from "@/lib/services/cms-public";

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
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
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
