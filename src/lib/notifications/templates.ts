import { emailConfiguration } from "@/lib/notifications/config";

/** CSC versions of the reference collection's transactional and lifecycle families. */
export const definitions = {
  EventReviewRequest: ["How Was Your CSC Event?", "Thank you for attending. Share your rating and experience in My Ratings and Reviews. Your feedback helps CSC plan future events.", "/member/reviews", "support", "light"],
  FirstLoginWelcome: ["Welcome to CSC Circle", "Welcome to Coimbatore Startup Community. Connect with founders, discover events, and build your profile at your own pace.", "/member/profile", "welcome", "orange"],
  MembershipApplicationReceived: ["Membership Application Received", "We received your CSC membership application. Membership is free; your card will be available after the community team approves your claim.", "/member/claim", "onboarding", "sky"],
  MembershipAdminAlert: ["New Membership Application", "A membership application has been submitted and is ready for authorized review.", "/admin/membership-claims", "workspace", "light"],
  MembershipApproved: ["Your CSC Membership Card Is Ready", "Your free CSC membership has been approved. Sign in to view and download your digital membership card. No payment is required for the membership card.", "/member/id-card", "milestone", "light"],
  MembershipRejected: ["Membership Application Update", "There is an update to your membership application. Sign in to review the decision and any next steps.", "/member/claim", "support", "light"],
  MembershipMoreInformation: ["CSC Membership Status Update", "Your CSC membership claim has been submitted for review. Sign in to see its current status and any next steps.", "/member/claim", "verification", "light"],
  MembershipStatusChanged: ["Membership Status Update", "Your CSC membership status has changed. Sign in to view the current status of your account and card.", "/member/id-card", "milestone", "light"],
  EventPublishedBroadcast: ["A new CSC event is open", "A new event has been published by Coimbatore Startup Community. Review the date, location, admission details, and registration information below.", "/events", "campaign", "orange"],
  EventRSVPReceived: ["Event Registration Received", "Your event registration was received. We will email you when its status changes. A received registration is not a seat confirmation.", "/member/events", "onboarding", "sky"],
  EventRSVPAdminAlert: ["New Event Registration", "A registration or event enquiry has been saved and is ready for authorized review.", "/admin/registrations", "workspace", "light"],
  EventConfirmed: ["Your Event Registration Is Confirmed", "Your registration is confirmed.\n\nEvent pass: Sign in with the same email address used for registration. The View in CSC Circle button opens Member → My Events, where you can view and download your pass.\n\nMembership ID: To request a Coimbatore Startup Community membership card, choose Digital ID from the member menu, complete and submit the required information, and wait for the team to review it. We will notify you after approval; you can then view and download your Digital ID.", "/member/events", "milestone", "light"],
  EventRegistrationNotConfirmed: ["Event Registration Update", "We could not confirm your event registration. Review the note below or contact CSC Circle if you need help.", "/events", "support", "light"],
  PaidEventRegistrationReceived: ["Registration Received — Payment Verification Pending", "We received your CSC event registration and payment proof. Your place is not confirmed until an authorized CSC reviewer verifies the payment.", "/events", "payment", "light"],
  PaidEventRegistrationConfirmed: ["Your CSC Event Registration Is Confirmed", "Your payment has been verified and your event registration is confirmed. Keep this email for your event details.", "/events", "milestone", "light"],
  PaidEventRegistrationNotConfirmed: ["CSC Event Registration Update", "We could not confirm your event registration. Review the note below or contact CSC Circle if you need help.", "/events", "support", "light"],
  EventWaitlisted: ["Event Waitlist Update", "You have been added to the event waitlist. A place is not reserved unless CSC later confirms your registration.", "/member/events", "support", "light"],
  EventReminder: ["Upcoming CSC Event Reminder", "Your confirmed CSC event is approaching. Review the latest schedule, venue, and event pass before attending.", "/member/events", "campaign", "orange"],
  EventUpdated: ["Event Details Updated", "Details for an event you registered for have changed. Review the latest event information before travelling.", "/member/events", "support", "light"],
  EventCancelled: ["Event Registration Update", "Your event registration has been cancelled or is no longer active. Sign in to review its current status.", "/member/events", "support", "light"],
  ConsultationReceived: ["Consultation Request Received", "Your consultation request has been saved. The CSC team will contact you when there is an update; this email does not confirm a meeting.", "/member/consultations", "onboarding", "sky"],
  ConsultationAdminAlert: ["New Consultation Request", "A consultation request has been submitted and is ready for authorized review.", "/admin/consultations", "workspace", "light"],
  ConsultationApproved: ["Consultation Request Approved", "Your consultation request has been approved. A meeting is confirmed only after a date and time are scheduled.", "/member/consultations", "milestone", "light"],
  ConsultationMoreInformation: ["More Information Needed", "The CSC team needs more information to continue reviewing your consultation request. Sign in to see its status.", "/member/consultations", "support", "light"],
  ConsultationScheduled: ["Your Consultation Is Scheduled", "Your consultation has been scheduled. Sign in to review the confirmed appointment time and any location or call details recorded by CSC.", "/member/consultations", "onboarding", "sky"],
  ConsultationCancelled: ["Consultation Update", "Your consultation schedule or request has changed. Sign in to review the current details.", "/member/consultations", "support", "light"],
  PaymentPendingVerification: ["Event Payment Review Update", "Payment verification is required for this event registration. No paid-event pass is issued until an authorized review is complete.", "/member/events", "payment", "light"],
  PaymentVerified: ["Event Payment Verified", "An authorized CSC reviewer has verified the recorded payment. Your event registration and pass status remain available in your account.", "/member/events", "payment", "light"],
  PaymentRejected: ["Event Payment Review Update", "The submitted event payment could not be verified. Sign in to review the status or contact CSC support. Do not reply with bank credentials.", "/member/events", "payment", "light"],
  PaymentRefunded: ["Event Payment Refund Update", "The authorized event payment record has been marked as refunded. Contact CSC support if you need settlement details.", "/member/events", "payment", "light"],
  StartupSubmissionReceived: ["Startup Submission Received", "Your startup information was saved and sent to the CSC admin team for review. It will appear publicly only after approval and publication.", "/member/startups", "onboarding", "sky"],
  StartupAdminAlert: ["Startup Submission Ready for Review", "A startup submission has been saved and is ready for authorized review.", "/admin/startups", "workspace", "light"],
  StartupApproved: ["Your Startup Is Published in the CSC Directory", "Your startup submission has been approved and published in the CSC Founder Directory. View the public listing below.", "/directory", "milestone", "light"],
  StartupStatusChanged: ["Startup Listing Update", "The publication status of your startup listing has changed. Sign in to review its current status.", "/member/startups", "support", "light"],
  CommunityReviewReceived: ["Review Received", "Your CSC review was saved and is awaiting moderation. If approved, it may be shown publicly with your consent.", "/member/reviews", "onboarding", "sky"],
  ReviewAdminAlert: ["Review Awaiting Moderation", "A community review has been submitted and is ready for authorized moderation.", "/admin/reviews", "workspace", "light"],
  ReviewModerationResult: ["Review Moderation Update", "The moderation status of your review has changed. Your submitted words are not changed by this notification.", "/member/reviews", "support", "light"],
  OperationalAlert: ["CSC Operational Alert", "A CSC operational issue requires authorized review in the notifications dashboard.", "/admin/notifications", "support", "light"],
} as const;

