import { emailConfiguration } from "@/lib/notifications/config";
import { escapeHtml } from "@/lib/notifications/email-components";
import { renderMerakiEditorialEmail } from "@/lib/notifications/template-meraki";

export { escapeHtml };

/** CSC versions of the reference collection's transactional and lifecycle families. */
export const definitions = {
  GuestEmailVerification: ["Verify Your Email for CSC Event Checkout", "Use the verification code below to continue your CSC event payment. The code expires in 10 minutes. If you did not request it, you can ignore this message.", "/events", "verification", "light"],
  EventReviewRequest: ["How Was Your CSC Event?", "Thank you for attending. Share your rating and experience in My Ratings and Reviews. Your feedback helps CSC plan future events.", "/profile/reviews", "support", "light"],
  FirstLoginWelcome: ["Welcome to CSC Circle", "Welcome to Coimbatore Startup Community. Connect with founders, discover events, and build your profile at your own pace.", "/profile/account", "welcome", "orange"],
  MembershipApplicationReceived: ["Membership Application Received", "We received your CSC membership application. Membership is free; your card will be available after the community team approves your claim.", "/profile/claim", "onboarding", "sky"],
  MembershipAdminAlert: ["New Membership Application", "A membership application has been submitted and is ready for authorized review.", "/admin/membership-claims", "workspace", "light"],
  MembershipApproved: ["Your CSC Membership Card Is Ready", "Your free CSC membership has been approved. Sign in to view and download your digital membership card directly on your profile. No payment is required for the membership card.", "/profile/id-card", "milestone", "light"],
  MembershipRejected: ["Membership Application Update", "There is an update to your membership application. Sign in to review the decision and any next steps.", "/profile/claim", "support", "light"],
  MembershipMoreInformation: ["CSC Membership Status Update", "Your CSC membership claim has been submitted for review. Sign in to see its current status and any next steps.", "/profile/claim", "verification", "light"],
  MembershipStatusChanged: ["Membership Status Update", "Your CSC membership status has changed. Sign in to view the current status of your account and card.", "/profile/id-card", "milestone", "light"],
  EventPublishedBroadcast: ["A new CSC event is open", "A new event has been published by Coimbatore Startup Community. Review the date, location, admission details, and registration information below.", "/events", "campaign", "orange"],
  EventRSVPReceived: ["Event Registration Received", "Your event registration was received. We will email you when its status changes. A received registration is not a seat confirmation.", "/profile/events", "onboarding", "sky"],
  EventRSVPAdminAlert: ["New Event Registration", "A registration or event enquiry has been saved and is ready for authorized review.", "/admin/registrations", "workspace", "light"],
  EventConfirmed: ["Your Event Registration Is Confirmed", "Your registration is confirmed.\n\nEvent pass: You can view, save, and download your verified digital event pass directly from your Profile page on the website. No PDF is attached to this email.\n\nMembership ID: To request a Coimbatore Startup Community membership card, choose Digital ID from your profile menu, submit your details, and wait for review.", "/profile/events", "milestone", "light"],
  EventRegistrationNotConfirmed: ["Event Registration Update", "We could not confirm your event registration. Review the note below or contact CSC Circle if you need help.", "/events", "support", "light"],
  PaidEventRegistrationReceived: ["Registration Received — Payment Verification Pending", "We received your CSC event registration and payment proof. Your place is not confirmed until an authorized CSC reviewer verifies the payment.", "/events", "payment", "light"],
  PaidEventRegistrationConfirmed: ["Your CSC Event Registration Is Confirmed", "Your payment has been verified and your event registration is confirmed. You can view and download your verified pass on your Profile page at any time.", "/profile/events", "milestone", "light"],
  PaidEventRegistrationNotConfirmed: ["CSC Event Registration Update", "We could not confirm your event registration. Review the note below or contact CSC Circle if you need help.", "/events", "support", "light"],
  EventWaitlisted: ["Event Waitlist Update", "You have been added to the event waitlist. A place is not reserved unless CSC later confirms your registration.", "/profile/events", "support", "light"],
  EventReminder: ["Upcoming CSC Event Reminder", "Your confirmed CSC event is approaching. Review the latest schedule, venue, and your verified event pass on your profile page before attending.", "/profile/events", "campaign", "orange"],
  EventUpdated: ["Event Details Updated", "Details for an event you registered for have changed. Review the latest event information before travelling.", "/profile/events", "support", "light"],
  EventCancelled: ["Event Registration Update", "Your event registration has been cancelled or is no longer active. Sign in to review its current status on your profile.", "/profile/events", "support", "light"],
  ConsultationReceived: ["Consultation Request Received", "Your consultation request has been saved. The CSC team will contact you when there is an update; this email does not confirm a meeting.", "/profile/consultations", "onboarding", "sky"],
  ConsultationAdminAlert: ["New Consultation Request", "A consultation request has been submitted and is ready for authorized review.", "/admin/consultations", "workspace", "light"],
  ConsultationApproved: ["Consultation Request Approved", "Your consultation request has been approved. A meeting is confirmed only after a date and time are scheduled.", "/profile/consultations", "milestone", "light"],
  ConsultationMoreInformation: ["More Information Needed", "The CSC team needs more information to continue reviewing your consultation request. Sign in to see its status.", "/profile/consultations", "support", "light"],
  ConsultationScheduled: ["Your Consultation Is Scheduled", "Your consultation has been scheduled. Sign in to review the confirmed appointment time and any location or call details recorded by CSC.", "/profile/consultations", "onboarding", "sky"],
  ConsultationCancelled: ["Consultation Update", "Your consultation schedule or request has changed. Sign in to review the current details.", "/profile/consultations", "support", "light"],
  PaymentPendingVerification: ["Event Payment Review Update", "Payment verification is required for this event registration. Your pass will be unlocked on your profile as soon as review is complete.", "/profile/events", "payment", "light"],
  PaymentVerified: ["Event Payment Verified", "An authorized CSC reviewer has verified the recorded payment. Your verified event pass is ready to view and download on your profile.", "/profile/events", "payment", "light"],
  PaymentRejected: ["Event Payment Review Update", "The submitted event payment could not be verified. Sign in to review the status or contact CSC support. Do not reply with bank credentials.", "/profile/events", "payment", "light"],
  PaymentRefunded: ["Event Payment Refund Update", "The authorized event payment record has been marked as refunded. Contact CSC support if you need settlement details.", "/profile/events", "payment", "light"],
  StartupSubmissionReceived: ["Startup Submission Received", "Your startup information was saved and sent to the CSC admin team for review. It will appear publicly only after approval and publication.", "/profile/startups", "onboarding", "sky"],
  StartupAdminAlert: ["Startup Submission Ready for Review", "A startup submission has been saved and is ready for authorized review.", "/admin/startups", "workspace", "light"],
  StartupApproved: ["Your Startup Is Published in the CSC Directory", "Your startup submission has been approved and published in the CSC Founder Directory. View the public listing below.", "/directory", "milestone", "light"],
  StartupStatusChanged: ["Startup Listing Update", "The publication status of your startup listing has changed. Sign in to your profile to review its current status.", "/profile/startups", "support", "light"],
  CommunityReviewReceived: ["Review Received", "Your CSC review was saved and is awaiting moderation. If approved, it may be shown publicly with your consent.", "/profile/reviews", "onboarding", "sky"],
  ReviewAdminAlert: ["Review Awaiting Moderation", "A community review has been submitted and is ready for authorized moderation.", "/admin/reviews", "workspace", "light"],
  ReviewModerationResult: ["Review Moderation Update", "The moderation status of your review has changed. Your submitted words are not changed by this notification.", "/profile/reviews", "support", "light"],
  OperationalAlert: ["CSC Operational Alert", "A CSC operational issue requires authorized review in the notifications dashboard.", "/admin/notifications", "support", "light"],
} as const;

