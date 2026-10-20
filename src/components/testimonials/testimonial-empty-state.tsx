import * as React from "react";
import { MessageSquareQuote } from "lucide-react";
import { ReviewInvitation } from "@/components/testimonials/review-invitation";

/** Shown when there are no approved reviews yet — a warm invitation, not a gap. */
export function TestimonialEmptyState() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-purple text-brand-accent">
          <MessageSquareQuote className="size-6" aria-hidden="true" />
        </span>
        <h3 className="text-xl font-semibold text-brand-ink text-balance">
          Be the first to share your CSC story.
        </h3>
        <p className="max-w-md text-sm leading-relaxed text-brand-muted">
          Approved member reviews will appear here. Share your experience with
          the CSC community.
        </p>
      </div>
      <ReviewInvitation />
    </div>
  );
}
