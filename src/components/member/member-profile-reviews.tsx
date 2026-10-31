import Link from "next/link";
import { Star, ArrowRight, MessageSquareQuote } from "lucide-react";
import { RatingStars } from "@/components/testimonials/rating-stars";
import { StatusBadge } from "@/components/member/status-badge";
import { Button } from "@/components/ui/button";
import { reviewModerationMeta } from "@/lib/content/member-taxonomy";
import { formatEventDate } from "@/lib/format";
import type { CommunityReview } from "@/types/member";

export function MemberProfileReviewsSection({
  reviews,
  eligibleEvents = [],
  eligibleCollaborations = [],
}: {
  reviews: CommunityReview[];
  eligibleEvents?: { id: string; title: string }[];
  eligibleCollaborations?: { id: string; title: string }[];
}) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-brand-ink">Ratings &amp; Reviews</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Your event feedback, collaboration ratings, and CSC community reviews.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/member/reviews" />} className="w-fit gap-1.5 text-xs font-semibold">
          <Star className="size-3.5" /> Manage All Reviews <ArrowRight className="size-3.5" />
        </Button>
      </div>

      {/* Eligible events / collaborations awaiting review */}
      {eligibleEvents.length > 0 || eligibleCollaborations.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-brand-cloud/70 p-4 ring-1 ring-brand-border sm:p-5">
          <span className="text-xs font-semibold tracking-wider uppercase text-brand-accent">
            Awaiting Your Feedback
          </span>
          <p className="text-sm text-brand-secondary">
            You attended these concluded events or collaborations. Share your ratings and feedback on how they were conducted!
          </p>
          <div className="mt-1 flex flex-col gap-2">
            {eligibleEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-brand-border"
              >
                <div>
                  <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    Concluded Event
                  </span>
                  <p className="font-semibold text-brand-ink">{event.title}</p>
                </div>
                <Link
                  href={`/member/reviews?event=${event.id}#event-${event.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-ink/90"
                >
                  Ratings and Review
                </Link>
              </div>
            ))}
            {eligibleCollaborations.map((collab) => (
              <div
                key={collab.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-brand-border"
              >
                <div>
                  <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                    Completed Collaboration
                  </span>
                  <p className="font-semibold text-brand-ink">{collab.title}</p>
                </div>
                <Link
                  href={`/member/reviews?collaboration=${collab.id}#collaboration-${collab.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-ink/90"
                >
                  Ratings and Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Submitted reviews list */}
      {reviews.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {reviews.map((r) => {
            const meta = reviewModerationMeta[r.moderation];
            const title =
              r.kind === "event"
                ? r.eventTitle ? `Event: ${r.eventTitle}` : "Event Review"
                : r.kind === "collaboration"
                ? r.collaborationTitle ? `Collaboration: ${r.collaborationTitle}` : "Collaboration Review"
                : "CSC Community Review";

            return (
              <figure
                key={r.id}
                className="flex flex-col gap-3 rounded-2xl bg-brand-cloud/40 p-5 ring-1 ring-brand-border"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-secondary ring-1 ring-brand-border">
                    {title}
                  </span>
                  <StatusBadge label={meta.label} tone={meta.tone} />
                </div>
                <blockquote className="my-1 flex-1 font-serif text-base text-brand-ink">
                  “{r.review}”
                </blockquote>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-brand-border">
                  <RatingStars rating={r.rating} size="sm" />
                  <span className="text-xs text-brand-muted">
                    {formatEventDate(r.createdAt)}
                  </span>
                </div>
              </figure>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-brand-border bg-brand-cloud/40 p-8 text-center">
          <MessageSquareQuote className="size-8 text-brand-muted" aria-hidden />
          <p className="text-sm font-medium text-brand-ink">No reviews written yet</p>
          <p className="text-xs text-brand-muted max-w-sm">
            After attending a CSC gathering or collaboration, rate how it was conducted and share your experience.
          </p>
          <Button variant="outline" render={<Link href="/member/reviews" />} className="mt-2 text-xs">
            Write a community review
          </Button>
        </div>
      )}
    </section>
  );
}