export type TemplateKey = keyof typeof definitions;
export function isTemplateKey(value: string): value is TemplateKey {
  return Object.hasOwn(definitions, value);
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
  ["verificationCode", "Verification code", 12],
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
  return `
    <div style="margin:20px 0 24px;padding:18px 20px;background:#FAF9F6;border:1px solid #E2E8F0;border-radius:16px;text-align:left;box-sizing:border-box;">
      <p style="margin:0 0 12px;font-family:'Courier New',ui-monospace,monospace;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748B;">
        ✦ APPLICATION &amp; RECORD DETAILS
      </p>
      ${rows.map(([label, value]) => `
        <p style="margin:0 0 8px;font-size:13px;line-height:22px;color:#334155;">
          <span style="color:#0F766E;font-weight:bold;margin-right:6px;">✦</span>
          <strong style="color:#0F172A;font-weight:700;">${escapeHtml(label)}:</strong>
          <span style="${label.toLowerCase().includes("uid") || label.toLowerCase().includes("verification") ? "font-family:'Courier New',ui-monospace,monospace;font-weight:700;color:#0F766E;" : "color:#334155;"}margin-left:4px;">${escapeHtml(value)}</span>
        </p>
      `).join("")}
    </div>
  `;
}

/**
 * Renders 100% of all CSC notifications using Template A: MERAKI Editor.
 * Featuring fluid mobile responsiveness, the 7 Core Leaders, Technical Partner badge, and 7 governance links.
 */
