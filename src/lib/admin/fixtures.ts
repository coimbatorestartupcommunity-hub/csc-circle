/**
 * DEMO admin fixtures — NOT REAL DATA. Served only through the dev-gated admin
 * preview. Never present in production (fail-closed gate). Clearly labelled.
 */

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
import type { EventRegistration } from "@/types/member";

const d = (daysAgo: number) => {
  const x = new Date("2026-10-19T10:00:00+05:30");
  x.setDate(x.getDate() - daysAgo);
  return x.toISOString();
};

export const demoMembers: AdminMemberRow[] = [
  { id: "m1", memberNumber: "CSC-2026-000001", fullName: "Demo Member A", email: "a@example.com", whatsapp: "+91 90000 00001", designation: "Startup Founder", startup: "Sample AI Studio", status: "active", joinedAt: d(40), updatedAt: d(2) },
  { id: "m2", fullName: "Demo Member B", email: "b@example.com", designation: "Developer", status: "pending_verification", joinedAt: d(6), updatedAt: d(1) },
  { id: "m3", fullName: "Demo Member C", email: "c@example.com", designation: "Investor", status: "claim_submitted", joinedAt: d(3), updatedAt: d(3) },
  { id: "m4", memberNumber: "CSC-2026-000002", fullName: "Demo Member D", email: "d@example.com", designation: "Mentor", startup: "Sample SaaS Labs", status: "suspended", joinedAt: d(90), updatedAt: d(10) },
];

export const demoClaims: AdminClaimRow[] = [
  { id: "cl1", reference: "CLM-DEMO-0001", applicantName: "Demo Member B", applicantType: "new_applicant", submittedAt: d(6), startup: "—", status: "pending_verification", reviewer: "Demo Super Admin" },
  { id: "cl2", reference: "CLM-DEMO-0002", applicantName: "Demo Member C", applicantType: "existing_member", submittedAt: d(3), startup: "Sample Fund", status: "claim_submitted" },
];

export const demoStartups: AdminStartupRow[] = [
  { id: "s1", name: "Sample AI Studio", founder: "Demo Founder A", industry: "Artificial Intelligence", website: "https://example.com", collaboration: ["Open to Collaboration"], status: "published", updatedAt: d(5) },
  { id: "s2", name: "Sample SaaS Labs", founder: "Demo Founder B", industry: "SaaS", collaboration: ["Seeking Technology Support"], status: "pending", updatedAt: d(1) },
];

export const demoEvents: AdminEventRow[] = [
  { id: "e1", title: "Sample Founder Meetup", category: "Meetup", startsAt: d(-14), venue: "Sample Venue", capacity: 60, confirmed: 24, waitlisted: 3, status: "published", admission: "free" },
  { id: "e2", title: "Sample Pitch Session", category: "Pitch Session", startsAt: d(-28), venue: "Sample Venue", capacity: 40, confirmed: 12, waitlisted: 0, status: "draft", admission: "free" },
];

export const demoRegistrations: EventRegistration[] = [
  { id: "r1", eventId: "e1", eventTitle: "Sample Founder Meetup", startsAt: d(-14), endsAt: d(-14), location: "Coimbatore", reference: "CSC-REG-DEMO-0001", status: "confirmed", payment: "not_required", attendance: "not_attended", memberName: "Demo Member A", createdAt: d(2) },
  { id: "r2", eventId: "e1", eventTitle: "Sample Founder Meetup", startsAt: d(-14), endsAt: d(-14), location: "Coimbatore", reference: "CSC-REG-DEMO-0002", status: "pending_review", payment: "not_required", attendance: "not_attended", memberName: "Demo Member B", createdAt: d(1) },
  { id: "r3", eventId: "e2", eventTitle: "Sample Pitch Session", startsAt: d(-28), endsAt: d(-28), location: "Coimbatore", reference: "CSC-REG-DEMO-0003", status: "pending_payment", payment: "pending", attendance: "not_attended", memberName: "Demo Member C", createdAt: d(1) },
];

export const demoPayments: AdminPaymentRow[] = [
  { id: "p1", reference: "PAY-DEMO-0001", registrationReference: "CSC-REG-DEMO-0003", attendee: "Demo Member C", event: "Sample Pitch Session", amount: 500, currency: "INR", method: "Manual / UPI", status: "pending_verification" },
  { id: "p2", reference: "PAY-DEMO-0002", registrationReference: "CSC-REG-DEMO-0009", attendee: "Demo Member D", event: "Sample Workshop", amount: 1000, currency: "INR", method: "Manual / UPI", status: "verified", verifiedAt: d(4), verifiedBy: "Demo Finance Reviewer" },
];

