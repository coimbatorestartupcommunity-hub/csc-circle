"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

type Direction = "up" | "down" | "left" | "right" | "none";

const offset: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
  none: { x: 0, y: 0 },
};

export interface FadeInProps extends HTMLMotionProps<"div"> {
  direction?: Direction;
  delay?: number;
  duration?: number;
  /** Animate when scrolled into view (default) vs. immediately on mount. */
  inView?: boolean;
}

/** Fades (and optionally slides) content in — on scroll by default. */
export function FadeIn({
  direction = "up",
  delay = 0,
  duration = 0.5,
  inView = true,
  children,
  ...props
}: FadeInProps) {
  const reduce = useReducedMotion();
  const from = reduce
    ? { opacity: 0 }
    : { opacity: 0, ...offset[direction] };
  const to = { opacity: 1, x: 0, y: 0 };

  const viewProps = inView
    ? {
        whileInView: to,
        viewport: { once: true, amount: 0.3 },
        initial: from,
      }
    : { animate: to, initial: from };

  return (
    <motion.div
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...viewProps}
      {...props}
    >
      {children}
    </motion.div>
  );
}
