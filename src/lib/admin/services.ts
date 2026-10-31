import "server-only";
import type { User } from "@supabase/supabase-js";

/**
 * Admin service layer. Every method is permission-checked against the request's
 * AdminContext. preview → DEMO fixtures; live → real Supabase reads; forbidden
 * or closed → an error result. The backend (RLS + privileged ops) is the real
 * authority in Phase 1; this layer never performs privileged writes from the
 * browser and never fabricates an approval.
 */

import {
  type ServiceResult,
  ok,
  fail,
  unavailable,
} from "@/types/member";
import type {
  AdminClaimRow,
  AdminConsultationRow,
  AdminDashboardData,
  AdminEventRow,
  AdminMemberDetails,
  AdminMemberRow,
  AdminPaymentRow,
  AdminReviewRow,
  AdminStartupRow,
  AuditLog,
  ContentBlock,
  MediaAsset,
  NotificationRecord,
} from "@/types/admin";
import { getAdminContext, type AdminContext } from "@/lib/admin/gate";
import type { Permission } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificationIssueLabel } from "@/lib/admin/status-meta";
import {
  demoAudit,
  demoClaims,
  demoConsultations,
  demoContent,
  demoDashboard,
  demoEvents,
  demoMedia,
  demoMembers,
  demoNotifications,
  demoPayments,
  demoRegistrations,
  demoReviews,
  demoStartups,
} from "@/lib/admin/fixtures";
import type { EventRegistration } from "@/types/member";

type Row = Record<string, unknown>;

async function guard<T>(
  permission: Permission,
  previewData: T,
  liveFn: (ctx: AdminContext) => Promise<ServiceResult<T>>,
): Promise<ServiceResult<T>> {
  const ctx = await getAdminContext();
  if (ctx.mode === "closed") return unavailable("Sign in as an administrator.");
  if (ctx.mode === "forbidden")
    return fail("forbidden", "You don't have administrator access.");
  if (!ctx.permissions.has(permission))
    return fail("forbidden", "You don't have permission for this.");
  if (ctx.mode === "preview") return ok(previewData);
  try {
    return await liveFn(ctx);
  } catch {
    return fail("unknown", "Could not load this data.");
  }
}