export type TemplateKey = keyof typeof definitions;
export function isTemplateKey(value: string): value is TemplateKey {
  return Object.hasOwn(definitions, value);
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function textValue(payload: Record<string, unknown>, key: string, max = 500) {
  const value = payload[key];
  if (typeof value === "string") return value.trim().slice(0, max);
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, max);
  return "";
}

function detailValue(key: string, value: string) {
  if (["startsAt", "endsAt", "scheduledAt", "previousStartsAt", "issuedAt"].includes(key)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
    }).format(date) + " (IST)";
  }
  if (key === "priceMinor") {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount / 100)
      : value;
  }
  if (key === "admission") return value === "free" ? "Free" : value === "paid" ? "Paid event" : value;
  if (key === "registrationState") return value === "open" ? "Registration open" : value.replace(/[-_]/g, " ");
  if (key === "applicantType") return value === "new_applicant" ? "New applicant" : value.replace(/[-_]/g, " ");
  if (key === "designation" || key === "startupStage") return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  if (key === "status") {
    const labels: Record<string, string> = {
      claim_submitted: "Claim received", pending_verification: "Under review", approved: "Approved",
      active: "Active member", rejected: "Rejected", suspended: "Suspended", revoked: "Revoked",
      confirmed: "Registration confirmed", waitlisted: "Waitlisted", pending_payment: "Payment pending",
      payment_verification: "Payment under review", scheduled: "Scheduled", published: "Published",
      pending: "Pending review", submitted: "Submitted", archived: "Archived",
    };
    return labels[value] ?? value.replace(/[-_]/g, " ");
  }
  return value;
}

