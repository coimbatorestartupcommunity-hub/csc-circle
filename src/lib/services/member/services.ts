import "server-only";

import { cache } from "react";

/**
 * Member service layer.
 *
 * Three modes (resolved per request by getMemberContext):
 *  - live    → query the signed-in user's own rows from Supabase (RLS-enforced).
 *  - preview → DEMO fixtures (dev only), so the UI can be built/reviewed.
 *  - closed  → `unavailable` (production, unauthenticated).
 *
 * Writes/credentials are never faked. Member numbers, passes and check-ins are
 * issued by the backend only.
 */

import {
  type AuthSession,
  type CommunityReview,
  type ConsultationRequest,
  type EventPass,
  type EventRegistration,
  type MemberCard,
  type MemberProfile,
  type MembershipStatus,
  type RegistrationStatus,
  type ServiceResult,
  isPassEligible,
  ok,
  unavailable,
  fail,
} from "@/types/member";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { membershipDesignationLabel } from "@/lib/member/membership-designation";
import {
  demoCard,
  demoConsultations,
  demoProfile,
  demoRegistrations,
  demoReviews,
  demoUser,
} from "@/lib/services/member/fixtures";

/* --- Row mappers ----------------------------------------------------------- */

type Row = Record<string, unknown>;

function mapProfile(p: Row, m: Row | null): MemberProfile {
  const consent = (p.consent as MemberProfile["consent"]) ?? {
    membershipTerms: false,
    operationalEmail: false,
    marketingEmail: false,
    directoryParticipation: false,
    displayNamePublicly: false,
    displayPhotoPublicly: false,
    communityProfileVisible: false,
    showProfilePhotoToMembers: false,
    showCityToMembers: false,
    showProfessionalRoleToMembers: false,
    showAboutMeToMembers: false,
    showSkillsToMembers: false,
    showStartupAffiliationsToMembers: false,
    shareWhatsappWithMembers: false,
  };
  return {
    id: String(p.id),
    fullName: (p.full_name as string) ?? "",
    displayName: (p.display_name as string) ?? "",
    email: (p.email as string) ?? "",
    whatsapp: (p.whatsapp as string) ?? undefined,
    city: (p.city as string) ?? undefined,
    designationOther: (p.designation_other as string) ?? undefined,
    avatarUrl: (p.avatar_url as string) ?? undefined,
    portraitPath: (p.portrait_path as string) ?? undefined,
    portraitUrl: p.portrait_path ? "/api/member/portrait" : undefined,
    directoryPhotoPath: (p.directory_photo_path as string) ?? undefined,
    directoryPhotoUrl: p.directory_photo_path ? "/api/member/portrait?variant=directory" : undefined,
    portraitPublic: (p.portrait_public as boolean) ?? false,
    designations: (p.designations as MemberProfile["designations"]) ?? [],
    startup: (p.startup as MemberProfile["startup"]) ?? undefined,
    goals: (p.goals as MemberProfile["goals"]) ?? [],
    skills: (p.skills as string[]) ?? [],
    aboutMe: (p.about_me as string) ?? "",
    consent,
    membership: {
      id: String(m?.id ?? "none"),
      status: ((m?.status as MembershipStatus) ?? "not_started"),
      memberNumber: (m?.member_number as string) ?? undefined,
      issuedAt: (m?.issued_at as string) ?? undefined,
      expiresAt: (m?.expires_at as string) ?? undefined,
    },
    profileCompletion: (p.profile_completion as number) ?? 0,
  };
}

