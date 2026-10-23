"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";

type Invitation = { role: string; roleLabel: string; expiresAt: string; invitationId?: string; acceptanceMethod?: "email" | "in_app" };

export function AdminInvitationAcceptance() {
  const router = useRouter();
  const [invitation, setInvitation] = React.useState<Invitation | null>(null);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [accepting, setAccepting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [accepted, setAccepted] = React.useState(false);
  const [invitationId, setInvitationId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get("token");
    const id = new URLSearchParams(window.location.search).get("invitationId");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const load = async () => {
      try {
        if (token) {
          const response = await fetch("/api/admin/invitations/exchange", {
            method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }), cache: "no-store",
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error ?? "Invitation could not be verified.");
        }
        const lookup = id && /^[0-9a-f-]{36}$/i.test(id) ? `?invitationId=${encodeURIComponent(id)}` : "";
        const response = await fetch(`/api/admin/invitations/accept${lookup}`, { cache: "no-store" });
        const payload = await response.json();
        if (active && id && /^[0-9a-f-]{36}$/i.test(id)) setInvitationId(id);
        if (!response.ok || !payload.invitation) throw new Error("This invitation is unavailable, expired, revoked, or has already been used.");
        if (active) {
          setInvitation(payload.invitation);
          setAuthenticated(payload.authenticated);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Invitation could not be loaded.");
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, []);

  async function accept() {
    setAccepting(true); setError(null);
    try {
      const response = await fetch("/api/admin/invitations/accept", {
        method: "POST", cache: "no-store",
        ...(invitationId ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ invitationId }) } : {}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Invitation could not be accepted.");
      setAccepted(true);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Invitation could not be accepted."); }
    finally { setAccepting(false); }
  }

  const expiration = invitation ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(invitation.expiresAt)) + " IST" : "";
  return <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brand-border sm:p-10">
    <div className="mb-8 flex justify-center"><BrandLogo /></div>
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-purple/50 text-brand-ink"><ShieldCheck className="size-7" /></span>
      <h1 className="text-2xl font-bold text-brand-ink sm:text-3xl">{accepted ? "Administrator Access Activated" : "Administrator Invitation"}</h1>
      {loading ? <Loader2 className="size-6 animate-spin text-brand-accent" aria-label="Loading invitation" /> : null}
      {!loading && invitation && !accepted ? <>
        <p className="text-brand-secondary">You have been invited to join the Coimbatore Startup Community administration team.</p>
        <div className="w-full rounded-2xl bg-brand-cloud p-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Assigned role</p>
          <p className="mt-1 text-lg font-semibold text-brand-ink">{invitation.roleLabel}</p>
          <p className="mt-3 text-sm text-brand-muted">This invitation expires {expiration}. It can only be accepted by signing in to the intended verified email account.</p>
        </div>
        {authenticated ? <Button className="h-12 w-full" onClick={accept} disabled={accepting}>{accepting ? <Loader2 className="size-4 animate-spin" /> : null}Accept Invitation</Button> : <div className="grid w-full gap-3 sm:grid-cols-2">
          <Link href={`/login?next=${encodeURIComponent(`/admin/accept-invitation${invitationId ? `?invitationId=${invitationId}` : ""}`)}`} className={buttonVariants({ variant: "default", className: "h-12" })}>Sign in to accept</Link>
          <Link href={`/signup?next=${encodeURIComponent(`/admin/accept-invitation${invitationId ? `?invitationId=${invitationId}` : ""}`)}`} className={buttonVariants({ variant: "outline", className: "h-12" })}>Create verified account</Link>
        </div>}
      </> : null}
      {accepted ? <><p className="text-brand-secondary">Your CSC administrator role has been activated successfully.</p><Link href="/admin" className={buttonVariants({ className: "h-12 w-full" })}>Open Admin Dashboard</Link></> : null}
      {error ? <div role="alert" className="w-full rounded-xl bg-red-50 px-4 py-3 text-left text-sm text-red-800">{error}<p className="mt-2"><Link className="font-semibold underline" href={`/login?next=${encodeURIComponent(`/admin/accept-invitation${invitationId ? `?invitationId=${invitationId}` : ""}`)}`}>Sign in with the invited verified account</Link></p></div> : null}
      <p className="text-xs text-brand-muted">Only accept if you recognize and trust the CSC inviter. Administrator access is activated only after secure invitation validation.</p>
    </div>
  </section>;
}
