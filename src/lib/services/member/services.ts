import "server-only";

/**
 * Member service layer — typed contracts + a development adapter.
 *
 * Interfaces define the Phase 1 backend contract (Supabase). The exported
 * `memberServices` is the DEV adapter: it returns DEMO fixtures only while the
 * server-gated preview is enabled, and `unavailable` otherwise. It NEVER
 * returns a confirmed write, a real credential, or another member's data.
 */

import {
  type AuthSession,
  type CommunityReview,
  type ConsultationRequest,
  type EventPass,
  type EventRegistration,
  type MemberCard,
  type MemberProfile,
  type ServiceResult,
  isPassEligible,
  ok,
  unavailable,
  fail,
} from "@/types/member";
import { isMemberPreviewEnabled } from "@/lib/services/member/gate";
import {
  demoCard,
  demoConsultations,
  demoProfile,
  demoRegistrations,
  demoReviews,
  demoUser,
} from "@/lib/services/member/fixtures";

/* --- Phase 1 contract interfaces (implemented against Supabase later) ------ */

export interface AuthService {
  getSession(): Promise<ServiceResult<AuthSession>>;
}
export interface MemberProfileService {
  get(): Promise<ServiceResult<MemberProfile>>;
}
export interface MembershipCardService {
  getCard(): Promise<ServiceResult<MemberCard>>;
}
export interface EventRegistrationService {
  list(): Promise<ServiceResult<EventRegistration[]>>;
  get(id: string): Promise<ServiceResult<EventRegistration>>;
}
export interface EventPassService {
  getForRegistration(id: string): Promise<ServiceResult<EventPass>>;
}
export interface ConsultationService {
  list(): Promise<ServiceResult<ConsultationRequest[]>>;
}
export interface ReviewService {
  listMine(): Promise<ServiceResult<CommunityReview[]>>;
}

/* --- Development adapter ---------------------------------------------------- */

function preview<T>(data: T): ServiceResult<T> {
  return isMemberPreviewEnabled() ? ok(data) : unavailable();
}

export const memberServices = {
  auth: {
    async getSession() {
      return preview<AuthSession>({
        user: demoUser,
        expiresAt: "2099-01-01T00:00:00Z",
      });
    },
  } satisfies AuthService,

  profile: {
    async get() {
      return preview(demoProfile);
    },
  } satisfies MemberProfileService,

  card: {
    async getCard() {
      return preview(demoCard);
    },
  } satisfies MembershipCardService,

  registrations: {
    async list() {
      return preview(demoRegistrations);
    },
    async get(id: string) {
      if (!isMemberPreviewEnabled()) return unavailable();
      const reg = demoRegistrations.find((r) => r.id === id);
      return reg ? ok(reg) : fail("not_found", "Registration not found.");
    },
  } satisfies EventRegistrationService,

  passes: {
    async getForRegistration(id: string) {
      if (!isMemberPreviewEnabled()) return unavailable();
      const reg = demoRegistrations.find((r) => r.id === id);
      if (!reg) return fail("not_found", "Registration not found.");
      // A pending/unpaid/cancelled registration must NOT yield a valid pass.
      if (!isPassEligible(reg.status)) {
        return fail(
          "forbidden",
          "A pass is only available once a registration is confirmed.",
        );
      }
      return ok<EventPass>({
        registrationId: reg.id,
        eventTitle: reg.eventTitle,
        startsAt: reg.startsAt,
        endsAt: reg.endsAt,
        venue: reg.venue,
        location: reg.location,
        memberName: reg.memberName,
        reference: reg.reference,
        status: reg.status,
        verificationToken: `demo.pass.v1.${reg.reference}.PREVIEW-NOT-VALID`,
      });
    },
  } satisfies EventPassService,

  consultations: {
    async list() {
      return preview(demoConsultations);
    },
  } satisfies ConsultationService,

  reviews: {
    async listMine() {
      return preview(demoReviews);
    },
  } satisfies ReviewService,
};
