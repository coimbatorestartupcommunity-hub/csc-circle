"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";

export function NotificationEmailCheck() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function verify() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const response = await fetch("/api/admin/notifications/verify", { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        setFailed(true);
        setMessage(result.error || "Email verification failed.");
        return;
      }
      setMessage(result.message);
      router.refresh();
    } catch {
      setFailed(true);
      setMessage("Email verification failed. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 flex min-w-0 flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-brand-border bg-white p-5">
      <div className="min-w-0">
        <h2 className="font-semibold text-brand-ink">Email delivery health</h2>
        <p className="mt-1 text-sm text-brand-muted">Verify the production SMTP connection and start processing queued emails.</p>
        {message && <p className={`mt-2 text-sm ${failed ? "text-red-700" : "text-emerald-700"}`} role="status">{message}</p>}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={verify}
        className="inline-flex min-h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 py-2 font-semibold text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple disabled:cursor-wait disabled:opacity-60"
      >
        <MailCheck aria-hidden="true" className="size-4" />
        {busy ? "Checking email…" : "Verify & process queue"}
      </button>
    </section>
  );
}
