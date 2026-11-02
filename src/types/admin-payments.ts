import type { AdminPaymentRow, PaymentStatusAdmin } from "./admin";

export type EvidenceAuthStatus =
  | "authenticated"
  | "needs_review"
  | "untrusted"
  | "forged"
  | "unlinked";

export type AttributionStatus =
  | "attributed"
  | "unattributed"
  | "manual_attributed";

export type AdminPaymentStatus =
  | PaymentStatusAdmin
  | "reconciled"
  | "expired"
  | "cancelled"
  | "processing"
  | "needs_review";

export interface PaymentEvidenceSummary {
  id: string;
  bank: string;
  direction: "CREDIT" | "DEBIT";
  amountPaise: number;
  amountRupees: number;
  utr: string;
  receivingAccountSuffix: string;
  transactionTime: string;
  transactionInfoRaw: string;
  senderEmail: string;
  payerName?: string | null;
  authStatus: EvidenceAuthStatus;
  authDetails?: {
    dkim?: { pass: boolean; domain?: string };
    spf?: { pass: boolean };
    mta?: { boundary?: string; provenance?: boolean };
  };
  reconciliationState: "unmatched" | "matched" | "ambiguous" | "underpaid" | "ignored";
  matchedOrderId?: string | null;
}

export interface PaymentTimelineItem {
  id: string;
  stage:
    | "order_created"
    | "utr_claimed"
    | "bank_evidence_received"
    | "auth_evaluated"
    | "reconciliation_reviewed"
    | "manual_attribution"
    | "payment_reconciled"
    | "manual_reconciliation_rejected";
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "pending" | "warning" | "error" | "info";
  metadata?: Record<string, unknown>;
}

export interface EnrichedAdminPaymentRow extends Omit<AdminPaymentRow, "status"> {
  status: AdminPaymentStatus;
  isUpiOrder?: boolean;
  eventId?: string;
  email?: string;
  whatsapp?: string;
  organization?: string;
  attendeeCount?: number;
  claimedUtr?: string | null;
  evidenceId?: string | null;
  evidenceAuthStatus: EvidenceAuthStatus;
  attributionStatus: AttributionStatus;
  matchedAt?: string | null;
  matchedBy?: "automated_worker" | "user_utr_claim" | "admin_manual" | null;
  notes?: string | null;
  evidence?: PaymentEvidenceSummary | null;
  timeline: PaymentTimelineItem[];
  candidateEvidences?: PaymentEvidenceSummary[];
}
