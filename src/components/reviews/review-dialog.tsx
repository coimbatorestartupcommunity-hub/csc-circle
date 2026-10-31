"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Star,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
  ExternalLink,
  MessageSquareQuote,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field";
import { memberRequest } from "@/lib/services/member/request";
import { reviewSchema } from "@/lib/validations/forms";
import { notifySubmissionSuccess } from "@/lib/ui/submission-feedback";

export interface ReviewDialogProps {
  type?: "general" | "event" | "collaboration";
  eventId?: string;
  eventTitle?: string;
  collaborationId?: string;
  collaborationTitle?: string;
  buttonLabel?: string;
  variant?: "ink" | "glass";
  className?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hashTrigger?: boolean;
}

export function ReviewDialog({
  type,
  eventId,
  eventTitle,
  collaborationId,
  collaborationTitle,
  buttonLabel,
  variant = "ink",
  className,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  hashTrigger = false,
}: ReviewDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

  const resolvedType =
    type ||
    (collaborationId ? "collaboration" : eventId ? "event" : "general");

  const [rating, setRating] = React.useState(5);
  const [hover, setHover] = React.useState(0);
  const [review, setReview] = React.useState("");
  const [consent, setConsent] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [existingReview, setExistingReview] = React.useState<{
    id: string;
    rating: number;
    review: string;
    moderation: string;
  } | null>(null);
  const [checkedAuth, setCheckedAuth] = React.useState(false);
  const [notAuthenticated, setNotAuthenticated] = React.useState(false);

  // Auto-open if hash is #review
  React.useEffect(() => {
    if (
      hashTrigger &&
      typeof window !== "undefined" &&
      window.location.hash === "#review"
    ) {
      setOpen(true);
    }
  }, [hashTrigger, setOpen]);

  // Query existing review and authentication state when dialog opens
  React.useEffect(() => {
    if (!open) return;
    let active = true;

    const queryParams = new URLSearchParams();
    if (resolvedType === "collaboration" && collaborationId) {
      queryParams.set("collaborationId", collaborationId);
    } else if (resolvedType === "event" && eventId) {
      queryParams.set("eventId", eventId);
    }

    const qs = queryParams.toString();
    const endpoint = `/api/member/review${qs ? `?${qs}` : ""}`;

    fetch(endpoint, { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) {
          setNotAuthenticated(true);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (data?.ok && data?.review) {
          setExistingReview(data.review);
          setRating(data.review.rating ?? 5);
          setReview(data.review.review ?? "");
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setCheckedAuth(true);
      });

    return () => {
      active = false;
    };
  }, [open, resolvedType, collaborationId, eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reviewSchema.safeParse({
      rating,
      review,
      consent,
      eventId: resolvedType === "event" ? eventId : undefined,
      collaborationId:
        resolvedType === "collaboration" ? collaborationId : undefined,
    });

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
      const result = await memberRequest("review", {
        rating,
        review,
        consent,
        eventId: resolvedType === "event" ? eventId : undefined,
        collaborationId:
          resolvedType === "collaboration" ? collaborationId : undefined,
      });

      if (result.error) {
        if (result.error.includes("already submitted")) {
          setExistingReview({
            id: "submitted",
            rating,
            review,
            moderation: "submitted",
          });
          toast.info(result.error);
        } else {
          toast.error(result.error);
        }
        return;
      }

      notifySubmissionSuccess({
        title: "Review submitted",
        message:
          "Thank you! Your ratings and review have been received and sent for moderation.",
      });
      setSubmitted(true);
      setExistingReview({
        id: result.id || "new",
        rating,
        review,
        moderation: "submitted",
      });
      router.refresh();
    } catch {
      toast.error("Could not submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const defaultLabel =
    buttonLabel ||
    (submitted || existingReview
      ? "Review Submitted ✓"
      : resolvedType === "general"
      ? "Rate & Review"
      : "Ratings and Review");

  const dialogTitle = submitted
    ? "Review Submitted"
    : existingReview
    ? resolvedType === "collaboration"
      ? "Your Collaboration Review"
      : resolvedType === "event"
      ? "Your Event Review"
      : "Your CSC Circle Review"
    : "Ratings & Review";

  const dialogDescription = submitted
    ? "Your review was received and is awaiting administrator moderation. It is stored on your profile under Ratings & Reviews."
    : existingReview
    ? `Your review is saved and visible under My Ratings & Reviews.`
    : resolvedType === "collaboration"
    ? `Share your thoughts on "${collaborationTitle || "this collaboration"}". Your rating and review help spotlight genuine community collaborations.`
    : resolvedType === "event"
    ? `Share how "${eventTitle || "the event"}" was conducted and your experience with fellow community attendees.`
    : "Share your experience with CSC Circle. Your rating and review help spotlight genuine community experiences.";

  const textareaPlaceholder =
    resolvedType === "event"
      ? 'Share how the event was conducted (e.g. "Fantastic session, well organized and great founder discussions!")...'
      : resolvedType === "collaboration"
      ? 'Share your thoughts about this collaboration (e.g. "Super initiative, fantastic partner synergy and great impact!")...'
      : 'What has your experience with CSC Circle been like? (e.g. "Super supportive community, amazing founder sessions and network!")...';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <button
              type="button"
              className={cn(
                variant === "glass"
                  ? "inline-flex items-center justify-center gap-2 rounded-xl border border-white/80 bg-white/80 px-5 py-2.5 text-sm font-semibold text-brand-ink shadow-[0_8px_20px_-6px_rgba(31,41,78,0.18)] ring-1 ring-black/5 backdrop-blur-xl transition hover:bg-white hover:shadow-[0_12px_24px_-6px_rgba(31,41,78,0.25)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  : "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-black/5 transition hover:bg-brand-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple cursor-pointer",
                className,
              )}
            >
              <MessageSquarePlus className="size-4" aria-hidden="true" />
              {defaultLabel}
            </button>
          )
        }
      />

      <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg rounded-[2rem] border border-white/85 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 sm:p-8">
        <DialogHeader className="text-left">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-brand-purple/40 text-brand-ink shadow-xs ring-1 ring-white/70 backdrop-blur-md">
            {submitted || existingReview ? (
              <CheckCircle2 className="size-6 text-emerald-600" />
            ) : (
              <MessageSquareQuote className="size-6 text-brand-ink" />
            )}
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-brand-ink">
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs leading-relaxed text-brand-secondary sm:text-sm">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        {notAuthenticated ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-white/70 bg-brand-cloud/70 p-5 text-center backdrop-blur-md">
            <p className="text-sm font-semibold text-brand-ink">
              Sign in to rate and review
            </p>
            <p className="text-xs text-brand-muted">
              Member reviews are connected to your verified CSC account.
            </p>
            <Button
              render={
                <Link
                  href={`/login?next=${encodeURIComponent(
                    typeof window !== "undefined"
                      ? window.location.pathname
                      : "/",
                  )}`}
                />
              }
              className="mt-2 w-full sm:w-auto"
            >
              Sign in to Review
            </Button>
          </div>
        ) : submitted || existingReview ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-5 ring-1 ring-emerald-200 backdrop-blur-md shadow-xs">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-4",
                        i < (existingReview?.rating ?? rating)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-transparent text-emerald-200",
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-emerald-900">
                  {existingReview?.rating ?? rating} out of 5 stars
                </span>
                <span className="ml-auto rounded-full bg-emerald-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 capitalize">
                  {existingReview?.moderation?.replace("_", " ") ?? "Submitted"}
                </span>
              </div>
              <p className="mt-3 font-serif text-sm italic text-emerald-950 sm:text-base">
                “{existingReview?.review || review}”
              </p>
            </div>

            <div className="mt-2 flex flex-col gap-2.5 border-t border-brand-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/member/reviews"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/80 bg-white/80 px-4 py-2.5 text-xs font-semibold text-brand-ink shadow-xs ring-1 ring-brand-border/60 backdrop-blur-md transition hover:bg-white hover:shadow-sm"
              >
                View in My Ratings &amp; Reviews
                <ExternalLink className="size-3.5" />
              </Link>
              <Button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/80 bg-brand-cloud/60 p-4 shadow-xs ring-1 ring-brand-border/60 backdrop-blur-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                Your Rating
              </span>
              <div
                className="flex items-center gap-2"
                role="radiogroup"
                aria-label="Rating"
              >
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
                      className="rounded-lg p-1 transition hover:scale-115 focus-visible:ring-2 focus-visible:ring-brand-purple"
                    >
                      <Star
                        className={cn(
                          "size-8 transition-colors",
                          on
                            ? "fill-green-500 text-green-500"
                            : "fill-transparent text-brand-border",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
              {errors.rating ? <FieldError>{errors.rating}</FieldError> : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="dialog-review-text"
                className="text-xs font-semibold text-brand-ink"
              >
                Your Feedback &amp; Comments
              </label>
              <Textarea
                id="dialog-review-text"
                rows={4}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                maxLength={1000}
                placeholder={textareaPlaceholder}
                className="rounded-xl border border-brand-border bg-white text-sm focus:border-brand-ink focus:ring-2 focus:ring-brand-ink/10"
                aria-invalid={!!errors.review}
              />
              {errors.review ? <FieldError>{errors.review}</FieldError> : null}
            </div>

            <label className="flex items-start gap-2.5 text-xs text-brand-secondary">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 size-4 rounded accent-brand-ink shrink-0"
              />
              <span>
                I agree to share this review publicly in the CSC Circle
                community testimonials upon administrator approval.
              </span>
            </label>
            {errors.consent ? <FieldError>{errors.consent}</FieldError> : null}

            <div className="mt-2 flex flex-col gap-2.5 border-t border-brand-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/member/reviews"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/80 bg-white/80 px-4 py-2.5 text-xs font-semibold text-brand-ink shadow-xs ring-1 ring-brand-border/60 backdrop-blur-md transition hover:bg-white hover:shadow-sm"
              >
                View in My Ratings &amp; Reviews
                <ExternalLink className="size-3.5" />
              </Link>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !checkedAuth}
                  className="min-h-10 min-w-36 gap-2 rounded-xl text-xs font-semibold shadow-sm"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {submitting ? "Submitting…" : "Submit Review"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
