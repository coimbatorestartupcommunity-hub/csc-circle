"use client";

import * as React from "react";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { reviewSchema } from "@/lib/validations/forms";

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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to submit a review.");
        return;
      }
      const { error } = await supabase
        .from("reviews")
        .insert({ user_id: user.id, rating, review, kind: "general" });
      if (error) {
        toast.error(
          error.code === "23505"
            ? "You already have a review. You can edit it instead."
            : "Couldn't submit your review. Please try again.",
        );
        return;
      }
      toast.success("Thanks! Your review was submitted for moderation.");
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
      className="flex flex-col gap-5 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-brand-ink">
          Share your CSC experience
        </h2>
        <p className="text-sm text-brand-muted">
          Approved reviews may appear publicly on the CSC Circle website.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="member-review" className="text-sm font-medium text-brand-ink">
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

      <label className="flex items-start gap-2 text-sm text-brand-secondary">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--brand-accent)]"
        />
        <span>I understand my review may be shown publicly after approval.</span>
      </label>
      {errors.consent ? <FieldError>{errors.consent}</FieldError> : null}

      <Button type="submit" disabled={submitting} className="h-11 w-full gap-2">
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
