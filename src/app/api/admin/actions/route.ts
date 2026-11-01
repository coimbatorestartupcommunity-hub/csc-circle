import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes, randomUUID } from "node:crypto";
import type { Permission } from "@/lib/admin/permissions";
import type { Database } from "@/lib/supabase/database.types";
import { issueImportedRegistrationPasses } from "@/lib/admin/imported-registration-pass";
import { ensureEventPassEmail } from "@/lib/admin/event-pass-email";
const schema = z.object({ kind: z.enum(["claim", "member", "registration", "imported_registration", "paid_registration", "manual_check_in", "resend_event_pass", "payment", "review", "startup", "consultation"]), target: z.string().uuid(), decision: z.string().min(1).max(40), reason: z.string().max(1000).default("") });
const permissions: Record<string, Permission> = { claim: "members.approve", member: "members.suspend", registration: "registrations.approve", imported_registration: "registrations.approve", paid_registration: "registrations.approve", manual_check_in: "attendance.scan", resend_event_pass: "registrations.approve", payment: "payments.verify", review: "reviews.moderate", startup: "directory.manage", consultation: "consultations.manage" };
export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live") return authResponse({ error: "Administrator access required." }, 403);
    if (!rateLimit(`admin:${ctx.userId}:${clientIp(request)}`, 30, 60_000).allowed) return authResponse({ error: "Too many requests." }, 429);
    const parsed = schema.safeParse(await readAuthBody(request));
    if (!parsed.success) return authResponse({ error: "Invalid action." }, 422);
    if (!ctx.permissions.has(permissions[parsed.data.kind])) return authResponse({ error: "Permission denied." }, 403);
    if (parsed.data.kind === "manual_check_in") {
      if (parsed.data.decision !== "checked_in") return authResponse({ error: "Invalid attendance action." }, 422);
      const session = await createClient();
      const { data, error } = await session.rpc("csc_manual_check_in", { registration: parsed.data.target });
      if (error) return authResponse({ error: "Manual check-in was not recorded. Confirm your event assignment and try again." }, 409);
      const result = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
      const status = typeof result.status === "string" ? result.status : "invalid";
      if (status === "valid" || status === "already") {
        revalidateTag("registrations", "max");
        return authResponse({ ok: true, status, alreadyCheckedIn: status === "already", checkedInAt: result.checkedInAt });
      }
      const messages: Record<string, string> = {
        invalid: "The registration could not be found.",
        pending: "Only confirmed registrations can be checked in.",
        payment: "Paid registration must be fully paid before check-in.",
        revoked: "This attendee or event is not eligible for check-in.",
      };
      return authResponse({ error: messages[status] ?? "Manual check-in was not recorded." }, status === "invalid" ? 404 : 409);
    }
    if (parsed.data.kind === "resend_event_pass") {
      if (parsed.data.decision !== "resend") return authResponse({ error: "Invalid pass action." }, 422);
      const session = await createClient();
      const { data, error } = await session.rpc("csc_resend_event_pass", { p_registration_id: parsed.data.target });
      if (error || !data) return authResponse({ error: "The confirmed event pass could not be re-queued." }, 409);
      scheduleNotificationDelivery();
      return authResponse({ ok: true });
    }
    if (parsed.data.kind === "imported_registration") {
      if (parsed.data.decision !== "confirmed") return authResponse({ error: "Imported registrations can only be confirmed after payment review." }, 422);
      const admin = createAdminClient();
      const issued = await issueImportedRegistrationPasses(admin, parsed.data.target);
      if (!issued.ok) return authResponse({ error: issued.error }, 409);
      await admin.from("audit_logs").insert({ action: "event.imported_registration.confirmed", actor_id: ctx.userId, target_type: "event_registrations", target_id: parsed.data.target, after: { status: "confirmed", reference: issued.reference, passCount: issued.passCount } });
      scheduleNotificationDelivery();
      revalidateTag("registrations", "max");
      return authResponse({ ok: true });
    }
    if (parsed.data.kind === "paid_registration") {
      if (!["confirmed", "rejected"].includes(parsed.data.decision) || (parsed.data.decision === "rejected" && parsed.data.reason.trim().length < 5)) return authResponse({ error: "Choose approve or reject and add a review note when rejecting." }, 422);
      const reviewStatus = parsed.data.decision === "confirmed" ? "confirmed" as const : "rejected" as const;
      const admin = createAdminClient();
      const { data: current, error: readError } = await admin.from("paid_event_registrations").select("id,status,event_id,email,full_name,additional_attendee_names,user_id,member_registration_id,reference").eq("id", parsed.data.target).maybeSingle();
      if (readError) return authResponse({ error: "The registration could not be loaded for review. Refresh the page and try again." }, 503);
      if (!current) return authResponse({ error: "This registration could not be found. Refresh the registrations list and try again." }, 404);
      if (current.status === "confirmed") {
        if (!current.member_registration_id) return authResponse({ error: "This registration is approved, but its pass record needs administrator repair." }, 409);
        const email = await ensureEventPassEmail(admin, current.member_registration_id);
        if (!email.ok) return authResponse({ error: "This registration is already approved, but the pass email could not be queued. Use Resend pass after refreshing." }, 503);
        scheduleNotificationDelivery();
        return authResponse({ ok: true, alreadyApproved: true, message: "Already approved. The pass is ready and its email is queued." });
      }
      if (current.status !== "pending_verification") return authResponse({ error: `This registration is currently ${current.status.replaceAll("_", " ")}. Refresh the list to review its latest status.` }, 409);
      let userId = current.user_id;
      let memberRegistrationId = current.member_registration_id;
      let reference = current.reference;
      if (parsed.data.decision === "confirmed") {
        if (!userId) {
          for (let page = 1; page <= 10 && !userId; page += 1) {
            const { data: users, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
            if (error) return authResponse({ error: "Attendee access could not be prepared for pass issuance." }, 503);
            userId = users.users.find((user) => user.email?.toLowerCase() === current.email.toLowerCase())?.id ?? null;
            if (users.users.length < 1000) break;
          }
          if (!userId) {
            const redirectTo = new URL("/auth/confirm?next=%2Fmember%2Fevents", new URL(request.url).origin).toString();
            const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(current.email, { redirectTo });
            if (error || !invited.user) return authResponse({ error: "Attendee sign-in invitation could not be sent; registration remains pending review." }, 503);
            userId = invited.user.id;
          }
        }
        const attendeeNames = [current.full_name, ...(current.additional_attendee_names ?? "").split(/[\r\n;]/).map((name) => name.trim()).filter(Boolean)].slice(0, 10);
        const { data: existingPasses } = await admin.from("event_registrations").select("id,reference,pass_token,attendee_name").eq("paid_registration_id", current.id);
        const passes = new Map((existingPasses ?? []).map((pass) => [pass.attendee_name?.trim().toLocaleLowerCase("en") ?? "", pass]));
        for (const attendeeName of attendeeNames) {
          const oldPass = passes.get(attendeeName.toLocaleLowerCase("en"));
          const passReference = oldPass?.reference || `CSC-EVT-${randomUUID().replaceAll("-", "").toUpperCase()}`;
          const passTokenForAttendee = oldPass?.pass_token || randomBytes(32).toString("hex");
          const passData = { status: "confirmed" as const, payment: "paid" as const, attendee_name: attendeeName, reference: passReference, pass_token: passTokenForAttendee, paid_registration_id: current.id };
          if (oldPass) {
            const { error } = await admin.from("event_registrations").update(passData).eq("id", oldPass.id);
            if (error) return authResponse({ error: "Pass issuance could not be completed; registration remains pending review." }, 503);
            if (oldPass.id === current.member_registration_id || attendeeName === current.full_name) memberRegistrationId = oldPass.id;
          } else {
            const { data: created, error } = await admin.from("event_registrations").insert({ ...passData, event_id: current.event_id, user_id: userId! }).select("id").single();
            if (error || !created) return authResponse({ error: "Pass issuance could not be completed; registration remains pending review." }, 503);
            if (attendeeName === current.full_name) memberRegistrationId = created.id;
          }
          if (attendeeName === current.full_name) reference = passReference;
        }
      }
      const { error: updateError } = await admin.from("paid_event_registrations").update({ status: reviewStatus, user_id: userId, member_registration_id: memberRegistrationId, reference, reviewed_by: ctx.userId!, reviewed_at: new Date().toISOString(), review_note: parsed.data.reason.trim() || null }).eq("id", current.id).eq("status", "pending_verification");
      if (updateError) return authResponse({ error: "Registration review was not saved." }, 409);
      if (reviewStatus === "confirmed" && memberRegistrationId) {
        const email = await ensureEventPassEmail(admin, memberRegistrationId);
        if (!email.ok) return authResponse({ error: "Registration approved, but the pass email could not be queued. Refresh and use Resend pass." }, 503);
      }
      scheduleNotificationDelivery();
      return authResponse({ ok: true });
    }
    if (parsed.data.kind === "review") {
      if (!["approved", "rejected", "under_review"].includes(parsed.data.decision)) {
        return authResponse({ error: "Invalid review decision." }, 422);
      }
      if (parsed.data.decision === "rejected" && parsed.data.reason.trim().length < 5) {
        return authResponse({ error: "A note of at least 5 characters is required when rejecting a review." }, 422);
      }
      const admin = createAdminClient();
      const { data: review, error: reviewFetchError } = await admin
        .from("reviews")
        .select("id, moderation, user_id, rating, review, kind, event_id, collaboration_id")
        .eq("id", parsed.data.target)
        .maybeSingle();
      if (reviewFetchError || !review) return authResponse({ error: "Review could not be found." }, 404);

      const { error: updateError } = await admin
        .from("reviews")
        .update({ moderation: parsed.data.decision as Database["public"]["Enums"]["review_moderation_status"] })
        .eq("id", parsed.data.target);
      if (updateError) return authResponse({ error: "Review moderation could not be saved." }, 409);

      await admin.from("audit_logs").insert({
        action: `review.${parsed.data.decision}`,
        actor_id: ctx.userId,
        actor_role: ctx.roles[0] || "admin",
        target_type: "review",
        target_id: parsed.data.target,
        before: { moderation: review.moderation },
        after: { moderation: parsed.data.decision, reason: parsed.data.reason },
        correlation_id: randomUUID(),
      });

      if (review.user_id) {
        const title = parsed.data.decision === "approved" ? "Review approved" : "Review update";
        const message = parsed.data.decision === "approved"
          ? "Your CSC community review has been approved."
          : "There is an update to your CSC community review.";
        await admin.from("notifications").insert({
          type: `review.${parsed.data.decision}`,
          channel: "in_app",
          recipient: review.user_id,
          recipient_user_id: review.user_id,
          audience: "member",
          related_record_type: "review",
          related_record_id: parsed.data.target,
          title,
          message,
          action_url: "/member/reviews",
          payload: { target: parsed.data.target, kind: review.kind || "review" },
          dedupe_key: `review.${parsed.data.decision}:${parsed.data.target}:${parsed.data.decision}`,
          status: "available",
          delivered_at: new Date().toISOString(),
        }).select().maybeSingle();
      }

      for (const tag of ["reviews", "testimonials"]) revalidateTag(tag, { expire: 0 });
      scheduleNotificationDelivery();
      return authResponse({ ok: true });
    }
    if (parsed.data.kind === "payment" && (!parsed.data.reason || parsed.data.reason.trim().length < 5)) {
      return authResponse({ error: "An independent settlement reference (at least 5 characters) is required for payment verification or rejection." }, 422);
    }
    const sb = await createClient();
    const { data, error } = await sb.rpc("csc_admin_action", parsed.data);
    if (error) {
      const knownErrors: Record<string, string> = {
        "unverified account": "This account's email must be verified before membership can be approved.",
        "membership unavailable": "The member record is missing or cannot be activated. Ask the member to refresh their account, then retry.",
        "claim already decided": "This claim has already been decided. Refresh the page to see its current status.",
        "not found": "This record could not be found. Refresh the page and try again.",
        "independent settlement reference required": "An independent settlement reference (at least 5 characters) is required for payment actions.",
        "event full": "Cannot confirm registration: the event capacity has been reached.",
        "payment not verified": "Cannot confirm registration: event admission payment has not been verified.",
        "event unavailable": "This event has ended or is not published.",
        "membership ineligible": "The member does not have an active membership.",
        "reason required": "A reason of at least 5 characters is required for this action.",
        "invalid transition": "This record cannot undergo this status transition in its current state. Refresh the page to check its latest status.",
        "forbidden": "You do not have permission to perform this action.",
        "review authors cannot approve their own review": "Review authors cannot approve their own review.",
      };
      const message = parsed.data.kind === "claim"
        ? (knownErrors[error.message] ?? "Membership approval was not saved. Refresh the claim and verify the member account before retrying.")
        : (knownErrors[error.message] ?? error.message ?? "Action was not saved. Check the current record status and try again.");
      return authResponse({ error: message }, 409);
    }
    for (const tag of ["events", "directory", "reviews"]) revalidateTag(tag, { expire: 0 });
    scheduleNotificationDelivery();
    return authResponse({ ok: true, result: data });
  } catch { return authResponse({ error: "Could not process the action." }, 503); }
}
