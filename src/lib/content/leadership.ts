import { brandAssets, siteConfig } from "@/lib/content/site";

/** One CSC leadership record. name/portrait are optional so unconfirmed slots
 *  (e.g. a reserved Co-Founder) can be represented without inventing data. */
export interface Leader {
  id: string;
  /** Courtesy title shown before the name (e.g. "Mr."). Optional. */
  honorific?: string;
  name: string | null;
  role: string;
  additionalRole?: string;
  responsibility: string;
  portrait?: string;
  org?: { name: string; logo: string; url: string };
  order: number;
}

export const leadershipSection = {
  eyebrow: "OUR LEADERSHIP",
  heading: "The People Building CSC Circle",
  description:
    "The Coimbatore Startup Community was founded and is being built by the people below. With gratitude for their work, we recognize the team guiding CSC — from its founding vision and community initiatives to events and technology-enabled growth.",
};

export const leaders: Leader[] = [
  {
    id: "reyash",
    honorific: "Mr.",
    name: "Reyash",
    role: "Founder — Coimbatore Startup Community (CSC)",
    additionalRole: "Founder — Belvoria",
    responsibility:
      "As the Founder of the Coimbatore Startup Community, leads its vision and growth — guiding founder engagement, ecosystem partnerships, strategic initiatives, and the organization's overall development.",
    portrait: brandAssets.reyashPortrait,
    org: { name: "Belvoria", logo: brandAssets.belvoriaLogo, url: "https://belvoria.vercel.app/" },
    order: 1,
  },
  {
    id: "sharaneswaran",
    honorific: "Mr.",
    name: "E. R. Sharaneswaran",
    role: "Co-Founder — Coimbatore Startup Community (CSC)",
    responsibility:
      "As a Co-Founder of the Coimbatore Startup Community, supports its organizational coordination, community initiatives, founder engagement, and the development of a collaborative startup ecosystem.",
    order: 2,
  },
  {
    id: "co-founder-reserved",
    name: null,
    role: "Co-Founder — Coimbatore Startup Community (CSC)",
    responsibility:
      "A member of the CSC founding team. Full profile details will be shared soon.",
    order: 3,
  },
  {
    id: "kishore",
    honorific: "Mr.",
    name: "Kishore",
    role: "Event Manager — Coimbatore Startup Community (CSC)",
    responsibility:
      "As CSC's Event Manager, coordinates community events, meetup planning, attendee experiences, event operations, and on-ground community activities.",
    order: 4,
  },
  {
    id: "vikash",
    honorific: "Mr.",
    name: "Vikash Saravanan",
    role: "Chief Technology Officer (CTO) — Coimbatore Startup Community (CSC)",
    additionalRole: "Founder & Lead System Engineer — Logic Intelligence Technologies (LIT)",
    responsibility:
      "As CSC's Chief Technology Officer, leads its technology strategy, digital platform architecture, software development, system integrations, infrastructure management, and technical security, delivered through Logic Intelligence Technologies.",
    portrait: brandAssets.vikashPortrait,
    org: { name: siteConfig.technologyPartner.shortName, logo: brandAssets.litLogo, url: siteConfig.technologyPartner.url },
    order: 5,
  },
];
