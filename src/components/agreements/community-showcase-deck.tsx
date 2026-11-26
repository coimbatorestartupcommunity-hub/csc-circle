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
import { CircularSocialIcon } from "@/components/common/brand-icons";
import QRCode from "qrcode";

export interface DeckSlide {
  id: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

interface LeaderProfile {
  id: string;
  name: string;
  role: string;
  focus: string;
  image: string;
  badge: string;
}

const LEADERSHIP_TEAM: LeaderProfile[] = [
  {
    id: "reyash",
    name: "K. N. Reyash",
    role: "Founder & President",
    focus: "Ecosystem Vision",
    image: "/images/agreements/leaders/1-reyash.jpg",
    badge: "Ecosystem Stewardship",
  },
  {
    id: "sharan",
    name: "E. R. Sharan",
    role: "Co-Founder & VP",
    focus: "Strategic Growth",
    image: "/images/agreements/leaders/2-sharan.jpg",
    badge: "Strategic Expansion",
  },
  {
    id: "mirra",
    name: "Mirra Mahendran",
    role: "Chief Executive Officer",
    focus: "Operations & Alliances",
    image: "/images/agreements/leaders/3-mirra.jpg",
    badge: "Executive Operations",
  },
  {
    id: "vikash",
    name: "Vikash Saravanan",
    role: "Chief Technology Officer",
    focus: "Tech & LIT Architecture",
    image: "/images/agreements/leaders/4-vikash.jpg",
    badge: "LIT Platform Architecture",
  },
  {
    id: "swathi",
    name: "Swathi",
    role: "Chief Community Officer",
    focus: "Community Experience",
    image: "/images/agreements/leaders/5-swathi.jpg",
    badge: "Member Experience",
  },
  {
    id: "kishore",
    name: "Kishore C",
    role: "Chief Operating Officer",
    focus: "Programs & Logistics",
    image: "/images/agreements/leaders/6-kishore.jpg",
    badge: "Programs & Operations",
  },
  {
    id: "jaibharath",
    name: "Jaibharath V",
    role: "Chief Business Officer",
    focus: "Partnerships & Value",
    image: "/images/agreements/leaders/7-jaibharath.jpg",
    badge: "Venture Partnerships",
  },
];

function Slide3LeadersShowcase() {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(0);

  const activeLeader = selectedIndex !== null ? LEADERSHIP_TEAM[selectedIndex] : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex === null) {
      setSelectedIndex(LEADERSHIP_TEAM.length - 1);
    } else {
      setSelectedIndex((selectedIndex - 1 + LEADERSHIP_TEAM.length) % LEADERSHIP_TEAM.length);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex === null) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex((selectedIndex + 1) % LEADERSHIP_TEAM.length);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Featured Leader Spotlight Container */}
      <div className="relative overflow-hidden rounded-xl border border-brand-border/80 bg-slate-900 shadow-md">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full max-h-[380px] flex items-center justify-center bg-slate-950">
          <Image
            src={activeLeader ? activeLeader.image : "/images/agreements/leaders/csc-leaders-lockup.jpg"}
            alt={activeLeader ? `${activeLeader.name} - ${activeLeader.role}` : "CSC Circle Leadership Team"}
            fill
            className={activeLeader ? "object-contain" : "object-cover"}
            sizes="(max-width: 768px) 100vw, 700px"
            priority
          />

          {/* Quick Prev / Next Arrows */}
          <div className="absolute inset-y-0 left-2 flex items-center z-10">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Leader"
              className="rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm transition-all hover:bg-black/90 hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute inset-y-0 right-2 flex items-center z-10">
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Leader"
              className="rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm transition-all hover:bg-black/90 hover:scale-105 active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Overlay Tag */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3.5 pt-8 text-white z-10 flex flex-wrap items-end justify-between gap-2">
            <div>
              {activeLeader ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-brand-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      Leader {selectedIndex! + 1} of 7
                    </span>
                    <span className="text-[11px] text-zinc-300 font-medium">{activeLeader.badge}</span>
                  </div>
                  <p className="mt-0.5 text-base sm:text-lg font-bold text-white leading-tight">{activeLeader.name}</p>
                  <p className="text-xs text-zinc-300">{activeLeader.role} · <span className="text-brand-accent">{activeLeader.focus}</span></p>
                </>
              ) : (
                <>
                  <span className="rounded bg-brand-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Full Team Panorama
                  </span>
                  <p className="mt-0.5 text-base sm:text-lg font-bold text-white">Coimbatore Startup Community Stewards</p>
                  <p className="text-xs text-zinc-300">Seven dedicated leaders steering community vision &amp; ecosystem growth.</p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedIndex(activeLeader ? null : 0)}
              className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              {activeLeader ? "View Team Panorama" : "View Leader Spotlight"}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Leader Selection Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 sm:gap-2.5">
        {LEADERSHIP_TEAM.map((leader, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <button
              type="button"
              key={leader.id}
              onClick={() => setSelectedIndex(idx)}
              className={`flex items-center gap-2.5 text-left rounded-lg border p-2 transition-all ${
                isSelected
                  ? "border-brand-accent bg-blue-50/80 shadow-xs ring-2 ring-brand-accent/20"
                  : "border-brand-border/70 bg-white hover:border-brand-accent/50 hover:bg-brand-cloud/40 shadow-2xs"
              }`}
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-brand-border/60 bg-brand-cloud shadow-2xs">
                <Image
                  src={leader.image}
                  alt={leader.name}
                  fill
                  className="object-cover object-top"
                  sizes="36px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className={`truncate text-xs font-semibold ${isSelected ? "text-brand-accent" : "text-brand-ink"}`}>
                    {leader.name}
                  </p>
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-brand-accent shrink-0 ml-1" />}
                </div>
                <p className="truncate text-[10px] text-brand-muted">{leader.role}</p>
                <p className="truncate text-[9.5px] text-brand-secondary font-medium">{leader.focus}</p>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setSelectedIndex(null)}
          className={`flex items-center justify-center rounded-lg border p-2 text-center transition-all ${
            selectedIndex === null
              ? "border-brand-accent bg-blue-50/80 ring-2 ring-brand-accent/20"
              : "border-dashed border-brand-border bg-brand-cloud/40 hover:bg-brand-cloud/80"
          }`}
        >
          <div>
            <span className={`text-[11px] font-semibold block ${selectedIndex === null ? "text-brand-accent" : "text-brand-ink"}`}>
              Full Team Lockup
            </span>
            <span className="text-[9.5px] text-brand-muted">Guided by Collective Growth</span>
          </div>
        </button>
      </div>
    </div>
  );
}

