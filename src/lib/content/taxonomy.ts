import type {
  CollaborationIntent,
  EventCategory,
  IndustryCategory,
} from "@/types";

export const industryLabels: Record<IndustryCategory, string> = {
  ai: "Artificial Intelligence",
  saas: "SaaS",
  "d2c-ecommerce": "D2C & E-commerce",
  healthtech: "HealthTech",
  fintech: "FinTech",
  marketing: "Marketing",
  education: "Education",
  other: "Other",
};

/** Use the curated label when known, while preserving founder-entered industries. */
export function industryLabel(value: string): string {
  return industryLabels[value as IndustryCategory] ?? value;
}

export const collaborationLabels: Record<CollaborationIntent, string> = {
  "open-to-collaboration": "Open to Collaboration",
  "looking-for-co-founder": "Looking for Co-Founder",
  "seeking-technology-support": "Seeking Technology Support",
  "looking-for-marketing-partners": "Looking for Marketing Partners",
  "exploring-funding": "Exploring Funding",
  "offering-mentorship": "Offering Mentorship",
};

export const eventCategoryLabels: Record<EventCategory, string> = {
  meetup: "Meetup",
  "pitch-session": "Pitch Session",
  workshop: "Workshop",
  networking: "Networking",
  consultation: "Consultation",
};

/** Ordered option lists for filters/selects (include the "All" sentinel). */
export const industryOptions: { value: IndustryCategory | "all"; label: string }[] = [
  { value: "all", label: "All Industries" },
  ...(Object.keys(industryLabels) as IndustryCategory[]).map((value) => ({
    value,
    label: industryLabels[value],
  })),
];

export const collaborationOptions: {
  value: CollaborationIntent | "all";
  label: string;
}[] = [
  { value: "all", label: "All Collaboration Intents" },
  ...(Object.keys(collaborationLabels) as CollaborationIntent[]).map((value) => ({
    value,
    label: collaborationLabels[value],
  })),
];

/** Goal choices for the RSVP form. */
export const rsvpGoals = [
  "Networking",
  "Co-Founder Search",
  "Technical Support",
  "Funding Opportunities",
  "Startup Mentorship",
  "Marketing Support",
  "Business Development",
  "Other",
] as const;
export type RsvpGoal = (typeof rsvpGoals)[number];