const detailFields: Array<[string, string, number]> = [
  ["name", "Name", 100], ["reference", "UID", 100], ["email", "Email", 180],
  ["membershipNumber", "Membership number", 80], ["status", "Status", 80],
  ["eventTitle", "Event", 180], ["eventCategory", "Event type", 100],
  ["startsAt", "Starts", 80], ["endsAt", "Ends", 80], ["previousStartsAt", "Previous time", 80],
  ["venue", "Venue", 160], ["location", "Location", 160], ["admission", "Admission", 80],
  ["phone", "Phone", 40],
  ["registrationState", "Registration", 80], ["registrationDeadline", "Registration deadline", 80],
  ["priceMinor", "Event fee", 20],
  ["startupName", "Startup", 140], ["industry", "Industry", 100], ["startupStage", "Stage", 80],
  ["designation", "Professional role", 100], ["applicantType", "Applicant type", 80],
  ["startupAffiliation", "Startup affiliation", 140], ["goal", "Request", 400],
  ["scheduledAt", "Meeting time", 80], ["mode", "Meeting mode", 50], ["meetingLocation", "Meeting location", 180],
  ["rating", "Rating", 10], ["review", "Review", 800], ["website", "Website", 300],
  ["description", "Description", 600], ["reviewNote", "Review note", 500],
];

const asset = (base: string, file: string) => `${base}/email-assets/reference/${file}`;
const colors = {
  canvas: "#F8F6F3", cream: "#FBF8F3", white: "#FFFFFF", ink: "#333333",
  body: "#505050", muted: "#737373", divider: "#E7E3DE", orange: "#F57820",
  orangeHero: "#FF710B", blue: "#0755ED", sky: "#7ABAE9", purple: "#5734A5",
  navy: "#17153D", charcoal: "#4B5160",
} as const;

function safeAction(base: string, path: string) {
  const url = new URL(path, base);
  const origin = new URL(base);
  const localCapture = process.env.CSC_LOCAL_EMAIL_CAPTURE === "true"
    && process.env.VERCEL !== "1"
    && !process.env.VERCEL_ENV
    && origin.protocol === "http:"
    && ["localhost", "127.0.0.1"].includes(origin.hostname)
    && origin.port === "3107";
  if ((!localCapture && origin.protocol !== "https:") || url.origin !== base || url.username || url.password) throw new Error("Invalid CSC email action URL");
  return url.href;
}

