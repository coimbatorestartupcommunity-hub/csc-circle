"use client";

import * as React from "react";
import {
  animate,
  useInView,
  useReducedMotion,
} from "motion/react";

export interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}

/** Counts up to `value` the first time it enters the viewport. */
export function AnimatedCounter({
  value,
  suffix = "",
  duration = 1.6,
  className,
}: AnimatedCounterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(0);
  const shouldAnimate = inView && !reduce;

  React.useEffect(() => {
    if (!shouldAnimate) return;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [shouldAnimate, value, duration]);

  // Reduced motion (or before animation) resolves directly to the value.
  const shown = reduce || !inView ? (reduce ? value : 0) : display;

  return (
    <span ref={ref} className={className}>
      {shown.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
