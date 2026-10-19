import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "cn";
import { formatRating } from "@/lib/format";

export interface RatingStarsProps {
  rating: number;
  /** Show the numeric value (two decimals) beside the stars. */
  showValue?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** Five green stars filled to match the rating, with an accessible label. */
export function RatingStars({
  rating,
  showValue = true,
  size = "md",
  className,
}: RatingStarsProps) {
  const rounded = Math.round(rating);
  const starSize = size === "sm" ? "size-4" : "size-5";
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="img"
      aria-label={`Rated ${formatRating(rating)} out of 5`}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            aria-hidden="true"
            className={cn(
              starSize,
              i < rounded
                ? "fill-green-500 text-green-500"
                : "fill-transparent text-brand-border",
            )}
            strokeWidth={1.75}
          />
        ))}
      </div>
      {showValue ? (
        <span className="text-sm font-semibold text-brand-ink tabular-nums">
          {formatRating(rating)}
        </span>
      ) : null}
    </div>
  );
}
