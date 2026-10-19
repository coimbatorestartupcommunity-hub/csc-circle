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

/** White inner testimonial card: reviewer, role, quote, green stars + rating. */
export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="flex h-full flex-col gap-6 rounded-3xl bg-brand-white p-7 ring-1 ring-brand-border sm:p-9">
      <div className="flex items-center gap-4">
        <Avatar size="lg" className="size-14">
          {testimonial.avatarUrl ? (
            <AvatarImage
              src={testimonial.avatarUrl}
              alt={`${testimonial.name}'s photo`}
            />
          ) : null}
          <AvatarFallback className="bg-brand-purple font-semibold text-brand-ink">
            {initials(testimonial.name)}
          </AvatarFallback>
        </Avatar>
        <figcaption className="flex flex-col">
          <span className="flex items-center gap-2">
            <span className="text-base font-bold text-brand-ink">
              {testimonial.name}
            </span>
            {testimonial.isFixture ? <FixtureNotice /> : null}
          </span>
          <span className="text-sm text-brand-muted">
            {testimonial.designation}
          </span>
        </figcaption>
      </div>

      <blockquote className="flex-1 font-serif text-lg leading-relaxed text-brand-ink text-balance sm:text-xl">
        “{testimonial.quote}”
      </blockquote>

      <RatingStars rating={testimonial.rating} />
    </figure>
  );
}