export function CommunityShowcaseDeck() {
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    QRCode.toDataURL("https://csc.logicintelligencetechnologies.in", {
      margin: 1,
      width: 280,
      color: { dark: "#09090b", light: "#ffffff" },
    })
      .then((url) => {
        if (mounted) setQrCodeUrl(url);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

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
      content: <Slide3LeadersShowcase />,
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

    // Slide 7: Let's Connect & Build Together
    {
      id: 7,
      eyebrow: "Let's Connect & Build Together · Slide 7 of 7",
      title: "Join the Circle. Lead the Future.",
      subtitle: "Official community contact hub, partnerships & platform access.",
      content: (
        <div className="grid gap-5 md:grid-cols-2 items-center">
          {/* Visual: Dynamic QR Code to CSC Circle */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-brand-border bg-white p-5 text-center shadow-2xs">
            <div className="relative size-36 overflow-hidden rounded-lg border border-brand-border/60 bg-white p-1">
              {qrCodeUrl ? (
                <Image
                  src={qrCodeUrl}
                  alt="QR Code linking directly to CSC Circle Platform"
                  fill
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-zinc-50 text-[10px] text-zinc-400">
                  Generating QR...
                </div>
              )}
            </div>
            <p className="mt-3 text-xs font-bold text-brand-ink">Scan to Visit CSC Circle</p>
            <p className="text-[11px] font-mono text-brand-muted">csc.logicintelligencetechnologies.in</p>
            <Link
              href="https://csc.logicintelligencetechnologies.in"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-accent hover:underline"
            >
              <span>Open Platform</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>

          {/* Official Community Contact Hub */}
          <div className="flex flex-col gap-2.5">
            <div className="rounded-xl border border-brand-border bg-brand-cloud/40 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                Official Community Email
              </p>
              <Link
                href="mailto:coimbatorestartupcommunity@gmail.com"
                className="mt-0.5 block text-xs font-bold text-brand-ink hover:text-brand-accent transition sm:text-sm break-all"
              >
                coimbatorestartupcommunity@gmail.com
              </Link>
              <p className="mt-0.5 text-[11px] text-brand-secondary">
                For partnerships, college incubators, accelerator tie-ups &amp; press inquiries.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href={siteConfig.social.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg border border-brand-border bg-white p-2.5 text-xs font-semibold text-brand-ink shadow-2xs hover:border-brand-accent transition"
              >
                <CircularSocialIcon network="whatsapp" size={24} />
                <span className="truncate">WhatsApp Group</span>
              </Link>
              <Link
                href={siteConfig.social.whatsappAgent}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg border border-brand-border bg-white p-2.5 text-xs font-semibold text-brand-ink shadow-2xs hover:border-brand-accent transition"
              >
                <CircularSocialIcon network="ai_agent" size={24} />
                <span className="truncate">WhatsApp AI</span>
              </Link>
              <Link
                href={siteConfig.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg border border-brand-border bg-white p-2.5 text-xs font-semibold text-brand-ink shadow-2xs hover:border-brand-accent transition"
              >
                <CircularSocialIcon network="linkedin" size={24} />
                <span className="truncate">LinkedIn Page</span>
              </Link>
              <Link
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg border border-brand-border bg-white p-2.5 text-xs font-semibold text-brand-ink shadow-2xs hover:border-brand-accent transition"
              >
                <CircularSocialIcon network="instagram" size={24} />
                <span className="truncate">Instagram</span>
              </Link>
            </div>
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
