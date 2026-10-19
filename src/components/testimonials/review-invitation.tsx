"use client";

import * as React from "react";
import { Star, Lock } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { reviewSchema, type ReviewFormValues } from "@/lib/validations/forms";

/**
 * Review submission INTERFACE for future authenticated use. It validates input
 * (1–5 stars, review text, consent) but does not create a public review — there
 * is no persistent submission service until Phase 1, so it stays disabled and
 * says so clearly.
 */
export function ReviewInvitation({ className }: { className?: string }) {
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [review, setReview] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Validation is wired for Phase 1; submission is intentionally unavailable.
  const validate = () => {
    const result = reviewSchema.safeParse({
      rating,
      review,
      consent,
    } as Partial<ReviewFormValues>);
    if (result.success) {
      setErrors({});
      return;
    }
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!next[key]) next[key] = issue.message;
    }
    setErrors(next);
  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-xl flex-col gap-5 rounded-3xl bg-brand-white p-7 text-left ring-1 ring-brand-border sm:p-8",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-brand-ink">
          Share your CSC experience
        </h3>
        <p className="text-sm text-brand-muted">
          Reviews are published after you sign in and an admin approves them.
          This preview shows how feedback will be collected.
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
                    on
                      ? "fill-green-500 text-green-500"
                      : "fill-transparent text-brand-border",
                  )}
                />
              </button>
            );
          })}
        </div>
        {errors.rating ? (
          <FieldError className="mt-1">{errors.rating}</FieldError>
        ) : null}
      </div>

      <Field>
        <FieldLabel htmlFor="review-text">Your review</FieldLabel>
        <Textarea
          id="review-text"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="What has your experience with CSC Circle been like?"
          rows={4}
          aria-invalid={!!errors.review}
        />
        {errors.review ? <FieldError>{errors.review}</FieldError> : null}
      </Field>

      <label className="flex items-start gap-2 text-sm text-brand-secondary">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--brand-accent)]"
        />
        <span>
          I understand my review may be shown publicly after sign-in and
          approval.
        </span>
      </label>
      {errors.consent ? <FieldError>{errors.consent}</FieldError> : null}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={validate}
          className="h-10 w-full"
        >
          Check my review
        </Button>
        <Button type="button" size="lg" disabled className="h-11 w-full gap-2">
          <Lock className="size-4" />
          Review submission opens with member accounts
        </Button>
        <FieldDescription className="text-center">
          Validation is ready now; publishing activates in Phase 1.
        </FieldDescription>
      </div>
    </div>
  );
}
