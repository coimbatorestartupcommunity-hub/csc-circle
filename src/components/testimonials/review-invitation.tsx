"use client";

import * as React from "react";
import Link from "next/link";
import { Star, Loader2, MessageSquareQuote } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field";
import { reviewSchema } from "@/lib/validations/forms";
import { reviewModerationMeta } from "@/lib/content/member-taxonomy";
import { StatusBadge } from "@/components/member/status-badge";
import { RatingStars } from "@/components/testimonials/rating-stars";

type CurrentReview = { id: string; rating: number; review: string; moderation: keyof typeof reviewModerationMeta };
type AccountState = "loading" | "signed_out" | "ready" | "error";

/** Homepage review form. Session, ownership and review status are resolved by the server. */
export function ReviewInvitation({ className }: { className?: string }) {
  const [account, setAccount] = React.useState<AccountState>("loading");
  const [current, setCurrent] = React.useState<CurrentReview | null>(null);
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [review, setReview] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [failed, setFailed] = React.useState(false);

  const refreshStatus = React.useCallback(async () => {
    try {
      const response = await fetch("/api/member/review", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) { setAccount("signed_out"); setCurrent(null); return; }
      if (!response.ok) throw new Error(data.error ?? "Review status could not be loaded.");
      setCurrent(data.review ?? null);
      setAccount("ready");
    } catch {
      setAccount("error");
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    void fetch("/api/member/review", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!active) return;
      if (response.status === 401) { setAccount("signed_out"); return; }
      if (!response.ok) throw new Error("Review status could not be loaded.");
      setCurrent(data.review ?? null);
      setAccount("ready");
    }).catch(() => { if (active) setAccount("error"); });
    return () => { active = false; };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = reviewSchema.safeParse({ rating, review, consent });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({}); setMessage(""); setFailed(false); setSubmitting(true);
    try {
      const response = await fetch("/api/member/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok) {
        setFailed(true);
        setMessage(data.error ?? "We couldn't submit your review right now. Please try again.");
        return;
      }
      setCurrent(data.review);
      setReview(""); setRating(0); setConsent(false);
      setMessage("Your review was submitted and is waiting for CSC administrator review.");
    } catch {
      setFailed(true);
      setMessage("We couldn't submit your review right now. Please try again.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className={cn("mx-auto flex w-full min-w-0 max-w-xl flex-col items-center gap-5 rounded-3xl bg-brand-white p-5 text-center ring-1 ring-brand-border sm:p-8", className)}>
      <div className="flex w-full min-w-0 flex-col items-center gap-1">
        <h3 className="text-lg font-semibold text-brand-ink">Share your CSC experience</h3>
        <p className="text-sm text-brand-muted">Tell the CSC community about your genuine experience.</p>
      </div>

      {account === "loading" ? <p role="status" className="text-sm text-brand-muted">Checking your member account…</p>
        : account === "signed_out" ? <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-brand-cloud p-5 text-sm text-brand-secondary">
          <p>Sign in to share your CSC experience.</p>
          <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-ink px-4 text-sm font-medium text-brand-white hover:bg-brand-ink/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/login?next=%2F#testimonials">Sign in to review</Link>
        </div>
        : account === "error" ? <div className="w-full rounded-2xl bg-red-50 p-4 text-sm text-red-800"><p role="alert">Review status is temporarily unavailable.</p><Button type="button" variant="outline" className="mt-3" onClick={() => { setAccount("loading"); void refreshStatus(); }}>Try again</Button></div>
        : current ? <div className="flex w-full flex-col items-center gap-4 rounded-2xl bg-brand-cloud p-5 text-left ring-1 ring-brand-border">
          <div className="flex w-full items-center justify-between gap-3">
            <RatingStars rating={current.rating} size="sm" />
            <StatusBadge label={reviewModerationMeta[current.moderation].label} tone={reviewModerationMeta[current.moderation].tone} />
          </div>
          <p className="w-full break-words font-serif text-brand-ink">“{current.review}”</p>
          <p className="text-sm text-brand-muted">{current.moderation === "approved" ? "Your review has been approved for publication." : current.moderation === "rejected" ? "This review was not approved. Contact CSC support if you need help." : "Your review was submitted and is waiting for CSC administrator review."}</p>
          <Link className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-border bg-white px-4 text-sm font-medium text-brand-ink hover:bg-brand-cloud focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/member/reviews">View my review status</Link>
        </div>
        : <form onSubmit={onSubmit} className="flex w-full flex-col items-center gap-5">
          <div className="flex w-full flex-col items-center gap-1.5">
            <span className="text-sm font-medium text-brand-ink">Your rating</span>
            <div className="flex items-center justify-center gap-1" role="radiogroup" aria-label="Your rating">
              {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => {
                const active = (hover || rating) >= n;
                return <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} tabIndex={rating === n || (!rating && n === 1) ? 0 : -1}
                  onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onFocus={() => setHover(n)} onBlur={() => setHover(0)} onClick={() => setRating(n)}
                  onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setRating(Math.min(5, n + 1)); } if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setRating(Math.max(1, n - 1)); } }}
                  className="rounded-md p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <Star className={cn("size-7 transition-colors", active ? "fill-green-500 text-green-500" : "fill-transparent text-brand-border")} />
                </button>;
              })}
            </div>
            {errors.rating ? <FieldError>{errors.rating}</FieldError> : null}
          </div>
          <div className="flex w-full flex-col items-center gap-1.5">
            <label htmlFor="review-text" className="text-sm font-medium text-brand-ink">Your review</label>
            <Textarea id="review-text" value={review} onChange={(e) => setReview(e.target.value)} placeholder="What has your experience with CSC Circle been like?" rows={5} maxLength={600} aria-invalid={!!errors.review} className="w-full text-left" />
            <span className="w-full text-right text-xs text-brand-muted">{review.length}/600</span>
            {errors.review ? <FieldError>{errors.review}</FieldError> : null}
          </div>
          <div className="flex w-full max-w-md flex-col items-center gap-1">
            <label className="flex w-full min-w-0 items-start justify-start gap-2 text-left text-sm text-brand-secondary">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--brand-accent)]" />
              <span>I understand that my review may be shown publicly after administrator approval.</span>
            </label>
            {errors.consent ? <FieldError>{errors.consent}</FieldError> : null}
          </div>
          <Button type="submit" size="lg" disabled={submitting} className="h-11 w-full max-w-md gap-2">
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareQuote className="size-4" />}
            {submitting ? "Submitting…" : "Submit Review"}
          </Button>
          {message ? <p role={failed ? "alert" : "status"} className={cn("w-full max-w-md rounded-xl p-3 text-sm", failed ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800")}>{message}</p> : null}
        </form>}
    </div>
  );
}
