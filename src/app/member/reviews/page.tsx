import { Star } from "lucide-react";
import { MemberReviewForm } from "@/components/member/member-review-form";
import { StatusBadge } from "@/components/member/status-badge";
import { RatingStars } from "@/components/testimonials/rating-stars";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { reviewModerationMeta } from "@/lib/content/member-taxonomy";
import { formatEventDate } from "@/lib/format";

export const metadata = { title: "Reviews" };

export default async function MemberReviewsPage() {
  const ctx = await getMemberContext();
  const res = await memberServices.listReviews();
  const reviews = res.ok ? res.data : [];
  const hasGeneral = reviews.some((r) => r.kind === "general");

  return (
    <>
      <header className="mb-6 flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-brand-ink">My ratings &amp; reviews</h1>
        <p className="text-sm text-brand-muted">Share and manage your CSC community review.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="flex flex-col gap-4">
          <h2 className="text-center text-sm font-semibold tracking-wide text-brand-muted uppercase">
            Your reviews
          </h2>
          {reviews.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {reviews.map((r) => {
                const meta = reviewModerationMeta[r.moderation];
                return (
                  <li
                    key={r.id}
                    className="flex flex-col gap-3 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <RatingStars rating={r.rating} size="sm" />
                      <StatusBadge label={meta.label} tone={meta.tone} />
                    </div>
                    <p className="font-serif text-brand-ink">“{r.review}”</p>
                    <p className="text-xs text-brand-muted">
                      {formatEventDate(r.createdAt)} · {r.kind === "general" ? "Community review" : "Event review"}
                    </p>
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
            You already have a community review. Members may keep one general CSC
            review; editing and revision controls will appear here.
          </div>
        )}
      </div>
    </>
  );
}
