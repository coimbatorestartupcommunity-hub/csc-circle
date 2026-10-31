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
    ? "Your review is saved and visible under My Ratings & Reviews."
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
                  ? "inline-flex items-center justify-center gap-2 rounded-xl border border-white/90 bg-white/80 px-5 py-2.5 text-sm font-semibold text-brand-ink shadow-[0_8px_20px_-6px_rgba(31,41,78,0.18)] ring-1 ring-black/5 backdrop-blur-xl transition hover:bg-white hover:shadow-[0_12px_24px_-6px_rgba(31,41,78,0.25)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  : "inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-brand-ink px-5 py-2.5 text-sm font-semibold text-white shadow-md ring-1 ring-black/5 transition hover:bg-brand-ink/90 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple cursor-pointer active:scale-[0.99]",
                className,
              )}
            >
              <MessageSquarePlus className="size-4" aria-hidden="true" />
              {defaultLabel}
            </button>
          )
        }
      />

      <DialogContent className="w-[calc(100%-1.25rem)] max-w-lg overflow-hidden rounded-[2rem] border border-white/80 bg-white/92 p-0 shadow-[0_25px_60px_-15px_rgba(20,25,45,0.25)] ring-1 ring-black/5 backdrop-blur-2xl">
        <div className="max-h-[min(85dvh,720px)] overflow-y-auto p-5 sm:p-7">
          <DialogHeader className="text-left">
            <div className="mb-3.5 flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-gradient-to-br from-brand-purple/40 to-brand-lilac/30 text-brand-ink shadow-xs ring-1 ring-white/80 backdrop-blur-md">
              {submitted || existingReview ? (
                <CheckCircle2 className="size-6 text-emerald-600" />
              ) : (
                <MessageSquareQuote className="size-6 text-brand-ink" />
              )}
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-brand-ink sm:text-2xl">
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-xs leading-relaxed text-brand-secondary sm:text-sm">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>

          {notAuthenticated ? (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-white/70 bg-brand-cloud/70 p-6 text-center backdrop-blur-md">
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
                className="mt-2 w-full sm:w-auto min-h-10 rounded-xl px-6 text-sm font-semibold"
              >
                Sign in to Review
              </Button>
            </div>
          ) : submitted || existingReview ? (
            <div className="mt-5 flex flex-col gap-4">
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/75 p-5 shadow-xs ring-1 ring-emerald-300/40 backdrop-blur-md">
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
            </div>
          ) : (
            <form id="review-dialog-form" onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-xs ring-1 ring-brand-border/40 backdrop-blur-md">
                <span className="text-[11px] font-bold tracking-wider text-brand-muted uppercase">
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
                  className="rounded-2xl border border-brand-border/80 bg-white/90 p-3.5 text-sm font-medium text-brand-ink placeholder:text-brand-muted/70 focus:border-brand-ink focus:ring-2 focus:ring-brand-ink/10 shadow-xs"
                  aria-invalid={!!errors.review}
                />
                {errors.review ? <FieldError>{errors.review}</FieldError> : null}
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-brand-border/40 bg-brand-cloud/40 p-3.5 text-xs text-brand-secondary cursor-pointer hover:bg-brand-cloud/60 transition-colors">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-4 rounded accent-brand-ink shrink-0 cursor-pointer"
                />
                <span>
                  I agree to share this review publicly in the CSC Circle
                  community testimonials upon administrator approval.
                </span>
              </label>
              {errors.consent ? <FieldError>{errors.consent}</FieldError> : null}
            </form>
          )}
        </div>

        {/* Sticky Glassmorphism Dialog Footer with View in My Ratings & Reviews */}
        <div className="sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 border-t border-brand-border/60 bg-white/85 px-5 py-3.5 backdrop-blur-xl">
          <Link
            href="/member/reviews"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/80 bg-white/90 px-4 text-xs font-semibold text-brand-ink shadow-xs ring-1 ring-brand-border/50 backdrop-blur-md transition hover:bg-white hover:shadow-sm"
          >
            View in My Ratings &amp; Reviews
            <ExternalLink className="size-3.5" />
          </Link>

          {submitted || existingReview ? (
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto min-h-10 rounded-xl px-6 text-xs font-semibold"
            >
              Done
            </Button>
          ) : notAuthenticated ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto min-h-10 rounded-xl text-xs font-semibold"
            >
              Close
            </Button>
          ) : (
            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="w-full sm:w-auto min-h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="review-dialog-form"
                disabled={submitting || !checkedAuth}
                className="w-full sm:w-auto min-h-10 min-w-36 gap-2 rounded-xl bg-brand-ink px-6 text-xs font-semibold text-white shadow-sm hover:bg-brand-ink/90"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {submitting ? "Submitting…" : "Submit Review"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
