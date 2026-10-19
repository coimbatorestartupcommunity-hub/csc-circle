"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

export interface RevealOnScrollProps extends HTMLMotionProps<"div"> {
  delay?: number;
  y?: number;
}

/** Reveals a block (fade + rise) the first time it scrolls into view. */
export function RevealOnScroll({
  delay = 0,
  y = 28,
  children,
  ...props
}: RevealOnScrollProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
