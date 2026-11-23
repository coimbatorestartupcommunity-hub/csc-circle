/**
 * Authoritative, comprehensive Knowledge Base for Coimbatore Startup Community (CSC Circle).
 * Single source of truth for leadership, identity, tagline, mission, pillars, and URLs.
 */

export interface LeaderProfile {
  id: string;
  name: string;
  role: string;
  roleTitle: string;
  additionalRole?: string;
  responsibility: string;
  org?: { name: string; url: string };
}

export const CSC_IDENTITY = {
  name: "CSC Circle",
  shortName: "CSC",
  legalName: "Coimbatore Startup Community",
  tagline: "Connect. Build. Grow.",
  established: 2026,
  city: "Coimbatore",
  region: "Tamil Nadu",
  country: "India",
  description:
    "CSC Circle is Coimbatore's founder-focused startup community — bringing entrepreneurs, builders, creators, students, and professionals together to connect, build and grow.",
  oneLiner: "Connect. Build. Grow. — Coimbatore's founder-focused startup ecosystem bringing builders together to eliminate isolation and accelerate entrepreneurial execution.",
  mission:
    "To reduce the silos that slow founders down. We encourage networking, shared learning, collaboration, and execution — so good ideas find the people, feedback, and support they need to move.",
  vision:
    "A stronger startup future for Coimbatore where ambitious builders can find their circle, gain practical guidance, and scale sustainable businesses.",
  portalUrl: "https://csc.logicintelligencetechnologies.in",
} as const;

export const CSC_LEADERSHIP: Record<string, LeaderProfile> = {
  founder: {
    id: "reyash",
    name: "K. N. Reyash",
    role: "Founder",
    roleTitle: "Founder — Coimbatore Startup Community (CSC)",
    additionalRole: "Founder — Belvoria",
    responsibility:
      "K. N. Reyash is the Founder of CSC, providing overall community leadership, vision, and strategic direction. He shapes the founder network, approves ecosystem initiatives, coordinates strategic collaborations, and drives community meetups across Coimbatore.",
    org: { name: "Belvoria", url: "https://belvoria.vercel.app/" },
  },
  cofounder: {
    id: "sharan",
    name: "E. R. Sharan",
    role: "Co-Founder",
    roleTitle: "Co-Founder — Coimbatore Startup Community (CSC)",
    additionalRole: "Founder — CECIL Groups of Companies & Industries",
    responsibility:
      "E. R. Sharan is Co-Founder of CSC and Founder of CECIL Groups of Companies & Industries. He provides strategic leadership, drives corporate and industrial partnerships, and facilitates high-level industry connections bridging startups with commercial networks.",
  },
  ceo: {
    id: "mirra",
    name: "Mirra Mahendran",
    role: "CEO",
    roleTitle: "Chief Executive Officer (CEO) — Coimbatore Startup Community (CSC)",
    responsibility:
      "Mirra Mahendran leads day-to-day operations and structured execution at CSC. Pursuing a BA (Hons) in International Business at PSG Institute of Advanced Studies, she coordinates internal teams, manages task follow-ups, and oversees community activities following Founder approval.",
  },
  cto: {
    id: "vikash",
    name: "Vikash Saravanan",
    role: "CTO",
    roleTitle: "Chief Technology Officer (CTO) — Coimbatore Startup Community (CSC)",
    additionalRole: "Founder & CEO — Logic Intelligence Technologies (LIT)",
    responsibility:
      "As CSC's Chief Technology Officer, Vikash Saravanan leads the entire technology strategy, digital platform architecture, engineering, system integrations, AI agents, and security infrastructure, delivered through technical partner Logic Intelligence Technologies. He also oversees member verification, Digital ID Pass approvals, and technical onboarding.",
    org: { name: "Logic Intelligence Technologies", url: "https://www.logicintelligencetechnologies.in" },
  },
  coo: {
    id: "kishore",
    name: "Kishore C",
    role: "COO",
    roleTitle: "Chief Operating Officer (COO) — Coimbatore Startup Community (CSC)",
    additionalRole: "Founder — APARÈ Clothing",
    responsibility:
      "Kishore C drives operational and logistical excellence at CSC as Chief Operating Officer. Founder of APARÈ Clothing, he owns end-to-end event planning, venue coordination, and on-ground execution for all community gatherings.",
  },
  cbo: {
    id: "jaibharath",
    name: "Jaibharath V",
    role: "CBO",
    roleTitle: "Chief Brand Officer (CBO) — Coimbatore Startup Community (CSC)",
    additionalRole: "Founder — Flickkora Agency",
    responsibility:
      "Jaibharath V leads brand strategy and visual storytelling for CSC as Chief Brand Officer. Founder of Flickkora Agency, he produces promotional films, reels, event coverage, and brand assets elevating CSC's regional identity.",
  },
  cco: {
    id: "swathi",
    name: "Swathi",
    role: "CCO",
    roleTitle: "Chief Community Officer (CCO) — Coimbatore Startup Community (CSC)",
    responsibility:
      "Swathi spearheads member coordination and community engagement at CSC. She leads event operations, fosters cross-founder collaboration, serves as the core communicative bridge across members, maintains responsive support, and assists with health-related inquiries.",
  },
};

