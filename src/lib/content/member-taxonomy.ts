import type {
  CommunityGoal,
  ConsultationStatus,
  MemberDesignation,
  MembershipStatus,
  RegistrationStatus,
  ReviewModerationStatus,
} from "@/types/member";

export const designationLabels: Record<MemberDesignation, string> = {
  startup_founder: "Startup Founder",
  co_founder: "Co-Founder",
  team_member: "Startup Team Member",
  developer: "Developer / Technical Builder",
  student_entrepreneur: "Student Entrepreneur",
  designer: "Designer / Creative Professional",
  marketing: "Marketing Professional",
  investor: "Investor",
  mentor: "Mentor",
  aspiring_entrepreneur: "Aspiring Entrepreneur",
  other: "Other",
};

export const goalLabels: Record<CommunityGoal, string> = {
  networking: "Networking",
  technical_collaboration: "Technical Collaboration",
  finding_co_founder: "Finding a Co-Founder",
  mentorship: "Mentorship",
  product_development: "Product Development",
  marketing: "Marketing",
  funding_connections: "Funding Connections",
  hiring: "Hiring",
  startup_learning: "Startup Learning",
  community_participation: "Community Participation",
};

export const designationOptions = (
  Object.keys(designationLabels) as MemberDesignation[]
).map((value) => ({ value, label: designationLabels[value] }));

export const goalOptions = (Object.keys(goalLabels) as CommunityGoal[]).map(
  (value) => ({ value, label: goalLabels[value] }),
);

/** Visual tone + label for each membership status. */
export const membershipStatusMeta: Record<
  MembershipStatus,
  { label: string; tone: string }
> = {
  not_started: { label: "Not started", tone: "bg-brand-cloud text-brand-muted" },
  profile_incomplete: {
    label: "Profile incomplete",
    tone: "bg-brand-gold text-brand-ink",
  },
  claim_submitted: {
    label: "Claim submitted",
    tone: "bg-brand-blue text-brand-ink",
  },
  pending_verification: {
    label: "Pending verification",
    tone: "bg-brand-gold text-brand-ink",
  },
  approved: { label: "Approved", tone: "bg-brand-purple text-brand-ink" },
  active: { label: "Active member", tone: "bg-green-100 text-green-700" },
  rejected: { label: "Not approved", tone: "bg-brand-red text-brand-ink" },
  suspended: { label: "Suspended", tone: "bg-brand-red text-brand-ink" },
  revoked: { label: "Revoked", tone: "bg-brand-red text-brand-ink" },
  expired: { label: "Expired", tone: "bg-brand-cloud text-brand-muted" },
};

export const registrationStatusMeta: Record<
  RegistrationStatus,
  { label: string; tone: string }
> = {
  draft: { label: "Draft", tone: "bg-brand-cloud text-brand-muted" },
  pending: { label: "Pending", tone: "bg-brand-gold text-brand-ink" },
  pending_review: { label: "Pending review", tone: "bg-brand-gold text-brand-ink" },
  pending_payment: {
    label: "Payment required",
    tone: "bg-brand-gold text-brand-ink",
  },
  payment_verification: {
    label: "Verifying payment",
    tone: "bg-brand-blue text-brand-ink",
  },
  confirmed: { label: "Confirmed", tone: "bg-green-100 text-green-700" },
  waitlisted: { label: "Waitlisted", tone: "bg-brand-purple text-brand-ink" },
  cancelled: { label: "Cancelled", tone: "bg-brand-cloud text-brand-muted" },
  refunded: { label: "Refunded", tone: "bg-brand-cloud text-brand-muted" },
  checked_in: { label: "Checked in", tone: "bg-green-100 text-green-700" },
};

export const consultationStatusMeta: Record<
  ConsultationStatus,
  { label: string; tone: string }
> = {
  submitted: { label: "Submitted", tone: "bg-brand-blue text-brand-ink" },
  under_review: { label: "Under review", tone: "bg-brand-gold text-brand-ink" },
  more_info_required: {
    label: "More info required",
    tone: "bg-brand-gold text-brand-ink",
  },
  approved: { label: "Approved", tone: "bg-brand-purple text-brand-ink" },
  scheduled: { label: "Scheduled", tone: "bg-green-100 text-green-700" },
  completed: { label: "Completed", tone: "bg-green-100 text-green-700" },
  declined: { label: "Declined", tone: "bg-brand-red text-brand-ink" },
  cancelled: { label: "Cancelled", tone: "bg-brand-cloud text-brand-muted" },
};

export const reviewModerationMeta: Record<
  ReviewModerationStatus,
  { label: string; tone: string }
> = {
  draft: { label: "Draft", tone: "bg-brand-cloud text-brand-muted" },
  submitted: { label: "Submitted", tone: "bg-brand-blue text-brand-ink" },
  under_review: { label: "Under review", tone: "bg-brand-gold text-brand-ink" },
  approved: { label: "Published", tone: "bg-green-100 text-green-700" },
  rejected: { label: "Not approved", tone: "bg-brand-red text-brand-ink" },
};

/** Registration tabs for the My Events page. */
export const registrationTabs: {
  key: string;
  label: string;
  statuses: RegistrationStatus[];
}[] = [
  { key: "upcoming", label: "Upcoming", statuses: ["confirmed", "waitlisted"] },
  {
    key: "pending",
    label: "Pending",
    statuses: ["pending", "pending_review", "pending_payment", "payment_verification", "draft"],
  },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "waitlisted", label: "Waitlisted", statuses: ["waitlisted"] },
  { key: "attended", label: "Attended", statuses: ["checked_in"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "refunded"] },
];
