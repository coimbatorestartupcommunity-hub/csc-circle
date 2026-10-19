import "server-only";

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
    return guard("members.read", demoDashboard, async () => {
      // Live aggregation is assembled by the backend in Phase 1; for now return
      // an empty-but-valid shape so the UI shows honest zero/empty states.
      const empty: AdminDashboardData = {
        ...demoDashboard,
        metrics: demoDashboard.metrics.map((m) => ({ ...m, value: 0 })),
        recentClaims: [],
        upcomingEvents: [],
        pendingRegistrations: [],
        recentConsultations: [],
        reviewQueue: [],
        recentAudit: [],
        ratingDistribution: demoDashboard.ratingDistribution.map((r) => ({ ...r, count: 0 })),
        registrationsByEvent: [],
      };
      return ok(empty);
    });
  },

  listMembers(): Promise<ServiceResult<AdminMemberRow[]>> {
    return guard("members.read", demoMembers, async () => {
      const sb = await createClient();
      const { data } = await sb
        .from("profiles")
        .select("id, full_name, display_name, email, whatsapp, designations, startup, created_at, updated_at, memberships(status, member_number)")
        .order("created_at", { ascending: false });
      const rows: AdminMemberRow[] = (data ?? []).map((p) => {
        const r = p as Row;
        const m = (Array.isArray(r.memberships) ? r.memberships[0] : r.memberships) as Row | undefined;
        const startup = r.startup as { name?: string } | null;
        const desigs = (r.designations as string[]) ?? [];
        return {
          id: String(r.id),
          memberNumber: (m?.member_number as string) ?? undefined,
          fullName: (r.full_name as string) ?? (r.display_name as string) ?? "—",
          email: (r.email as string) ?? "",
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
          applicantType: (r.applicant_type as AdminClaimRow["applicantType"]) ?? "new_applicant",
          submittedAt: (r.submitted_at as string) ?? "",
          startup: (r.startup_affiliation as string) ?? undefined,
          status: (r.status as AdminClaimRow["status"]) ?? "claim_submitted",
        };
      });
      return ok(rows);
    });
  },

  listStartups(): Promise<ServiceResult<AdminStartupRow[]>> {
    return guard("directory.manage", demoStartups, async () => {
      const sb = await createClient();
      const { data } = await sb.from("directory_startups").select("*").order("updated_at", { ascending: false });
      const rows: AdminStartupRow[] = (data ?? []).map((s) => {
        const r = s as Row;
        const founder = r.founder as { name?: string } | null;
        return {
          id: String(r.id),
          name: (r.name as string) ?? "—",
          founder: founder?.name ?? "—",
          industry: (r.industry as string) ?? "other",
          website: (r.website as string) ?? undefined,
          collaboration: (r.collaboration as string[]) ?? [],
          status: (r.status as AdminStartupRow["status"]) ?? "draft",
          updatedAt: (r.updated_at as string) ?? "",
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
    return guard("events.update", demoEvents, async () => {
      const sb = await createClient();
      const { data } = await sb.from("events").select("*").order("starts_at", { ascending: false });
      const rows: AdminEventRow[] = (data ?? []).map((e) => {
        const r = e as Row;
        return {
          id: String(r.id),
          title: (r.title as string) ?? "—",
          category: (r.category as string) ?? "meetup",
          startsAt: (r.starts_at as string) ?? "",
          venue: (r.venue as string) ?? undefined,
          capacity: (r.capacity as number) ?? undefined,
          confirmed: 0,
          waitlisted: 0,
          status: (r.status as AdminEventRow["status"]) ?? "draft",
          admission: (r.admission as AdminEventRow["admission"]) ?? "free",
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
      const { data } = await sb
        .from("event_registrations")
        .select("*, events(title, starts_at, ends_at, venue, location)")
        .order("created_at", { ascending: false });
      const rows: EventRegistration[] = (data ?? []).map((v) => {
        const r = v as Row;
        const ev = (r.events as Row) ?? {};
        return {
          id: String(r.id),
          eventId: String(r.event_id),
          eventTitle: (ev.title as string) ?? "Event",
          startsAt: (ev.starts_at as string) ?? "",
          endsAt: (ev.ends_at as string) ?? "",
          venue: (ev.venue as string) ?? undefined,
          location: (ev.location as string) ?? "",
          reference: (r.reference as string) ?? "",
          status: (r.status as EventRegistration["status"]) ?? "pending",
          payment: (r.payment as EventRegistration["payment"]) ?? "not_required",
          attendance: (r.attendance as EventRegistration["attendance"]) ?? "not_attended",
          memberName: "",
          createdAt: (r.created_at as string) ?? "",
        };
      });
      return ok(rows);
    });
  },

  listConsultations(): Promise<ServiceResult<AdminConsultationRow[]>> {
    return guard("consultations.manage", demoConsultations, async () => {
      const sb = await createClient();
      const { data } = await sb.from("consultations").select("*").order("created_at", { ascending: false });
      const rows: AdminConsultationRow[] = (data ?? []).map((c) => {
        const r = c as Row;
        return {
          id: String(r.id),
          reference: `CON-${String(r.id).slice(0, 8)}`,
          fullName: (r.title as string) ?? "—",
          requested: (r.goal as string) ?? "",
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
    // No payment table yet (gateway deferred). Demo-only; live returns empty.
    return guard("payments.verify", demoPayments, async () => ok([]));
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
          excerpt: ((r.review as string) ?? "").slice(0, 80),
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
    return guard("settings.manage", demoNotifications, async () => ok([]));
  },

  listMedia(): Promise<ServiceResult<MediaAsset[]>> {
    return guard("media.manage", demoMedia, async () => ok([]));
  },

  listContent(): Promise<ServiceResult<ContentBlock[]>> {
    return guard("content.manage", demoContent, async () => ok([]));
  },
};