export const CSC_TECHNICAL_PARTNER = {
  name: "Logic Intelligence Technologies",
  shortName: "LIT",
  lead: "Vikash Saravanan (Founder & CEO of LIT / CTO of CSC)",
  url: "https://www.logicintelligencetechnologies.in",
  role: "Official Technology Partner — architects and supports CSC's digital platform, verification engine, WhatsApp intelligence, and cloud infrastructure.",
};

export const CSC_PLATFORM_PILLARS = [
  {
    title: "Events & Meetups",
    url: "https://csc.logicintelligencetechnologies.in/events",
    description: "Scheduled ecosystem meetups, founder roundtables, pitch sessions, and workshops across Coimbatore.",
  },
  {
    title: "Founder Directory",
    url: "https://csc.logicintelligencetechnologies.in/directory",
    description: "A showcase of verified startups and founder profiles founded by community members in Coimbatore.",
  },
  {
    title: "Membership & Digital Pass",
    url: "https://csc.logicintelligencetechnologies.in/member/card",
    description: "5-minute automated membership approval window with verifiable Apple/Google Wallet digital passes.",
  },
  {
    title: "Collaborations",
    url: "https://csc.logicintelligencetechnologies.in/collaborations",
    description: "Institutional partnerships with universities, incubators, industrial chambers, and commercial networks.",
  },
  {
    title: "Opportunities",
    url: "https://csc.logicintelligencetechnologies.in/opportunities",
    description: "Curated startup job listings, co-founder search, internships, and project collaboration opportunities.",
  },
  {
    title: "Resources & Playbooks",
    url: "https://csc.logicintelligencetechnologies.in/resources",
    description: "Practical guides, founder playbooks, legal templates, and technical resources.",
  },
  {
    title: "Community Updates",
    url: "https://csc.logicintelligencetechnologies.in/updates",
    description: "Official community milestones, event recaps, and founder spotlight features.",
  },
];

export const CSC_COMMUNITY_CONTACTS = {
  whatsappGroup: "https://chat.whatsapp.com/EsMyFEUTzT0G3MpMLkUNhB?s=cl&p=a&iam=2",
  whatsappAgentPhone: "+91 75500 67712",
  instagram: "https://www.instagram.com/coimbatorestartupcommunity/",
  linkedin: "https://www.linkedin.com/in/csc-coimbatore-startup-community-b27b0b44b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
  techEmail: "hello@logicintelligencetechnologies.in",
  adminEmail: "coimbatorestartupcommunity@gmail.com",
  supportEmail: "hello@logicintelligencetechnologies.in",
  communityEmail: "coimbatorestartupcommunity@gmail.com",
  contactUrl: "https://csc.logicintelligencetechnologies.in/contact",
};
