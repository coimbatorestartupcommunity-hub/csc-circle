"use client";

import * as React from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteMemberForm({ disabled }: { disabled?: boolean }) {
  const [email, setEmail] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/admin/members/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Invitation could not be sent.");
      setEmail(""); setMessage(data.message ?? "Invitation sent.");
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : "Invitation could not be sent.");
    } finally { setSaving(false); }
  }

  return <section className="mb-5 grid min-w-0 gap-3 rounded-2xl bg-white p-4 ring-1 ring-brand-border sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
    <form onSubmit={submit} className="contents">
      <div className="grid min-w-0 gap-2"><label htmlFor="invite-member-email" className="text-sm font-medium text-brand-ink">Invite a member</label><Input id="invite-member-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="member@example.com" disabled={saving || disabled} /></div>
      <Button type="submit" disabled={saving || disabled || !email.trim()} className="w-full gap-2 sm:w-auto">{saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}{saving ? "Sending…" : "Send Invitation"}</Button>
    </form>
    <p className="text-xs leading-5 text-brand-muted sm:col-span-2">An account invitation does not approve CSC membership. Recipients verify their email, complete their profile, and follow the separate membership review process.</p>
    {message ? <p role={error ? "alert" : "status"} aria-live="polite" className={`rounded-xl p-3 text-sm sm:col-span-2 ${error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{message}</p> : null}
  </section>;
}