export const adminServices = {
  getDashboard(): Promise<ServiceResult<AdminDashboardData>> {
    return guard("members.read", demoDashboard, async (ctx) => {
      const sb = await createClient();
      const head = { count: "exact" as const, head: true };
      const n = (p: { count: number | null }) => p.count ?? 0;

      const [
        accounts,
        active,
        claims,
        events,
        rsvps,
        confirmed,
        consults,
        reviews,
        startups,
      ] = await Promise.all([
        sb.from("profiles").select("*", head),
        sb.from("memberships").select("*", head).eq("status", "active"),
        sb.from("membership_claims").select("*", head).in("status", ["claim_submitted", "pending_verification"]),
        sb.from("events").select("*", head).eq("status", "published"),
        sb.from("rsvp_submissions").select("*", head).eq("status", "pending"),
        sb.from("rsvp_submissions").select("*", head).eq("status", "confirmed"),
        sb.from("consultation_submissions").select("*", head).in("status", ["submitted", "under_review"]),
        sb.from("reviews").select("*", head).eq("moderation", "approved"),
        ctx.permissions.has("directory.manage")
          ? sb.from("directory_startups").select("*", head).eq("status", "pending")
          : Promise.resolve({ count: 0, error: null }),
      ]);

      if ([accounts, active, claims, events, rsvps, confirmed, consults, reviews, startups].some(r => r.error)) return fail("unknown", "Dashboard data could not be loaded.");
      const metrics = [
        { key: "accounts", label: "Website accounts", value: n(accounts), href: "/admin/members" },
        { key: "active", label: "Active memberships", value: n(active), href: "/admin/members" },
        { key: "claims", label: "Pending claims", value: n(claims), href: "/admin/membership-claims" },
        { key: "events", label: "Published events", value: n(events), href: "/admin/events" },
        { key: "rsvps", label: "Pending RSVPs", value: n(rsvps), href: "/admin/registrations" },
        { key: "confirmed", label: "Confirmed registrations", value: n(confirmed), href: "/admin/registrations" },
        { key: "consults", label: "Pending consultations", value: n(consults), href: "/admin/consultations" },
        { key: "payments", label: "Payments to verify", value: 0, href: "/admin/payments" },
        { key: "reviews", label: "Approved reviews", value: n(reviews), href: "/admin/reviews" },
        { key: "attendance", label: "Total check-ins", value: 0, href: "/admin/attendance" },
      ];
      if (ctx.permissions.has("directory.manage")) {
        metrics.splice(3, 0, { key: "startups", label: "Startup submissions to review", value: n(startups), href: "/admin/startups" });
      }

      return ok<AdminDashboardData>({
        metrics,
        pendingStartupCount: ctx.permissions.has("directory.manage") ? n(startups) : undefined,
        recentClaims: [],
        upcomingEvents: [],
        pendingRegistrations: [],
        recentConsultations: [],
        reviewQueue: [],
        recentAudit: [],
        ratingDistribution: demoDashboard.ratingDistribution.map((r) => ({ ...r, count: 0 })),
        registrationsByEvent: [],
      });
    });
  },

  listMembers(): Promise<ServiceResult<AdminMemberRow[]>> {
    return guard("members.read", demoMembers, async () => {
      const sb = await createClient();
      const { data: initialProfiles, error: profileError } = await sb
        .from("profiles")
        .select("id, full_name, display_name, email, whatsapp, designations, startup, created_at, updated_at, memberships(status, member_number)")
        .order("created_at", { ascending: false });
      if (profileError) return fail("unknown", "Member accounts could not be loaded.");
      let data = initialProfiles ?? [];
      const authEmails = new Map<string, string>();
      try {
        const admin = createAdminClient();
        const authUsers: User[] = [];
        for (let page = 1; page <= 100; page += 1) {
          const { data: authPage, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) return fail("unknown", "Authenticated account inventory is temporarily unavailable.");
          authUsers.push(...(authPage?.users ?? []));
          if (!authPage?.users.length || authPage.users.length < 1000) break;
        }
        for (const user of authUsers) if (user.email) authEmails.set(user.id, user.email);
        const profileIds = new Set(data.map((profile) => String(profile.id)));
        const missingUsers = authUsers.filter((user) => !profileIds.has(user.id));
        if (missingUsers.length) {
          const profileRows = missingUsers.map((user) => {
            const metadata = user.user_metadata ?? {};
            const name = typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : null;
            const avatar = typeof metadata.avatar_url === "string" ? metadata.avatar_url : typeof metadata.picture === "string" ? metadata.picture : null;
            return { id: user.id, full_name: name, display_name: name, email: user.email ?? null, avatar_url: avatar };
          });
          const { error: reconcileError } = await admin.from("profiles").insert(profileRows);
          if (reconcileError && reconcileError.code !== "23505") return fail("unknown", "Missing member profiles could not be reconciled safely.");
          const { data: memberships } = await admin.from("memberships").select("user_id").in("user_id", missingUsers.map((user) => user.id));
          const membershipIds = new Set((memberships ?? []).map((membership) => membership.user_id));
          const missingMemberships = missingUsers.filter((user) => !membershipIds.has(user.id)).map((user) => ({ user_id: user.id, status: "not_started" as const }));
          if (missingMemberships.length) {
            const { error: membershipError } = await admin.from("memberships").insert(missingMemberships);
            if (membershipError && membershipError.code !== "23505") return fail("unknown", "Missing membership status records could not be reconciled safely.");
          }
          const refreshed = await sb.from("profiles").select("id, full_name, display_name, email, whatsapp, designations, startup, created_at, updated_at, memberships(status, member_number)").order("created_at", { ascending: false });
          if (refreshed.error) return fail("unknown", "Reconciled member profiles could not be reloaded.");
          data = refreshed.data ?? [];
        }
      } catch {
        return fail("unknown", "Authenticated account inventory is temporarily unavailable.");
      }
      const rows: AdminMemberRow[] = (data ?? []).map((p) => {
        const r = p as Row;
        const m = (Array.isArray(r.memberships) ? r.memberships[0] : r.memberships) as Row | undefined;
        const startup = r.startup as { name?: string } | null;
        const desigs = (r.designations as string[]) ?? [];
        return {
          id: String(r.id),
          memberNumber: (m?.member_number as string) ?? undefined,
          fullName: (r.full_name as string) ?? (r.display_name as string) ?? "—",
          email: (r.email as string) || authEmails.get(String(r.id)) || "Email unavailable",
          whatsapp: (r.whatsapp as string) ?? undefined,
          designation: desigs[0],
          startup: startup?.name,
          status: ((m?.status as AdminMemberRow["status"]) ?? "not_started"),
          joinedAt: (r.created_at as string) ?? "",
          updatedAt: (r.updated_at as string) ?? "",
        };
      });
      return ok(rows);
    });
  },

  getMember(id: string): Promise<ServiceResult<AdminMemberRow>> {
    return guard<AdminMemberRow>(
      "members.read",
      demoMembers.find((m) => m.id === id) ?? demoMembers[0],
      async () => {
        const list = await this.listMembers();
        if (!list.ok) return list;
        const m = list.data.find((x) => x.id === id);
        return m ? ok(m) : fail("not_found", "Member not found.");
      },
    );
  },

  getMemberDetails(id: string): Promise<ServiceResult<AdminMemberDetails>> {
    return guard<AdminMemberDetails>("members.read", {
      claims: [], startups: [], registrations: [], consultations: [], audit: [],
    }, async (context) => {
      const sb = await createClient();
      const [claimsResult, startupsResult, registrationsResult, consultationsResult, profileResult] = await Promise.all([
        sb.from("membership_claims").select("id,status,submitted_at,applicant_type,startup_affiliation").eq("user_id", id).order("submitted_at", { ascending: false }),
        sb.from("directory_startups").select("id,name,slug,industry,status,updated_at").eq("user_id", id).order("updated_at", { ascending: false }),
        sb.from("event_registrations").select("id,event_id,reference,status,payment,attendance,created_at").eq("user_id", id).order("created_at", { ascending: false }),
        sb.from("consultations").select("id,title,status,scheduled_at,created_at").eq("user_id", id).order("created_at", { ascending: false }),
        sb.from("profiles").select("portrait_path,profile_completion,email").eq("id", id).maybeSingle(),
      ]);
      if (claimsResult.error || startupsResult.error || registrationsResult.error || consultationsResult.error || profileResult.error) {
        return fail("unknown", "Member history could not be loaded.");
      }

      const registrations = registrationsResult.data ?? [];
      const eventIds = [...new Set(registrations.map((row) => row.event_id))];
      const { data: events, error: eventError } = eventIds.length
        ? await sb.from("events").select("id,title,starts_at").in("id", eventIds)
        : { data: [], error: null };
      if (eventError) return fail("unknown", "Event history could not be loaded.");
      const eventById = new Map((events ?? []).map((event) => [event.id, event]));
      const registrationIds = registrations.map((row) => row.id);
      const { data: checkins, error: checkinError } = registrationIds.length
        ? await sb.from("attendance_checkins").select("registration_id,checked_in_at").in("registration_id", registrationIds)
        : { data: [], error: null };
      if (checkinError) return fail("unknown", "Event attendance history could not be loaded.");
      const checkinByRegistration = new Map((checkins ?? []).map((row) => [row.registration_id, row.checked_in_at]));

      const profile = profileResult.data;
      let portraitUrl: string | undefined;
      if (profile?.portrait_path) {
        const { data } = await createAdminClient().storage.from("member-portraits").createSignedUrl(profile.portrait_path, 5 * 60);
        portraitUrl = data?.signedUrl;
      }

      const admin = createAdminClient();
      const authResult = await admin.auth.admin.getUserById(id);
      const consultations = (consultationsResult.data ?? []).map((row) => ({
        id: row.id, title: row.title, status: row.status,
        scheduledAt: row.scheduled_at ?? undefined, submittedAt: row.created_at,
      }));

      // Legacy website requests are keyed by contact email rather than Auth
      // UUID. Match only this member's stored account email, and only after the
      // role check; never expose the global consultation queue here.
      if (context.permissions.has("consultations.manage") && (profile?.email || authResult.data.user?.email)) {
        const { data: legacyRows, error } = await admin.from("consultation_submissions")
          .select("id,challenge,goal,status,scheduled_at,created_at")
          .eq("email", profile?.email || authResult.data.user!.email!)
          .order("created_at", { ascending: false });
        if (error) return fail("unknown", "Consultation history could not be loaded.");
        for (const row of legacyRows ?? []) consultations.push({
          id: row.id,
          title: row.goal || row.challenge || "Consultation request",
          status: row.status,
          scheduledAt: row.scheduled_at ?? undefined,
          submittedAt: row.created_at,
        });
      }

      let audit: AdminMemberDetails["audit"] = [];
      if (context.permissions.has("audit.read")) {
        const { data: auditRows, error } = await sb.from("audit_logs")
          .select("action,actor_role,target_type,created_at")
          .eq("target_id", id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) return fail("unknown", "Member audit history could not be loaded.");
        audit = (auditRows ?? []).map((row) => ({ action: row.action, actorRole: row.actor_role ?? undefined, targetType: row.target_type ?? undefined, createdAt: row.created_at }));
      }

      return ok({
        portraitUrl,
        profileCompletion: profile?.profile_completion ?? undefined,
        lastSignInAt: authResult.data.user?.last_sign_in_at ?? undefined,
        claims: (claimsResult.data ?? []).map((row) => ({ id: row.id, status: row.status, submittedAt: row.submitted_at, applicantType: row.applicant_type, startup: row.startup_affiliation ?? undefined })),
        startups: (startupsResult.data ?? []).map((row) => ({ id: row.id, name: row.name, slug: row.slug, industry: row.industry, status: row.status, updatedAt: row.updated_at })),
        registrations: registrations.map((row) => {
          const event = eventById.get(row.event_id);
          return { id: row.id, eventTitle: event?.title ?? "Event", startsAt: event?.starts_at ?? "", reference: row.reference, status: row.status, payment: row.payment, attendance: row.attendance, checkedInAt: checkinByRegistration.get(row.id) ?? undefined, createdAt: row.created_at };
        }),
        consultations: consultations.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
        audit,
      });
    });
  },

  listClaims(): Promise<ServiceResult<AdminClaimRow[]>> {
    return guard("members.approve", demoClaims, async () => {
      const sb = await createClient();
      const { data } = await sb
        .from("membership_claims")
        .select("*")
        .order("submitted_at", { ascending: false });
      const rows: AdminClaimRow[] = (data ?? []).map((c) => {
        const r = c as Row;
        return {
          id: String(r.id),
          reference: `CLM-${String(r.id).slice(0, 8)}`,
          applicantName: (r.full_name as string) ?? "—",
          email: (r.linked_account_email as string) ?? undefined,
          whatsapp: (r.whatsapp as string) ?? undefined,
          applicantType: (r.applicant_type as AdminClaimRow["applicantType"]) ?? "new_applicant",
          designation: r.designation === "other" && typeof r.designation_other === "string"
            ? r.designation_other
            : (r.designation as string) ?? undefined,
          submittedAt: (r.submitted_at as string) ?? "",
          startup: (r.startup_affiliation as string) ?? undefined,
          declarationAccurate: Boolean(r.declaration_accurate),
          status: (r.status as AdminClaimRow["status"]) ?? "claim_submitted",
        };
      });
      return ok(rows);
    });
  },

  listStartups(): Promise<ServiceResult<AdminStartupRow[]>> {
    return guard("directory.manage", demoStartups, async () => {
      const sb = await createClient();
      const { data, error } = await sb.from("directory_startups").select("*").order("updated_at", { ascending: false });
      if (error) return fail("unknown", "Startup submissions could not be loaded.");
      const adminDb = createAdminClient();
      const ids = (data ?? []).map((row) => row.id);
      const { data: privateRows } = ids.length ? await adminDb.from("directory_startup_private_details").select("startup_id,details").in("startup_id", ids) : { data: [] };
      const privateById = new Map((privateRows ?? []).map((row) => [row.startup_id, row.details as Record<string, unknown>]));
      const rows: AdminStartupRow[] = (data ?? []).map((s) => {
        const r = s as Row;
        const founder = r.founder as { name?: string } | null;
        const details = (r.details && typeof r.details === "object" ? r.details : {}) as Record<string, unknown>;
        return {
          id: String(r.id),
          name: (r.name as string) ?? "—",
          slug: (r.slug as string) ?? "",
          founder: founder?.name ?? "—",
          industry: (r.industry as string) ?? "other",
          description: (r.description as string) ?? "",
          publicationConsent: r.publication_consent === true,
          publicationConsentAt: (r.publication_consent_at as string) ?? undefined,
          website: (r.website as string) ?? undefined,
          collaboration: (r.collaboration as string[]) ?? [],
          status: (r.status as AdminStartupRow["status"]) ?? "draft",
          submittedAt: (r.created_at as string) ?? "",
          updatedAt: (r.updated_at as string) ?? "",
          details,
          privateDetails: privateById.get(String(r.id)) ?? {},
          directoryImagePath: (r.directory_image_path as string) ?? undefined,
          logoPath: (r.logo_url as string) ?? undefined,
          city: typeof details.city === "string" ? details.city : undefined,
        };
      });
      return ok(rows);
    });
  },

  getStartup(id: string): Promise<ServiceResult<AdminStartupRow>> {
    return guard<AdminStartupRow>(
      "directory.manage",
      demoStartups.find((s) => s.id === id) ?? demoStartups[0],
      async () => {
        const list = await this.listStartups();
        if (!list.ok) return list;
        const s = list.data.find((x) => x.id === id);
        return s ? ok(s) : fail("not_found", "Startup not found.");
      },
    );
  },

  listEvents(): Promise<ServiceResult<AdminEventRow[]>> {
    return guard("attendance.scan", demoEvents, async () => {
      const sb = await createClient();
      const context = await getAdminContext();
      let query = sb.from("events").select("*").order("starts_at", { ascending: false });
      if (!context.permissions.has("events.update")) {
        const { data: assignments } = await sb.from("event_staff").select("event_id").eq("user_id", context.userId!);
        query = query.in("id", (assignments ?? []).map(a => a.event_id));
      }
      const { data, error } = await query;
      if (error) return fail("unknown", "Could not load events.");
      const { data: registrations } = context.permissions.has("registrations.read") ? await sb.from("event_registrations").select("event_id, status") : { data: [] };
      const rows: AdminEventRow[] = (data ?? []).map((e) => {
        const r = e as Row;
        return {
          id: String(r.id),
          slug: (r.slug as string) ?? undefined,
          title: (r.title as string) ?? "—",
          category: (r.category as string) ?? "meetup",
          startsAt: (r.starts_at as string) ?? "",
          venue: (r.venue as string) ?? undefined,
          capacity: (r.capacity as number) ?? undefined,
          confirmed: (registrations ?? []).filter(x => x.event_id === r.id && ["confirmed", "checked_in"].includes(x.status)).length,
          waitlisted: (registrations ?? []).filter(x => x.event_id === r.id && x.status === "waitlisted").length,
          status: (r.status as AdminEventRow["status"]) ?? "draft",
          admission: (r.admission as AdminEventRow["admission"]) ?? "free",
          registrationState: (r.registration_state as string) ?? undefined,
          isCompleted: Boolean((r.settings as Record<string, unknown> | null)?.completed) || r.registration_state === "completed",
        };
      });
      return ok(rows);
    });
  },

  getEvent(id: string): Promise<ServiceResult<AdminEventRow>> {
    return guard<AdminEventRow>(
      "events.update",
      demoEvents.find((e) => e.id === id) ?? demoEvents[0],
      async () => {
        const list = await this.listEvents();
        if (!list.ok) return list;
        const e = list.data.find((x) => x.id === id);
        return e ? ok(e) : fail("not_found", "Event not found.");
      },
    );
  },

  listRegistrations(): Promise<ServiceResult<EventRegistration[]>> {
    return guard("registrations.read", demoRegistrations, async () => {
      const sb = await createClient();
      const [{ data, error }, { data: profiles }, { data: events }] = await Promise.all([
        sb.from("event_registrations").select("*").order("created_at", { ascending: false }),
        sb.from("profiles").select("id, display_name, full_name"),
        sb.from("events").select("id, title, starts_at, ends_at, venue, location"),
      ]);
      if (error) return fail("unknown", "Could not load registrations.");
      const rows: EventRegistration[] = (data ?? []).map(r => {
        const e = (events ?? []).find(e => e.id === r.event_id);
        const p = (profiles ?? []).find(p => p.id === r.user_id);
        const venue = e?.venue?.trim() ?? "";
        const address = e?.location?.trim() ?? "";
        const location = [venue, address].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(", ");
        return { id: r.id, eventId: r.event_id, eventTitle: e?.title ?? "Event", startsAt: e?.starts_at ?? "", endsAt: e?.ends_at ?? "", location, venue: e?.venue ?? undefined, reference: r.reference || "UID pending", status: r.status, payment: r.payment, attendance: r.attendance, memberName: r.attendee_name?.trim() || p?.full_name?.trim() || p?.display_name?.trim() || "Name unavailable", createdAt: r.created_at };
      });
      return ok(rows);
    });
  },

  listEnquiries(): Promise<ServiceResult<{ id: string; fullName: string; email: string; whatsapp: string; startup: string; event: string; goal: string; status: string; createdAt: string }[]>> {
    return guard("registrations.read", [], async () => {
      const sb = await createClient();
      const { data, error } = await sb.from("rsvp_submissions").select("*").order("created_at", { ascending: false });
      if (error) return fail("unknown", "Could not load RSVP enquiries.");
      return ok((data ?? []).map(r => ({ id: r.id, fullName: r.full_name, email: r.email, whatsapp: r.whatsapp, startup: r.startup ?? "", event: r.event_label ?? "", goal: r.goal ?? "", status: r.status, createdAt: r.created_at })));
    });
  },

  listConsultations(): Promise<ServiceResult<AdminConsultationRow[]>> {
    return guard("consultations.manage", demoConsultations, async () => {
      // Public website consultation enquiries land in consultation_submissions.
      const sb = await createClient();
      const { data } = await sb
        .from("consultation_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      const rows: AdminConsultationRow[] = (data ?? []).map((c) => {
        const r = c as Row;
        return {
          id: String(r.id),
          reference: `CON-${String(r.id).slice(0, 8).toUpperCase()}`,
          fullName: (r.full_name as string) ?? "—",
          startup: (r.startup as string) ?? undefined,
          whatsapp: (r.whatsapp as string) ?? undefined,
          email: (r.email as string) ?? undefined,
          requested: (r.goal as string) ?? (r.challenge as string) ?? "",
          submittedAt: (r.created_at as string) ?? "",
          assignedTo: (r.assigned_rep as string) ?? undefined,
          status: (r.status as AdminConsultationRow["status"]) ?? "submitted",
          scheduledAt: (r.scheduled_at as string) ?? undefined,
        };
      });
      return ok(rows);
    });
  },

  listPayments(): Promise<ServiceResult<AdminPaymentRow[]>> {
    return guard("payments.verify", demoPayments, async () => {
      const sb = await createClient();
      const { data, error } = await sb.from("payments").select("*").order("created_at", { ascending: false });
      if (error) return fail("unknown", "Could not load payments.");
      return ok((data ?? []).map(p => ({ id: p.id, reference: p.reference ?? p.id, registrationReference: p.registration_id, attendee: "Restricted to registration detail", event: "See registration", amount: p.amount_minor / 100, currency: p.currency, status: p.status as AdminPaymentRow["status"], verifiedAt: p.reviewed_at ?? undefined, verifiedBy: p.reviewed_by ?? undefined })));
    });
  },

  listReviews(): Promise<ServiceResult<AdminReviewRow[]>> {
    return guard("reviews.moderate", demoReviews, async () => {
      const sb = await createClient();
      const { data } = await sb.from("reviews").select("*").order("created_at", { ascending: false });
      const rows: AdminReviewRow[] = (data ?? []).map((v) => {
        const r = v as Row;
        return {
          id: String(r.id),
          reviewer: String(r.user_id).slice(0, 8),
          rating: (r.rating as number) ?? 0,
          excerpt: (r.review as string) ?? "",
          submittedAt: (r.created_at as string) ?? "",
          status: (r.moderation as AdminReviewRow["status"]) ?? "submitted",
        };
      });
      return ok(rows);
    });
  },

  listAudit(): Promise<ServiceResult<AuditLog[]>> {
    return guard("audit.read", demoAudit, async () => {
      const sb = await createClient();
      const { data } = await sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
      const rows: AuditLog[] = (data ?? []).map((v) => {
        const r = v as Row;
        return {
          id: String(r.id),
          action: (r.action as string) ?? "",
          actorId: String(r.actor_id ?? ""),
          actorRole: (r.actor_role as string) ?? "",
          targetType: (r.target_type as string) ?? "",
          targetId: String(r.target_id ?? ""),
          createdAt: (r.created_at as string) ?? "",
          correlationId: (r.correlation_id as string) ?? undefined,
        };
      });
      return ok(rows);
    });
  },

  listNotifications(): Promise<ServiceResult<NotificationRecord[]>> {
    return guard("roles.manage", demoNotifications, async () => {
      const sb = await createClient(); const { data, error } = await sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) return fail("unknown", "Could not load notifications.");
      return ok((data ?? []).map(r => {
        const status = r.status as NotificationRecord["status"];
        const channel = r.channel as NotificationRecord["channel"];
        return { id: r.id, type: r.type, channel, recipient: r.audience === "admin" ? "Configured admin recipients" : channel === "in_app" ? "Authenticated member" : r.recipient ?? "Verified account email", attempts: r.attempts, lastError: notificationIssueLabel(status, r.last_error ?? undefined, channel, r.type), status, createdAt: r.created_at, sentAt: r.sent_at ?? undefined, deliveredAt: r.delivered_at ?? undefined };
      }));
    });
  },

  listMedia(): Promise<ServiceResult<MediaAsset[]>> {
    return guard("media.manage", demoMedia, async () => {
      const sb = await createClient(); const { data, error } = await sb.from("media_assets").select("*").order("created_at", { ascending: false });
      if (error) return fail("unknown", "Could not load media.");
      return ok((data ?? []).map(r => ({ id: r.id, filename: r.filename, altText: r.alt_text ?? undefined, type: r.type ?? "", width: r.width ?? undefined, height: r.height ?? undefined, sizeBytes: r.size_bytes ?? undefined, category: r.category as MediaAsset["category"], visibility: r.visibility as MediaAsset["visibility"], createdAt: r.created_at })));
    });
  },

  listContent(): Promise<ServiceResult<ContentBlock[]>> {
    return guard("content.manage", demoContent, async () => {
      const sb = await createClient(); const { data, error } = await sb.from("content_blocks").select("*").order("key");
      if (error) return fail("unknown", "Could not load content.");
      const now = Date.now();
      return ok((data ?? []).map(r => {
        const status: ContentBlock["status"] = r.deleted_at ? "deleted"
          : r.status === "archived" ? "archived"
          : r.status !== "published" ? (r.status === "draft" ? "draft" : "unpublished")
          : r.visible_from && new Date(r.visible_from).getTime() > now ? "scheduled"
          : r.visible_until && new Date(r.visible_until).getTime() <= now ? "expired"
          : "published";
        return { key: r.key, label: r.label, value: r.value, status, updatedAt: r.updated_at, visibleFrom: r.visible_from ?? undefined, visibleUntil: r.visible_until ?? undefined, deletedAt: r.deleted_at ?? undefined };
      }));
    });
  },
};
