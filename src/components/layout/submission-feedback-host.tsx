"use client";

import * as React from "react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listenForSubmissionFeedback, type SubmissionFeedback } from "@/lib/ui/submission-feedback";

export function SubmissionFeedbackHost() {
  const [feedback, setFeedback] = React.useState<SubmissionFeedback | null>(null);
  React.useEffect(() => listenForSubmissionFeedback(setFeedback), []);
  return <Dialog open={!!feedback} onOpenChange={(open) => !open && setFeedback(null)}>
    {feedback && <DialogContent className="max-w-md overflow-hidden rounded-3xl border-0 p-0 shadow-2xl">
      <div className="px-7 pb-6 pt-8 text-center sm:px-9 sm:pt-10">
        <div className="relative mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-300"><span className="absolute inset-1 rounded-full border border-emerald-100" /><Check className="relative size-10 stroke-[2.5]" /><Sparkles className="absolute -right-1 -top-1 size-5 text-brand-accent" /></div>
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-2xl font-semibold text-brand-ink">{feedback.title}</DialogTitle>
          <DialogDescription className="max-w-sm text-center text-base leading-relaxed">{feedback.message}</DialogDescription>
        </DialogHeader>
        {feedback.reference && <p className="mt-4 rounded-xl bg-brand-cloud px-4 py-3 font-mono text-sm text-brand-secondary">Reference: {feedback.reference}</p>}
      </div>
      <DialogFooter className="sm:justify-center"><Button className="w-full sm:w-40" onClick={() => setFeedback(null)}>Continue</Button></DialogFooter>
    </DialogContent>}
  </Dialog>;
}
