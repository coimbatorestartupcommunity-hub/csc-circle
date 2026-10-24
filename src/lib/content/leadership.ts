import { brandAssets, siteConfig } from "@/lib/content/site";

/** One CSC leadership record. name/portrait are optional so unconfirmed slots
 *  (e.g. a reserved Co-Founder) can be represented without inventing data. */
export interface Leader {
  id: string;
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
    "Coimbatore Startup Community is guided by a team focused on founder engagement, collaboration, community initiatives, events, and technology-enabled growth.",
};

export const leaders: Leader[] = [
  {
    id: "reyash",
    name: "Reyash",
    role: "Founder — Coimbatore Startup Community (CSC)",
    additionalRole: "Founder — Belvoria",
    responsibility:
      "Leads CSC's community vision, founder engagement, ecosystem partnerships, strategic initiatives, and organizational development.",
    portrait: brandAssets.reyashPortrait,
    org: { name: "Belvoria", logo: brandAssets.belvoriaLogo, url: "https://belvoria.vercel.app/" },
    order: 1,
  },
  {
    id: "sharaneswaran",
    name: "E. R. Sharaneswaran",
    role: "Co-Founder",
    responsibility:
      "Supports CSC's organizational coordination, community initiatives, founder engagement, and collaborative ecosystem development.",
    order: 2,
  },
  {
    id: "co-founder-reserved",
    name: null,
    role: "Co-Founder",
    responsibility:
      "A member of the CSC founding team. Full profile details will be shared soon.",
    order: 3,
  },
  {
    id: "kishore",
    name: "Kishore",
    role: "Event Manager",
    responsibility:
      "Coordinates CSC events, meetup planning, attendee experiences, event operations, and community activities.",
    order: 4,
  },
  {
    id: "vikash",
    name: "Vikash Saravanan",
    role: "Chief Technology Officer (CTO) — Coimbatore Startup Community (CSC)",
    additionalRole: "Founder & Lead System Engineer — Logic Intelligence Technologies (LIT)",
    responsibility:
      "Leads CSC's technology strategy, digital platform architecture, software development, system integrations, infrastructure management, and technical security through Logic Intelligence Technologies.",
    portrait: brandAssets.vikashPortrait,
    org: { name: siteConfig.technologyPartner.shortName, logo: brandAssets.litLogo, url: siteConfig.technologyPartner.url },
    order: 5,
  },
];