export function renderNotification(key: TemplateKey, payload: Record<string, unknown>) {
  const c = emailConfiguration();
  const [heading, body, path] = definitions[key];
  const effectiveHeading =
    key === "EventConfirmed" && (payload.totalAmountPaid !== undefined || payload.amountPaise !== undefined || payload.priceMinor !== undefined)
      ? "Payment Successful & Event Registration Confirmed"
      : key === "EventRSVPAdminAlert" && (payload.totalAmountPaid !== undefined || payload.amountPaise !== undefined || payload.priceMinor !== undefined)
      ? "New Verified Paid Event Registration"
      : heading;

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
  const verificationUrl = textValue(payload, "verificationUrl", 500);
  const targetPath = key === "GuestEmailVerification" && verificationUrl
    ? verificationUrl
    : key === "EventPublishedBroadcast"
      ? (slug ? `/events/${encodeURIComponent(slug)}` : "/events")
      : key === "EventConfirmed"
        ? "/profile/events"
      : key === "StartupApproved"
        ? (slug ? `/directory/${encodeURIComponent(slug)}` : "/directory")
        : path;
  const link = safeAction(c.base, targetPath);

  const eventPassQrCid = textValue(payload, "eventPassQrCid", 100);
  const eventPassQrMarkup = key === "EventConfirmed" && /^[a-z0-9@._-]+$/i.test(eventPassQrCid)
    ? `<div style="margin:22px auto;padding:20px 16px;max-width:440px;border:1px solid #E2E8F0;border-radius:18px;background:#F8FAFC;text-align:center;box-sizing:border-box;"><div style="display:inline-block;padding:4px 12px;background:#CCFBF1;color:#0F766E;font-size:11px;font-weight:800;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">Official Digital Event Pass</div><h3 style="margin:0 0 8px;color:#1E293B;font-size:16px;font-weight:800;">Your individual event pass QR</h3><p style="margin:0 0 14px;color:#64748B;font-size:12px;line-height:18px;">Your verified digital event pass is ready. You can view, save, and download it directly from your Profile on the website.</p><div style="padding:12px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;display:inline-block;margin:0 auto 16px;box-shadow:0 4px 12px rgba(0,0,0,0.05);"><img src="cid:${escapeHtml(eventPassQrCid)}" width="200" height="200" alt="Unique individual QR pass for your confirmed CSC event registration" style="display:block;width:200px;height:200px;margin:0 auto;border:0;" /></div><div style="text-align:left;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:14px 16px;margin-bottom:16px;"><p style="margin:0 0 8px;color:#1E293B;font-size:12px;font-weight:800;">Entry &amp; Session Check-in:</p><ol style="margin:0;padding-left:16px;color:#475569;font-size:11px;line-height:20px;"><li><strong>View &amp; Save Pass:</strong> Visit your Profile &rarr; Events on the website to view and download your verified pass.</li><li><strong>Online Sessions:</strong> Check-in portal opens 1 hour before start to access Google Meet.</li><li><strong>In-Person Sessions:</strong> Present this QR pass on your phone at entrance registration.</li></ol></div><div style="margin:12px auto 4px;"><a href="${c.base}/profile/events" style="display:inline-block;padding:12px 26px;border-radius:999px;background:#0D9488;color:#FFFFFF;font-size:13px;font-weight:800;text-decoration:none;box-shadow:0 2px 8px rgba(13,148,136,0.3);">View Pass on Your Profile &rarr;</a></div><p style="margin:8px 0 0;color:#64748B;font-size:10px;">Portal: ${c.base}/profile/events</p></div>`
    : "";

  const guestVerificationMarkup = key === "GuestEmailVerification" && verificationUrl
    ? `<div style="margin:20px auto 16px;padding:20px 16px;border:1px solid #14B8A6;border-radius:18px;background:#F0FDFA;text-align:center;box-sizing:border-box;"><div style="display:inline-block;padding:4px 12px;background:#CCFBF1;color:#0F766E;font-size:11px;font-weight:800;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">1-Click Instant Verification</div><h3 style="margin:0 0 6px;color:#0F766E;font-size:16px;font-weight:800;">Verify Email &amp; Proceed to Payment</h3><p style="margin:0 0 14px;color:#134E4A;font-size:12px;line-height:18px;">Click the button below to verify your email automatically and proceed directly to checkout.</p><div style="margin:12px auto 6px;"><a href="${link}" style="display:inline-block;padding:13px 26px;border-radius:999px;background:#0D9488;color:#FFFFFF;font-size:14px;font-weight:800;text-decoration:none;box-shadow:0 3px 10px rgba(13,148,136,0.3);">Verify Email &amp; Complete Checkout &rarr;</a></div><p style="margin:10px 0 0;color:#0F766E;font-size:10px;">Link expires in 10 minutes. If you prefer manual entry, use the 6-digit code shown above.</p></div>`
    : "";

  const buttonText = key === "GuestEmailVerification"
    ? "Verify Email & Complete Checkout"
    : key === "EventPublishedBroadcast"
      ? (textValue(payload, "registrationState") === "open" ? "View event & register" : "View event details")
      : key === "MembershipApproved"
        ? "View my membership card"
        : key === "StartupApproved"
          ? "View directory listing"
          : key === "EventConfirmed"
            ? "View & Download Event Pass"
            : key === "FirstLoginWelcome"
              ? "Explore my CSC profile"
              : "View in CSC Circle";

  const passText = key === "EventConfirmed"
    ? "\n\n--- INDIVIDUAL EVENT PASS & ENTRY INSTRUCTIONS ---\n" +
      "1. View & Download Your Pass: You can view, save, and download your verified pass on your CSC Profile page at: " + c.base + "/profile/events\n" +
      "2. Online Sessions: Visit the check-in portal on the event day (opens 1 hour prior to session start) to scan your QR and access Google Meet.\n" +
      "3. In-Person Sessions: Present your QR code at the entrance desk for instant check-in."
    : "";

  const text = `${effectiveHeading}\n\n${greeting}\n\n${body}${details ? `\n\n${details}` : ""}${passText}\n\n${buttonText}: ${link}\n\nQuestions? ${c.support}\nInstagram: https://www.instagram.com/coimbatorestartupcommunity/\nWhatsApp group: https://chat.whatsapp.com/EsMyFEUTzT0G3MpMLkUNhB?s=cl&p=a&iam=2\nWebsite: ${c.base}\n\nCSC Circle — Coimbatore Startup Community\nCoimbatore, Tamil Nadu · Estd 2026\nConnect. Build. Grow.`;

  const detailsHtml = htmlDetails(rows);

  const html = renderMerakiEditorialEmail({
    base: c.base,
    support: c.support,
    badgeText: "COIMBATORE STARTUP COMMUNITY ✦",
    headline: effectiveHeading,
    greeting,
    body,
    buttonText,
    buttonUrl: link,
    htmlDetailsContent: detailsHtml,
    customMarkup: guestVerificationMarkup || eventPassQrMarkup,
    thumbtackNote: key === "EventConfirmed"
      ? "Your registration is confirmed. View your pass anytime on your profile."
      : key === "FirstLoginWelcome"
      ? "Welcome to Coimbatore's leading founder & builder network."
      : "Consistency matters more than frequency in early ventures.",
  });

  return { subject: key === "FirstLoginWelcome" ? heading : `CSC Circle — ${effectiveHeading}`, text, html };
}

