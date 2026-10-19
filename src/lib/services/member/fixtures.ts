/**
 * DEMO member-portal fixtures — NOT REAL MEMBER DATA.
 *
 * Used only to preview the member UI while the backend is not connected. Served
 * only through the server-gated preview; never presented as a real credential,
 * membership, pass or check-in. Phase 1 replaces these with Supabase queries.
 */

import type {
  AuthenticatedUser,
  CommunityReview,
  ConsultationRequest,
  EventRegistration,
  MemberCard,
  MemberProfile,
} from "@/types/member";

export const demoUser: AuthenticatedUser = {
  id: "demo-user",
  email: "demo.member@example.com",
  displayName: "Demo Member",
  emailVerified: true,
  provider: "google",
};

export const demoProfile: MemberProfile = {
  id: "demo-member",
  fullName: "Demo Member",
  displayName: "Demo Member",
  email: "demo.member@example.com",
  whatsapp: "+91 90000 00000",
  city: "Coimbatore",
  designations: ["startup_founder", "developer"],
  startup: {
    name: "Demo Startup (sample)",
    website: "https://example.com",
    industry: "SaaS",
    stage: "Early",
    role: "Founder",
    description: "A placeholder startup used to preview the member profile.",
  },
  goals: ["networking", "technical_collaboration", "finding_co_founder"],
  skills: ["Product", "Frontend", "Go-to-market"],
  consent: {
    membershipTerms: true,
    operationalEmail: true,
    marketingEmail: false,
    directoryParticipation: true,
    displayNamePublicly: true,
    displayPhotoPublicly: false,
  },
  membership: {
    id: "demo-membership",
    status: "active",
    memberNumber: "CSC-2026-000001",
    issuedAt: "2026-10-01T00:00:00+05:30",
  },
  profileCompletion: 85,
};

export const demoCard: MemberCard = {
  memberNumber: "CSC-2026-000001",
  fullName: "Demo Member",
  designationLabel: "Startup Founder",
  startupName: "Demo Startup (sample)",
  status: "active",
  issuedAt: "2026-10-01T00:00:00+05:30",
  // Opaque DEMO token — contains no PII. A real token is minted server-side.
  verificationToken: "demo.mbr.v1.PREVIEW-NOT-VALID",
};

const refDate = new Date("2026-12-01T00:00:00+05:30");
const at = (days: number, hour: number) => {
  const d = new Date(refDate);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const demoRegistrations: EventRegistration[] = [
  {
    id: "demo-reg-1",
    eventId: "fx-event-1",
    eventTitle: "Sample Founder Meetup",
    startsAt: at(14, 18),
    endsAt: at(14, 20),
    venue: "Sample Venue (demo)",
    location: "Coimbatore",
    reference: "CSC-REG-DEMO-0001",
    status: "confirmed",
    payment: "not_required",
    attendance: "not_attended",
    memberName: "Demo Member",
    createdAt: at(-2, 10),
  },
  {
    id: "demo-reg-2",
    eventId: "fx-event-2",
    eventTitle: "Sample Pitch Session",
    startsAt: at(28, 17),
    endsAt: at(28, 19),
    venue: "Sample Venue (demo)",
    location: "Coimbatore",
    reference: "CSC-REG-DEMO-0002",
    status: "pending_review",
    payment: "not_required",
    attendance: "not_attended",
    memberName: "Demo Member",
    createdAt: at(-1, 12),
  },
  {
    id: "demo-reg-3",
    eventId: "fx-event-3",
    eventTitle: "Sample Tech Workshop",
    startsAt: at(-20, 10),
    endsAt: at(-20, 13),
    venue: "Sample Venue (demo)",
    location: "Coimbatore",
    reference: "CSC-REG-DEMO-0003",
    status: "checked_in",
    payment: "not_required",
    attendance: "checked_in",
    memberName: "Demo Member",
    createdAt: at(-30, 9),
  },
  {
    id: "demo-reg-4",
    eventId: "fx-event-4",
    eventTitle: "Sample Networking Night",
    startsAt: at(40, 19),
    endsAt: at(40, 21),
    venue: "Sample Venue (demo)",
    location: "Coimbatore",
    reference: "CSC-REG-DEMO-0004",
    status: "waitlisted",
    payment: "not_required",
    attendance: "not_attended",
    memberName: "Demo Member",
    createdAt: at(-1, 15),
  },
];

export const demoConsultations: ConsultationRequest[] = [
  {
    id: "demo-con-1",
    title: "Go-to-market guidance",
    submittedAt: at(-10, 11),
    goal: "Marketing Support",
    assignedRep: "CSC Team (demo)",
    status: "scheduled",
    scheduledAt: at(5, 16),
    mode: "online",
    memberNotes: "Demo note: initial call to review positioning.",
  },
  {
    id: "demo-con-2",
    title: "Technical architecture review",
    submittedAt: at(-3, 9),
    goal: "Technical Support",
    status: "under_review",
  },
];

export const demoReviews: CommunityReview[] = [
  {
    id: "demo-rev-1",
    rating: 5,
    review:
      "Demo review — placeholder text showing an approved community review in the member area.",
    createdAt: at(-15, 10),
    moderation: "approved",
    kind: "general",
  },
];
