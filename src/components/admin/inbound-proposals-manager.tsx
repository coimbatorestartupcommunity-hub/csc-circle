"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Inbox,
  Loader2,
  Mail,
  Phone,
  Globe,
  Sparkles,
  Calendar,
  Building2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface InboundProposal {
  id: string;
  slug?: string | null;
  title: string;
  organization?: string | null;
  representative?: string | null;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  summary?: string | null;
  details?: string | null;
  benefits?: string | null;
  supportRequested?: string | null;
  venue?: string | null;
  capacity?: string | number | null;
  deadline?: string | null;
  referenceCode?: string | null;
  publicationStatus: "draft" | "published" | "archived" | string;
  pipelineStatus?: string | null;
  createdAt?: string | null;
}

interface InboundProposalsManagerProps {
  kind: "collaboration" | "event" | "opportunity";
  proposals: InboundProposal[];
  className?: string;
}

export function InboundProposalsManager({
  kind,
  proposals: initialProposals,
  className = "",
}: InboundProposalsManagerProps) {
  const router = useRouter();
  const [proposals, setProposals] = useState<InboundProposal[]>(initialProposals);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const kindLabels = {
    collaboration: "Partnership & Collaboration Proposals",
    event: "Host Event Proposals",
    opportunity: "Opportunity Submissions",
  }[kind];

  const publicUrlBase = {
    collaboration: "/collaborations",
    event: "/events",
    opportunity: "/opportunities",
  }[kind];

  const pendingCount = proposals.filter(
    (p) =>
      p.publicationStatus === "draft" ||
      p.pipelineStatus === "proposal" ||
      p.title.toLowerCase().includes("[proposal]")
  ).length;

  async function handleAction(id: string, action: "approve" | "reject" | "delete") {
    setProcessingId(`${id}:${action}`);
    try {
      const res = await fetch("/api/admin/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, action }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Action failed.");
      }

      if (action === "approve") {
        toast.success("Approved! Published directly to live website.");
        setProposals((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  publicationStatus: "published",
                  pipelineStatus: "active",
                  title: p.title.replace(/^\[Proposal\]\s*/i, ""),
                }
              : p
          )
        );
      } else if (action === "reject") {
        toast.info("Proposal archived / cancelled.");
        setProposals((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  publicationStatus: "archived",
                  pipelineStatus: "cancelled",
                }
              : p
          )
        );
      } else if (action === "delete") {
        toast.success("Proposal deleted.");
        setProposals((prev) => prev.filter((p) => p.id !== id));
      }

      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to execute moderation action.");
    } finally {
      setProcessingId(null);
    }
  }

  const displayedProposals = proposals.filter((p) => {
    if (activeTab === "pending") {
      return (
        p.publicationStatus === "draft" ||
        p.pipelineStatus === "proposal" ||
        p.title.toLowerCase().includes("[proposal]")
      );
    }
    return true;
  });

  return (
    <div className={`flex flex-col gap-4 rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-7 shadow-xs ${className}`}>
      {/* Top Banner and Trigger Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-cloud text-brand-ink">
            <Inbox className="size-5 text-brand-accent" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-brand-ink">
                {kindLabels}
              </h2>
              {pendingCount > 0 ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 ring-1 ring-amber-300">
                  {pendingCount} Pending Review
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  All Reviewed
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-brand-secondary">
              Community proposals submitted from the public website. Review details and approve with one click to publish live.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setOpen(!open)}
          className={`shrink-0 gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer min-h-11 ${
            pendingCount > 0
              ? "bg-amber-600 text-white hover:bg-amber-700"
              : "bg-brand-ink text-white hover:bg-brand-ink/90"
          }`}
        >
          <span>{open ? "Hide Proposals" : `Review Proposals (${pendingCount})`}</span>
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>

      {/* Expandable Proposals Drawer */}
      {open && (
        <div className="mt-4 flex flex-col gap-4 border-t border-brand-border/60 pt-5">
          {/* Sub-tabs */}
          <div className="flex items-center justify-between border-b border-brand-border/40 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "pending"
                    ? "bg-brand-ink text-white shadow-2xs"
                    : "bg-brand-cloud text-brand-secondary hover:text-brand-ink"
                }`}
              >
                Pending Submissions ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "all"
                    ? "bg-brand-ink text-white shadow-2xs"
                    : "bg-brand-cloud text-brand-secondary hover:text-brand-ink"
                }`}
              >
                All History ({proposals.length})
              </button>
            </div>
          </div>

          {/* List of Proposals */}
          {displayedProposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="size-10 text-emerald-600" />
              <h3 className="mt-3 text-base font-bold text-brand-ink">
                No Pending Proposals
              </h3>
              <p className="mt-1 max-w-sm text-xs text-brand-secondary">
                All submitted community proposals have been reviewed. New submissions from the public website will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {displayedProposals.map((item) => {
                const isPublished = item.publicationStatus === "published";
                const isArchived = item.publicationStatus === "archived" || item.pipelineStatus === "cancelled";
                const isBusy = (action: string) => processingId === `${item.id}:${action}`;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-cloud/40 p-5 text-sm shadow-xs transition hover:bg-brand-cloud/70 hover:shadow-sm"
                  >
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-brand-ink">
                            {item.title}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                              isPublished
                                ? "bg-emerald-100 text-emerald-800"
                                : isArchived
                                ? "bg-slate-200 text-slate-700"
                                : "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                            }`}
                          >
                            {isPublished ? "Published (Live)" : isArchived ? "Archived" : "Pending Review"}
                          </span>
                          {item.referenceCode && (
                            <span className="font-mono text-[11px] font-semibold text-brand-muted">
                              Ref: {item.referenceCode}
                            </span>
                          )}
                        </div>

                        {/* Meta row */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-brand-secondary">
                          {item.organization && (
                            <span className="flex items-center gap-1 font-semibold text-brand-ink">
                              <Building2 className="size-3.5 text-brand-muted" /> {item.organization}
                            </span>
                          )}
                          {item.representative && (
                            <span className="flex items-center gap-1 font-medium">
                              <User className="size-3.5 text-brand-muted" /> {item.representative} {item.designation ? `(${item.designation})` : ""}
                            </span>
                          )}
                          {item.email && (
                            <a
                              href={`mailto:${item.email}`}
                              className="flex items-center gap-1 font-medium text-brand-accent hover:underline"
                            >
                              <Mail className="size-3.5" /> {item.email}
                            </a>
                          )}
                          {item.phone && (
                            <a
                              href={`tel:${item.phone}`}
                              className="flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                            >
                              <Phone className="size-3.5" /> {item.phone}
                            </a>
                          )}
                          {item.website && (
                            <a
                              href={item.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-medium text-sky-700 hover:underline"
                            >
                              <Globe className="size-3.5" /> Website
                            </a>
                          )}
                          {item.createdAt && (
                            <span className="text-[11px] text-brand-muted">
                              Submitted: {new Date(item.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Badge / Category */}
                      {item.category && (
                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-accent shadow-2xs ring-1 ring-brand-border">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {/* Summary / Proposal Rationale */}
                    {item.summary && (
                      <div className="rounded-xl bg-white p-3.5 text-xs leading-relaxed text-brand-ink ring-1 ring-brand-border/60">
                        <strong className="block text-brand-secondary font-semibold mb-1">
                          Rationale &amp; Objectives:
                        </strong>
                        <p>{item.summary}</p>
                      </div>
                    )}

                    {/* Benefits or Detailed Outline */}
                    {item.benefits && (
                      <div className="rounded-xl bg-emerald-50/70 p-3.5 text-xs leading-relaxed text-emerald-950 ring-1 ring-emerald-200">
                        <strong className="block text-emerald-800 font-semibold mb-1">
                          Benefits Offered to Coimbatore Founders:
                        </strong>
                        <p>{item.benefits}</p>
                      </div>
                    )}

                    {/* Support Requested */}
                    {item.supportRequested && (
                      <div className="rounded-xl bg-sky-50/70 p-3.5 text-xs leading-relaxed text-sky-950 ring-1 ring-sky-200">
                        <strong className="block text-sky-800 font-semibold mb-1">
                          Support Requested from CSC Circle:
                        </strong>
                        <p>{item.supportRequested}</p>
                      </div>
                    )}

                    {/* Venue / Timing (Events) */}
                    {(item.venue || item.capacity || item.deadline) && (
                      <div className="flex flex-wrap items-center gap-3 text-xs text-brand-secondary font-medium">
                        {item.venue && <span>📍 Venue: <strong>{item.venue}</strong></span>}
                        {item.capacity && <span>👥 Capacity: <strong>{item.capacity} attendees</strong></span>}
                        {item.deadline && <span>⏳ Deadline: <strong>{item.deadline}</strong></span>}
                      </div>
                    )}

                    {/* Actions Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border/60 pt-3">
                      <div className="flex items-center gap-2">
                        {isPublished && item.slug && (
                          <a
                            href={`${publicUrlBase}/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-accent hover:bg-brand-cloud shadow-2xs"
                          >
                            <span>View Live on Site</span>
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!isPublished && (
                          <Button
                            type="button"
                            onClick={() => handleAction(item.id, "approve")}
                            disabled={Boolean(processingId)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 cursor-pointer"
                          >
                            {isBusy("approve") ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-3.5" />
                            )}
                            <span>Approve &amp; Publish Live</span>
                          </Button>
                        )}

                        {!isArchived && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleAction(item.id, "reject")}
                            disabled={Boolean(processingId)}
                            className="inline-flex items-center gap-1.5 rounded-xl border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-secondary hover:bg-slate-50 cursor-pointer"
                          >
                            {isBusy("reject") ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <XCircle className="size-3.5 text-amber-600" />
                            )}
                            <span>Reject / Cancel</span>
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to permanently delete this proposal?")) {
                              handleAction(item.id, "delete");
                            }
                          }}
                          disabled={Boolean(processingId)}
                          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          {isBusy("delete") ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