/** Admin role invitation email formatted using Template A (Meraki style). */
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

  const messageBox = input.message?.trim()
    ? `<div style="margin:0 0 18px;padding:14px 18px;border-radius:12px;background:#FAF8F5;border-left:4px solid #7D8B53;color:#2D3748;font-size:13px;line-height:22px;text-align:left;white-space:pre-line;box-sizing:border-box;">${escapeHtml(input.message.trim())}</div>`
    : "";

  const permissionItems = input.permissions.map((p) => `
    <td valign="top" style="padding:4px 4px;width:50%;box-sizing:border-box;">
      <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;padding:8px 8px;font-size:10px;font-weight:700;color:#334155;line-height:14px;">
        ✦ ${escapeHtml(p)}
      </div>
    </td>
  `).join("");

  const permissionsBox = `
    <div style="margin:18px 0 20px;padding:16px 16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;text-align:left;box-sizing:border-box;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#475569;">
        Your Assigned Administrative Permissions (${input.permissions.length})
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr>
          ${permissionItems}
        </tr>
      </table>
    </div>
  `;

  const superNote = input.superAdminAllCount
    ? `<div style="margin:0 0 18px;padding:12px 16px;border:1px solid #F2CC76;border-radius:12px;background:#FFF8E7;color:#755315;font-size:12px;line-height:18px;text-align:left;box-sizing:border-box;"><strong>High Privilege:</strong> Super Admin includes all ${input.superAdminAllCount} system administrator permissions.</div>`
    : "";

  const customMarkup = `
    ${messageBox}
    ${permissionsBox}
    ${superNote}
    <p style="margin:14px 0;font-size:12px;color:#64748B;text-align:center;">
      Invitation expires: <strong style="color:#1E293B;">${escapeHtml(input.expiration)}</strong>
    </p>
    <p style="margin:10px 0 0;font-size:11px;color:#94A3B8;text-align:center;">
      Security Notice: Accept only if you recognize and trust the CSC inviter. This single-use invitation is bound to your authorized email.
    </p>
  `;

  const html = renderMerakiEditorialEmail({
    base: c.base,
    support: c.support,
    badgeText: "CSC ADMINISTRATIVE INVITATION",
    headline: heading,
    headlineItalic: input.roleName,
    greeting: input.greeting,
    body: `You have been officially invited to join the Coimbatore Startup Community administration team as ${input.roleName}.`,
    buttonText: "Accept Invitation",
    buttonUrl: link,
    customMarkup,
  });

  return { html };
}
