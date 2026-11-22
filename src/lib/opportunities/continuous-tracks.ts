export interface ContinuousTrack {
  slug: string;
  category: string;
  title: string;
  organization: string;
  summary: string;
  mode: string;
  participationMode: string;
  status: string;
  badge: string;
  applicationUrl: string;
  description: string;
  eligibility: string;
}

export const continuousTracks: ContinuousTrack[] = [
  {
    slug: "flagship-founder-in-residence",
    category: "Mentorship & Advisory",
    title: "CSC Founder-in-Residence (FiR) Circle",
    organization: "Coimbatore Startup Community",
    summary:
      "A 6-month continuous guidance track connecting early-stage founders with seasoned operators across Coimbatore for weekly 1:1 syncs and strategic reviews.",
    mode: "Hybrid · Coimbatore",
    participationMode: "Hybrid",
    status: "Rolling Intake",
    badge: "Active Track",
    applicationUrl: "mailto:coimbatorestartup.csc@gmail.com?subject=CSC%20Founder-in-Residence%20Inquiry",
    description:
      "The CSC Founder-in-Residence track matches active early-stage builders with experienced mentors in Tamil Nadu. Selected fellows receive weekly office hours, architectural advisory, and direct founder peer accountability circles.",
    eligibility:
      "Open to full-time or actively bootstrapping founders with an MVP or active customer validation in Coimbatore or surrounding regions.",
  },
  {
    slug: "flagship-student-grant-fellowship",
    category: "Student Builders & Grants",
    title: "Regional Student Innovation & Grant Fellowship",
    organization: "CSC Ecosystem Initiative",
    summary:
      "For student entrepreneurs building hardware or software prototypes in regional engineering colleges. Includes TANSEED grant prep and pitch coaching.",
    mode: "Virtual & In-Person",
    participationMode: "Hybrid",
    status: "Open Enrollment",
    badge: "Student Track",
    applicationUrl: "mailto:coimbatorestartup.csc@gmail.com?subject=Student%20Grant%20Fellowship%20Inquiry",
    description:
      "Designed specifically for collegiate innovators across PSG Tech, CIT, Kumaraguru, Sri Krishna, and regional campuses. Fellows receive hands-on documentation assistance for TANSEED and EDII-TN seed grant submissions.",
    eligibility:
      "Enrolled college students or recent graduates within 12 months of graduation working on deep-tech, IoT, SaaS, or social innovation prototypes.",
  },
  {
    slug: "flagship-pre-seed-demo-day",
    category: "Capital & Demo Days",
    title: "Quarterly Pre-Seed Demo Day Nominations",
    organization: "CSC Capital Network",
    summary:
      "Present your validated MVP to regional angel investors, high-net-worth operators, and early-stage syndicates based in Tamil Nadu.",
    mode: "Closed Door Pitch · Coimbatore",
    participationMode: "In-Person",
    status: "Next Cohort Forming",
    badge: "Investor Track",
    applicationUrl: "mailto:coimbatorestartup.csc@gmail.com?subject=Demo%20Day%20Nomination%20Inquiry",
    description:
      "Quarterly curated closed-door demo days where top CSC startups present metrics, product traction, and seed round terms to angel syndicates and regional family offices.",
    eligibility:
      "Startups with live pilots, paying users, or clear technical defensibility seeking ₹25L to ₹2Cr in early seed capital.",
  },
  {
    slug: "flagship-platform-engineering-fellows",
    category: "Engineering & Tech",
    title: "Platform Engineering & Open Source Fellows",
    organization: "Logic Intelligence Technologies",
    summary:
      "Collaborate directly on CSC Circle architecture, edge routing, performance tuning, and modern agentic engineering workflows.",
    mode: "Remote / Hybrid",
    participationMode: "Remote / Hybrid",
    status: "Selective Intake",
    badge: "Tech Fellowship",
    applicationUrl: "mailto:coimbatorestartup.csc@gmail.com?subject=Platform%20Engineering%20Fellowship%20Inquiry",
    description:
      "Work shoulder-to-shoulder with senior engineers from Logic Intelligence Technologies on high-performance web systems, distributed caching, security hardening, and generative AI infrastructure.",
    eligibility:
      "Founders, tech leads, and senior software builders with experience in TypeScript, React, Next.js, and cloud backends.",
  },
];
