"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  History,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EvidenceAuthBadge } from "./evidence-auth-badge";
import { AttributionBadge } from "./attribution-badge";
import { PaymentAuditTimeline } from "./payment-audit-timeline";
import { ManualReconciliationModal } from "./manual-reconciliation-modal";
import type { EnrichedAdminPaymentRow } from "@/types/admin-payments";

export function AdminPaymentsClient({
  initialRows,
  canVerify,
}: {
  initialRows: EnrichedAdminPaymentRow[];
  canVerify: boolean;
}) {
  const router = useRouter();
  const [rows] = React.useState<EnrichedAdminPaymentRow[]>(initialRows);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [authFilter, setAuthFilter] = React.useState<string>("all");
  const [attrFilter, setAttrFilter] = React.useState<string>("all");
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const [reconcileOrder, setReconcileOrder] = React.useState<EnrichedAdminPaymentRow | null>(null);

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      // Search filter
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        row.reference.toLowerCase().includes(q) ||
        row.attendee.toLowerCase().includes(q) ||
        row.event.toLowerCase().includes(q) ||
        (row.claimedUtr && row.claimedUtr.toLowerCase().includes(q)) ||
        (row.email && row.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== "all" && row.status !== statusFilter) return false;

      // Evidence Auth filter
      if (authFilter !== "all" && row.evidenceAuthStatus !== authFilter) return false;

      // Attribution filter
      if (attrFilter !== "all" && row.attributionStatus !== attrFilter) return false;

      return true;
    });
  }, [rows, search, statusFilter, authFilter, attrFilter]);

  const toggleExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order reference, attendee, email, or UTR..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="verified">Verified</option>
            <option value="failed">Failed / Expired</option>
          </select>

          {/* Evidence Auth Select */}
          <select
            value={authFilter}
            onChange={(e) => setAuthFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Auth Statuses</option>
            <option value="authenticated">Authenticated</option>
            <option value="needs_review">Needs Review</option>
            <option value="untrusted">Untrusted</option>
            <option value="forged">Forged</option>
            <option value="unlinked">No Evidence</option>
          </select>

          {/* Attribution Select */}
          <select
            value={attrFilter}
            onChange={(e) => setAttrFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Attributions</option>
            <option value="attributed">Auto Attributed</option>
            <option value="manual_attributed">Admin Attributed</option>
            <option value="unattributed">Unattributed</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="h-9 gap-1.5 text-xs text-slate-600 hover:text-slate-900"
            title="Refresh table"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Payment Ref</th>
                <th className="py-3 px-4">Attendee / Event</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Evidence Auth</th>
                <th className="py-3 px-4">Attribution</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No matching payments found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isExpanded = expandedRowId === row.id;
                  const canReconcile =
                    canVerify &&
                    row.isUpiOrder &&
                    row.status !== "verified" &&
                    row.status !== "reconciled";

                  return (
                    <React.Fragment key={row.id}>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                          {row.reference}
                          {row.claimedUtr && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              UTR: {row.claimedUtr}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{row.attendee}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{row.event}</p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ₹{row.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <EvidenceAuthBadge status={row.evidenceAuthStatus} />
                        </td>
                        <td className="py-3.5 px-4">
                          <AttributionBadge status={row.attributionStatus} />
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                              row.status === "verified" || row.status === "reconciled"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : row.status === "failed" || row.status === "expired"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {row.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canReconcile && (
                              <Button
                                size="sm"
                                onClick={() => setReconcileOrder(row)}
                                className="h-7 px-2.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-medium"
                              >
                                Reconcile
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(row.id)}
                              className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900"
                              title="Toggle audit timeline"
                            >
                              <History className="size-3.5 mr-1" />
                              {isExpanded ? (
                                <ChevronUp className="size-3" />
                              ) : (
                                <ChevronDown className="size-3" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Audit Timeline Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={7} className="py-4 px-6 border-y border-slate-200/60">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <ShieldCheck className="size-4 text-teal-600" />
                                  Audit Trail & Chronological Timeline for {row.reference}
                                </h4>
                                {row.evidence && (
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    Linked Bank UTR: {row.evidence.utr} (Account XX{row.evidence.receivingAccountSuffix})
                                  </span>
                                )}
                              </div>

                              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-inner">
                                <PaymentAuditTimeline items={row.timeline} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Reconciliation Modal */}
      {reconcileOrder && (
        <ManualReconciliationModal
          order={reconcileOrder}
          isOpen={Boolean(reconcileOrder)}
          onClose={() => setReconcileOrder(null)}
          onSuccess={() => {
            setReconcileOrder(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
