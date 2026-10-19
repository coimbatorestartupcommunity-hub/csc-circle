/**
 * DEVELOPMENT FIXTURES — NOT REAL CSC CONTENT.
 *
 * Every record here is clearly fictional and flagged `isFixture: true`. These
 * exist only to exercise the UI (cards, filters, carousels, empty vs. populated
 * states) during development. They are served ONLY when `USE_FIXTURES` is true,
 * which defaults to development and is OFF in production builds — so the public
 * production site never presents these as genuine members, events or reviews.
 *
 * Phase 1 replaces these providers with Supabase-backed queries.
 */

import type { EventRecord, Startup, Testimonial } from "@/types";

const explicitFlag = process.env.NEXT_PUBLIC_USE_FIXTURES;

/** True only when explicitly enabled, or in local development. Never in prod unless opted in. */
export const USE_FIXTURES: boolean =
  explicitFlag === "true"
    ? true
    : explicitFlag === "false"
      ? false
      : process.env.NODE_ENV === "development";

export const startupFixtures: Startup[] = [
  {
    id: "fx-startup-1",
    slug: "sample-ai-studio",
    name: "Sample AI Studio",
    industry: "ai",
    description:
      "Development fixture — a placeholder startup building applied AI tools. Replace with approved directory data in Phase 1.",
    collaboration: ["open-to-collaboration", "looking-for-co-founder"],
    website: "https://example.com",
    founder: { id: "fx-f1", name: "Demo Founder A", role: "Founder & CEO" },
    status: "published",
    isFixture: true,
  },
  {
    id: "fx-startup-2",
    slug: "sample-saas-labs",
    name: "Sample SaaS Labs",
    industry: "saas",
    description:
      "Development fixture — a placeholder B2B SaaS workspace product. Not a real CSC member.",
    collaboration: ["seeking-technology-support", "exploring-funding"],
    founder: { id: "fx-f2", name: "Demo Founder B", role: "Co-Founder" },
    status: "published",
    isFixture: true,
  },
  {
    id: "fx-startup-3",
    slug: "sample-d2c-collective",
    name: "Sample D2C Collective",
    industry: "d2c-ecommerce",
    description:
      "Development fixture — a placeholder direct-to-consumer brand. Illustrates the directory card only.",
    collaboration: ["looking-for-marketing-partners", "open-to-collaboration"],
    website: "https://example.com",
    founder: { id: "fx-f3", name: "Demo Founder C", role: "Founder" },
    status: "published",
    isFixture: true,
  },
  {
    id: "fx-startup-4",
    slug: "sample-healthtech",
    name: "Sample HealthTech",
    industry: "healthtech",
    description:
      "Development fixture — a placeholder healthtech venture. Sample data for layout and filtering.",
    collaboration: ["offering-mentorship"],
    founder: { id: "fx-f4", name: "Demo Founder D", role: "Founder & CTO" },
    status: "published",
    isFixture: true,
  },
  {
    id: "fx-startup-5",
    slug: "sample-fintech",
    name: "Sample FinTech",
    industry: "fintech",
    description:
      "Development fixture — a placeholder fintech product. Not representative of a real company.",
    collaboration: ["exploring-funding", "looking-for-co-founder"],
    founder: { id: "fx-f5", name: "Demo Founder E", role: "Founder" },
    status: "published",
    isFixture: true,
  },
  {
    id: "fx-startup-6",
    slug: "sample-edtech",
    name: "Sample EdTech",
    industry: "education",
    description:
      "Development fixture — a placeholder education platform used to preview the grid at scale.",
    collaboration: ["open-to-collaboration", "seeking-technology-support"],
    founder: { id: "fx-f6", name: "Demo Founder F", role: "Co-Founder" },
    status: "published",
    isFixture: true,
  },
];

// Fixture event dates are expressed relative to a fixed reference so they read
// as "upcoming" in demos without depending on the current time at render.
const ref = new Date("2026-12-01T00:00:00+05:30");
const atDays = (days: number, hour: number) => {
  const d = new Date(ref);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const eventFixtures: EventRecord[] = [
  {
    id: "fx-event-1",
    slug: "sample-founder-meetup",
    title: "Sample Founder Meetup",
    category: "meetup",
    description:
      "Development fixture — a placeholder meetup for previewing event cards, the featured event and booking states.",
    startsAt: atDays(14, 18),
    endsAt: atDays(14, 20),
    location: "Coimbatore",
    venue: "Sample Venue (demo data)",
    capacity: 60,
    registrationDeadline: atDays(12, 23),
    status: "published",
    admission: "free",
    registrationState: "coming-soon",
    featured: true,
    isFixture: true,
  },
  {
    id: "fx-event-2",
    slug: "sample-pitch-session",
    title: "Sample Pitch Session",
    category: "pitch-session",
    description:
      "Development fixture — a placeholder pitch session. Registration is intentionally not live.",
    startsAt: atDays(28, 17),
    endsAt: atDays(28, 19),
    location: "Coimbatore",
    venue: "Sample Venue (demo data)",
    capacity: 40,
    status: "published",
    admission: "free",
    registrationState: "coming-soon",
    isFixture: true,
  },
  {
    id: "fx-event-3",
    slug: "sample-tech-workshop",
    title: "Sample Tech Workshop",
    category: "workshop",
    description:
      "Development fixture — a placeholder workshop used to preview the workshop category and list view.",
    startsAt: atDays(42, 10),
    endsAt: atDays(42, 13),
    location: "Coimbatore",
    venue: "Sample Venue (demo data)",
    capacity: 30,
    status: "published",
    admission: "free",
    registrationState: "coming-soon",
    isFixture: true,
  },
];

export const testimonialFixtures: Testimonial[] = [
  {
    id: "fx-review-1",
    name: "Sample Member A",
    designation: "Community Member (demo)",
    quote:
      "Development fixture — a placeholder testimonial that demonstrates the ratings carousel layout. This is not a real review.",
    rating: 5,
    createdAt: "2026-10-01T00:00:00+05:30",
    status: "published",
    isFixture: true,
  },
  {
    id: "fx-review-2",
    name: "Sample Member B",
    designation: "Founder (demo)",
    quote:
      "Development fixture — placeholder review text shown only while fixtures are enabled. Replace with approved reviews.",
    rating: 5,
    createdAt: "2026-10-05T00:00:00+05:30",
    status: "published",
    isFixture: true,
  },
  {
    id: "fx-review-3",
    name: "Sample Member C",
    designation: "Builder (demo)",
    quote:
      "Development fixture — another placeholder review used to preview carousel navigation and pagination dots.",
    rating: 4,
    createdAt: "2026-10-09T00:00:00+05:30",
    status: "published",
    isFixture: true,
  },
];