function mapRegistration(r: Row, memberName = ""): EventRegistration {
  const ev = (r.events as Row) ?? {};
  return {
    id: String(r.id),
    eventId: String(r.event_id),
    eventTitle: (ev.title as string) ?? "Event",
    eventCoverImage: (ev.cover_image as string) ?? undefined,
    startsAt: (ev.starts_at as string) ?? new Date().toISOString(),
    endsAt: (ev.ends_at as string) ?? new Date().toISOString(),
    venue: (ev.venue as string) ?? undefined,
    location: (ev.location as string) ?? "",
    reference: (r.reference as string) ?? "",
    status: (r.status as RegistrationStatus) ?? "pending",
    payment: (r.payment as EventRegistration["payment"]) ?? "not_required",
    attendance: (r.attendance as EventRegistration["attendance"]) ?? "not_attended",
    memberName: String(r.attendee_name ?? "").trim() || memberName.trim() || String(r.full_name ?? r.member_name ?? "").trim() || "Name unavailable",
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

/* --- Services -------------------------------------------------------------- */

export const memberServices = {
  async auth(): Promise<ServiceResult<AuthSession>> {
    const ctx = await getMemberContext();
    if (ctx.mode === "closed") return unavailable();
    if (ctx.mode === "preview")
      return ok({ user: demoUser, expiresAt: "2099-01-01T00:00:00Z" });
    return ok({
      user: {
        id: ctx.user!.id,
        email: ctx.user!.email ?? "",
        displayName: (ctx.user!.user_metadata?.name as string) ?? undefined,
        avatarUrl: (ctx.user!.user_metadata?.avatar_url as string) ?? (ctx.user!.user_metadata?.picture as string) ?? undefined,
        emailVerified: ctx.user!.emailVerified,
        provider: (ctx.user!.app_metadata?.provider as "google" | "email") ?? "email",
      },
      expiresAt: "",
    });
  },

  getProfile: cache(async function getProfile(): Promise<ServiceResult<MemberProfile>> {
    const ctx = await getMemberContext();
    if (ctx.mode === "closed") return unavailable();
    if (ctx.mode === "preview") return ok(demoProfile);
    try {
      const sb = await createClient();
      const [{ data: profile }, { data: membership }] = await Promise.all([
        sb.from("profiles").select("*").eq("id", ctx.user!.id).maybeSingle(),
        sb.from("memberships").select("*").eq("user_id", ctx.user!.id).maybeSingle(),
      ]);
      if (!profile) return fail("not_found", "Profile not found.");
      return ok(mapProfile(profile as Row, (membership as Row) ?? null));
    } catch {
      return fail("unknown", "Could not load your profile.");
    }
  }),

  getCard: cache(async function getCard(): Promise<ServiceResult<MemberCard>> {
    const ctx = await getMemberContext();
    if (ctx.mode === "closed") return unavailable();
    if (ctx.mode === "preview") return ok(demoCard);
    try {
      const sb = await createClient();
      const [{ data: m }, { data: p }, { data: approvedClaim }] = await Promise.all([
        sb.from("memberships").select("*").eq("user_id", ctx.user!.id).maybeSingle(),
        sb.from("profiles").select("full_name, display_name, portrait_path, designations, designation_other, startup").eq("id", ctx.user!.id).maybeSingle(),
        sb.from("membership_claims").select("designation,designation_other,startup_affiliation").eq("user_id", ctx.user!.id).eq("status", "active").order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const mm = m as Row | null;
      if (!mm || !mm.member_number || !mm.verification_token || mm.status !== "active" || (mm.expires_at && new Date(String(mm.expires_at)).getTime() <= Date.now())) {
        return fail(
          "forbidden",
          "Your membership ID becomes available once your membership is active.",
        );
      }
      const pp = (p as Row) ?? {};
      if (!pp.portrait_path) return fail("forbidden", "Upload a 4:5 profile portrait before using your official CSC digital ID.");
      const designations = (pp.designations as string[]) ?? [];
      const startup = (pp.startup as { name?: string }) ?? {};
      return ok({
        memberNumber: String(mm.member_number),
        fullName: (pp.full_name as string) ?? (pp.display_name as string) ?? "CSC Member",
        designationLabel: membershipDesignationLabel(
          designations,
          approvedClaim?.designation,
          pp.designation_other as string | null,
          approvedClaim?.designation_other,
        ),
        startupName: startup.name || approvedClaim?.startup_affiliation || undefined,
        avatarUrl: "/api/member/portrait",
        status: mm.status as MembershipStatus,
        issuedAt: (mm.issued_at as string) ?? undefined,
        expiresAt: (mm.expires_at as string) ?? undefined,
        verificationToken: String(mm.verification_token ?? ""),
      });
    } catch {
      return fail("unknown", "Could not load your membership card.");
    }
  }),

  listRegistrations: cache(async function listRegistrations(): Promise<ServiceResult<EventRegistration[]>> {
    const ctx = await getMemberContext();
    if (ctx.mode === "closed") return unavailable();
    if (ctx.mode === "preview") return ok(demoRegistrations);
    try {
      const sb = await createClient();
      const [{ data }, { data: profile }] = await Promise.all([
        sb.from("event_registrations")
          .select("*, events(title, cover_image, starts_at, ends_at, venue, location)")
          .eq("user_id", ctx.user!.id)
          .order("created_at", { ascending: false }),
        sb.from("profiles").select("full_name, display_name").eq("id", ctx.user!.id).maybeSingle(),
      ]);
      const metadataName = String(ctx.user!.user_metadata?.full_name ?? ctx.user!.user_metadata?.name ?? "");
      const memberName = String(profile?.full_name ?? "").trim() || String(profile?.display_name ?? "").trim() || metadataName.trim();
      return ok((data ?? []).map((r) => mapRegistration(r as Row, memberName)));
    } catch {
      return fail("unknown", "Could not load your registrations.");
    }
  }),

  async getRegistration(id: string): Promise<ServiceResult<EventRegistration>> {
    const list = await this.listRegistrations();
    if (!list.ok) return list;
    const reg = list.data.find((r) => r.id === id);
    return reg ? ok(reg) : fail("not_found", "Registration not found.");
  },

  async getPass(registrationId: string): Promise<ServiceResult<EventPass>> {
    const regResult = await this.getRegistration(registrationId);
    if (!regResult.ok) return regResult;
    const reg = regResult.data;
    if (!isPassEligible(reg.status)) {
      return fail(
        "forbidden",
        "A pass is only available once a registration is confirmed.",
      );
    }
    const ctx = await getMemberContext();
    let token: string | null = null;
    let email: string | undefined;
    let phone: string | undefined;
    let avatarUrl: string | undefined;
    if (ctx.mode === "preview") token = "DEMO-PASS-NOT-VALID";
    if (ctx.mode === "live") {
      const sb = await createClient();
      const { data: passData } = await sb.from("event_registrations").select("pass_token,payment,user_id,reference,source,source_email,paid_registration_id,source_parent_registration_id").eq("id", reg.id).eq("user_id", ctx.user!.id).maybeSingle();
      if (!passData?.pass_token || !["paid", "not_required"].includes(passData.payment) || new Date(reg.endsAt).getTime() <= Date.now()) return fail("forbidden", "This pass is unavailable or expired.");
      if (!String(reg.memberName).trim() || !String(passData.reference).trim() || !String(reg.location).trim() && !String(reg.venue ?? "").trim()) return fail("forbidden", "A pass requires an attendee name, UID, and event location.");
      reg.reference = passData.reference;
      token = passData.pass_token;

      const metadataRegistrationId = passData.source_parent_registration_id ?? reg.id;
      const [profileResult, paidResult] = await Promise.all([
        sb.from("profiles").select("portrait_path,whatsapp").eq("id", ctx.user!.id).maybeSingle(),
        passData.paid_registration_id
          ? sb.from("paid_event_registrations").select("email,whatsapp").eq("id", passData.paid_registration_id).eq("user_id", ctx.user!.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      // Import metadata is admin-only under RLS. The pass row above was first
      // verified through the attendee's own session, so scope this service-role
      // lookup to that exact linked registration and expose only contact data.
      let importMetadata: Record<string, unknown> | null = null;
      if (passData.source === "google_form_import" || passData.source_parent_registration_id) {
        try {
          const admin = createAdminClient();
          const { data } = await admin.from("event_registration_import_metadata").select("metadata").eq("registration_id", metadataRegistrationId).maybeSingle();
          importMetadata = data?.metadata as Record<string, unknown> | null;
        } catch { /* The pass still works if optional imported contact metadata is unavailable. */ }
      }
      const googlePicture = ctx.user!.user_metadata?.avatar_url ?? ctx.user!.user_metadata?.picture;
      email = passData.source_email ?? paidResult.data?.email ?? ctx.user!.email ?? undefined;
      phone = paidResult.data?.whatsapp ?? (typeof importMetadata?.whatsapp === "string" ? importMetadata.whatsapp : undefined) ?? profileResult.data?.whatsapp ?? undefined;
      avatarUrl = profileResult.data?.portrait_path
        ? "/api/member/portrait"
        : (typeof googlePicture === "string" && googlePicture ? "/api/member/avatar" : undefined);
    }
    if (!token) return unavailable();
    return ok({
      registrationId: reg.id,
      eventTitle: reg.eventTitle,
      startsAt: reg.startsAt,
      endsAt: reg.endsAt,
      venue: reg.venue,
      location: reg.location,
      memberName: reg.memberName,
      avatarUrl,
      email,
      phone,
      reference: reg.reference,
      status: reg.status,
      verificationToken: token,
    });
  },

  listConsultations: cache(async function listConsultations(): Promise<ServiceResult<ConsultationRequest[]>> {
    const ctx = await getMemberContext();
    if (ctx.mode === "closed") return unavailable();
    if (ctx.mode === "preview") return ok(demoConsultations);
    try {
      const sb = await createClient();
      const { data } = await sb
        .from("consultations")
        .select("*")
        .eq("user_id", ctx.user!.id)
        .order("created_at", { ascending: false });
      return ok(
        (data ?? []).map((c) => {
          const r = c as Row;
          return {
            id: String(r.id),
            title: (r.title as string) ?? "Consultation",
            submittedAt: (r.created_at as string) ?? "",
            goal: (r.goal as string) ?? "",
            assignedRep: (r.assigned_rep as string) ?? undefined,
            status: (r.status as ConsultationRequest["status"]) ?? "submitted",
            scheduledAt: (r.scheduled_at as string) ?? undefined,
            mode: (r.mode as ConsultationRequest["mode"]) ?? undefined,
            memberNotes: (r.member_notes as string) ?? undefined,
          };
        }),
      );
    } catch {
      return fail("unknown", "Could not load your consultations.");
    }
  }),

  listReviews: cache(async function listReviews(): Promise<ServiceResult<CommunityReview[]>> {
    const ctx = await getMemberContext();
    if (ctx.mode === "closed") return unavailable();
    if (ctx.mode === "preview") return ok(demoReviews);
    try {
      const sb = await createClient();
      const { data } = await sb
        .from("reviews")
        .select("*, events(title), collaborations(title)")
        .eq("user_id", ctx.user!.id)
        .order("created_at", { ascending: false });
      return ok(
        (data ?? []).map((v) => {
          const r = v as Row;
          const ev = r.events as { title?: string } | null;
          const col = r.collaborations as { title?: string } | null;
          return {
            id: String(r.id),
            rating: (r.rating as number) ?? 0,
            review: (r.review as string) ?? "",
            createdAt: (r.created_at as string) ?? "",
            updatedAt: (r.updated_at as string) ?? undefined,
            moderation: (r.moderation as CommunityReview["moderation"]) ?? "submitted",
            kind: (r.kind as CommunityReview["kind"]) ?? "general",
            eventId: (r.event_id as string) ?? undefined,
            eventTitle: ev?.title,
            collaborationId: (r.collaboration_id as string) ?? undefined,
            collaborationTitle: col?.title,
          };
        }),
      );
    } catch {
      return fail("unknown", "Could not load your reviews.");
    }
  }),
};
