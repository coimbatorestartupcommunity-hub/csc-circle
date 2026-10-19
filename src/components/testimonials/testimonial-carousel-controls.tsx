import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";

export interface TestimonialCarouselControlsProps {
  count: number;
  active: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}

/** Previous/next buttons + pagination dots for the testimonial carousel. */
export function TestimonialCarouselControls({
  count,
  active,
  onPrev,
  onNext,
  onSelect,
}: TestimonialCarouselControlsProps) {
  if (count <= 1) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-5">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous testimonial"
        className="flex size-10 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-cloud focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>

      <div className="flex items-center gap-2" role="tablist" aria-label="Testimonials">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Go to testimonial ${i + 1}`}
            onClick={() => onSelect(i)}
            className={cn(
              "h-2 rounded-full transition-all focus-visible:ring-3 focus-visible:ring-ring/50",
              i === active
                ? "w-6 bg-brand-accent"
                : "w-2 bg-brand-border hover:bg-brand-muted/50",
            )}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        aria-label="Next testimonial"
        className="flex size-10 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border transition-colors hover:bg-brand-cloud focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
