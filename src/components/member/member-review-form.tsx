"use client";

import * as React from "react";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field";
import { memberRequest } from "@/lib/services/member/request";
import { reviewSchema } from "@/lib/validations/forms";
import { notifySubmissionSuccess } from "@/lib/ui/submission-feedback";

/**
 * Member review submission. In a live session this inserts a real review
 * (moderation = submitted) owned by the signed-in user, enforced by RLS. In the
 * DEMO preview there is no session, so it reports that sign-in is required —
 * it never fabricates a published review.
 */
export function MemberReviewForm({ isDemo }: { isDemo: boolean }) {
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [review, setReview] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reviewSchema.safeParse({ rating, review, consent });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "form");
        if (!next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const result = await memberRequest("review", { rating, review, consent });
      if (result.error) { toast.error(result.error); return; }
      notifySubmissionSuccess({ title: "Successfully submitted", message: "Thank you. Your review was received and is waiting for moderation." });
      setReview("");
      setRating(0);
      setConsent(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col items-center gap-5 rounded-2xl bg-brand-white p-6 text-center ring-1 ring-brand-border"
    >
      <div className="flex w-full flex-col gap-1 text-center">
        <h2 className="text-lg font-semibold text-brand-ink">
          Share your CSC experience
        </h2>
        <p className="text-sm text-brand-muted">
          Approved reviews may appear publicly on the CSC Circle website.
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-1.5">
        <span className="text-sm font-medium text-brand-ink">Your rating</span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {Array.from({ length: 5 }).map((_, i) => {
            const n = i + 1;
            const on = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                tabIndex={rating === n || (!rating && n === 1) ? 0 : -1}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); setRating(Math.min(5, n + 1)); }
                  if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); setRating(Math.max(1, n - 1)); }
                  if (event.key === " ") { event.preventDefault(); setRating(n); }
                }}
                className="rounded-md p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Star
                  className={cn(
                    "size-7 transition-colors",
                    on ? "fill-green-500 text-green-500" : "fill-transparent text-brand-border",
                  )}
                />
              </button>
            );
          })}
        </div>
        {errors.rating ? <FieldError>{errors.rating}</FieldError> : null}
      </div>

      <div className="flex w-full flex-col gap-1.5">
        <label htmlFor="member-review" className="text-center text-sm font-medium text-brand-ink">
          Your review
        </label>
        <Textarea
          id="member-review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={4}
          placeholder="What has your experience with CSC Circle been like?"
          aria-invalid={!!errors.review}
        />
        {errors.review ? <FieldError>{errors.review}</FieldError> : null}
      </div>

      <label className="flex items-start justify-center gap-2 text-left text-sm text-brand-secondary">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--brand-accent)]"
        />
        <span>I understand my review may be shown publicly after approval.</span>
      </label>
      {errors.consent ? <FieldError>{errors.consent}</FieldError> : null}

      <Button type="submit" disabled={submitting} className="h-11 w-full max-w-md gap-2">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Submit review
      </Button>
      {isDemo ? (
        <p className="text-center text-xs text-brand-muted">
          DEMO preview — sign in with a real account to submit a review.
        </p>
      ) : null}
    </form>
  );
}
