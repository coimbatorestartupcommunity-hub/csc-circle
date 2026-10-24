import type { Metadata } from "next";
import Link from "next/link";
import { Handshake, GraduationCap, HeartHandshake, CalendarRange, Trophy, Building2, Rocket } from "lucide-react";
import { Container } from "@/components/common/container";
import { AmbientPastelBackground, FadeIn } from "@/components/motion";
import { CtaLink } from "@/components/common/cta-link";

export const metadata: Metadata = {
  title: "Startup Opportunities — Coming Soon",
  description:
    "A space for verified startup opportunities, community collaborations, mentorship initiatives, volunteering, and ecosystem participation is on the way.",
  alternates: { canonical: "/opportunities" },
};

const categories = [
  { icon: Handshake, title: "Startup Collaborations" },
  { icon: GraduationCap, title: "Mentorship" },
  { icon: HeartHandshake, title: "Volunteering" },
  { icon: CalendarRange, title: "Community Programs" },
  { icon: Trophy, title: "Workshops & Challenges" },
  { icon: Building2, title: "Partnership Opportunities" },
  { icon: Rocket, title: "Founder Opportunities" },
];

export default function OpportunitiesPage() {
  return (
    <section className="relative overflow-hidden">
      <AmbientPastelBackground intensity="subtle" />
      <Container className="flex flex-col items-center py-20 text-center sm:py-28">
        <FadeIn inView={false} direction="up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-border/60 bg-brand-white/60 px-4 py-1.5 font-mono text-xs font-semibold tracking-[0.18em] text-brand-accent uppercase backdrop-blur-sm">
            Coming Soon
          </span>
        </FadeIn>
        <FadeIn inView={false} delay={0.1} direction="up">
          <h1 className="mt-6 max-w-3xl text-[length:var(--text-hero)] leading-[1.05] font-extrabold tracking-tight text-brand-ink">
            Startup Opportunities
          </h1>
        </FadeIn>
        <FadeIn inView={false} delay={0.2} direction="up">
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-brand-secondary sm:text-[17px]">
            We&apos;re preparing a space for verified startup opportunities, community collaborations, mentorship
            initiatives, volunteering, and ecosystem participation. Here&apos;s a preview of what&apos;s on the way.
          </p>
        </FadeIn>

        <div className="mt-12 grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <FadeIn key={c.title} inView delay={0.05 * i} direction="up">
              <div className="flex h-full items-center gap-3 rounded-2xl border border-brand-white/60 bg-brand-white/55 p-5 text-left shadow-sm ring-1 ring-brand-border/40 backdrop-blur-md">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/40 text-brand-ink">
                  <c.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-brand-ink">{c.title}</span>
              </div>
            </FadeIn>
          ))}
        </div>

        <p className="mt-10 max-w-md text-sm text-brand-muted">
          Verified opportunities will appear here once the directory launches. We only publish opportunities that have
          been submitted and approved — no fabricated listings.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <CtaLink href="/membership" size="md">Explore membership</CtaLink>
          <CtaLink href="/events" variant="outline" size="md" arrow={false}>See community events</CtaLink>
        </div>
        <p className="mt-8 text-xs text-brand-muted">
          Want to share an opportunity? <Link href="/contact" className="font-semibold text-brand-accent underline underline-offset-2">Contact the community team</Link>.
        </p>
      </Container>
    </section>
  );
}
