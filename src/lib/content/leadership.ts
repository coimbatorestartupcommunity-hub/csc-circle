import { brandAssets, siteConfig } from "@/lib/content/site";

export interface Leader {
  id: string;
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
    id: "vikash",
    honorific: "Mr.",
    name: "Vikash Saravanan",
    role: "Chief Technology Officer (CTO) — Coimbatore Startup Community (CSC)",
    additionalRole: "Founder & Lead System Engineer — Logic Intelligence Technologies (LIT)",
    responsibility:
      "As CSC's Chief Technology Officer, leads its technology strategy, digital platform architecture, software development, system integrations, infrastructure management, and technical security, delivered through Logic Intelligence Technologies.",
    portrait: brandAssets.vikashPortrait,
    org: { name: siteConfig.technologyPartner.shortName, logo: brandAssets.litLogo, url: siteConfig.technologyPartner.url },
    order: 2,
  },
];
