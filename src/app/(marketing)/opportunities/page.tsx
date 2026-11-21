import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Handshake,
  GraduationCap,
  HeartHandshake,
  CalendarRange,
  Trophy,
  Building2,
  Rocket,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { listPublishedOpportunities, cmsImageUrl } from "@/lib/services/cms-public";

export const metadata: Metadata = {
  title: "Startup Opportunities & Ecosystem Programs — CSC Circle",
  description:
    "Explore active founder residencies, grant fellowships, demo day nominations, and mentorship opportunities in Coimbatore.",
  alternates: { canonical: "/opportunities" },
};

const continuousTracks = [
  {
    category: "Mentorship & Advisory",
    title: "CSC Founder-in-Residence (FiR) Circle",
    organization: "Coimbatore Startup Community",
    summary:
      "A 6-month continuous guidance track connecting early-stage founders with seasoned operators across Coimbatore for weekly 1:1 syncs and strategic reviews.",
    mode: "Hybrid · Coimbatore",
    status: "Rolling Intake",
    badge: "Active Track",
  },
  {
    category: "Student Builders",
    title: "Regional Student Innovation & Grant Fellowship",
    organization: "CSC Ecosystem Initiative",
    summary:
      "For student entrepreneurs building hardware or software prototypes in regional engineering colleges. Includes TANSEED grant prep and pitch coaching.",
    mode: "Virtual & In-Person",
    status: "Open Enrollment",
    badge: "Student Track",
  },
  {
    category: "Capital & Demo Days",
    title: "Quarterly Pre-Seed Demo Day Nominations",
    organization: "CSC Capital Network",
    summary:
      "Present your validated MVP to regional angel investors, high-net-worth operators, and early-stage syndicates based in Tamil Nadu.",
    mode: "Closed Door Pitch · Coimbatore",
    status: "Next Cohort Forming",
    badge: "Investor Track",
  },
  {
    category: "Engineering & Tech",
    title: "Platform Engineering & Open Source Fellows",
    organization: "Logic Intelligence Technologies",
    summary:
      "Collaborate directly on CSC Circle architecture, edge routing, performance tuning, and modern agentic engineering workflows.",
    mode: "Remote / Hybrid",
    status: "Selective Intake",
    badge: "Tech Fellowship",
  },
];

const fmtDate = (value: string | null) => {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(d.getTime())
    ? null
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
};

async function OpportunitiesContent() {
  const dynamicOpportunities = await listPublishedOpportunities();

  return (
    <>
      <PageHero
        eyebrow="Ecosystem Tracks"
        title="Opportunities in the CSC Ecosystem"
        description="Verified collaborations, mentorship fellowships, demo day nominations, and student builder tracks across Coimbatore."
      />

      <section className="py-14 sm:py-16">
        <Container className="mx-auto flex max-w-5xl flex-col gap-12">
          {/* Dynamic CMS Opportunities if present */}
          {dynamicOpportunities && dynamicOpportunities.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold tracking-tight text-brand-ink">Active Public Listings</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {dynamicOpportunities.map((o) => {
                  const logo = cmsImageUrl(o.orgLogoPath);
                  const deadline = fmtDate(o.deadline);
                  return (
                    <Link
                      key={o.id}
                      href={`/opportunities/${o.slug}`}
                      className="group flex h-full flex-col gap-3 rounded-2xl border border-brand-border bg-brand-white p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-ink"
                    >
                      <div className="flex items-center gap-3">
                        {logo ? (
                          <Image
                            src={logo}
                            alt={`${o.organization ?? "Organization"} logo`}
                            width={40}
                            height={40}
                            unoptimized
                            className="size-10 rounded-full object-contain ring-1 ring-brand-border"
                          />
                        ) : (
                          <span className="flex size-10 items-center justify-center rounded-full bg-brand-blue/40 text-brand-ink">
                            <Building2 className="size-5" aria-hidden />
                          </span>
                        )}
                        <span className="text-xs font-semibold text-brand-accent">{o.category}</span>
                      </div>
                      <h3 className="text-base font-bold text-brand-ink">{o.title}</h3>
                      {o.organization && (
                        <p className="text-sm font-medium text-brand-secondary">{o.organization}</p>
                      )}
                      {o.summary && (
                        <p className="line-clamp-3 text-sm leading-relaxed text-brand-secondary">
                          {o.summary}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-brand-muted">
                        {o.location || o.participationMode ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden />
                            {[o.location, o.participationMode].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                        {deadline && <span>Apply by {deadline}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Continuous Ecosystem Programs */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Continuous Programs
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">
                Flagship CSC Tracks &amp; Fellowships
              </h2>
              <p className="mt-1 text-xs text-brand-secondary">
                Ongoing community tracks open to active CSC members and regional builders.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {continuousTracks.map((track) => (
                <div
                  key={track.title}
                  className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-7 shadow-xs"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-brand-cloud px-2.5 py-0.5 text-[11px] font-semibold text-brand-accent">
                        {track.badge}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <Clock className="size-3" /> {track.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-brand-ink">{track.title}</h3>
                    <p className="text-xs font-medium text-brand-muted">{track.organization}</p>
                    <p className="text-xs leading-relaxed text-brand-secondary">{track.summary}</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-brand-border/60 pt-4 text-xs">
                    <span className="text-brand-muted">{track.mode}</span>
                    <a
                      href="mailto:coimbatorestartup.csc@gmail.com?subject=Ecosystem%20Track%20Inquiry"
                      className="inline-flex items-center gap-1 font-semibold text-brand-accent hover:underline"
                    >
                      Express interest &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Share an opportunity callout */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 rounded-3xl bg-brand-cloud p-6 sm:p-8">
            <div>
              <h3 className="text-base font-bold text-brand-ink">Are You Hiring or Hosting an Opportunity?</h3>
              <p className="text-xs text-brand-secondary">
                Incubators, companies, and mentors can list relevant hackathons, grants, and hiring openings for CSC members.
              </p>
            </div>
            <a
              href="mailto:coimbatorestartup.csc@gmail.com?subject=Submit%20an%20Opportunity"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-ink px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-ink/90"
            >
              <Rocket className="size-3.5" /> Submit an Opportunity
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <section aria-busy="true" className="py-20">
          <Container className="max-w-5xl">
            <p className="text-sm text-brand-muted">Loading opportunities…</p>
          </Container>
        </section>
      }
    >
      <OpportunitiesContent />
    </Suspense>
  );
}
