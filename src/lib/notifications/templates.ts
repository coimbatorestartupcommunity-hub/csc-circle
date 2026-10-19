import { emailConfiguration } from "@/lib/notifications/config";
export const definitions = {
 MembershipApplicationReceived: ["Membership Application Received", "Your application was received. Official membership approval is pending.", "/member/claim"],
 MembershipAdminAlert: ["New Membership Application", "A persisted membership application is ready for authorized review.", "/admin/membership-claims"],
 MembershipApproved: ["Welcome to CSC Circle — Membership Approved", "Your CSC membership is active. Sign in to view your digital ID. Your QR credential is not attached to this email.", "/member/id-card"],
 MembershipRejected: ["Membership Application Update", "Your application was not approved. Contact CSC support for next steps.", "/member/claim"],
 MembershipMoreInformation: ["Membership Verification Update", "Your membership application is under verification. The CSC team may request further information.", "/member/claim"],
 MembershipStatusChanged: ["Membership Status Update", "Your membership status has changed. Sign in to review your current access.", "/member"],
 EventRSVPReceived: ["Event Registration Received", "Your registration was received and is pending review. This email does not confirm a seat or issue an event pass.", "/member/events"],
 EventRSVPAdminAlert: ["New Event RSVP", "A persisted event registration or visitor enquiry is ready for review.", "/admin/registrations"],
 EventConfirmed: ["Your Event Registration Is Confirmed", "Your registration is confirmed. Sign in to view your current event pass and admission instructions.", "/member/events"],
 EventWaitlisted: ["Event Waitlist Update", "You are on the event waitlist. A seat has not been reserved.", "/member/events"],
 EventReminder: ["Upcoming Event Reminder", "Your confirmed CSC event is approaching. Review the current details and your event pass before attending.", "/member/events"],
 EventUpdated: ["Event Details Updated", "An event you registered for has changed. Review the latest schedule and venue before travelling.", "/member/events"],
 EventCancelled: ["Event Cancelled", "The CSC event or your registration has been cancelled. Sign in to review its current status.", "/member/events"],
 ConsultationReceived: ["Consultation Request Received", "Your consultation request was saved and is under review. A meeting has not yet been confirmed.", "/member/consultations"],
 ConsultationAdminAlert: ["New Consultation Enquiry", "A persisted consultation enquiry is ready for authorized review. Full details remain in the private dashboard.", "/admin/consultations"],
 ConsultationApproved: ["Consultation Approved", "Your request was approved. A meeting is only confirmed once its schedule is provided.", "/member/consultations"],
 ConsultationMoreInformation: ["Consultation Information Requested", "The CSC team needs more information about your consultation request. Contact support for next steps.", "/member/consultations"],
 ConsultationScheduled: ["Consultation Scheduled", "Your consultation has been scheduled. Review the confirmed meeting details below.", "/member/consultations"],
 ConsultationCancelled: ["Consultation Update", "Your consultation has been cancelled or declined. Contact support if you need assistance.", "/member/consultations"],
 PaymentPendingVerification: ["Payment Verification Required", "Payment or independent payment verification is pending. No paid-event pass is issued by this email.", "/member/events"],
 PaymentVerified: ["Payment Verified", "An authorized reviewer has verified your payment. Event confirmation remains subject to registration eligibility and capacity.", "/member/events"],
 PaymentRejected: ["Payment Review Update", "Your payment could not be verified. Contact CSC support; do not send private bank or payment evidence by reply.", "/member/events"],
 PaymentRefunded: ["Payment Refund Update", "The authorized payment record has been marked refunded. Contact support for settlement details.", "/member/events"],
 StartupSubmissionReceived: ["Startup Submission Received", "Your startup listing was saved and awaits approval. It is not publicly published yet.", "/member/startup"],
 StartupAdminAlert: ["New Startup Submission", "A persisted startup listing is ready for approval and consent review.", "/admin/startups"],
 StartupApproved: ["Startup Listing Approved", "Your startup listing was approved for publication subject to your current directory consent.", "/directory"],
 StartupStatusChanged: ["Startup Listing Update", "Your startup listing publication status has changed. Contact support for assistance.", "/member/startup"],
 CommunityReviewReceived: ["Community Review Received", "Your genuine review was saved and awaits moderation.", "/member/reviews"],
 ReviewAdminAlert: ["Community Review Awaiting Moderation", "A persisted community review is ready for moderation.", "/admin/reviews"],
 ReviewModerationResult: ["Review Moderation Update", "The moderation status of your review has changed. Your original opinion has not been rewritten.", "/member/reviews"],
 OperationalAlert: ["Operational Alert", "An operational issue requires authorized review in the CSC notifications dashboard.", "/admin/notifications"],
} as const;
export type TemplateKey = keyof typeof definitions;
export function isTemplateKey(value: string): value is TemplateKey { return Object.hasOwn(definitions, value); }
export function escapeHtml(value: string) { return value.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!)); }
export function renderNotification(key: TemplateKey, payload: Record<string, unknown>) {
  const c = emailConfiguration(); const [heading, body, path] = definitions[key];
  const subject = heading.startsWith("Welcome") ? heading : `CSC Circle — ${heading}`;
  const details: [string,string][] = [];
  for (const [field,label] of [["reference","Reference"],["eventTitle","Event"],["venue","Venue"],["status","Status"],["goal","Objective"],["category","Category"]]) if (typeof payload[field]==="string") details.push([label,(payload[field] as string).slice(0,500)]);
  for (const [field,label] of [["startsAt","Event time (Asia/Kolkata)"],["previousStartsAt","Previous event time (Asia/Kolkata)"],["scheduledAt","Meeting time (Asia/Kolkata)"]]) if (typeof payload[field]==="string" && !Number.isNaN(Date.parse(payload[field] as string))) details.push([label,new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(payload[field] as string))]);
  const greeting = typeof payload.name === "string" ? `Hello ${payload.name.slice(0,100)},` : "Hello,";
  const link = c.base + path; const lines = details.map(([k,v])=>`${k}: ${v}`).join("\n");
  const text = `${greeting}\n\n${body}\n\n${lines}\n\nView details: ${link}\nSupport: ${c.support}\nPrivacy: ${c.base}/privacy\n\nCSC Circle — Coimbatore Startup Community\nConnect. Build. Grow.`;
  const html = `<!doctype html><html><body style="margin:0;background:#F7F9FC;font-family:Poppins,Arial,sans-serif;color:#121826"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:white;border:1px solid #DFE7EF;border-radius:24px"><tr><td style="padding:30px"><img src="${c.base}/brand/csc-logo.png" width="160" alt="CSC Circle — Coimbatore Startup Community" style="max-width:100%;height:auto"><h1 style="font-size:24px;line-height:1.3">${escapeHtml(heading)}</h1><p>${escapeHtml(greeting)}</p><p style="line-height:1.7">${escapeHtml(body)}</p><table role="presentation" width="100%" style="background:#F1ECFF;border-radius:16px;padding:16px">${details.map(([k,v])=>`<tr><td style="padding:5px;font-size:13px">${escapeHtml(k)}</td><td style="padding:5px;font-size:13px">${escapeHtml(v)}</td></tr>`).join("")}</table><p style="margin:28px 0"><a href="${link}" style="background:#E7F3FF;color:#121826;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:bold">View in CSC Circle</a></p><p style="font-size:13px;line-height:1.6">Questions? Contact <a href="mailto:${escapeHtml(c.support)}">${escapeHtml(c.support)}</a>. Sensitive records remain in the authenticated portal.</p><p style="font-size:12px;color:#52677C"><a href="${c.base}/privacy">Privacy</a> · <a href="${c.base}/terms">Terms</a><br>CSC Circle · Coimbatore Startup Community<br>Connect. Build. Grow.</p></td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
