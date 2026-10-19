"use client";

import * as React from "react";
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "motion/react";

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

export interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  /** Trigger when scrolled into view (default) or immediately. */
  inView?: boolean;
  amount?: number;
}

/** Orchestrates staggered reveals of its <StaggerItem> children. */
export function StaggerContainer({
  children,
  inView = true,
  amount = 0.2,
  ...props
}: StaggerContainerProps) {
  const trigger = inView
    ? { whileInView: "show" as const, viewport: { once: true, amount } }
    : { animate: "show" as const };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      {...trigger}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  ...props
}: HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  const itemVariants: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };
  return (
    <motion.div variants={itemVariants} {...props}>
      {children}
    </motion.div>
  );
}
