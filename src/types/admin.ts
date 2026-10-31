/**
 * Admin-domain types (Phase 4). Reuses shared member/event statuses so the
 * public site, member portal and admin dashboard use ONE set of models.
 */

import type {
  ConsultationStatus,
  EventRegistration,
  MembershipStatus,
  RegistrationStatus,
  ReviewModerationStatus,
} from "@/types/member";
import type { AdminRole } from "@/lib/admin/permissions";

export type { MembershipStatus, RegistrationStatus, ConsultationStatus, ReviewModerationStatus };

export interface AdminMemberRow {
  id: string;
  memberNumber?: string;
  fullName: string;
  email: string;
  whatsapp?: string;
  designation?: string;
  startup?: string;
  status: MembershipStatus;
  joinedAt: string;
  updatedAt: string;
}

export interface AdminMemberDetails {
  portraitUrl?: string;
  profileCompletion?: number;
  lastSignInAt?: string;
  claims: { id: string; status: string; submittedAt: string; applicantType: string; startup?: string }[];
  startups: { id: string; name: string; slug: string; industry: string; status: string; updatedAt: string }[];
  registrations: { id: string; eventTitle: string; startsAt: string; reference: string; status: string; payment: string; attendance: string; checkedInAt?: string; createdAt: string }[];
  consultations: { id: string; title: string; status: string; scheduledAt?: string; submittedAt: string }[];
  audit: { action: string; actorRole?: string; targetType?: string; createdAt: string }[];
}

export interface AdminClaimRow {
  id: string;
  reference: string;
  applicantName: string;
  email?: string;
  whatsapp?: string;
  applicantType: "existing_member" | "new_applicant";
  designation?: string;
  submittedAt: string;
  startup?: string;
  declarationAccurate?: boolean;
  status: MembershipStatus;
  reviewer?: string;
}

export interface AdminStartupRow {
  id: string;
  name: string;
  slug: string;
  founder: string;
  industry: string;
  description: string;
  publicationConsent: boolean;
  publicationConsentAt?: string;
  website?: string;
  collaboration: string[];
  status: "draft" | "pending" | "published" | "archived";
  submittedAt: string;
  updatedAt: string;
  details?: Record<string, unknown>;
  privateDetails?: Record<string, unknown>;
  directoryImagePath?: string;
  logoPath?: string;
  city?: string;
}

export interface AdminEventRow {
  id: string;
  slug?: string;
  title: string;
  category: string;
  startsAt: string;
  venue?: string;
  capacity?: number;
  confirmed: number;
  waitlisted: number;
  status: "draft" | "published" | "cancelled" | "archived";
  admission: "free" | "paid";
  registrationState?: string;
  isCompleted?: boolean;
}

export type PaymentStatusAdmin =
  | "awaiting_payment"
  | "pending_verification"
  | "verified"
  | "failed"
  | "rejected"
  | "refunded"
  | "partially_refunded";

export interface AdminPaymentRow {
  id: string;
  reference: string;
  registrationReference: string;
  attendee: string;
  event: string;
  amount: number;
  currency: string;
  method?: string;
  status: PaymentStatusAdmin;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface AdminReviewRow {
  id: string;
  reviewer: string;
  rating: number;
  excerpt: string;
  submittedAt: string;
  status: ReviewModerationStatus;
}

export interface AdminConsultationRow {
  id: string;
  reference: string;
  fullName: string;
  startup?: string;
  whatsapp?: string;
  email?: string;
  requested: string;
  submittedAt: string;
  assignedTo?: string;
  status: ConsultationStatus;
  scheduledAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  actorRole: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  correlationId?: string;
}

export type MediaCategory =
  | "branding"
  | "team"
  | "community"
  | "startup_logo"
  | "event_banner"
  | "speaker"
  | "gallery";

export interface MediaAsset {
  id: string;
  filename: string;
  altText?: string;
  type: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  category: MediaCategory;
  visibility: "public" | "private";
  createdAt: string;
}

export type NotificationStatus = "queued" | "processing" | "sent" | "available" | "superseded" | "failed" | "retrying" | "failed_retryable" | "failed_permanent";

export interface NotificationRecord {
  id: string;
  type: string;
  channel: "in_app" | "email" | "whatsapp";
  recipient: string;
  status: NotificationStatus;
  attempts?: number;
  lastError?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
}

export interface ContentBlock {
  key: string;
  label: string;
  value: string;
  status: "draft" | "scheduled" | "published" | "expired" | "unpublished" | "archived" | "deleted";
  updatedAt: string;
  visibleFrom?: string;
  visibleUntil?: string;
  deletedAt?: string;
}

export interface AdminRoleAssignment {
  userId: string;
  email: string;
  roles: AdminRole[];
  assignedAt: string;
}

export interface DashboardMetric {
  key: string;
  label: string;
  value: number;
  href?: string;
}

export interface AdminDashboardData {
  metrics: DashboardMetric[];
  pendingStartupCount?: number;
  recentClaims: AdminClaimRow[];
  upcomingEvents: AdminEventRow[];
  pendingRegistrations: EventRegistration[];
  recentConsultations: AdminConsultationRow[];
  reviewQueue: AdminReviewRow[];
  recentAudit: AuditLog[];
  ratingDistribution: { rating: number; count: number }[];
  registrationsByEvent: { event: string; count: number }[];
}
