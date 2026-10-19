import Link from "next/link";
import { MessagesSquare, CalendarClock, UserCheck } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { StatusBadge } from "@/components/member/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { memberServices } from "@/lib/services/member/services";
import { consultationStatusMeta } from "@/lib/content/member-taxonomy";
import { formatEventDate } from "@/lib/format";

export const metadata = { title: "Consultations" };

export default async function ConsultationsPage() {
  const res = await memberServices.listConsultations();
  const consultations = res.ok ? res.data : [];

  return (
    <>
      <MemberPageHeader
        title="My consultations"
        description="Track your consultation requests and their status."
        action={
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-3.5 py-2 text-sm font-medium text-brand-white hover:bg-brand-ink/90"
          >
            Request a consultation
          </Link>
        }
      />

      {consultations.length > 0 ? (
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
      ) : (
        <EmptyState
          icon={MessagesSquare}
          title="No consultation requests yet."
          description="Request a consultation from the Events page to get tailored guidance."
        >
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-ink px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-ink/90"
          >
            Request a consultation
          </Link>
        </EmptyState>
      )}
    </>
  );
}