export const demoReviews: AdminReviewRow[] = [
  { id: "rv1", reviewer: "Demo Member A", rating: 5, excerpt: "Great community, lots of value…", submittedAt: d(8), status: "submitted" },
  { id: "rv2", reviewer: "Demo Member D", rating: 4, excerpt: "Helpful connections and events…", submittedAt: d(12), status: "approved" },
];

export const demoConsultations: AdminConsultationRow[] = [
  { id: "co1", reference: "CON-DEMO-0001", fullName: "Demo Member C", startup: "Sample Fund", whatsapp: "+91 90000 00003", email: "c@example.com", requested: "Funding Opportunities", submittedAt: d(3), status: "under_review" },
  { id: "co2", reference: "CON-DEMO-0002", fullName: "Demo Member A", startup: "Sample AI Studio", requested: "Technical Support", submittedAt: d(10), assignedTo: "Demo Community Admin", status: "scheduled", scheduledAt: d(-5) },
];

export const demoAudit: AuditLog[] = [
  { id: "au1", action: "events.publish", actorId: "demo", actorRole: "event_manager", targetType: "event", targetId: "e1", createdAt: d(5) },
  { id: "au2", action: "members.approve", actorId: "demo", actorRole: "community_admin", targetType: "membership", targetId: "m1", createdAt: d(40) },
  { id: "au3", action: "reviews.moderate", actorId: "demo", actorRole: "content_manager", targetType: "review", targetId: "rv2", createdAt: d(12) },
];

export const demoNotifications: NotificationRecord[] = [
  { id: "n1", type: "membership_claim_submitted", channel: "in_app", recipient: "Demo Member B", status: "sent", createdAt: d(6), sentAt: d(6) },
  { id: "n2", type: "payment_verification_required", channel: "email", recipient: "Demo Member C", status: "queued", createdAt: d(1) },
  { id: "n3", type: "registration_confirmed", channel: "whatsapp", recipient: "Demo Member A", status: "failed", createdAt: d(2) },
];

export const demoMedia: MediaAsset[] = [
  { id: "md1", filename: "csc-logo.png", altText: "CSC Circle logo", type: "image/png", width: 1254, height: 1254, sizeBytes: 340000, category: "branding", visibility: "public", createdAt: d(30) },
  { id: "md2", filename: "community.png", altText: "Community group photo", type: "image/png", width: 1501, height: 1048, sizeBytes: 2865940, category: "community", visibility: "public", createdAt: d(20) },
];

export const demoContent: ContentBlock[] = [
  { key: "home.announcement", label: "Homepage announcement", value: "Welcome to CSC Circle — Connect. Build. Grow.", status: "published", updatedAt: d(7) },
  { key: "home.intro", label: "Community introduction", value: "CSC Circle brings Coimbatore's founders together.", status: "published", updatedAt: d(7) },
  { key: "stats.founders", label: "Stat — founders (unpublished)", value: "0", status: "draft", updatedAt: d(7) },
];

export const demoDashboard: AdminDashboardData = {
  metrics: [
    { key: "accounts", label: "Website accounts", value: 128, href: "/admin/members" },
    { key: "active", label: "Active memberships", value: 42, href: "/admin/members" },
    { key: "claims", label: "Pending claims", value: 2, href: "/admin/membership-claims" },
    { key: "events", label: "Published events", value: 1, href: "/admin/events" },
    { key: "rsvps", label: "Pending RSVPs", value: 2, href: "/admin/registrations" },
    { key: "confirmed", label: "Confirmed registrations", value: 24, href: "/admin/registrations" },
    { key: "consults", label: "Pending consultations", value: 1, href: "/admin/consultations" },
    { key: "payments", label: "Payments to verify", value: 1, href: "/admin/payments" },
    { key: "reviews", label: "Approved reviews", value: 1, href: "/admin/reviews" },
    { key: "attendance", label: "Total check-ins", value: 36, href: "/admin/attendance" },
  ],
  recentClaims: demoClaims,
  upcomingEvents: demoEvents,
  pendingRegistrations: demoRegistrations.filter((r) => r.status.startsWith("pending")),
  recentConsultations: demoConsultations,
  reviewQueue: demoReviews.filter((r) => r.status === "submitted"),
  recentAudit: demoAudit,
  ratingDistribution: [
    { rating: 5, count: 8 },
    { rating: 4, count: 3 },
    { rating: 3, count: 1 },
    { rating: 2, count: 0 },
    { rating: 1, count: 0 },
  ],
  registrationsByEvent: [
    { event: "Founder Meetup", count: 24 },
    { event: "Pitch Session", count: 12 },
  ],
};
