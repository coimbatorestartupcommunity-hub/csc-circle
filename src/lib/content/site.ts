/**
 * Global site configuration: identity, navigation, routes and partnership facts.
 * Single source of truth for the shell and metadata. Content here is approved
 * and factual — do not add unverified claims.
 */

export const siteConfig = {
  name: "CSC Circle",
  shortName: "CSC",
  legalName: "Coimbatore Startup Community",
  tagline: "Connect. Build. Grow.",
  established: 2026,
  description:
    "CSC Circle is Coimbatore's founder-focused startup community — bringing entrepreneurs, builders, creators, students and professionals together to connect, build and grow.",
  /** Public base URL, used for canonical + OpenGraph. */
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://csc-circle-lake.vercel.app",
  locale: "en_IN",
  city: "Coimbatore",
  region: "Tamil Nadu",
  country: "India",
  timezone: "Asia/Kolkata",
  people: {
    founder: {
      name: "Reyash",
      role: "Founder — Coimbatore Startup Community",
      responsibility:
        "Community leadership, founder engagement, events, partnerships, and community operations.",
    },
    technicalPartner: {
      name: "Vikash",
      role: "Founder & Lead System Engineer — Logic Intelligence Technologies",
      responsibility:
        "CSC web platform architecture, digital experience, technical infrastructure, system integration, and technology direction.",
    },
  },
  technologyPartner: {
    name: "Logic Intelligence Technologies",
    shortName: "LIT",
    url: "https://www.logicintelligencetechnologies.in",
  },
  social: {
    instagram: "https://www.instagram.com/coimbatorestartupcommunity/",
    whatsapp: "https://chat.whatsapp.com/Bw3EVo9r4bV5BoeoZfRx1l?mode=gi_t",
    email: "coimbatorestartupcommunity@gmail.com",
  },
} as const;

export const brandAssets = {
  cscLogo: "/brand/csc-logo.png",
  cscIcon: "/brand/csc-icon.png",
  litLogo: "/brand/lit-logo.png",
  /** Approved community group photograph. */
  communityPhoto: "/images/community.jpg",
  /** Approved portrait of the technical partner. */
  vikashPortrait: "/images/vikash.jpg",
} as const;

export interface NavItem {
  label: string;
  href: string;
}

export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About CSC", href: "/about" },
  { label: "Founder Directory", href: "/directory" },
  { label: "Events & Booking", href: "/events" },
];

export const routes = {
  home: "/",
  about: "/about",
  directory: "/directory",
  events: "/events",
  /** Join / Login entry point. Phase 3 implements the real portal here. */
  join: "/login",
  login: "/login",
} as const;

/** Footer link groups. All targets are valid in-site routes. */
export const footerNav: { heading: string; links: NavItem[] }[] = [
  {
    heading: "Community",
    links: [
      { label: "Home", href: routes.home },
      { label: "About CSC", href: routes.about },
      { label: "Founder Directory", href: routes.directory },
      { label: "Events & Booking", href: routes.events },
    ],
  },
  {
    heading: "Get involved",
    links: [
      { label: "Join the Community", href: routes.join },
      { label: "Member Login", href: routes.login },
      { label: "Upcoming Events", href: routes.events },
      { label: "Share Feedback", href: `${routes.home}#testimonials` },
    ],
  },
];
