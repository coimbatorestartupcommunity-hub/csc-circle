"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NotificationRetry({ jobs }: { jobs: { id: string; type: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!jobs.length) return null;

  return (
    <form
      className="mb-6 grid min-w-0 max-w-full gap-3 rounded-2xl border border-brand-border bg-white p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setMessage("");
        const data = new FormData(event.currentTarget);
        try {
          const res = await fetch("/api/admin/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              job: data.get("job"),
              reason: data.get("reason"),
              acknowledge_ambiguous: data.get("ack") === "on",
            }),
          });
          const result = await res.json();
          setMessage(res.ok ? "Retry queued. Delivery is not yet confirmed." : result.error);
          if (res.ok) router.refresh();
        } catch {
          setMessage("Retry unavailable.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="font-semibold text-brand-ink">Request a controlled retry</h2>
      <label className="grid min-w-0 gap-1 text-sm font-medium text-brand-ink">
        Failed notification
        <select
          name="job"
          className="block min-h-11 w-full max-w-full truncate rounded-lg border border-brand-border bg-white p-2 text-sm"
          required
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.type} — {j.id}
            </option>
          ))}
        </select>
      </label>
      <label className="grid min-w-0 gap-1 text-sm font-medium text-brand-ink">
        Reason
        <input
          name="reason"
          minLength={5}
          maxLength={500}
          required
          className="block min-h-11 w-full max-w-full rounded-lg border border-brand-border bg-white p-2 text-sm"
        />
      </label>
      <label className="flex items-start gap-2 text-xs text-brand-secondary sm:text-sm">
        <input name="ack" type="checkbox" className="mt-0.5 shrink-0" />
        <span>I checked the mailbox for uncertain delivery and confirmed a resend is appropriate.</span>
      </label>
      <button
        disabled={busy}
        className="w-full rounded-xl bg-brand-purple px-4 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-fit"
      >
        {busy ? "Queuing…" : "Queue retry"}
      </button>
      {message ? <p role="status" className="text-sm font-medium text-brand-ink">{message}</p> : null}
    </form>
  );
}
