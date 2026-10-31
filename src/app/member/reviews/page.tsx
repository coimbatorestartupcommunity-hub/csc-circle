import { Star } from "lucide-react";
import { MemberReviewForm } from "@/components/member/member-review-form";
import { StatusBadge } from "@/components/member/status-badge";
import { RatingStars } from "@/components/testimonials/rating-stars";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { reviewModerationMeta } from "@/lib/content/member-taxonomy";
import { formatEventDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getPublicCollaborations } from "@/lib/services/public-data";
import { eventHasConcluded } from "@/lib/events/completion";

export const metadata = { title: "Reviews" };

export default async function MemberReviewsPage({
  searchParams,
}: {
  searchParams?: Promise<{ event?: string; collaboration?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const requestedEventId = params.event;
  const requestedCollabId = params.collaboration;
  const ctx = await getMemberContext();
  const userId = ctx.user?.id;
  const isLive = ctx.mode === "live" && Boolean(userId);

  const [res, attendanceRes, collabs] = await Promise.all([
    memberServices.listReviews(),
    isLive ? createClient().then((sb) => sb.from("event_registrations").select("event_id,events(id,title,ends_at,registration_state)").eq("user_id", userId!)) : Promise.resolve(null),
    getPublicCollaborations(),
  ]);
  const reviews = res.ok ? res.data : [];
  const hasGeneral = reviews.some((r) => r.kind === "general");
  const eligible = [...new Map((attendanceRes?.data ?? []).flatMap((row) => {
    const event = row.events as { id: string; title: string; ends_at: string; registration_state: string } | null;
    return event && eventHasConcluded(event) && !reviews.some((review) => review.eventId === event.id) ? [[event.id, event] as const] : [];
  })).values()];
  const collaborations = collabs.filter((item) => item.status === "completed" && !reviews.some((review) => review.collaborationId === item.id));

  return (
    <>
      <header className="mb-6 flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-brand-ink">My ratings &amp; reviews</h1>
        <p className="text-sm text-brand-muted">Share and manage your CSC community review.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {eligible.map((event) => <div key={event.id} id={`event-${event.id}`}><MemberReviewForm isDemo={false} eventId={event.id} title={event.title} /></div>)}
        {collaborations.map((item) => <div key={item.id} id={`collaboration-${item.id}`}><MemberReviewForm isDemo={ctx.mode !== "live"} collaborationId={item.id} title={item.title} /></div>)}
        <section className="flex flex-col gap-4">
          <h2 className="text-center text-sm font-semibold tracking-wide text-brand-muted uppercase">
            Your reviews
          </h2>
          {reviews.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {reviews.map((r) => {
                const meta = reviewModerationMeta[r.moderation];
                const activityTitle =
                  r.kind === "event"
                    ? r.eventTitle ? `Event · ${r.eventTitle}` : "Event Review"
                    : r.kind === "collaboration"
                    ? r.collaborationTitle ? `Collaboration · ${r.collaborationTitle}` : "Collaboration Review"
                    : "CSC Community Review";
                return (
                  <li
                    key={r.id}
                    className="flex flex-col gap-3 rounded-3xl bg-brand-white p-6 shadow-sm ring-1 ring-brand-border sm:p-7"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-secondary">
                        {activityTitle}
                      </span>
                      <StatusBadge label={meta.label} tone={meta.tone} />
                    </div>
                    <blockquote className="my-1 font-serif text-lg leading-relaxed text-brand-ink">
                      “{r.review}”
                    </blockquote>
                    <div className="flex items-center justify-between gap-2 border-t border-brand-border pt-3">
                      <RatingStars rating={r.rating} size="sm" />
                      <span className="text-xs text-brand-muted">
                        {formatEventDate(r.createdAt)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-brand-border bg-brand-cloud/60 p-8 text-center">
              <Star className="size-6 text-brand-accent" aria-hidden />
              <p className="text-sm text-brand-muted">
                You haven&apos;t written a review yet.
              </p>
            </div>
          )}
        </section>

        {!hasGeneral ? (
          <MemberReviewForm isDemo={ctx.mode === "preview"} />
        ) : (
          <div className="rounded-2xl bg-brand-cloud p-6 text-sm text-brand-secondary ring-1 ring-brand-border">
            Your current community review and moderation status are shown above. A member may maintain one general CSC review.
          </div>
        )}
      </div>
    </>
  );
}
