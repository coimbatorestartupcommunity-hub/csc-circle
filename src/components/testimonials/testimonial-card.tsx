import * as React from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { RatingStars } from "@/components/testimonials/rating-stars";
import { FixtureNotice } from "@/components/common/empty-state";
import { initials } from "@/lib/format";
import type { Testimonial } from "@/types";

/**
 * White inner testimonial card — fully centered: the quote, then the rating
 * (numeric value first, then green stars), then the reviewer identity as a
 * pill centered at the BOTTOM of the card (not the top-left corner).
 */
export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="flex h-full flex-col items-center gap-6 rounded-3xl bg-brand-white p-7 text-center ring-1 ring-brand-border sm:p-9">
      <blockquote className="flex-1 font-serif text-lg leading-relaxed text-brand-ink text-balance sm:text-xl">
        “{testimonial.quote}”
      </blockquote>

      {/* Rating centered: value, then stars */}
      <RatingStars rating={testimonial.rating} valueFirst className="justify-center" />

      {/* Reviewer identity pill, centered at the bottom */}
      <figcaption className="flex flex-col items-center gap-1.5">
        <span className="inline-flex items-center gap-2.5 rounded-full bg-brand-white px-3 py-1.5 shadow-sm ring-1 ring-brand-border">
          <Avatar size="sm" className="size-8">
            {testimonial.avatarUrl ? (
              <AvatarImage
                src={testimonial.avatarUrl}
                alt={`${testimonial.name}'s photo`}
              />
            ) : null}
            <AvatarFallback className="bg-brand-purple text-xs font-semibold text-brand-ink">
              {initials(testimonial.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-bold text-brand-ink">{testimonial.name}</span>
          {testimonial.isFixture ? <FixtureNotice /> : null}
        </span>
        <span className="text-sm text-brand-muted">{testimonial.designation}</span>
      </figcaption>
    </figure>
  );
}
