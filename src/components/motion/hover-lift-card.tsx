"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "cn";

export interface HoverLiftCardProps extends HTMLMotionProps<"div"> {
  lift?: number;
}

/** A card wrapper that gently lifts on hover/focus-within (motion-safe). */
export function HoverLiftCard({
  className,
  lift = 6,
  children,
  ...props
}: HoverLiftCardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn("h-full min-w-0 w-full max-w-full", className)}
      whileHover={reduce ? undefined : { y: -lift }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
