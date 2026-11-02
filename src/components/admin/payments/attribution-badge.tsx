"use client";

import * as React from "react";
import { Link2, UserCheck, Unlink } from "lucide-react";
import type { AttributionStatus } from "@/types/admin-payments";

const attrConfig: Record<
  AttributionStatus,
  { label: string; bg: string; text: string; icon: typeof Link2 }
> = {
  attributed: {
    label: "Auto Attributed",
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    icon: Link2,
  },
  manual_attributed: {
    label: "Admin Attributed",
    bg: "bg-purple-50 border-purple-200",
    text: "text-purple-700",
    icon: UserCheck,
  },
  unattributed: {
    label: "Unattributed",
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-500",
    icon: Unlink,
  },
};

export function AttributionBadge({ status }: { status: AttributionStatus }) {
  const cfg = attrConfig[status] || attrConfig.unattributed;
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
