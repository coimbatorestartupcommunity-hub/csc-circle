"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";

export function LoginSuccessTransition({
  next,
  displayName,
  profileComplete,
}: {
  next: string;
  displayName?: string;
  profileComplete: boolean;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const navigated = React.useRef(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (navigated.current) return;
      navigated.current = true;
      router.replace(next);
    }, reducedMotion ? 650 : 1450);
    return () => window.clearTimeout(timer);
  }, [next, reducedMotion, router]);

  return (
    <section className="flex min-h-[100svh] flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top_left,#f1ecff_0%,transparent_48%),radial-gradient(ellipse_at_bottom_right,#e7f3ff_0%,transparent_46%),#f7f9fc] px-5 text-center">
      <motion.section
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }}
        aria-live="polite"
        className="flex w-full max-w-sm flex-col items-center rounded-3xl bg-white/90 px-8 py-10 shadow-lg shadow-brand-ink/5 ring-1 ring-brand-border"
      >
        <motion.span
          initial={reducedMotion ? false : { scale: 0.72, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: reducedMotion ? 0 : 0.12, duration: reducedMotion ? 0 : 0.3, type: "spring", stiffness: 250, damping: 18 }}
          className="flex size-16 items-center justify-center rounded-full bg-brand-purple text-brand-accent ring-1 ring-brand-border"
        >
          <Check aria-hidden="true" className="size-8" strokeWidth={2.5} />
        </motion.span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-brand-ink">Login Successful</h1>
        <p className="mt-2 text-sm leading-6 text-brand-muted">
          {displayName ? `Welcome, ${displayName}. ` : "Welcome to CSC Circle. "}
          {profileComplete ? "Your profile is ready." : "Let's complete your profile."}
        </p>
        <p className="mt-4 text-xs text-brand-muted">Opening your profile…</p>
      </motion.section>
    </section>
  );
}
