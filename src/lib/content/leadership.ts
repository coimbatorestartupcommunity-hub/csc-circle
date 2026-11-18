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
  heading: "The People Behind CSC Circle",
  description:
    "The Coimbatore Startup Community was founded and is being built by the people below. With gratitude for their work, we recognize the team guiding CSC — from its founding vision and community initiatives to events and technology-enabled growth.",
};

export const leaders: Leader[] = [
  {
    id: "reyash",
    name: "K. N. Reyash",
    role: "Founder, Coimbatore Startup Community",
    additionalRole: "Founder, Belvoria",
    responsibility:
      "K. N. Reyash is the Founder of CSC, providing overall community leadership, vision, and strategic direction. He builds entrepreneur networks, approves plans, and drives meetups — shaping the startup ecosystem and fostering entrepreneurial growth across Coimbatore.",
    portrait: "/images/team/reyash.jpg",
    org: { name: "Belvoria", logo: brandAssets.belvoriaLogo, url: "https://belvoria.vercel.app/" },
    order: 1,
  },
  {
    id: "sharan",
    name: "E. R. Sharan",
    role: "Co-Founder, Coimbatore Startup Community",
    additionalRole: "Founder, CECIL Groups of Companies & Industries",
    responsibility:
      "E. R. Sharan is Co-Founder of CSC and Founder of CECIL Groups of Companies & Industries. He provides strategic leadership, builds industry connections, and develops partnerships — bridging emerging startups with established networks to drive CSC's sustainable expansion.",
    portrait: "/images/team/sharan.jpg",
    order: 2,
  },
  {
    id: "mirra",
    name: "Mirra Mahendran",
    role: "Chief Executive Officer (CEO), Coimbatore Startup Community",
    responsibility:
      "Mirra Mahendran leads day-to-day operations and execution at CSC. She coordinates team communication, follows up on tasks, and plans and executes community activities following Founder approval — driving the structured, strategic execution of CSC's goals.",
    portrait: "/images/team/mirra.jpg",
    order: 3,
  },
  {
    id: "vikash",
    name: "Vikash Saravanan",
    role: "Chief Technology Officer (CTO) — Coimbatore Startup Community (CSC)",
    additionalRole: "Founder & Chief Executive Officer, Logic Intelligence Technologies (LIT)",
    responsibility:
      "As CSC's Chief Technology Officer, leads its technology strategy, digital platform architecture, software development, system integrations, infrastructure management, and technical security, delivered through Logic Intelligence Technologies.",
    portrait: "/images/team/vikash-new.jpg",
    org: { name: "Logic Intelligence Technologies", logo: brandAssets.litLogo, url: siteConfig.technologyPartner.url },
    order: 4,
  },
  {
    id: "swathi",
    name: "Swathi",
    role: "Chief Community Officer (CCO), Coimbatore Startup Community",
    responsibility:
      "Swathi spearheads member coordination and community engagement at CSC. She leads event coordination, fosters collaboration, and serves as the core communicative link — keeping the community united, informed, and engaged while shaping a sustainable startup ecosystem.",
    portrait: "/images/team/swathi.jpg",
    order: 5,
  },
  {
    id: "kishore",
    name: "Kishore C",
    role: "Chief Operating Officer (COO), Coimbatore Startup Community",
    additionalRole: "Founder, APARÈ Clothing",
    responsibility:
      "Kishore C drives operational and logistical excellence at CSC as Chief Operating Officer. Founder of APARÈ Clothing, he owns end-to-end event management — from planning and venue coordination to flawless on-ground execution, elevating every CSC community experience.",
    portrait: "/images/team/kishore.jpg",
    order: 6,
  },
  {
    id: "jaibharath",
    name: "Jaibharath V",
    role: "Chief Brand Officer (CBO), Coimbatore Startup Community",
    additionalRole: "Founder, Flickkora Agency",
    responsibility:
      "Jaibharath V leads brand strategy and visual storytelling for CSC as Chief Brand Officer. Founder of Flickkora, he produces high-impact videos, reels, and event coverage — elevating CSC's brand identity and expanding its digital presence and influence.",
    portrait: "/images/team/jaibharath.jpg",
    order: 7,
  },
];
