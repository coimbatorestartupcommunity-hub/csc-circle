/**
 * Global site configuration: identity, navigation, routes and partnership facts.
 * Single source of truth for the shell and metadata. Content here is approved
 * and factual — do not add unverified claims.
 */

export interface LeadershipDesk {
  title: string;
  leader: string;
  role: string;
  affiliation: string;
  email: string;
  altEmail?: string;
  focus: string;
  sla: string;
  badge: string;
}

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
    whatsapp: "https://chat.whatsapp.com/HGWEu9dm7Jc6C3sH7V1PTB",
    whatsappAgent: "https://wa.me/917550067712?text=Hi",
    whatsappAgentPhone: "+91 75500 67712",
    linkedin: "https://www.linkedin.com/in/csc-coimbatore-startup-community-b27b0b44b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    linkedinProfile: "https://www.linkedin.com/in/csc-coimbatore-startup-community-b27b0b44b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    email: "coimbatorestartup.csc@gmail.com",
    adminEmail: "coimbatorestartupcommunity@gmail.com",
    techEmail: "hello@logicintelligencetechnologies.in",
    whatsappCircles: {
      announcements: {
        name: "CSC Announcement",
        category: "Official Broadcast Channel",
        description:
          "Zero-noise, admin-only verified broadcasts. Flagship summits, StartupTN & Startup India updates, policy alerts, and pass rollouts.",
        url: "https://chat.whatsapp.com/HGWEu9dm7Jc6C3sH7V1PTB",
      },
      circle: {
        name: "CSC Circle",
        category: "Main Community Hub",
        description:
          "Peer founder discussions, product showcases, UI/UX audits, problem-solving, and builder matchmaking.",
        url: "https://chat.whatsapp.com/HGWEu9dm7Jc6C3sH7V1PTB",
      },
      mindSprint: {
        name: "CSC Mind Sprint",
        category: "Innovation, Challenges & Growth",
        description:
          "Daily engineering sprints (Monday Logic), product teardowns, Build-in-Public sprints, hackathons, and student fellowships.",
        url: "https://chat.whatsapp.com/HGWEu9dm7Jc6C3sH7V1PTB",
      },
      businessNetwork: {
        name: "CSC Business Network",
        category: "Enterprise, Capital & Alliances",
        description:
          "Commercial B2B matchmaking, corporate pilots, connecting legacy industrial manufacturing with modern tech startups & angel syndicates.",
        url: "https://chat.whatsapp.com/HGWEu9dm7Jc6C3sH7V1PTB",
      },
      opportunities: {
        name: "CSC Opportunities",
        category: "Grants, Funding & Calls",
        description:
          "Capital intelligence, non-dilutive seed grants (TANSEED up to ₹15L, SISFS up to ₹50L), BIRAC, and top accelerator cohorts.",
        url: "https://chat.whatsapp.com/HGWEu9dm7Jc6C3sH7V1PTB",
      },
    },
  },
  leadershipDesks: [
    {
      title: "Office of the President & Founder",
      leader: "K. N. Reyash",
      role: "Founder & President",
      affiliation: "Founder, Belvoria",
      email: "coimbatorestartup.president@gmail.com",
      altEmail: "coimbatorestartup.csc@gmail.com",
      focus: "Institutional MoUs, government relations, sovereign ecosystem strategy & non-transactional ethics.",
      sla: "Within 24–48 hours",
      badge: "Executive Office",
    },
    {
      title: "Vice President & Strategic Partnerships",
      leader: "E. R. Sharan",
      role: "Co-Founder & Vice President",
      affiliation: "Founder, CECIL Groups",
      email: "coimbatorestartup.partnerships@gmail.com",
      altEmail: "coimbatorestartupcommunity@gmail.com",
      focus: "Corporate enablers, university incubation cells, sponsor alliances & industrial manufacturing tie-ups.",
      sla: "Within 24–48 hours",
      badge: "Partnerships Desk",
    },
    {
      title: "Executive Office & CEO",
      leader: "Mirra Mahendran",
      role: "Chief Executive Officer (CEO)",
      affiliation: "PSG Institute of Advanced Studies",
      email: "coimbatorestartup.ceo@gmail.com",
      altEmail: undefined,
      focus: "Ecosystem operations, cross-chapter expansions, program administration & mentor councils.",
      sla: "Within 24 hours (Mon–Sat)",
      badge: "Operations & Admin",
    },
    {
      title: "Technology & Platform Architecture Desk",
      leader: "Vikash Saravanan",
      role: "Chief Technology Officer (CTO)",
      affiliation: "Founder & CEO, Logic Intelligence Technologies (LIT)",
      email: "coimbatorestartup.tech@gmail.com",
      altEmail: "hello@logicintelligencetechnologies.in",
      focus: "Platform uptime, cryptographic verification APIs, mobile wallets, security disclosures & system architecture.",
      sla: "Within 24–48 hours (Security disclosures < 24h)",
      badge: "Engineering Desk",
    },
    {
      title: "Community Engagement & Member Welfare Desk",
      leader: "Swathi",
      role: "Chief Community Officer (CCO)",
      affiliation: "Community Welfare & Healthcare Support",
      email: "coimbatorestartup.community@gmail.com",
      altEmail: undefined,
      focus: "Onboarding, WhatsApp group moderation, diversity, founder wellness, grievances & inclusivity.",
      sla: "Within 24 hours",
      badge: "Community Desk",
    },
    {
      title: "Operations & Event Logistics Desk",
      leader: "Kishore C",
      role: "Chief Operating Officer (COO)",
      affiliation: "Founder, APARÈ Clothing",
      email: "coimbatorestartup.operations@gmail.com",
      altEmail: undefined,
      focus: "Venue bookings, physical check-in kiosks, AV and volunteer coordination & demo day logistics.",
      sla: "Within 12–24 hours (Priority on event days)",
      badge: "Events & Logistics",
    },
    {
      title: "Brand Strategy, Media & Press Desk",
      leader: "Jaibharath V",
      role: "Chief Brand Officer (CBO)",
      affiliation: "Founder, Flickkora Agency",
      email: "coimbatorestartup.brand@gmail.com",
      altEmail: undefined,
      focus: "Press releases, media kits, demo day broadcasts, brand asset licenses & visual storytelling.",
      sla: "Within 24–48 hours",
      badge: "Brand & Media",
    },
  ] satisfies readonly LeadershipDesk[],
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
