"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "cn";

type HeadingTag = "h1" | "h2" | "h3";

export interface AnimatedHeadingProps {
  text: string;
  as?: HeadingTag;
  className?: string;
  delay?: number;
  /** Animate on mount (hero) vs. when scrolled into view. */
  onMount?: boolean;
}

/**
 * Animates a heading in by words (fade + rise). Falls back to a single fade
 * when reduced motion is preferred. Renders real heading text for a11y/SEO.
 */
export function AnimatedHeading({
  text,
  as = "h2",
  className,
  delay = 0,
  onMount = false,
}: AnimatedHeadingProps) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.06, delayChildren: delay },
    },
  };
  const word: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: "0.4em" },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const MotionTag = motion[as];
  const trigger = onMount
    ? { animate: "show" as const }
    : {
        whileInView: "show" as const,
        viewport: { once: true, amount: 0.5 },
      };

  return (
    <MotionTag
      className={cn("text-balance", className)}
      variants={container}
      initial="hidden"
      {...trigger}
    >
      {words.map((w, i) => (
        <React.Fragment key={`${w}-${i}`}>
          <motion.span variants={word} className="inline-block">
            {w}
          </motion.span>
          {i < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </MotionTag>
  );
}
