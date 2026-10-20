/**
 * Shared domain types for the CSC Circle public website.
 *
 * These contracts are intentionally backend-agnostic. Phase 1 will connect them
 * to Supabase without requiring the UI to change. Until then, data is served
 * from the typed providers in `src/lib/services` (development fixtures only).
 */

/** Publication lifecycle shared by content that an admin approves before it goes public. */
export type PublicationStatus = "draft" | "pending" | "published" | "archived";

/* -------------------------------------------------------------------------- */
/*  Directory                                                                 */
/* -------------------------------------------------------------------------- */

export type IndustryCategory =
  | "ai"
  | "saas"
  | "d2c-ecommerce"
  | "healthtech"
  | "fintech"
  | "marketing"
  | "education"
  | "other";

export type CollaborationIntent =
  | "open-to-collaboration"
  | "looking-for-co-founder"
  | "seeking-technology-support"
  | "looking-for-marketing-partners"
  | "exploring-funding"
  | "offering-mentorship";

export interface FounderProfile {
  id: string;
  /** Approved display name. */
  name: string;
  /** Role / title within the startup. */
  role: string;
  /** Short, approved biography. */
  bio?: string;
  /** Approved portrait URL. Optional — initials are shown as a fallback. */
  avatarUrl?: string;
  /** Verified external profile (e.g. LinkedIn). Validated before rendering. */
  profileUrl?: string;
}

export interface Startup {
  id: string;
  slug: string;
  name: string;
  /** Approved logo URL. Optional — initials are shown as a fallback. */
  logoUrl?: string;
  /** Free-form industry name entered by the founder. */
  industry: string;
  /** Short approved description (2–4 lines). */
  description: string;
  /** Collaboration interests this startup is signalling. */
  collaboration: CollaborationIntent[];
  /** Validated website URL (optional). */
  website?: string;
  founder: FounderProfile;
  status: PublicationStatus;
  /** Marks development fixtures so they never appear as real members in production. */
  isFixture?: boolean;
}

export interface DirectoryFilters {
  /** Free-text query against name, startup, industry, skills. */
  search: string;
  industry: IndustryCategory | "all";
  collaboration: CollaborationIntent | "all";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Events                                                                    */
/* -------------------------------------------------------------------------- */

export type EventCategory =
  | "meetup"
  | "pitch-session"
  | "workshop"
  | "networking"
  | "consultation";

export type EventRegistrationState =
  | "open"
  | "closed"
  | "full"
  | "coming-soon"
  | "unavailable";

export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  description: string;
  /** Cover image URL (optional). */
  coverImage?: string;
  /** ISO 8601 timestamps. Displayed in Asia/Kolkata. */
  startsAt: string;
  endsAt: string;
  location: string;
  /** Venue line (building / area). */
  venue?: string;
  capacity?: number;
  /** ISO 8601 registration deadline. */
  registrationDeadline?: string;
  status: PublicationStatus;
  admission: "free" | "paid";
  registrationState: EventRegistrationState;
  featured?: boolean;
  isFixture?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Testimonials                                                              */
/* -------------------------------------------------------------------------- */

export interface Testimonial {
  id: string;
  /** Approved reviewer display name. */
  name: string;
  /** Approved profile image URL. Optional — initials are shown as a fallback. */
  avatarUrl?: string;
  /** Community designation / role. */
  designation: string;
  /** Review body. */
  quote: string;
  /** 1–5. */
  rating: number;
  /** ISO 8601 creation date. */
  createdAt: string;
  status: PublicationStatus;
  isFixture?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Marketing content                                                         */
/* -------------------------------------------------------------------------- */

export interface CommunityStat {
  id: string;
  label: string;
  /** Numeric value — only rendered when `published` is true. */
  value: number;
  suffix?: string;
  /** When false, the figure is withheld and the proposition is shown instead. */
  published: boolean;
}