function htmlDetails(rows: Array<[string, string]>) {
  if (!rows.length) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;margin:14px 0 22px;background:${colors.cream};border-radius:12px"><tbody>${rows.map(([label, value], index) => `<tr><td width="38%" style="padding:11px 10px 11px 18px;border-bottom:${index < rows.length - 1 ? `1px solid ${colors.divider}` : "0"};font-size:12px;line-height:20px;color:${colors.muted};vertical-align:top">${escapeHtml(label)}</td><td style="padding:11px 18px 11px 0;border-bottom:${index < rows.length - 1 ? `1px solid ${colors.divider}` : "0"};font-size:13px;line-height:20px;color:${colors.ink};font-weight:700;vertical-align:top;word-break:break-word;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>`;
}

function htmlFooter(base: string, support: string, dark: boolean) {
  const ink = dark ? "#F4F0FC" : colors.body;
  const muted = dark ? "#CBC4DC" : colors.muted;
  const social = [
    ["Instagram", `${base}/email-assets/reference/social-instagram.png`, "https://www.instagram.com/coimbatorestartupcommunity/"],
    ["WhatsApp group", `${base}/email-assets/reference/social-whatsapp.png`, "https://chat.whatsapp.com/EMaSXe8j6cA9s94hGOCEqf?s=cl&p=a&mlu=4&ilr=4"],
    ["Email CSC", `${base}/email-assets/reference/social-email.png`, `mailto:${support}`],
    ["CSC website", `${base}/email-assets/reference/social-website.png`, base],
  ];
  return `<tr><td align="center" style="padding:42px 36px 30px;background:${dark ? colors.navy : colors.white}"><p style="margin:0 auto 25px;max-width:420px;font-size:12px;line-height:20px;color:${ink}">Questions? We’re here to help. Visit <a href="${base}" style="color:${dark ? "#FFD865" : "#C2500A"};font-weight:800;text-decoration:none">CSC Circle</a> or email <a href="mailto:${escapeHtml(support)}" style="color:${dark ? "#FFD865" : "#C2500A"};font-weight:800;text-decoration:none;overflow-wrap:anywhere">${escapeHtml(support)}</a>.</p><hr style="width:160px;margin:0 auto 20px;border:0;border-top:1px solid ${dark ? "#51476D" : colors.divider}"><table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 22px"><tbody><tr>${social.map(([label, icon, href]) => `<td style="padding:0 10px"><a href="${href}" aria-label="${label}" style="text-decoration:none"><img src="${icon}" width="20" height="20" alt="${label}" style="display:block;border:0"></a></td>`).join("")}</tr></tbody></table><p style="margin:0 0 23px;font-size:11px;line-height:22px;color:${muted}"><a href="${base}" style="color:${ink};text-decoration:none">Website</a> &nbsp;·&nbsp; <a href="${safeAction(base, "/member/settings")}" style="color:${ink};text-decoration:none">Email preferences</a> &nbsp;·&nbsp; <a href="${safeAction(base, "/terms")}" style="color:${ink};text-decoration:none">Terms</a> &nbsp;·&nbsp; <a href="${safeAction(base, "/privacy")}" style="color:${ink};text-decoration:none">Privacy</a></p><p style="margin:0 0 4px;font-size:10px;line-height:17px;color:${muted}">CSC Circle<br>Coimbatore Startup Community · Coimbatore, Tamil Nadu · Estd 2026</p><p style="margin:10px 0 0;font-size:10px;line-height:17px;color:${muted}">Connect. Build. Grow.<br>© ${new Date().getFullYear()} CSC Circle. All rights reserved.</p></td></tr>`;
}

