"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Camera, Check } from "lucide-react";

export function DirectorySetupButton({ href = "/member/startups/new" }: { href?: string }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [opening, setOpening] = React.useState(false);
  const navigated = React.useRef(false);

  React.useEffect(() => {
    if (!opening) return;
    router.prefetch(href);
    const timer = window.setTimeout(() => {
      if (navigated.current) return;
      navigated.current = true;
      router.push(href);
    }, reducedMotion ? 250 : 850);
    return () => window.clearTimeout(timer);
  }, [href, opening, reducedMotion, router]);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => { if (!opening) { navigated.current = false; setOpening(true); } }}
        disabled={opening}
        whileHover={reducedMotion ? undefined : { y: -2, scale: 1.015 }}
        whileTap={reducedMotion ? undefined : { scale: 0.985 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-brand-ink px-6 py-3 text-center text-sm font-semibold text-white shadow-md shadow-brand-ink/10 ring-1 ring-brand-ink/10 transition-colors hover:bg-brand-ink/90 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-accent disabled:cursor-wait sm:min-w-[320px] sm:px-8 sm:text-base"
      >
        <Camera className="size-4 shrink-0 text-brand-purple" aria-hidden="true" />
        <span>Complete Directory Profile Setup</span>
        <ArrowRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
      </motion.button>

      {opening ? (
        <motion.div
          className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-[radial-gradient(ellipse_at_top_left,#f1ecff_0%,transparent_48%),radial-gradient(ellipse_at_bottom_right,#e7f3ff_0%,transparent_46%),#f7f9fc] px-5 text-center"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
          aria-live="polite"
        >
          <motion.section
            initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.24, ease: "easeOut" }}
            className="flex w-full max-w-md flex-col items-center rounded-3xl bg-white/95 px-8 py-10 shadow-xl shadow-brand-ink/10 ring-1 ring-brand-border sm:px-10"
          >
            <motion.span
              initial={reducedMotion ? false : { scale: 0.72, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.08, duration: reducedMotion ? 0 : 0.28, type: "spring", stiffness: 250, damping: 18 }}
              className="flex size-16 items-center justify-center rounded-full bg-brand-purple text-brand-accent ring-1 ring-brand-border"
            >
              <Check className="size-8" strokeWidth={2.5} aria-hidden="true" />
            </motion.span>
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-brand-ink">Directory profile setup</h1>
            <p className="mt-2 text-sm leading-6 text-brand-muted">We’re preparing your founder photo and startup information form.</p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-brand-secondary"><Camera className="size-4" aria-hidden="true" /> Your 4:5 member portrait stays unchanged.</p>
            <motion.span
              className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-brand-cloud"
              initial={false}
              aria-hidden="true"
            ><motion.span className="block h-full w-10 rounded-full bg-brand-accent" animate={{ x: [-36, 88] }} transition={{ duration: reducedMotion ? 0 : 0.65, repeat: reducedMotion ? 0 : Infinity, ease: "easeInOut" }} /></motion.span>
            <p className="mt-3 text-xs text-brand-muted">Opening directory setup…</p>
          </motion.section>
        </motion.div>
      ) : null}
    </>
  );
}
