import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Handshake, GraduationCap, HeartHandshake, CalendarRange, Trophy, Building2, Rocket, MapPin } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { ComingSoon } from "@/components/cms/coming-soon";
import { listPublishedOpportunities, cmsImageUrl } from "@/lib/services/cms-public";

export const metadata: Metadata = {
  title: "Startup Opportunities",
  description:
    "Verified startup opportunities, community collaborations, mentorship initiatives, volunteering, and ecosystem participation from CSC Circle.",
  alternates: { canonical: "/opportunities" },
};

const previewCategories = [
  { icon: Handshake, title: "Startup Collaborations" },
  { icon: GraduationCap, title: "Mentorship" },
  { icon: HeartHandshake, title: "Volunteering" },
  { icon: CalendarRange, title: "Community Programs" },
  { icon: Trophy, title: "Workshops & Challenges" },
  { icon: Building2, title: "Partnership Opportunities" },
  { icon: Rocket, title: "Founder Opportunities" },
];

const fmtDate = (value: string | null) => {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
};

async function OpportunitiesContent() {
  const opportunities = await listPublishedOpportunities();

  if (opportunities === null) {
    return <section className="py-20"><Container className="max-w-3xl"><div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm leading-6 text-red-900">Opportunities are temporarily unavailable. Please try again shortly.</div></Container></section>;
  }

  if (opportunities.length === 0) {
    return (
      <ComingSoon
        title="Startup Opportunities"
        description="We're preparing a place to discover startup collaborations, mentorship initiatives, community programs, and opportunities to participate in Coimbatore's entrepreneurial ecosystem."
        categories={previewCategories}
        iconBg="bg-brand-blue/40"
        note="We only publish opportunities that have been submitted and approved — no fabricated listings. Approved opportunities will appear here."
        primary={{ href: "/membership", label: "Explore membership" }}
        secondary={{ href: "/events", label: "See community events" }}
        contactPrompt="Want to share an opportunity?"
      />
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Startup Opportunities"
        title="Opportunities in the CSC Ecosystem"
        description="Verified collaborations, mentorship, programs, and ways to participate — shared by the Coimbatore Startup Community."
      />
      <section className="py-14">
        <Container className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((o) => {
            const logo = cmsImageUrl(o.orgLogoPath);
            const deadline = fmtDate(o.deadline);
            return (
              <Link
                key={o.id}
                href={`/opportunities/${o.slug}`}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-brand-border bg-brand-white p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
              >
                <div className="flex items-center gap-3">
                  {logo ? (
                    <Image src={logo} alt={`${o.organization ?? "Organization"} logo`} width={40} height={40} unoptimized className="size-10 rounded-full object-contain ring-1 ring-brand-border" />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded-full bg-brand-blue/40 text-brand-ink"><Building2 className="size-5" aria-hidden /></span>
                  )}
                  <span className="text-xs font-semibold text-brand-accent">{o.category}</span>
                </div>
                <h2 className="text-base font-bold text-brand-ink">{o.title}</h2>
                {o.organization ? <p className="text-sm font-medium text-brand-secondary">{o.organization}</p> : null}
                {o.summary ? <p className="line-clamp-3 text-sm leading-relaxed text-brand-secondary">{o.summary}</p> : null}
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-brand-muted">
                  {o.location || o.participationMode ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{[o.location, o.participationMode].filter(Boolean).join(" · ")}</span> : null}
                  {deadline ? <span>Apply by {deadline}</span> : null}
                </div>
              </Link>
            );
          })}
        </Container>
      </section>
    </>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<section aria-busy="true" className="py-20"><Container className="max-w-5xl"><p className="text-sm text-brand-muted">Loading opportunities…</p></Container></section>}>
      <OpportunitiesContent />
    </Suspense>
  );
}
