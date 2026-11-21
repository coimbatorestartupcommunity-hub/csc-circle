import Link from "next/link";
import { MessagesSquare, CalendarClock, UserCheck } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { StatusBadge } from "@/components/member/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { memberServices } from "@/lib/services/member/services";
import { getMemberContext } from "@/lib/services/member/context";
import { consultationStatusMeta } from "@/lib/content/member-taxonomy";
import { formatEventDate } from "@/lib/format";
import { BookOfficeHours } from "@/components/member/book-office-hours";

export const metadata = { title: "Consultations & Founder Office Hours" };

export default async function ConsultationsPage() {
  const [ctx, res, profileRes] = await Promise.all([
    getMemberContext(),
    memberServices.listConsultations(),
    memberServices.getProfile(),
  ]);

  const consultations = res.ok ? res.data : [];
  const profile = profileRes.ok ? profileRes.data : null;

  return (
    <div className="flex flex-col gap-6">
      <MemberPageHeader
        title="Founder Office Hours & Consultations"
        description="Book 1:1 advisory sessions with mentors, engineering leads, and grant advisors."
      />

      <BookOfficeHours
        userFullName={profile?.fullName}
        userEmail={ctx.user?.email || undefined}
        userStartup={profile?.membership?.memberNumber ? profile.fullName : ""}
      />

      {consultations.length > 0 ? (
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
      ) : (
        <EmptyState
          icon={MessagesSquare}
          title="No past consultation requests."
          description="Schedule a 1:1 consultation above to get strategic engineering and grant guidance."
        />
      )}
    </div>
  );
}
