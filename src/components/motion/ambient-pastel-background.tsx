import * as React from "react";
import { cn } from "cn";

export interface AmbientPastelBackgroundProps {
  className?: string;
  /** Lower = more subtle. */
  intensity?: "subtle" | "soft";
}

/**
 * Decorative, restrained pastel blobs for hero / section backdrops. Purely
 * presentational (aria-hidden), does not intercept pointer events, and its
 * drift animation is disabled under prefers-reduced-motion via globals.css.
 */
export function AmbientPastelBackground({
  className,
  intensity = "soft",
}: AmbientPastelBackgroundProps) {
  const opacity = intensity === "subtle" ? "opacity-50" : "opacity-70";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "absolute -top-24 -left-16 size-72 rounded-full bg-brand-purple blur-3xl motion-safe:animate-(--animate-brand-float)",
          opacity,
        )}
      />
      <div
        className={cn(
          "absolute top-10 right-0 size-80 rounded-full bg-brand-blue blur-3xl motion-safe:animate-(--animate-brand-float) [animation-delay:-4s]",
          opacity,
        )}
      />
      <div
        className={cn(
          "absolute -bottom-24 left-1/3 size-72 rounded-full bg-brand-pink blur-3xl motion-safe:animate-(--animate-brand-float) [animation-delay:-8s]",
          opacity,
        )}
      />
    </div>
  );
}