/** Table-based, inline-styled HTML follows the 600px reference frame for email-client compatibility. */
export function renderNotification(key: TemplateKey, payload: Record<string, unknown>) {
  const c = emailConfiguration();
  const [heading, body, path, artwork, tone] = definitions[key];
  if (key === "EventConfirmed") {
    const venue = textValue(payload, "venue", 160);
    const address = textValue(payload, "location", 300);
    payload = {
      ...payload,
      name: textValue(payload, "name", 100) || "Name unavailable",
      reference: textValue(payload, "reference", 100) || "UID pending",
      eventTitle: textValue(payload, "eventTitle", 180) || "Event",
      location: [venue, address].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(", ") || "Location to be confirmed",
      venue: "",
    };
  }
  const greetingName = textValue(payload, "name", 100);
  const greeting = greetingName ? `Hello ${greetingName},` : "Hello,";
  const rows: Array<[string, string]> = [];
  for (const [field, label, limit] of detailFields) {
    const value = textValue(payload, field, limit);
    if (value) rows.push([label, detailValue(field, value)]);
  }
  const details = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const slug = textValue(payload, "slug", 100);
  const targetPath = key === "EventPublishedBroadcast"
    ? (slug ? `/events/${encodeURIComponent(slug)}` : "/events")
    : key === "EventConfirmed"
      ? "/member/events"
    : key === "StartupApproved"
      ? (slug ? `/directory/${encodeURIComponent(slug)}` : "/directory")
      : path;
  const link = safeAction(c.base, targetPath);
  const eventPassQrCid = textValue(payload, "eventPassQrCid", 100);
  const eventPassQrMarkup = key === "EventConfirmed" && /^[a-z0-9@._-]+$/i.test(eventPassQrCid)
    ? `<div style="margin:22px auto;padding:18px;max-width:260px;border:1px solid ${colors.divider};border-radius:16px;text-align:center"><p style="margin:0 0 12px;color:${colors.ink};font-size:14px;font-weight:800">Your individual event pass QR</p><img src="cid:${escapeHtml(eventPassQrCid)}" width="220" height="220" alt="Unique QR code for your confirmed CSC event registration" style="display:block;width:220px;height:220px;margin:0 auto;border:0"><p style="margin:10px 0 0;color:${colors.muted};font-size:12px;line-height:18px">This QR is specific to your confirmed registration. Your official Event Pass PDF is attached to this email.</p></div>`
    : "";
  const buttonText = key === "EventPublishedBroadcast" ? (textValue(payload, "registrationState") === "open" ? "View event & register" : "View event details") : key === "MembershipApproved" ? "View my membership card" : key === "StartupApproved" ? "View directory listing" : key === "FirstLoginWelcome" ? "Explore my CSC profile" : "View in CSC Circle";
  const passText = key === "EventConfirmed"
    ? eventPassQrMarkup
      ? "\n\nYour individual event pass QR is attached to this email along with your official Event Pass PDF."
      : ""
    : "";
  const text = `${heading}\n\n${greeting}\n\n${body}${details ? `\n\n${details}` : ""}${passText}\n\n${buttonText}: ${link}\n\nQuestions? ${c.support}\nInstagram: https://www.instagram.com/coimbatorestartupcommunity/\nWhatsApp group: https://chat.whatsapp.com/EMaSXe8j6cA9s94hGOCEqf?s=cl&p=a&mlu=4&ilr=4\nWebsite: ${c.base}\n\nCSC Circle — Coimbatore Startup Community\nCoimbatore, Tamil Nadu · Estd 2026\nConnect. Build. Grow.`;
  const isOrange = tone === "orange";
  const isSky = tone === "sky";
  const brandBg = isOrange ? colors.orangeHero : colors.white;
  const heroBg = isOrange ? colors.orangeHero : isSky ? colors.sky : colors.white;
  const inverse = isOrange || isSky;
  const artAfter = isOrange || isSky;
  const imageMarkup = `<img src="${asset(c.base, `${artwork}.png`)}" width="${artAfter ? 600 : 280}" alt="" style="display:block;width:${artAfter ? "100%" : "70%"};max-width:${artAfter ? 600 : 280}px;height:auto;margin:${artAfter ? "20px auto 0" : "4px auto 26px"};border:0">`;
  const preview = escapeHtml(`${heading}. ${body}`.slice(0, 160));
  let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>@font-face{font-family:'Nunito Sans';src:url('${asset(c.base, "nunito-sans-latin.woff2")}') format('woff2');font-weight:400 800}body,table,td,a,p,h1{font-family:'Nunito Sans',Arial,Helvetica,sans-serif}a{color:inherit}@media only screen and (max-width:620px){.ref-canvas{padding:0!important}.ref-brand{padding:30px 18px 24px!important}.ref-section{padding-left:24px!important;padding-right:24px!important}.ref-hero{padding-left:22px!important;padding-right:22px!important}.ref-heading{font-size:32px!important;line-height:37px!important}.ref-copy{font-size:15px!important;line-height:25px!important}.ref-footer{padding:42px 22px 32px!important}.ref-detail-value{overflow-wrap:anywhere!important}}</style></head><body style="margin:0;padding:0;background:${colors.canvas};color:${colors.ink}"><div style="display:none!important;max-height:0;max-width:0;overflow:hidden;opacity:0">${preview}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.canvas}"><tbody><tr><td class="ref-canvas" align="center" style="padding:32px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${colors.white};border-collapse:separate;border-spacing:0"><tbody><tr><td class="ref-brand" align="center" style="padding:36px 24px 28px;background:${brandBg}"><img src="${c.base}/brand/csc-icon.png" width="78" height="78" alt="CSC Circle logo" style="display:block;width:78px;height:78px;margin:0 auto 14px;border:0;border-radius:50%"><p style="margin:0;color:${inverse ? "#FFFFFF" : colors.ink};font-size:14px;line-height:20px;font-weight:800;letter-spacing:.045em;text-align:center;white-space:nowrap">COIMBATORE STARTUP COMMUNITY</p></td></tr><tr><td align="center" style="padding:0 0 4px;background:${heroBg}">${!artAfter ? imageMarkup : ""}<h1 class="ref-heading" style="margin:0 auto 16px;padding:12px 38px 0;max-width:480px;color:${inverse ? "#FFFFFF" : colors.ink};font-size:40px;line-height:45px;font-weight:800;letter-spacing:-.035em;text-align:center">${escapeHtml(heading)}</h1>${artAfter ? imageMarkup : ""}</td></tr><tr><td class="ref-section" style="padding:20px 46px 8px;background:${colors.white}"><p class="ref-copy" style="margin:0 0 19px;color:${colors.body};font-size:16px;line-height:28px;text-align:center">${escapeHtml(greeting)}</p><p class="ref-copy" style="margin:0 0 19px;color:${colors.body};font-size:16px;line-height:28px;text-align:center;white-space:pre-line">${escapeHtml(body)}</p>${htmlDetails(rows)}<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:28px auto 30px"><tbody><tr><td align="center" style="border-radius:999px;background:${colors.orange};mso-padding-alt:14px 30px"><a href="${link}" style="display:inline-block;padding:14px 30px;border-radius:999px;background:${colors.orange};color:#fff;font-size:15px;line-height:22px;font-weight:800;text-align:center;text-decoration:none">${escapeHtml(buttonText)}</a></td></tr></tbody></table><p style="margin:0 0 18px;color:${colors.muted};font-size:12px;line-height:20px;text-align:center">This message relates to your CSC account or a request you submitted. Sensitive account and membership information remains in the signed-in portal.</p></td></tr>${htmlFooter(c.base, c.support, false)}</tbody></table></td></tr></tbody></table></body></html>`;
  if (eventPassQrMarkup) html = html.replace('<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:28px auto 30px">', `${eventPassQrMarkup}<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:28px auto 30px">`);
  return { subject: key === "FirstLoginWelcome" ? heading : `CSC Circle — ${heading}`, text, html };
}

