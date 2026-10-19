import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createSubmissionClient } from "@/lib/supabase/submissions";
import { emailConfiguration, validEmail } from "@/lib/notifications/config";
import { isTemplateKey, renderNotification } from "@/lib/notifications/templates";
import { sendCommunityEmail } from "@/lib/notifications/email";
import { classifyEmailFailure } from "@/lib/notifications/failures";
import type { Database } from "@/lib/supabase/database.types";
type Job = Database["public"]["Tables"]["notifications"]["Row"];
type Service = NonNullable<ReturnType<typeof createSubmissionClient>>;
async function isCurrent(sb: Service, job: Job) {
  if (!["EventConfirmed","EventReminder","PaymentVerified","MembershipApproved","StartupApproved"].includes(job.template_key ?? "")) return true;
  if (job.template_key === "MembershipApproved") {
    const { data, error } = await sb.from("memberships").select("status,expires_at").eq("id", job.related_record_id!).maybeSingle();
    return !error && data?.status === "active" && (!data.expires_at || Date.parse(data.expires_at)>Date.now());
  }
  if (job.template_key === "StartupApproved") {
    const { data, error } = await sb.from("directory_startups").select("status").eq("id", job.related_record_id!).maybeSingle(); return !error && data?.status === "published";
  }
  if (job.template_key === "PaymentVerified") {
    const { data, error } = await sb.from("payments").select("status").eq("id", job.related_record_id!).maybeSingle(); return !error && data?.status === "verified";
  }
  const { data: r, error } = await sb.from("event_registrations").select("status,event_id,user_id,payment").eq("id", job.related_record_id!).maybeSingle();
  if (error || r?.status !== "confirmed") return false;
  const [{ data: e }, { data: m }] = await Promise.all([sb.from("events").select("status,starts_at,admission").eq("id", r.event_id).maybeSingle(),sb.from("memberships").select("status,expires_at").eq("user_id", r.user_id).maybeSingle()]);
  return e?.status === "published" && Date.parse(e.starts_at)>Date.now() && m?.status === "active" && (!m.expires_at || Date.parse(m.expires_at)>Date.now()) && (e.admission === "free" || r.payment === "paid");
}
export async function dispatchNotifications(batch = 3) {
  let c;
  try { c = emailConfiguration(); } catch { return { state: "configuration_error", claimed: 0, accepted: 0 }; }
  if (!c.enabled) return { state: "disabled", claimed: 0, accepted: 0 };
  const sb = createSubmissionClient();
  if (!sb) return { state: "database_configuration_error", claimed: 0, accepted: 0 };
  const worker = randomUUID(); let accepted = 0;
  const { data: jobs, error } = await sb.rpc("csc_claim_notifications", { batch: Math.min(batch,3), worker });
  if (error) return { state: "queue_unavailable", claimed: 0, accepted: 0 };
  try {
    for (const job of jobs ?? []) {
      const lease = job.lease_id!;
      const finish = async (outcome: string, code: string) => { const r=await sb.rpc("csc_finish_notification", { job: job.id, lease, outcome, code }); if (r.error) throw new Error("QUEUE_FINISH_FAILED"); };
      if (!job.template_key || !isTemplateKey(job.template_key)) { await finish("failed_permanent","UNKNOWN_TEMPLATE"); continue; }
      if (job.template_key === "ConsultationScheduled" && (!job.payload || typeof job.payload!=="object" || Array.isArray(job.payload) || !job.payload.scheduledAt)) { await finish("failed_permanent","MEETING_DETAILS_UNCONFIRMED"); continue; }
      if (!await isCurrent(sb,job)) { await finish("failed_permanent","SUPERSEDED_BUSINESS_STATE"); continue; }
      let recipients = job.audience === "admin" ? c.admins : [job.recipient ?? ""];
      if (job.audience !== "admin" && job.recipient_user_id) {
        const r = await sb.rpc("csc_notification_recipient", { member: job.recipient_user_id });
        recipients = r.error ? [] : [r.data ?? ""];
      }
      if (!recipients.length || recipients.some(r=>!validEmail(r))) { await finish("failed_permanent","INVALID_RECIPIENT"); continue; }
      const payload = job.payload && typeof job.payload === "object" && !Array.isArray(job.payload) ? job.payload : {};
      const message = renderNotification(job.template_key,payload);
      let outcome = "sent", code = "";
      for (const recipient of recipients) {
        const { data: budget, error: budgetError } = await sb.rpc("csc_email_budget_available", {});
        if (budgetError || !budget) { outcome="failed_retryable";code="EMAIL_RATE_DEFERRED";break; }
        const digest = createHash("sha256").update(recipient.toLowerCase()).digest("hex");
        const { data: begin, error: beginError } = await sb.rpc("csc_begin_email_delivery", { job:job.id,lease,digest });
        if (beginError) throw new Error("QUEUE_CLAIM_FAILED");
        if (!begin) {
          const { data: receipt } = await sb.from("notification_deliveries").select("status").eq("notification_id",job.id).eq("recipient_digest",digest).maybeSingle();
          if (receipt?.status !== "accepted") { outcome="failed_permanent";code="AMBIGUOUS_DELIVERY"; }
          continue;
        }
        try {
          const response = await sendCommunityEmail({ to:recipient,...message,notificationId:job.id });
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
    return { state:"processed",claimed:jobs?.length ?? 0,accepted };
  } finally { await sb.rpc("csc_release_notification_dispatch",{worker}); }
}
