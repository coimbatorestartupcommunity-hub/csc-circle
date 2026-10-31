import Link from "next/link";
import { IdCard, ShieldCheck } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberIdCard } from "@/components/member/member-id-card";
import { EmptyState } from "@/components/common/empty-state";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { eventPassViewModel } from "@/lib/member/event-pass-view-model";
import { isPassEligible } from "@/types/member";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { formatEventDate, formatEventTime } from "@/lib/format";

export const metadata = { title: "Digital ID" };

export default async function IdCardPage() {
  const ctx = await getMemberContext();
  const [cardRes, registrationsRes] = await Promise.all([
    memberServices.getCard(),
    memberServices.listRegistrations(),
  ]);
  const eventPasses = registrationsRes.ok
    ? registrationsRes.data.filter((registration) => isPassEligible(registration.status))
    : [];

  if (!cardRes.ok) {
    const needsPortrait = cardRes.error.message.toLowerCase().includes("portrait");
    return (
      <>
        <MemberPageHeader title="Digital membership ID" />
        <EmptyState
          icon={IdCard}
          title={needsPortrait ? "Add your 4:5 portrait to complete your digital ID." : "Your digital ID unlocks when your membership is active."}
          description={cardRes.error.message}
        >
          <Link
            href={needsPortrait ? "/member/profile#profile-portrait" : "/member/claim"}
            prefetch={true}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-ink px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-ink/90"
          >
            {needsPortrait ? "Upload a 4:5 portrait" : "Claim your membership"}
          </Link>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <MemberPageHeader
        title="Digital membership ID"
        description="Your virtual CSC credential. Present it at eligible events."
      />
      <div className="grid w-full gap-6 xl:grid-cols-[minmax(22rem,0.9fr)_minmax(0,1.1fr)] xl:items-center">
        <div className="flex justify-center rounded-3xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-7">
          <MemberIdCard card={cardRes.data} isDemo={ctx.mode === "preview"} />
        </div>
        <section className="flex h-full flex-col justify-center gap-5 rounded-3xl bg-brand-white p-6 ring-1 ring-brand-border sm:p-8">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-purple text-brand-accent">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-brand-ink">Your CSC membership credential</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-secondary">
              This card reflects your verified membership status. Present it at eligible CSC community events; event registration and any event-specific admission requirements are verified separately.
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
          </div>
        </section>
      </div>
      <section className="mt-8 flex flex-col gap-4" aria-labelledby="digital-id-event-passes">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="digital-id-event-passes" className="text-xl font-semibold text-brand-ink">My event passes</h2>
            <p className="mt-1 text-sm text-brand-secondary">View and download tickets for your confirmed event registrations.</p>
          </div>
          <Link href="/member/events" prefetch={true} className="text-sm font-medium text-brand-accent hover:underline">All registrations</Link>
        </div>
        {eventPasses.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {eventPasses.map((registration) => {
              const fields = eventPassViewModel(registration);
              return (
                <li key={registration.id} className="flex flex-col gap-3 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border">
                  <h3 className="font-semibold text-brand-ink">{registration.eventTitle}</h3>
                  <ul className="flex flex-col gap-1.5 text-sm text-brand-muted">
                    <li className="flex items-center gap-2"><CalendarDays className="size-4" aria-hidden />{formatEventDate(registration.startsAt)} · {formatEventTime(registration.startsAt)} IST</li>
                    <li className="flex items-start gap-2"><MapPin className="size-4 shrink-0" aria-hidden /><span><strong className="text-brand-ink">Location:</strong> {fields.location}</span></li>
                    <li><strong className="text-brand-ink">UID:</strong> <span className="font-mono">{fields.uid}</span></li>
                    <li><strong className="text-brand-ink">Name:</strong> {fields.name}</li>
                  </ul>
                  <Link href={`/member/events/${registration.id}`} prefetch={true} className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-brand-accent hover:underline">
                    <Ticket className="size-4" aria-hidden />View and download pass
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-2xl bg-brand-white p-5 text-sm text-brand-muted ring-1 ring-brand-border">Confirmed event passes will appear here. <Link href="/events" className="font-medium text-brand-accent hover:underline">Browse events</Link>.</p>
        )}
      </section>
    </>
  );
}
