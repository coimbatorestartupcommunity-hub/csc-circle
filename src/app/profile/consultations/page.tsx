import Link from "next/link";
import { MessagesSquare, CalendarClock, UserCheck, Sparkles } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { StatusBadge } from "@/components/member/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { memberServices } from "@/lib/services/member/services";
import { getMemberContext } from "@/lib/services/member/context";
import { consultationStatusMeta } from "@/lib/content/member-taxonomy";
import { formatEventDate } from "@/lib/format";
import { ConsultationForm } from "@/components/events/rsvp-form";

export const metadata = { title: "Consultations & Founder Guidance" };

export default async function ConsultationsPage() {
  const [ctx, res] = await Promise.all([
    getMemberContext(),
    memberServices.listConsultations(),
  ]);

  const consultations = res.ok ? res.data : [];

  return (
    <div className="flex flex-col gap-8">
      <MemberPageHeader
        title="Founder Guidance & Consultations"
        description="Request complimentary 1:1 advisory sessions with seasoned engineering leads, seed mentors, and grant advisors."
      />

      {/* 1:1 Founder Guidance Consultation Form — Exact Contact Page Layout & Style */}
      <div
        id="consultation"
        className="flex flex-col gap-6 rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-10 shadow-xs ring-1 ring-brand-border"
      >
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
            <Sparkles className="size-3.5" /> 1:1 Founder Guidance
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-ink">Request a Founder Consultation</h2>
          <p className="text-sm leading-relaxed text-brand-secondary">
            Are you an early-stage founder navigating product architecture, technical validation, TANSEED grants, or investor pitch decks? Submit your details below. Our advisory committee evaluates requests weekly to schedule a complimentary 30-minute virtual guidance session.
          </p>
        </div>
        <ConsultationForm />
      </div>

      {consultations.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-bold text-brand-ink">Your Scheduled & Past Sessions</h3>
          <ul className="flex flex-col gap-4">
            {consultations.map((c) => {
              const meta = consultationStatusMeta[c.status];
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <h3 className="font-semibold text-brand-ink">{c.title}</h3>
                      <p className="text-sm text-brand-muted">
                        Submitted {formatEventDate(c.submittedAt)}
                        {c.goal ? ` · ${c.goal}` : ""}
                      </p>
                    </div>
                    <StatusBadge label={meta.label} tone={meta.tone} />
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-brand-muted">
                    {c.assignedRep ? (
                      <span className="inline-flex items-center gap-1.5">
                        <UserCheck className="size-4" /> {c.assignedRep}
                      </span>
                    ) : null}
                    {c.scheduledAt ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-4" />
                        {formatEventDate(c.scheduledAt)}
                        {c.mode ? ` · ${c.mode === "online" ? "Online" : "In person"}` : ""}
                      </span>
                    ) : null}
                  </div>
                  {c.memberNotes ? (
                    <p className="rounded-xl bg-brand-cloud p-3 text-sm text-brand-secondary">
                      {c.memberNotes}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
