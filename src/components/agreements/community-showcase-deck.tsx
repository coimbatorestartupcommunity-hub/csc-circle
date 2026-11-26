"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Cpu,
  Layers,
  ShieldCheck,
  Compass,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/content/site";

export interface DeckSlide {
  id: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

export function CommunityShowcaseDeck() {
  const [activeSlide, setActiveSlide] = React.useState(0);

  const slides: DeckSlide[] = [
    // Slide 1: Cover
    {
      id: 1,
      eyebrow: "CSC Circle Ecosystem Deck · Slide 1 of 7",
      title: "Great Ideas Grow in the Right Circle",
      subtitle: "Coimbatore Startup Community — Connect. Build. Grow.",
      content: (
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-xl border border-brand-border/80 bg-brand-cloud shadow-xs aspect-[16/9] max-h-72 w-full">
            <Image
              src="/images/agreements/csc-web-banner.jpg"
              alt="CSC Circle Community Banner"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 700px"
              priority
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-brand-border/70 bg-white p-3.5 shadow-2xs">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Ecosystem</p>
              <p className="text-sm font-bold text-brand-ink">Founders &amp; Builders</p>
              <p className="mt-0.5 text-xs text-brand-secondary">Bridging early-stage creators with industry champions.</p>
            </div>
            <div className="rounded-xl border border-brand-border/70 bg-white p-3.5 shadow-2xs">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Footprint</p>
              <p className="text-sm font-bold text-brand-ink">Coimbatore Hub</p>
              <p className="mt-0.5 text-xs text-brand-secondary">Rooted in South India&apos;s fastest growing engineering corridor.</p>
            </div>
            <div className="rounded-xl border border-brand-border/70 bg-white p-3.5 shadow-2xs">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Philosophy</p>
              <p className="text-sm font-bold text-brand-ink">Give-First Ethos</p>
              <p className="mt-0.5 text-xs text-brand-secondary">Organic collaboration over transactional networking.</p>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 2: About CSC & Founding Vision
    {
      id: 2,
      eyebrow: "Our Story & Movement · Slide 2 of 7",
      title: "Building South India's Most Dynamic Founder Hub",
      subtitle: "Founded with a mission to unite ambitious minds across Coimbatore.",
      content: (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-xl border border-brand-border/80 bg-brand-cloud shadow-xs aspect-[4/3] w-full">
            <Image
              src="/images/agreements/community-ticel.webp"
              alt="CSC Community at TICEL Bio Park"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
          <div className="flex flex-col justify-center gap-3 text-xs text-brand-secondary sm:text-[13px]">
            <p className="leading-relaxed">
              <strong className="text-brand-ink">Coimbatore Startup Community (CSC Circle)</strong> was founded to provide aspiring and established founders with an authentic home base.
            </p>
            <p className="leading-relaxed">
              From closed-door founder roundtables at TICEL Bio Park to open-air masterminds and coffee house pitch teardowns, we create intentional spaces for builders to solve real problems.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-brand-cloud/70 p-2.5">
                <p className="text-lg font-bold text-brand-ink">100+</p>
                <p className="text-[11px] text-brand-muted">Founders &amp; Startups</p>
              </div>
              <div className="rounded-lg bg-brand-cloud/70 p-2.5">
                <p className="text-lg font-bold text-brand-ink">Bi-Weekly</p>
                <p className="text-[11px] text-brand-muted">Meetups &amp; Clinics</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 3: The People Behind CSC Circle
    {
      id: 3,
      eyebrow: "Leadership & Stewards · Slide 3 of 7",
      title: "The People Behind CSC Circle",
      subtitle: "Seven dedicated leaders steering the community's vision and operations.",
      content: (
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-xl border border-brand-border/80 bg-brand-cloud shadow-xs aspect-[21/9] w-full">
            <Image
              src="/images/agreements/leaders/csc-leaders-lockup.jpg"
              alt="The 7 Leaders of CSC Circle"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 700px"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 sm:gap-2.5">
            {[
              { name: "K. N. Reyash", role: "Founder & President", focus: "Ecosystem Vision" },
              { name: "E. R. Sharan", role: "Co-Founder & VP", focus: "Strategic Growth" },
              { name: "Mirra Mahendran", role: "Chief Executive Officer", focus: "Operations & Alliances" },
              { name: "Vikash Saravanan", role: "Chief Technology Officer", focus: "Tech & LIT Architecture" },
              { name: "Swathi", role: "Chief Community Officer", focus: "Community Experience" },
              { name: "Kishore C", role: "Chief Operating Officer", focus: "Programs & Logistics" },
              { name: "Jaibharath V", role: "Chief Business Officer", focus: "Partnerships & Value" },
            ].map((leader) => (
              <div key={leader.name} className="rounded-lg border border-brand-border/60 bg-white p-2.5 shadow-2xs">
                <p className="font-semibold text-brand-ink truncate">{leader.name}</p>
                <p className="text-[10px] text-brand-accent font-medium">{leader.role}</p>
                <p className="text-[10px] text-brand-muted truncate">{leader.focus}</p>
              </div>
            ))}
            <div className="flex items-center justify-center rounded-lg border border-dashed border-brand-border bg-brand-cloud/40 p-2 text-center">
              <span className="text-[11px] font-medium text-brand-muted">Guided by Collective Growth</span>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 4: Technology Partner Spotlight (LIT)
    {
      id: 4,
      eyebrow: "Engineering Architecture · Slide 4 of 7",
      title: "Exclusive Technology Partner: Logic Intelligence Technologies",
      subtitle: "Enterprise-grade digital infrastructure engineered specifically for CSC Circle.",
      content: (
        <div className="grid gap-5 md:grid-cols-2 items-center">
          <div className="flex flex-col items-center justify-center rounded-xl border border-brand-border/80 bg-brand-cloud/40 p-6 text-center">
            <div className="relative size-24 mb-3">
              <Image
                src="/brand/lit-seal.png"
                alt="Logic Intelligence Technologies Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-200">
              Exclusive Technology Partner
            </span>
            <p className="mt-2 text-sm font-bold text-brand-ink">Logic Intelligence Technologies (LIT)</p>
            <p className="text-xs text-brand-muted">Platform Architecture · AI Integration · Security</p>
          </div>
          <div className="flex flex-col gap-2.5 text-xs text-brand-secondary sm:text-[13px]">
            <div className="flex items-start gap-2.5 rounded-lg border border-brand-border/60 bg-white p-3">
              <ShieldCheck className="size-4 shrink-0 text-brand-accent mt-0.5" />
              <div>
                <p className="font-bold text-brand-ink text-xs">Tamper-Evident Digital Agreements</p>
                <p className="text-[11px] text-brand-muted">SHA-256 signed audit trails compliant with Section 10A &amp; 65B of Indian IT Act.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg border border-brand-border/60 bg-white p-3">
              <Cpu className="size-4 shrink-0 text-brand-accent mt-0.5" />
              <div>
                <p className="font-bold text-brand-ink text-xs">AI Assistant &amp; Founder Directory</p>
                <p className="text-[11px] text-brand-muted">Automated verification, high-speed profile search, and 24/7 WhatsApp AI concierge.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg border border-brand-border/60 bg-white p-3">
              <Layers className="size-4 shrink-0 text-brand-accent mt-0.5" />
              <div>
                <p className="font-bold text-brand-ink text-xs">Dynamic Digital Founder Pass</p>
                <p className="text-[11px] text-brand-muted">Cryptographic QR check-in badges for partner discounts and venue access.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 5: Flagship Programs
    {
      id: 5,
      eyebrow: "Ecosystem Initiatives · Slide 5 of 7",
      title: "Programs Designed for Tangible Founder Outcomes",
      subtitle: "High-signal gatherings and structured acceleration clinics.",
      content: (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col justify-between rounded-xl border border-brand-border bg-white p-4 shadow-2xs">
            <div>
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-brand-accent mb-3">
                <Users className="size-4" />
              </span>
              <h4 className="text-sm font-bold text-brand-ink">CSC Connect</h4>
              <p className="mt-1 text-xs text-brand-secondary leading-relaxed">
                Curated bi-weekly meetups designed to bypass polite small talk. Founders share actual metrics, roadblocks, and peer solutions.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-brand-border/60 text-[11px] text-brand-muted">
              Format: Stranger-to-Partner Mastermind
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-brand-border bg-white p-4 shadow-2xs">
            <div>
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 mb-3">
                <Sparkles className="size-4" />
              </span>
              <h4 className="text-sm font-bold text-brand-ink">Pitch Clinics</h4>
              <p className="mt-1 text-xs text-brand-secondary leading-relaxed">
                Live deck teardowns with venture capital scouts, active angel investors, and experienced operators before taking your seed round to market.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-brand-border/60 text-[11px] text-brand-muted">
              Format: Closed-Door Tear-down Sessions
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-brand-border bg-white p-4 shadow-2xs">
            <div>
              <span className="flex size-8 items-center justify-center rounded-lg bg-purple-50 text-purple-700 mb-3">
                <Compass className="size-4" />
              </span>
              <h4 className="text-sm font-bold text-brand-ink">Founder Pass &amp; Perks</h4>
              <p className="mt-1 text-xs text-brand-secondary leading-relaxed">
                Exclusive community partner benefits: cloud credits, co-working desks across Coimbatore, and legal templates.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-brand-border/60 text-[11px] text-brand-muted">
              Format: Verified Digital Badge Access
            </div>
          </div>
        </div>
      ),
    },

    // Slide 6: Operating Principles
    {
      id: 6,
      eyebrow: "Community Principles · Slide 6 of 7",
      title: "Our Core Operating Principles & Code of Conduct",
      subtitle: "A high-trust sanctuary where Coimbatore's founders thrive.",
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "1. Give First, Ask Later",
              desc: "True networks flourish when founders offer insights, introductions, and feedback before seeking immediate transactions.",
            },
            {
              title: "2. Zero Tolerance for Spam",
              desc: "Unsolicited promotional sales pitches and indiscriminate DM blasts are strictly prohibited to preserve high signal-to-noise ratio.",
            },
            {
              title: "3. Radical Confidentiality (Vegas Rule)",
              desc: "Unreleased product teardowns, sensitive numbers, and struggles shared in closed circles remain strictly confidential.",
            },
            {
              title: "4. Inclusivity & Meritocracy",
              desc: "Whether you are a solo student hacker or a seasoned serial entrepreneur, everyone is evaluated on grit and integrity.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-brand-border/70 bg-white p-4 shadow-2xs">
              <h4 className="text-xs font-bold text-brand-ink sm:text-[13px]">{item.title}</h4>
              <p className="mt-1 text-xs text-brand-secondary leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      ),
    },

    // Slide 7: Let's Connect
    {
      id: 7,
      eyebrow: "Official Hub · Slide 7 of 7",
      title: "Join the Circle. Lead the Future.",
      subtitle: "Connect with the leadership team and access official community channels.",
      content: (
        <div className="flex flex-col gap-4 text-center">
          <p className="mx-auto max-w-xl text-xs text-brand-secondary sm:text-[13px] leading-relaxed">
            CSC Circle is continuously expanding partnerships with pioneering startups, academic incubators, and industry leaders. Get in touch directly to unlock collaborative opportunities.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Link
              href={siteConfig.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3 text-xs font-semibold text-brand-ink shadow-2xs hover:border-brand-accent transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative size-6">
                  <Image src="/images/agreements/social/whatsapp.png" alt="WhatsApp" fill className="object-contain" />
                </div>
                <span>WhatsApp Network</span>
              </div>
              <ExternalLink className="size-3.5 text-brand-muted" />
            </Link>
            <Link
              href={siteConfig.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3 text-xs font-semibold text-brand-ink shadow-2xs hover:border-brand-accent transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative size-6">
                  <Image src="/images/agreements/social/linkedin.png" alt="LinkedIn" fill className="object-contain" />
                </div>
                <span>LinkedIn Page</span>
              </div>
              <ExternalLink className="size-3.5 text-brand-muted" />
            </Link>
            <Link
              href={`mailto:${siteConfig.social.email}`}
              className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3 text-xs font-semibold text-brand-ink shadow-2xs hover:border-brand-accent transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative size-6">
                  <Image src="/images/agreements/social/mail.png" alt="Email" fill className="object-contain" />
                </div>
                <span>Official Email</span>
              </div>
              <ArrowRight className="size-3.5 text-brand-muted" />
            </Link>
          </div>
          <div className="mt-2 rounded-xl border border-brand-border/60 bg-brand-cloud/40 p-3 text-xs text-brand-muted">
            Official Platform: <strong className="text-brand-ink">csc.logicintelligencetechnologies.in</strong>
          </div>
        </div>
      ),
    },
  ];

  const current = slides[activeSlide];

  return (
    <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-white p-5 shadow-xs sm:p-7">
      {/* Header with Slide indicator & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-accent">
            {current.eyebrow}
          </span>
          <h3 className="text-base font-bold text-brand-ink sm:text-lg">{current.title}</h3>
          <p className="text-xs text-brand-muted">{current.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSlide((prev) => (prev > 0 ? prev - 1 : slides.length - 1))}
            className="h-8 w-8 p-0"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-mono text-xs font-semibold text-brand-secondary">
            {activeSlide + 1} / {slides.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSlide((prev) => (prev < slides.length - 1 ? prev + 1 : 0))}
            className="h-8 w-8 p-0"
            aria-label="Next Slide"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Slide Content View */}
      <div className="min-h-[280px] py-2">{current.content}</div>

      {/* Slide Dot Indicators */}
      <div className="flex items-center justify-center gap-1.5 pt-3 border-t border-brand-border/60">
        {slides.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSlide(idx)}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              idx === activeSlide ? "w-6 bg-brand-accent" : "w-1.5 bg-brand-border hover:bg-brand-muted"
            }`}
            aria-label={`Jump to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
