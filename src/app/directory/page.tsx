import type { Metadata } from "next";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { DirectoryClient } from "@/components/directory/directory-client";
import { getPublishedStartups } from "@/lib/services/directory";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Founder & Startup Directory",
  description:
    "Discover approved CSC Circle founders and startups. Search and filter by industry and collaboration intent to find the right people to build with.",
  alternates: { canonical: "/directory" },
  openGraph: {
    title: "Founder & Startup Directory · CSC Circle",
    description:
      "Discover founders, explore startups, and build connections across Coimbatore's startup community.",
    url: `${siteConfig.url}/directory`,
  },
};

export default function DirectoryPage() {
  const startups = getPublishedStartups();
  return (
    <>
      <PageHero
        eyebrow="Founder Directory"
        title="Discover Founders. Explore Startups. Build Connections."
        description="Browse approved CSC Circle founders and startups. Search by name, industry or skills, and filter by what they're looking to collaborate on."
      />
      <section className="py-14 sm:py-16 lg:py-20">
        <Container>
          <DirectoryClient startups={startups} />
        </Container>
      </section>
    </>
  );
}
