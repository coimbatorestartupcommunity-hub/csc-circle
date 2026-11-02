"use client";

import * as React from "react";
import { ShieldCheck, AlertTriangle, ShieldAlert, Ban, HelpCircle } from "lucide-react";
import type { EvidenceAuthStatus } from "@/types/admin-payments";

const statusConfig: Record<
  EvidenceAuthStatus,
  { label: string; bg: string; text: string; icon: typeof ShieldCheck }
> = {
  authenticated: {
    label: "Authenticated",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    icon: ShieldCheck,
  },
  needs_review: {
    label: "Needs Review",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: AlertTriangle,
  },
  untrusted: {
    label: "Untrusted",
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-700",
    icon: ShieldAlert,
  },
  forged: {
    label: "Forged",
    bg: "bg-red-100 border-red-300",
    text: "text-red-800",
    icon: Ban,
  },
  unlinked: {
    label: "No Evidence",
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-500",
    icon: HelpCircle,
  },
};

export function EvidenceAuthBadge({ status }: { status: EvidenceAuthStatus }) {
  const cfg = statusConfig[status] || statusConfig.unlinked;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text}`}
    >
      <Icon className="size-3.5" />
      {cfg.label}
    </span>
  );
}
