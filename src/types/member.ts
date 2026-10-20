/**
 * Member-portal domain types (Phase 3).
 *
 * These are backend-agnostic contracts. Phase 1 implements them against
 * Supabase (Auth + RLS). Statuses are typed unions with documented legal
 * transitions — never raw strings sprinkled through the UI.
 *
 * SECURITY: nothing here, and nothing built on it, treats a client-held value
 * (email, member id, localStorage, URL param) as proof of authentication. The
 * production member area is gated server-side (see lib/services/member/gate).
 */

/* -------------------------------------------------------------------------- */
/*  Auth                                                                      */
/* -------------------------------------------------------------------------- */

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  portraitUrl?: string;
  portraitPath?: string;
  portraitPublic?: boolean;
  emailVerified: boolean;
  provider: "google" | "email";
}

export interface AuthSession {
  user: AuthenticatedUser;
  expiresAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Membership                                                                */
/* -------------------------------------------------------------------------- */

export type MembershipStatus =
  | "not_started"
  | "profile_incomplete"
  | "claim_submitted"
  | "pending_verification"
  | "approved"
  | "active"
  | "rejected"
  | "suspended"
  | "revoked"
  | "expired";

/** Legal forward transitions for a membership. The server is the authority. */
export const membershipTransitions: Record<MembershipStatus, MembershipStatus[]> = {
  not_started: ["profile_incomplete", "claim_submitted"],
  profile_incomplete: ["claim_submitted"],
  claim_submitted: ["pending_verification", "rejected"],
  pending_verification: ["approved", "rejected"],
  approved: ["active"],
  active: ["suspended", "revoked", "expired"],
  rejected: ["claim_submitted"],
  suspended: ["active", "revoked"],
  revoked: [],
  expired: ["active"],
};

export function canTransitionMembership(
  from: MembershipStatus,
  to: MembershipStatus,
): boolean {
  return membershipTransitions[from]?.includes(to) ?? false;
}

export interface Membership {
  id: string;
  status: MembershipStatus;
  /** Official member number, e.g. CSC-2026-000001 — issued by the backend only. */
  memberNumber?: string;
  issuedAt?: string;
  expiresAt?: string;
}

export type MemberDesignation =
  | "startup_founder"
  | "co_founder"
  | "team_member"
  | "developer"
  | "student_entrepreneur"
  | "designer"
  | "marketing"
  | "investor"
  | "mentor"
  | "aspiring_entrepreneur"
  | "other";

export interface MembershipClaim {
  id?: string;
  fullName: string;
  linkedAccountEmail: string;
  applicantType: "existing_member" | "new_applicant";
  reference?: string;
  whatsapp: string;
  designation: MemberDesignation;
  startupAffiliation?: string;
  declarationAccurate: boolean;
  submittedAt?: string;
}

/* -------------------------------------------------------------------------- */
/*  Member profile                                                            */
/* -------------------------------------------------------------------------- */

export type CommunityGoal =
  | "networking"
  | "technical_collaboration"
  | "finding_co_founder"
  | "mentorship"
  | "product_development"
  | "marketing"
  | "funding_connections"
  | "hiring"
  | "startup_learning"
  | "community_participation";

export interface MemberProfile {
  id: string;
  fullName: string;
  displayName: string;
  email: string;
  whatsapp?: string;
  city?: string;
  avatarUrl?: string;
  /** Private, server-validated 4:5 portrait used by the profile and eligible ID card. */
  portraitPath?: string;
  portraitUrl?: string;
  /** Private 4:3 crop used only when directory name/photo publication is consented. */
  directoryPhotoPath?: string;
  directoryPhotoUrl?: string;
  portraitPublic?: boolean;
  designations: MemberDesignation[];
  startup?: {
    name?: string;
    website?: string;
    industry?: string;
    stage?: string;
    role?: string;
    description?: string;
    logoUrl?: string;
    challenges?: string;
  };
  goals: CommunityGoal[];
  skills?: string[];
  /** Consent flags, each independently recorded by the backend. */
  consent: {
    membershipTerms: boolean;
    operationalEmail: boolean;
    marketingEmail: boolean;
    directoryParticipation: boolean;
    displayNamePublicly: boolean;
    displayPhotoPublicly: boolean;
  };
  membership: Membership;
  profileCompletion: number; // 0–100
}

/** The data shown on the virtual membership ID card. */
export interface MemberCard {
  memberNumber: string;
  fullName: string;
  designationLabel: string;
  startupName?: string;
  avatarUrl?: string;
  status: MembershipStatus;
  issuedAt: string;
  expiresAt?: string;
  /** Opaque verification token — resolved server-side. Never raw PII. */
  verificationToken: string;
}

/* -------------------------------------------------------------------------- */
/*  Events: registrations & passes                                            */
/* -------------------------------------------------------------------------- */

export type RegistrationStatus =
  | "draft"
  | "pending"
  | "pending_review"
  | "pending_payment"
  | "payment_verification"
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "refunded"
  | "checked_in";

export type AttendanceStatus = "not_attended" | "checked_in" | "no_show";
export type PaymentStatus = "not_required" | "pending" | "paid" | "refunded";

export interface EventRegistration {
  id: string;
  eventId: string;
  eventTitle: string;
  eventCoverImage?: string;
  startsAt: string;
  endsAt: string;
  venue?: string;
  location: string;
  reference: string;
  status: RegistrationStatus;
  payment: PaymentStatus;
  attendance: AttendanceStatus;
  memberName: string;
  createdAt: string;
}

/** Only a confirmed/checked-in registration is eligible for a valid pass. */
export const passEligibleStatuses: RegistrationStatus[] = ["confirmed", "checked_in"];

export function isPassEligible(status: RegistrationStatus): boolean {
  return passEligibleStatuses.includes(status);
}

export interface EventPass {
  registrationId: string;
  eventTitle: string;
  startsAt: string;
  endsAt: string;
  venue?: string;
  location: string;
  memberName: string;
  reference: string;
  status: RegistrationStatus;
  /** Opaque, event-scoped verification token — resolved server-side. */
  verificationToken: string;
}

/* -------------------------------------------------------------------------- */
/*  Consultations                                                             */
/* -------------------------------------------------------------------------- */

export type ConsultationStatus =
  | "submitted"
  | "under_review"
  | "more_info_required"
  | "approved"
  | "scheduled"
  | "completed"
  | "declined"
  | "cancelled";

export interface ConsultationRequest {
  id: string;
  title: string;
  submittedAt: string;
  goal: string;
  assignedRep?: string;
  status: ConsultationStatus;
  scheduledAt?: string;
  mode?: "online" | "in_person";
  memberNotes?: string;
}

/* -------------------------------------------------------------------------- */
/*  Reviews                                                                   */
/* -------------------------------------------------------------------------- */

export type ReviewModerationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";

export interface CommunityReview {
  id: string;
  rating: number;
  review: string;
  createdAt: string;
  updatedAt?: string;
  moderation: ReviewModerationStatus;
  /** General community review vs. event-specific (future). */
  kind: "general" | "event";
  eventId?: string;
}

/* -------------------------------------------------------------------------- */
/*  Service result envelope                                                   */
/* -------------------------------------------------------------------------- */

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError };

export interface ServiceError {
  code: ServiceErrorCode;
  message: string;
}

export type ServiceErrorCode =
  | "unavailable" // backend not yet connected (Phase 1)
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "unknown";

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function fail(code: ServiceErrorCode, message: string): ServiceResult<never> {
  return { ok: false, error: { code, message } };
}

/** Standard "backend not connected yet" result used before Phase 1. */
export function unavailable(
  message = "This feature activates when secure backend services are connected (Phase 1).",
): ServiceResult<never> {
  return fail("unavailable", message);
}