/** Admin role invitation email on the shared reference frame, so it matches every other CSC email. */
export function renderAdminInvitationEmail(input: {
  greeting: string;
  roleName: string;
  message?: string;
  permissions: string[];
  expiration: string;
  invitationUrl: string;
  superAdminAllCount?: number;
}) {
  const c = emailConfiguration();
  const heading = "Administrator Invitation";
  const link = safeAction(c.base, input.invitationUrl);
  const imageMarkup = `<img src="${asset(c.base, "workspace.png")}" width="280" alt="" style="display:block;width:70%;max-width:280px;height:auto;margin:4px auto 26px;border:0">`;
  const preview = escapeHtml(`${heading}. You have been invited to join the CSC administration team as ${input.roleName}.`.slice(0, 160));
  const messageBox = input.message?.trim()
    ? `<p class="ref-copy" style="margin:0 0 20px;padding:14px 18px;border-radius:12px;background:${colors.cream};color:${colors.body};font-size:15px;line-height:24px;text-align:left;white-space:pre-line">${escapeHtml(input.message.trim())}</p>`
    : "";
  const permissionItems = input.permissions.map((permission) => `<li style="margin:0 0 9px;color:${colors.ink};font-size:14px;line-height:21px">${escapeHtml(permission)}</li>`).join("");
  const permissionsBox = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 22px;background:${colors.cream};border-radius:12px"><tbody><tr><td style="padding:16px 20px"><p style="margin:0 0 10px;color:${colors.muted};font-size:12px;line-height:20px;font-weight:800;letter-spacing:.03em;text-transform:uppercase">Your assigned permissions</p><ul style="margin:0;padding-left:20px">${permissionItems}</ul></td></tr></tbody></table>`;
  const superNote = input.superAdminAllCount
    ? `<p style="margin:0 0 18px;padding:12px 16px;border:1px solid #F2CC76;border-radius:12px;background:#FFF8E7;color:#755315;font-size:13px;line-height:20px;text-align:left"><strong>High privilege:</strong> Super Admin includes all ${input.superAdminAllCount} administrator permissions.</p>`
    : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>@font-face{font-family:'Nunito Sans';src:url('${asset(c.base, "nunito-sans-latin.woff2")}') format('woff2');font-weight:400 800}body,table,td,a,p,h1{font-family:'Nunito Sans',Arial,Helvetica,sans-serif}a{color:inherit}@media only screen and (max-width:620px){.ref-canvas{padding:0!important}.ref-brand{padding:30px 18px 24px!important}.ref-section{padding-left:24px!important;padding-right:24px!important}.ref-heading{font-size:32px!important;line-height:37px!important}.ref-copy{font-size:15px!important;line-height:25px!important}}</style></head><body style="margin:0;padding:0;background:${colors.canvas};color:${colors.ink}"><div style="display:none!important;max-height:0;max-width:0;overflow:hidden;opacity:0">${preview}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.canvas}"><tbody><tr><td class="ref-canvas" align="center" style="padding:32px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${colors.white};border-collapse:separate;border-spacing:0"><tbody><tr><td class="ref-brand" align="center" style="padding:36px 24px 28px;background:${colors.white}"><img src="${c.base}/brand/csc-icon.png" width="78" height="78" alt="CSC Circle logo" style="display:block;width:78px;height:78px;margin:0 auto 14px;border:0;border-radius:50%"><p style="margin:0;color:${colors.ink};font-size:14px;line-height:20px;font-weight:800;letter-spacing:.045em;text-align:center;white-space:nowrap">COIMBATORE STARTUP COMMUNITY</p></td></tr><tr><td align="center" style="padding:0 0 4px;background:${colors.white}">${imageMarkup}<h1 class="ref-heading" style="margin:0 auto 16px;padding:12px 38px 0;max-width:480px;color:${colors.ink};font-size:40px;line-height:45px;font-weight:800;letter-spacing:-.035em;text-align:center">${escapeHtml(heading)}</h1></td></tr><tr><td class="ref-section" style="padding:20px 46px 8px;background:${colors.white}"><p class="ref-copy" style="margin:0 0 19px;color:${colors.body};font-size:16px;line-height:28px;text-align:center">${escapeHtml(input.greeting)}</p><p class="ref-copy" style="margin:0 0 19px;color:${colors.body};font-size:16px;line-height:28px;text-align:center">You have been invited to join the Coimbatore Startup Community administration team as <strong style="color:${colors.ink}">${escapeHtml(input.roleName)}</strong>.</p>${messageBox}${permissionsBox}${superNote}<p style="margin:0 0 4px;color:${colors.muted};font-size:13px;line-height:21px;text-align:center">Invitation expires <strong style="color:${colors.ink}">${escapeHtml(input.expiration)}</strong>.</p><table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:26px auto 28px"><tbody><tr><td align="center" style="border-radius:999px;background:${colors.orange};mso-padding-alt:14px 30px"><a href="${link}" style="display:inline-block;padding:14px 30px;border-radius:999px;background:${colors.orange};color:#fff;font-size:15px;line-height:22px;font-weight:800;text-align:center;text-decoration:none">Accept Invitation</a></td></tr></tbody></table><p style="margin:0 0 18px;color:${colors.muted};font-size:12px;line-height:20px;text-align:center">Security notice: accept only if you recognize and trust the inviter. This single-use invitation is bound to the intended verified account.</p></td></tr>${htmlFooter(c.base, c.support, false)}</tbody></table></td></tr></tbody></table></body></html>`;
  return { html };
}
