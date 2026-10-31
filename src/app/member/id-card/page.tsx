import Link from "next/link";
import { IdCard, ShieldCheck, CalendarDays, MapPin, Ticket, Sparkles } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberIdCard } from "@/components/member/member-id-card";
import { EmptyState } from "@/components/common/empty-state";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { eventPassViewModel } from "@/lib/member/event-pass-view-model";
import { isPassEligible } from "@/types/member";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { membershipStatusMeta } from "@/lib/content/member-taxonomy";

export const metadata = { title: "Member ID & Events Pass" };

export default async function IdCardPage() {
  const ctx = await getMemberContext();
  const [profileRes, cardRes, registrationsRes] = await Promise.all([
    memberServices.getProfile(),
    memberServices.getCard(),
    memberServices.listRegistrations(),
  ]);

  const profile = profileRes.ok ? profileRes.data : null;
  const eventPasses = registrationsRes.ok
    ? registrationsRes.data.filter((registration) => isPassEligible(registration.status))
    : [];

  const status = profile?.membership.status ?? "not_started";
  const statusMeta = membershipStatusMeta[status];
  const memberNumber = cardRes.ok ? cardRes.data.memberNumber : profile?.membership.memberNumber;
  const fullName = cardRes.ok ? cardRes.data.fullName : profile?.fullName || "Member";

  return (
    <>
      <MemberPageHeader
        title="Member ID & Events Pass"
        description="Your verified CSC Member ID credential and confirmed event passes."
      />

      {/* Member ID Section */}
      <section id="member-id" aria-labelledby="member-id-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IdCard className="size-5 text-brand-ink" />
            <h2 id="member-id-heading" className="text-xl font-bold text-brand-ink">
              Member ID
            </h2>
          </div>
          <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-secondary">
            {statusMeta.label}
          </span>
        </div>

        {cardRes.ok ? (
          <div className="grid w-full gap-6 xl:grid-cols-[minmax(22rem,0.9fr)_minmax(0,1.1fr)] xl:items-center">
            <div className="flex justify-center rounded-3xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-7">
              <MemberIdCard card={cardRes.data} isDemo={ctx.mode === "preview"} />
            </div>
            <section className="flex h-full flex-col justify-center gap-5 rounded-3xl bg-brand-white p-6 ring-1 ring-brand-border sm:p-8">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-purple text-brand-accent">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-brand-ink">Your CSC membership credential</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-secondary">
                  This card reflects your verified membership status. Present it at eligible CSC community events; event registration and admission requirements are verified separately.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-brand-cloud p-4">
                  <p className="text-xs font-semibold tracking-wide text-brand-muted uppercase">Member</p>
                  <p className="mt-1 font-medium text-brand-ink">{cardRes.data.fullName}</p>
                </div>
                <div className="rounded-2xl bg-brand-cloud p-4">
                  <p className="text-xs font-semibold tracking-wide text-brand-muted uppercase">Membership ID</p>
                  <p className="mt-1 font-mono font-medium text-brand-ink">{cardRes.data.memberNumber}</p>
                </div>
                <div className="rounded-2xl bg-brand-cloud p-4">
                  <p className="text-xs font-semibold tracking-wide text-brand-muted uppercase">Designation</p>
                  <p className="mt-1 font-medium text-brand-ink">{cardRes.data.designationLabel || "Member"}</p>
                </div>
                <div className="rounded-2xl bg-brand-cloud p-4">
                  <p className="text-xs font-semibold tracking-wide text-brand-muted uppercase">Startup</p>
                  <p className="mt-1 font-medium text-brand-ink">{cardRes.data.startupName || "Coimbatore Startup Community"}</p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="grid w-full gap-6 lg:grid-cols-2">
            <div className="flex flex-col justify-center rounded-3xl bg-brand-white p-6 ring-1 ring-brand-border sm:p-8">
              {(() => {
                const needsPortrait = cardRes.error.message.toLowerCase().includes("portrait");
                return (
                  <EmptyState
                    icon={IdCard}
                    title={needsPortrait ? "Add your 4:5 portrait to complete your Member ID card." : "Your Member ID unlocks when your membership is active."}
                    description={cardRes.error.message}
                  >
                    <Link
                      href={needsPortrait ? "/member/profile#profile-portrait" : "/member/claim"}
                      prefetch={true}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-4 py-2.5 text-sm font-semibold text-brand-white hover:bg-brand-ink/90 shadow-2xs"
                    >
                      {needsPortrait ? "Upload a 4:5 portrait" : "Claim your membership"}
                    </Link>
                  </EmptyState>
                );
              })()}
            </div>
            <section className="flex flex-col justify-center gap-4 rounded-3xl bg-brand-white p-6 ring-1 ring-brand-border sm:p-8">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-purple text-brand-accent">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-brand-ink">Membership Account Details</h3>
                <p className="mt-1 text-sm text-brand-secondary">
                  Review your membership account status and assigned ID.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-brand-cloud p-4">
                  <p className="text-xs font-semibold tracking-wide text-brand-muted uppercase">Member</p>
                  <p className="mt-1 font-medium text-brand-ink">{fullName}</p>
                </div>
                <div className="rounded-2xl bg-brand-cloud p-4">
                  <p className="text-xs font-semibold tracking-wide text-brand-muted uppercase">Membership ID</p>
                  <p className="mt-1 font-mono font-medium text-brand-ink">{memberNumber || "Pending Issuance"}</p>
                </div>
                <div className="rounded-2xl bg-brand-cloud p-4 sm:col-span-2">
                  <p className="text-xs font-semibold tracking-wide text-brand-muted uppercase">Status</p>
                  <p className="mt-1 text-sm font-semibold text-brand-ink">{statusMeta.label}</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </section>

      {/* Events Pass Section */}
      <section id="event-passes" className="mt-10 flex flex-col gap-4" aria-labelledby="events-pass-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-brand-border pt-8">
          <div>
            <div className="flex items-center gap-2">
              <Ticket className="size-5 text-brand-accent" />
              <h2 id="events-pass-heading" className="text-xl font-bold text-brand-ink">
                Events Pass
              </h2>
            </div>
            <p className="mt-1 text-sm text-brand-secondary">
              View and download admission passes for your confirmed event registrations.
            </p>
          </div>
          <Link href="/member/events" prefetch={true} className="text-sm font-medium text-brand-accent hover:underline">
            All registrations ({registrationsRes.ok ? registrationsRes.data.length : 0})
          </Link>
        </div>

        {eventPasses.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {eventPasses.map((registration) => {
              const fields = eventPassViewModel(registration);
              return (
                <li key={registration.id} className="flex flex-col gap-3.5 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-brand-ink">{registration.eventTitle}</h3>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Confirmed Pass
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5 text-sm text-brand-muted">
                    <li className="flex items-center gap-2">
                      <CalendarDays className="size-4 shrink-0 text-brand-muted" aria-hidden />
                      {formatEventDate(registration.startsAt)} · {formatEventTime(registration.startsAt)} IST
                    </li>
                    <li className="flex items-start gap-2">
                      <MapPin className="size-4 shrink-0 text-brand-muted" aria-hidden />
                      <span><strong className="text-brand-ink">Location:</strong> {fields.location}</span>
                    </li>
                    <li><strong className="text-brand-ink">Pass UID:</strong> <span className="font-mono text-xs">{fields.uid}</span></li>
                    <li><strong className="text-brand-ink">Attendee:</strong> {fields.name}</li>
                  </ul>
                  <Link
                    href={`/member/events/${registration.id}`}
                    prefetch={true}
                    className="mt-auto inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 text-xs font-semibold text-brand-white transition hover:bg-brand-ink/90"
                  >
                    <Ticket className="size-4" aria-hidden /> View and download pass
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl bg-brand-white p-6 text-sm text-brand-muted ring-1 ring-brand-border text-center">
            <p>Confirmed event passes will appear here after you register for an event.</p>
            <Link
              href="/events"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2 text-xs font-semibold text-brand-ink hover:bg-brand-cloud"
            >
              Browse upcoming events
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
