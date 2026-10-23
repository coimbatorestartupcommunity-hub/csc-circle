const memberDestinations = new Set([
  "/member", "/member/claim", "/member/id-card", "/member/profile", "/member/settings",
  "/member/startups", "/member/events", "/member/reviews", "/member/consultations",
]);

const actionLabels: Record<string, string> = {
  "claim.active": "View Membership Card",
  "claim.pending_verification": "View Application",
  "startup.submitted": "View Submission",
  "review.submitted": "View Review Status",
  "startup.published": "View Startup",
  "registration.submitted": "View Registration",
  "attendance.checked_in": "View Attendance",
  MembershipApproved: "View Membership Card",
  MembershipStatusChanged: "View Membership",
  EventConfirmed: "View Event Pass",
  EventWaitlisted: "View Registration",
  EventUpdated: "View Event Update",
  EventCancelled: "View Event Update",
  StartupApproved: "View Startup",
  StartupChangesRequested: "Update Startup",
  ConsultationScheduled: "View Consultation",
  "admin.invitation.received": "Review & Accept Invitation",
};

/** Stored notification destinations are untrusted input; allow only known same-origin app routes. */
export function notificationAction(type: string, value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  const path = value.split(/[?#]/, 1)[0];
  const invitationAction = path === "/admin/accept-invitation"
    && /^\/admin\/accept-invitation\?invitationId=[0-9a-f-]{36}$/i.test(value);
  const adminHomeAction = path === "/admin" && type === "admin.invitation.received";
  const safe = invitationAction || adminHomeAction || memberDestinations.has(path)
    || /^\/(events|directory|collaborations)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)
    || path === "/events";
  if (!safe) return null;
  return { href: value, label: adminHomeAction ? "Open Admin Dashboard" : actionLabels[type] ?? "View update" };
}
