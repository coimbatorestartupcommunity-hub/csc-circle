"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Clock, AlertTriangle, Loader2, ArrowRight } from "lucide-react";

export interface PaymentStatusBadgeProps {
  status:
    | "pending"
    | "processing"
    | "verified"
    | "reconciled"
    | "needs_review"
    | "expired"
    | "failed"
    | "cancelled"
    | string;
  orderReference?: string;
  passHref?: string | null;
  className?: string;
}

export function PaymentStatusBadge({
  status,
  orderReference,
  passHref,
  className = "",
}: PaymentStatusBadgeProps) {
  switch (status) {
    case "verified":
    case "reconciled":
      return (
        <div
          className={`flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 border border-emerald-200 ${className}`}
          role="status"
        >
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span>Payment Verified · Passes Issued</span>
          {passHref && (
            <Link
              href={passHref}
              className="ml-auto inline-flex items-center gap-1 font-semibold text-emerald-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
            >
              View Pass <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      );
    case "processing":
      return (
        <div
          className={`flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800 border border-teal-200 ${className}`}
          role="status"
        >
          <Loader2 className="size-4 animate-spin text-teal-600 shrink-0" />
          <span>Checking Bank Alert Reconciliation…</span>
        </div>
      );
    case "needs_review":
      return (
        <div
          className={`flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 border border-amber-200 ${className}`}
          role="status"
        >
          <Clock className="size-4 text-amber-600 shrink-0" />
          <span>Under Bank Review {orderReference ? `· Ref: ${orderReference}` : ""}</span>
        </div>
      );
    case "expired":
    case "failed":
    case "cancelled":
      return (
        <div
          className={`flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 border border-rose-200 ${className}`}
          role="alert"
        >
          <AlertTriangle className="size-4 text-rose-600 shrink-0" />
          <span>Payment Session {status === "expired" ? "Expired" : "Failed"}</span>
        </div>
      );
    default:
      return (
        <div
          className={`flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 ${className}`}
          role="status"
        >
          <Clock className="size-4 text-slate-500 shrink-0" />
          <span>Awaiting UPI Payment</span>
        </div>
      );
  }
}
