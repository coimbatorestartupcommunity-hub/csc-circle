"use client";

import * as React from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { TestimonialCard } from "@/components/testimonials/testimonial-card";
import { TestimonialCarouselControls } from "@/components/testimonials/testimonial-carousel-controls";
import { TestimonialEmptyState } from "@/components/testimonials/testimonial-empty-state";
import { ReviewDialog } from "@/components/reviews/review-dialog";
import { brandAssets, siteConfig } from "@/lib/content/site";
import type { Testimonial } from "@/types";

export interface CommunityTestimonialsProps {
  testimonials: Testimonial[];
}

/**
 * CSC ratings & testimonials. Matches the supplied reference composition
 * (centered logo pill → large light-bordered outer container → white inner
 * card → reviewer, quote, green stars, numeric rating → dots + controls) on a
 * white canvas, with the reference's light-blue page background removed.
 */
export function CommunityTestimonials({
  testimonials,
}: CommunityTestimonialsProps) {
  const reduce = useReducedMotion();
  const [[index, direction], setState] = React.useState<[number, number]>([
    0, 0,
  ]);
  const count = testimonials.length;

  const paginate = React.useCallback(
    (dir: number) => {
      if (count === 0) return;
      setState(([i]) => [(i + dir + count) % count, dir]);
    },
    [count],
  );

  const select = React.useCallback(
    (next: number) => setState(([i]) => [next, next > i ? 1 : -1]),
    [],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") paginate(-1);
    if (e.key === "ArrowRight") paginate(1);
  };

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x < -threshold) paginate(1);
    else if (info.offset.x > threshold) paginate(-1);
  };

  const logoPill = (
    <div className="mx-auto flex flex-wrap items-center justify-center gap-3">
      <div className="flex w-fit items-center gap-2.5 rounded-full bg-brand-white px-4 py-2 ring-1 ring-brand-border">
        <Image
          src={brandAssets.cscIcon}
          alt={`${siteConfig.legalName} logo`}
          width={28}
          height={28}
          className="rounded-full"
        />
        <span className="text-sm font-semibold text-brand-ink">
          CSC Circle Ratings
        </span>
      </div>
      <ReviewDialog
        type="general"
        buttonLabel="Rate CSC Circle"
        variant="glass"
        className="h-10 rounded-full px-4 text-xs font-semibold"
      />
    </div>
  );

  if (count === 0) {
    return (
      <div className="flex flex-col gap-8">
        {logoPill}
        <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-brand-border bg-brand-cloud/50 p-5 sm:p-8">
          <TestimonialEmptyState />
        </div>
      </div>
    );
  }

  const active = testimonials[index];

  return (
    <div className="flex flex-col gap-8">
      {logoPill}

      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-brand-border bg-brand-cloud/50 p-4 sm:p-8">
        <div
          className="relative overflow-hidden focus-visible:outline-none"
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label="Community testimonials"
          onKeyDown={onKeyDown}
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={active.id}
              custom={direction}
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, x: direction >= 0 ? 60 : -60 }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, x: direction >= 0 ? -60 : 60 }
              }
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              drag={reduce ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={onDragEnd}
            >
              <TestimonialCard testimonial={active} />
            </motion.div>
          </AnimatePresence>
        </div>

        <TestimonialCarouselControls
          count={count}
          active={index}
          onPrev={() => paginate(-1)}
          onNext={() => paginate(1)}
          onSelect={select}
        />
      </div>
    </div>
  );
}
