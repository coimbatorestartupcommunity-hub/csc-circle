"use client";

import * as React from "react";
import { CheckCircle2, Clock, AlertCircle, ShieldAlert } from "lucide-react";
import type { PaymentTimelineItem } from "@/types/admin-payments";

export function PaymentAuditTimeline({ items }: { items: PaymentTimelineItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="py-2 text-xs text-slate-400 italic">
        No audit trail events recorded for this order yet.
      </div>
    );
  }

  const getIcon = (status: PaymentTimelineItem["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="size-4 text-emerald-600" />;
      case "warning":
        return <AlertCircle className="size-4 text-amber-500" />;
      case "error":
        return <ShieldAlert className="size-4 text-rose-600" />;
      default:
        return <Clock className="size-4 text-teal-600" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {items.map((item) => (
        <div key={item.id} className="relative group">
          <div className="absolute -left-6 top-0.5 bg-white rounded-full p-0.5 ring-2 ring-white">
            {getIcon(item.status)}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900">{item.title}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(item.timestamp).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <pre className="mt-1 text-[10px] bg-slate-50 border border-slate-200/80 rounded-lg p-2 overflow-x-auto text-slate-700 font-mono max-h-32">
                {JSON.stringify(item.metadata, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
