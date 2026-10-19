/**
 * Community statistics provider.
 *
 * The figures below are UNVERIFIED examples and are withheld (`published: false`)
 * so the public site never presents them as facts. The UI shows the community
 * proposition instead. When an admin approves real numbers (Phase 1/4), flip
 * `published` to true and the counting animation will resolve to the value.
 */

import type { CommunityStat } from "@/types";

export const communityStats: CommunityStat[] = [
  {
    id: "founders",
    label: "Founders & Builders",
    value: 0,
    suffix: "+",
    published: false,
  },
  {
    id: "startups",
    label: "Startups",
    value: 0,
    suffix: "+",
    published: false,
  },
  {
    id: "partners",
    label: "Technology Partners",
    value: 0,
    suffix: "+",
    published: false,
  },
];

/** Propositions shown when the numeric value is withheld. */
export const statPropositions: Record<string, string> = {
  founders: "A growing circle of founders and builders across Coimbatore.",
  startups: "Early-stage startups finding partners, feedback and momentum.",
  partners: "Technology partners supporting strong startup foundations.",
};

export function getCommunityStats(): CommunityStat[] {
  return communityStats;
}

export const hasPublishedStats = communityStats.some((s) => s.published);
