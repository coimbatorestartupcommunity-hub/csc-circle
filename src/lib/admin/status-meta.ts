import type { NotificationStatus, PaymentStatusAdmin } from "@/types/admin";

export const paymentStatusMeta: Record<PaymentStatusAdmin, { label: string; tone: string }> = {
  awaiting_payment: { label: "Awaiting payment", tone: "bg-brand-gold text-brand-ink" },
  pending_verification: { label: "Pending verification", tone: "bg-brand-gold text-brand-ink" },
  verified: { label: "Verified", tone: "bg-green-100 text-green-700" },
  failed: { label: "Failed", tone: "bg-brand-red text-brand-ink" },
  rejected: { label: "Rejected", tone: "bg-brand-red text-brand-ink" },
  refunded: { label: "Refunded", tone: "bg-brand-cloud text-brand-muted" },
  partially_refunded: { label: "Partially refunded", tone: "bg-brand-cloud text-brand-muted" },
};

export const notificationStatusMeta: Record<NotificationStatus, { label: string; tone: string }> = {
  processing: { label: "Processing", tone: "bg-brand-blue text-brand-ink" },
  failed_retryable: { label: "Retry scheduled", tone: "bg-brand-gold text-brand-ink" },
  failed_permanent: { label: "Needs review", tone: "bg-brand-red text-brand-ink" },
  queued: { label: "Queued", tone: "bg-brand-blue text-brand-ink" },
  sent: { label: "SMTP accepted", tone: "bg-green-100 text-green-700" },
  failed: { label: "Failed", tone: "bg-brand-red text-brand-ink" },
  retrying: { label: "Retrying", tone: "bg-brand-gold text-brand-ink" },
};

export const publicationStatusMeta: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-brand-cloud text-brand-muted" },
  pending: { label: "Pending", tone: "bg-brand-gold text-brand-ink" },
  published: { label: "Published", tone: "bg-green-100 text-green-700" },
  archived: { label: "Archived", tone: "bg-brand-cloud text-brand-muted" },
  scheduled: { label: "Scheduled", tone: "bg-brand-blue text-brand-ink" },
  expired: { label: "Expired", tone: "bg-brand-cloud text-brand-muted" },
  unpublished: { label: "Unpublished", tone: "bg-brand-gold text-brand-ink" },
  deleted: { label: "Deleted", tone: "bg-brand-red text-brand-ink" },
  cancelled: { label: "Cancelled", tone: "bg-brand-red text-brand-ink" },
};
