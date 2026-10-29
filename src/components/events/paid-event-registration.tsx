"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Ticket } from "lucide-react";
import { PaidRegistrationForm } from "@/components/events/paid-registration-form";
import { getPaidRegistrationPresentation, type PaidRegistrationDisplayState } from "@/lib/events/registration-presentation";
import type { EventRecord } from "@/types";

type StatusResult = { ok: true; authenticated: boolean; registered: boolean; state?: PaidRegistrationDisplayState; passHref?: string };

export function PaidEventRegistration({ event }: { event: EventRecord }) {
  const [result, setResult] = React.useState<StatusResult | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetch(`/api/events/${encodeURIComponent(event.id)}/registration-status`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as StatusResult;
        if (!response.ok || !body.ok) throw new Error("status unavailable");
        if (active) setResult(body);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [event.id]);

  if (!result && !failed) return <div className="flex min-h-28 items-center justify-center gap-2 rounded-2xl bg-brand-white p-6 text-sm text-brand-secondary ring-1 ring-brand-border" role="status"><Loader2 className="size-4 animate-spin" />Checking your registration…</div>;
  if (failed) return <div className="rounded-2xl bg-brand-white p-5 text-sm text-brand-secondary ring-1 ring-brand-border" role="alert">We couldn’t check your registration status. Refresh this page before registering.</div>;

  if (result?.registered) {
    const state = result.state ?? "confirmation_pending";
    const presentation = getPaidRegistrationPresentation(state);
    const passReady = presentation.passReady && result.passHref;
    return <section className="rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border" aria-live="polite">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-accent" aria-hidden />
        <div><h5 className="font-semibold text-brand-ink">{presentation.heading}</h5><p className="mt-1 text-sm leading-relaxed text-brand-secondary">{presentation.message}</p></div>
      </div>
      {passReady ? <Link href={result.passHref!} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><Ticket className="size-4" />View and download your event pass</Link> : null}
    </section>;
  }

  return <PaidRegistrationForm event={event} />;
}
