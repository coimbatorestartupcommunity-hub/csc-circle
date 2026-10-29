import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createSubmissionClient } from "@/lib/supabase/submissions";
import { emailConfiguration, validEmail } from "@/lib/notifications/config";
import { isTemplateKey, renderNotification } from "@/lib/notifications/templates";
import { sendCommunityEmail } from "@/lib/notifications/email";
import { classifyEmailFailure } from "@/lib/notifications/failures";
import QRCode from "qrcode";
import { buildEventPassQrPayload } from "@/lib/member/qr";
import type { Database } from "@/lib/supabase/database.types";
type Job = Database["public"]["Tables"]["notifications"]["Row"];
type Service = NonNullable<ReturnType<typeof createSubmissionClient>>;
async function isCurrent(sb: Service, job: Job) {
  const key = job.template_key ?? "";
  const id = job.related_record_id;
  if (!id) return true;
  if (key === "FirstLoginWelcome") {
    if (!job.recipient_user_id) return false;
    const { data, error } = await sb.rpc("csc_notification_recipient", { member: job.recipient_user_id });
    return !error && Boolean(data);
  }
  if (key === "EventPublishedBroadcast") {
    const { data, error } = await sb.from("events").select("status").eq("id", id).maybeSingle();
    return !error && data?.status === "published";
  }
  if (job.template_key === "MembershipApproved") {
    const { data, error } = await sb.from("memberships").select("status,expires_at").eq("id", id).maybeSingle();
    return !error && data?.status === "active" && (!data.expires_at || Date.parse(data.expires_at)>Date.now());
  }
  if (job.template_key === "StartupApproved") {
    const { data, error } = await sb.from("directory_startups").select("status").eq("id", id).maybeSingle(); return !error && data?.status === "published";
  }
  if (["PaymentPendingVerification", "PaymentVerified", "PaymentRejected", "PaymentRefunded"].includes(key) && job.related_record_type === "payments") {
    const { data, error } = await sb.from("payments").select("status").eq("id", id).maybeSingle();
    const expected: Record<string, string[]> = {
      PaymentPendingVerification: ["pending_verification"],
      PaymentVerified: ["verified"],
      PaymentRejected: ["rejected"],
      PaymentRefunded: ["refunded"],
    };
    return !error && expected[key]?.includes(data?.status ?? "") === true;
  }
  if (job.related_record_type === "paid_event_registrations" && ["PaidEventRegistrationReceived", "PaidEventRegistrationConfirmed", "PaidEventRegistrationNotConfirmed"].includes(key)) {
    const { data, error } = await sb.from("paid_event_registrations").select("status").eq("id", id).maybeSingle();
    if (error || !data) return false;
    return key === "PaidEventRegistrationReceived" ? data.status === "pending_verification" : key === "PaidEventRegistrationConfirmed" ? data.status === "confirmed" : data.status === "rejected";
  }
  if (job.related_record_type === "event_registrations" && ["EventRSVPReceived", "EventRSVPAdminAlert", "EventConfirmed", "EventWaitlisted", "EventReminder", "EventUpdated", "EventCancelled", "PaymentPendingVerification"].includes(key)) {
    const { data: r, error } = await sb.from("event_registrations").select("status,event_id,payment").eq("id", id).maybeSingle();
    if (error || !r) return false;
    const { data: e, error: eventError } = await sb.from("events").select("status,starts_at,admission").eq("id", r.event_id).maybeSingle();
    if (eventError || !e) return false;
    if (key === "EventRSVPReceived" || key === "EventRSVPAdminAlert") return true;
    if (key === "EventCancelled") return r.status === "cancelled" || e.status !== "published";
    if (key === "PaymentPendingVerification") return ["pending_payment", "payment_verification"].includes(r.status);
    if (key === "EventWaitlisted") return r.status === "waitlisted" && e.status === "published";
    if (key === "EventUpdated") return e.status === "published";
    return r.status === "confirmed" && e.status === "published" && Date.parse(e.starts_at) > Date.now() && (e.admission === "free" || r.payment === "paid");
  }
  if (job.related_record_type === "rsvp_submissions" && ["EventRSVPReceived", "EventRSVPAdminAlert"].includes(key)) {
    const { data, error } = await sb.from("rsvp_submissions").select("id").eq("id", id).maybeSingle();
    return !error && Boolean(data);
  }
  if (job.related_record_type === "membership_claims" && ["MembershipApplicationReceived", "MembershipAdminAlert", "MembershipRejected", "MembershipMoreInformation"].includes(key)) {
    const { data, error } = await sb.from("membership_claims").select("status").eq("id", id).maybeSingle();
    if (error || !data) return false;
    if (key === "MembershipRejected") return data.status === "rejected";
    // This is a durable status-change event, not a reminder. The template
    // tells the member to check the current claim status, so it remains valid
    // if the claim is still under review or has advanced through approval.
    if (key === "MembershipMoreInformation") return ["pending_verification", "approved", "active"].includes(data.status);
    return true;
  }
  if (job.related_record_type === "consultation_submissions" && key.startsWith("Consultation")) {
    const { data, error } = await sb.from("consultation_submissions").select("status,scheduled_at").eq("id", id).maybeSingle();
    if (error || !data) return false;
    const expected: Record<string, string[]> = {
      ConsultationApproved: ["approved", "scheduled"],
      ConsultationMoreInformation: ["more_info_required"],
      ConsultationScheduled: ["scheduled"],
      ConsultationCancelled: ["cancelled", "declined"],
    };
    return key === "ConsultationReceived" || key === "ConsultationAdminAlert" || (expected[key]?.includes(data.status) === true && (key !== "ConsultationScheduled" || Boolean(data.scheduled_at)));
  }
  if (job.related_record_type === "reviews" && ["CommunityReviewReceived", "ReviewAdminAlert", "ReviewModerationResult"].includes(key)) {
    const { data, error } = await sb.from("reviews").select("moderation").eq("id", id).maybeSingle();
    return !error && Boolean(data) && (key !== "ReviewModerationResult" || ["approved", "rejected"].includes(data?.moderation ?? ""));
  }
  if (job.related_record_type === "directory_startups" && ["StartupSubmissionReceived", "StartupAdminAlert", "StartupApproved", "StartupStatusChanged"].includes(key)) {
    const { data, error } = await sb.from("directory_startups").select("status").eq("id", id).maybeSingle();
    if (error || !data) return false;
    if (key === "StartupApproved") return data.status === "published";
    if (key === "StartupSubmissionReceived" || key === "StartupAdminAlert") return true;
    return data.status !== "published";
  }
  if (job.related_record_type === "events" && key === "EventUpdated") {
    const { data, error } = await sb.from("events").select("status").eq("id", id).maybeSingle();
    return !error && data?.status === "published";
  }
  if (job.related_record_type === "memberships" && ["MembershipApproved", "MembershipStatusChanged"].includes(key)) {
    const { data, error } = await sb.from("memberships").select("status,expires_at").eq("id", id).maybeSingle();
    if (error || !data) return false;
    return key === "MembershipApproved"
      ? data.status === "active" && (!data.expires_at || Date.parse(data.expires_at) > Date.now())
      : true;
  }
  return true;
}
export async function dispatchNotifications(batch = 15) {
  let c;
  try { c = emailConfiguration(); } catch { return { state: "configuration_error", claimed: 0, accepted: 0, deferred: 0 }; }
  if (!c.enabled) return { state: "disabled", claimed: 0, accepted: 0, deferred: 0 };
  const sb = createSubmissionClient();
  if (!sb) return { state: "database_configuration_error", claimed: 0, accepted: 0, deferred: 0 };
  const worker = randomUUID(); let accepted = 0; let deferred = 0; let rateLimited = false;
  const { data: jobs, error } = await sb.rpc("csc_claim_notifications", { batch: Math.min(batch,15), worker });
  if (error) return { state: "queue_unavailable", claimed: 0, accepted: 0, deferred: 0 };
  try {
    for (const job of jobs ?? []) {
      const lease = job.lease_id!;
      const finish = async (outcome: string, code: string) => { const r=await sb.rpc("csc_finish_notification", { job: job.id, lease, outcome, code }); if (r.error) throw new Error("QUEUE_FINISH_FAILED"); };
      if (rateLimited) { await finish("failed_retryable","EMAIL_RATE_DEFERRED"); deferred++; continue; }
      if (!job.template_key || !isTemplateKey(job.template_key)) { await finish("failed_permanent","UNKNOWN_TEMPLATE"); continue; }
      if (job.template_key === "ConsultationScheduled" && (!job.payload || typeof job.payload!=="object" || Array.isArray(job.payload) || !job.payload.scheduledAt)) { await finish("failed_permanent","MEETING_DETAILS_UNCONFIRMED"); continue; }
      if (!await isCurrent(sb,job)) { await finish("superseded","SUPERSEDED_BUSINESS_STATE"); continue; }
      let recipients = job.audience === "admin" ? c.admins : [job.recipient ?? ""];
      if (job.audience !== "admin" && job.recipient_user_id) {
        const r = await sb.rpc("csc_notification_recipient", { member: job.recipient_user_id });
        recipients = r.error ? [] : [r.data ?? ""];
      }
      if (!recipients.length || recipients.some(r=>!validEmail(r))) { await finish("failed_permanent","INVALID_RECIPIENT"); continue; }
      const originalPayload = job.payload && typeof job.payload === "object" && !Array.isArray(job.payload) ? job.payload : {};
      let payload: Record<string, unknown> = originalPayload;
      let attachments: { filename: string; content: Buffer; contentType: string; cid: string }[] | undefined;
      if (job.related_record_type === "paid_event_registrations" && job.related_record_id) {
        const { data: registration } = await sb.from("paid_event_registrations").select("full_name,reference,status,review_note,event_id,member_registration_id").eq("id", job.related_record_id).maybeSingle();
        if (registration) {
          const { data: event } = await sb.from("events").select("title,starts_at,ends_at,venue,location").eq("id", registration.event_id).maybeSingle();
          payload = { ...originalPayload, name: registration.full_name, reference: registration.reference, status: registration.status, reviewNote: registration.review_note ?? "", eventTitle: event?.title ?? "Event", startsAt: event?.starts_at, endsAt: event?.ends_at, venue: event?.venue, location: event?.location, memberRegistrationId: registration.member_registration_id };
        }
      }
      if (job.template_key === "EventConfirmed" && job.related_record_type === "event_registrations" && job.related_record_id) {
        payload = { ...originalPayload, registrationId: job.related_record_id };
        const { data: registration } = await sb.from("event_registrations").select("pass_token,reference,user_id,event_id,attendee_name,source,source_email,source_parent_registration_id,paid_registration_id").eq("id", job.related_record_id).maybeSingle();
        if (registration) {
          const [{ data: event }, { data: profile }, { data: paidRegistration }] = await Promise.all([
            sb.from("events").select("title,starts_at,ends_at,venue,location").eq("id", registration.event_id).maybeSingle(),
            sb.from("profiles").select("full_name,display_name,email,whatsapp").eq("id", registration.user_id).maybeSingle(),
            registration.paid_registration_id
              ? sb.from("paid_event_registrations").select("email,whatsapp").eq("id", registration.paid_registration_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          let importedContact: Record<string, unknown> | null = null;
          if (registration.source === "google_form_import" || registration.source_parent_registration_id) {
            const { data } = await sb.from("event_registration_import_metadata").select("metadata").eq("registration_id", registration.source_parent_registration_id ?? job.related_record_id).maybeSingle();
            importedContact = data?.metadata as Record<string, unknown> | null;
          }
          payload = {
            ...payload,
            name: registration.attendee_name?.trim() || profile?.full_name?.trim() || profile?.display_name?.trim() || String(originalPayload.name ?? "Name unavailable"),
            reference: registration.reference || String(originalPayload.reference ?? "UID pending"),
            eventTitle: event?.title || String(originalPayload.eventTitle ?? "Event"),
            startsAt: event?.starts_at ?? originalPayload.startsAt,
            endsAt: event?.ends_at ?? originalPayload.endsAt,
            venue: event?.venue ?? originalPayload.venue,
            location: event?.location ?? originalPayload.location,
            email: registration.source_email || paidRegistration?.email || profile?.email || recipients[0] || "",
            phone: paidRegistration?.whatsapp || (typeof importedContact?.whatsapp === "string" ? importedContact.whatsapp : "") || profile?.whatsapp || "",
          };
        }
        if (registration?.pass_token && /^[a-f0-9]{64}$/i.test(registration.pass_token)) {
          const cid = `csc-event-pass-${job.id}@csc`;
          payload = { ...payload, eventPassQrCid: cid, reference: registration.reference };
          attachments = [{ filename: `CSC-EventPass-${registration.reference}.png`, content: await QRCode.toBuffer(buildEventPassQrPayload(registration.pass_token), { type: "png", width: 440, margin: 2, color: { dark: "#121826", light: "#ffffff" } }), contentType: "image/png", cid }];
        }
      }
      const message = renderNotification(job.template_key,payload);
      let outcome = "sent", code = "";
      for (const recipient of recipients) {
        const { data: budget, error: budgetError } = await sb.rpc("csc_email_budget_available");
        if (budgetError || !budget) { outcome="failed_retryable";code="EMAIL_RATE_DEFERRED";rateLimited=true;deferred++;break; }
        const digest = createHash("sha256").update(recipient.toLowerCase()).digest("hex");
        const { data: begin, error: beginError } = await sb.rpc("csc_begin_email_delivery", { job:job.id,lease,digest });
        if (beginError) throw new Error("QUEUE_CLAIM_FAILED");
        if (!begin) {
          const { data: receipt } = await sb.from("notification_deliveries").select("status").eq("notification_id",job.id).eq("recipient_digest",digest).maybeSingle();
          if (receipt?.status !== "accepted") { outcome="failed_permanent";code="AMBIGUOUS_DELIVERY"; }
          continue;
        }
        try {
          const response = await sendCommunityEmail({ to:recipient,...message,notificationId:job.id,attachments });
          if (!response.accepted?.some(a=>String(a).toLowerCase()===recipient.toLowerCase())) throw { responseCode:550 };
          const recorded = await sb.rpc("csc_finish_email_delivery", { job:job.id,lease,digest,outcome:"accepted",code:"" });
          if (recorded.error) throw new Error("ACCEPTANCE_RECORD_FAILED");
          accepted++;
        } catch (error) {
          const failure = classifyEmailFailure(error);
          const recorded=await sb.rpc("csc_finish_email_delivery", {job:job.id,lease,digest,outcome:failure.outcome,code:failure.code});
          if (recorded.error) throw new Error("QUEUE_RECEIPT_UNCERTAIN");
          outcome=failure.outcome === "ambiguous" ? "failed_permanent" : failure.outcome; code=failure.code;
          if (outcome === "failed_permanent") break;
        }
        // One connection at a time; bounded bursts and persistent hourly/day caps.
        await new Promise(resolve=>setTimeout(resolve,500));
      }
      await finish(outcome,code);
    }
    return { state:"processed",claimed:jobs?.length ?? 0,accepted,deferred };
  } finally { await sb.rpc("csc_release_notification_dispatch",{worker}); }
}
