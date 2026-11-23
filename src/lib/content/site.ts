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
    "https://csc.logicintelligencetechnologies.in",
  locale: "en_IN",
  city: "Coimbatore",
  region: "Tamil Nadu",
  country: "India",
  timezone: "Asia/Kolkata",
  people: {
    founder: {
      name: "Reyash",
      role: "Founder — Coimbatore Startup Community (CSC)",
      belvoriaRole: "Founder — Belvoria",
      responsibility:
        "Leads the Coimbatore Startup Community (CSC) — shaping the community vision, founder engagement, events and programs, strategic partnerships, and day-to-day community operations.",
    },
    technicalPartner: {
      name: "Vikash Saravanan",
      role: "Founder — Logic Intelligence Technologies (LIT)",
      communityRole: "Chief Technology Officer (CTO) — Coimbatore Startup Community (CSC)",
      responsibility:
        "As CTO, leads all technology for the Coimbatore Startup Community (CSC) — platform architecture and engineering, digital product and experience, security, technical infrastructure, system integration, and overall technology direction, delivered through Logic Intelligence Technologies (LIT).",
    },
  },
  technologyPartner: {
    name: "Logic Intelligence Technologies",
    shortName: "LIT",
    url: "https://www.logicintelligencetechnologies.in",
  },
  social: {
    instagram: "https://www.instagram.com/coimbatorestartupcommunity/",
    whatsapp: "https://chat.whatsapp.com/EsMyFEUTzT0G3MpMLkUNhB?s=cl&p=a&iam=2",
    whatsappAgent: "https://wa.me/917550067712?text=Hi",
    whatsappAgentPhone: "+91 75500 67712",
    linkedin: "https://www.linkedin.com/in/csc-coimbatore-startup-community-b27b0b44b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    linkedinProfile: "https://www.linkedin.com/in/csc-coimbatore-startup-community-b27b0b44b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    email: "coimbatorestartup.csc@gmail.com",
    adminEmail: "coimbatorestartupcommunity@gmail.com",
    techEmail: "hello@logicintelligencetechnologies.in",
  },
} as const;

export const brandAssets = {
  cscLogo: "/brand/csc-logo.png",
  cscIcon: "/brand/csc-logo.png",
  litLogo: "/brand/lit-logo.png",
  /** Outlier partner logo (orange background, white lettering). */
  outlierLogo: "/brand/outlier-logo.png",
  /** Approved community group photograph. */
  communityPhoto: "/images/community.png",
  /** CSC × Outlier meetup group photograph. */
  communityOutlier: "/images/community-outlier.png",
  /** Approved portrait of the technical partner / CTO. */
  vikashPortrait: "/images/team/vikash-new.jpg",
  /** Owner-supplied portrait of CSC founder K. N. Reyash. */
  reyashPortrait: "/images/team/reyash.jpg",
  /** Owner-supplied Belvoria logo. */
  belvoriaLogo: "/brand/belvoria-logo.png",
  /** Team portraits */
  sharanPortrait: "/images/team/sharan.jpg",
  mirraPortrait: "/images/team/mirra.jpg",
  kishoreCPortrait: "/images/team/kishore.jpg",
  swathiPortrait: "/images/team/swathi.jpg",
  jaibharathPortrait: "/images/team/jaibharath.jpg",
} as const;

export interface NavItem {
  label: string;
  href: string;
}

export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About CSC", href: "/about" },
  { label: "Founder Directory", href: "/directory" },
  { label: "View CSC Profiles", href: "/members" },
  { label: "Events & Booking", href: "/events" },
  { label: "Collaborations", href: "/collaborations" },
  { label: "Updates", href: "/updates" },
  { label: "Resources", href: "/resources" },
  { label: "Opportunities", href: "/opportunities" },
];

export const routes = {
  home: "/",
  about: "/about",
  directory: "/directory",
  events: "/events",
  collaborations: "/collaborations",
  /** Joining starts with the authenticated CSC membership claim. */
  join: "/profile/claim",
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
      { label: "Collaborations", href: routes.collaborations },
    ],
  },
  {
    heading: "Get involved",
    links: [
      { label: "Join the Community", href: routes.join },
      { label: "Profile Login", href: "/profile/account" },
      { label: "Upcoming Events", href: routes.events },
      { label: "Share Feedback", href: "/profile/reviews" },
    ],
  },
];
