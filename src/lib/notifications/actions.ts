const memberDestinations = new Set([
  "/profile", "/profile/claim", "/profile/id-card", "/profile/account", "/profile/settings",
  "/profile/startups", "/profile/events", "/profile/reviews", "/profile/consultations",
  "/member", "/member/claim", "/member/id-card", "/member/profile", "/member/settings",
  "/member/startups", "/member/events", "/member/reviews", "/member/consultations",
  "/admin/membership-claims", "/admin/members", "/admin/startups", "/admin/reviews", "/admin/events",
  "/admin/consultations", "/admin/registrations",
]);

const actionLabels: Record<string, string> = {
  "claim.active": "View Membership Card",
  "claim.pending_verification": "View Application",
  "startup.submitted": "View Submission",
  "startup.revision.submitted": "View Submission",
  "startup.revision.approved": "View Startup",
  "review.submitted": "View Review Status",
  "review.approved": "View Review",
  "review.rejected": "View Review",
  "review.update": "View Review",
  "startup.published": "View Startup",
  "registration.submitted": "View Registration",
  "attendance.checked_in": "View Attendance",
  MembershipApproved: "View Membership Card",
  MembershipStatusChanged: "View Membership",
  EventConfirmed: "Open My Events",
  EventWaitlisted: "View Registration",
  EventUpdated: "View Event Update",
  EventCancelled: "View Event Update",
  StartupApproved: "View Startup",
  StartupChangesRequested: "Update Startup",
  ConsultationScheduled: "View Consultation",
  "admin.invitation.received": "Review & Accept Invitation",
};

/** Stored notification destinations are untrusted input; allow only known same-origin app routes. */
export function notificationAction(type: string, value: string | null, isAdmin?: boolean) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  const path = value.split(/[?#]/, 1)[0];
  const invitationAction = path === "/admin/accept-invitation"
    && /^\/admin\/accept-invitation\?invitationId=[0-9a-f-]{36}$/i.test(value);
  const adminHomeAction = path === "/admin" && type === "admin.invitation.received";
  const safe = invitationAction || adminHomeAction || memberDestinations.has(path)
    || /^\/member\/events\/[0-9a-f-]{36}$/i.test(path)
    || /^\/profile\/events\/[0-9a-f-]{36}$/i.test(path)
    || /^\/(events|directory|collaborations)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)
    || path === "/events";
  if (!safe) return null;

  let href = value;
  let label = adminHomeAction ? "Open Admin Dashboard" : actionLabels[type] ?? "View update";

  if (isAdmin) {
    if (type === "claim.pending_verification" || path === "/member/claim" || path === "/profile/claim") {
      href = "/admin/membership-claims";
      label = "View Application";
    } else if (type === "startup.submitted" || type === "startup.revision.submitted") {
      href = "/admin/startups";
      label = "View Submission";
    } else if (type === "review.submitted") {
      href = "/admin/reviews";
      label = "View Review Status";
    }
  } else {
    if (path === "/member/claim") {
      href = "/profile/claim";
    }
  }

  return { href, label };
}
