"use client";

import * as React from "react";
import { Loader2, Mail, ShieldAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RoleOption = { id: string; label: string; permissions: { id: string; label: string }[] };
type InvitationRow = { id: string; email: string; fullName?: string | null; role: string; roleLabel: string; invitedBy: string; status: string; deliveryStatus: string; attempts: number; deliveryIssue: string | null; expiresAt: string; sentAt: string | null; acceptedAt: string | null; acceptedBy: string | null; revokedAt: string | null; createdAt: string; message: string | null };
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value)) + " IST" : "—";

export function AdminInvitationManager({ isDemo }: { isDemo: boolean }) {
  const [roles, setRoles] = React.useState<RoleOption[]>([]);
  const [invitations, setInvitations] = React.useState<InvitationRow[]>([]);
  const [role, setRole] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [confirmSuperAdmin, setConfirmSuperAdmin] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ error: boolean; text: string } | null>(null);
  const [lastInvite, setLastInvite] = React.useState<{ url: string; email: string; role: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const selectedRole = roles.find((item) => item.id === role);

  async function copyLink() {
    if (!lastInvite) return;
    try {
      await navigator.clipboard.writeText(lastInvite.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(false); }
  }
  const load = React.useCallback(async () => {
    if (isDemo) { setLoading(false); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/admin/invitations", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Invitation records could not be loaded.");
      setRoles(payload.roles ?? []); setInvitations(payload.invitations ?? []);
      setRole((current) => current || payload.roles?.[0]?.id || "");
    } catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : "Invitation records could not be loaded." }); }
    finally { setLoading(false); }
  }, [isDemo]);
  React.useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function send(event: React.FormEvent) {
    event.preventDefault(); setNotice(null);
    if (role === "super_admin" && !confirmSuperAdmin) { setNotice({ error: true, text: "Confirm that this invitee should receive all administrator permissions." }); return; }
    setSending(true);
    try {
      const response = await fetch("/api/admin/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role, fullName, message, confirmSuperAdmin }) });
      const payload = await response.json();
      if (typeof payload.invitationUrl === "string" && payload.invitationUrl) { setLastInvite({ url: payload.invitationUrl, email, role: selectedRole?.label ?? role }); setCopied(false); }
      if (!response.ok) throw new Error(payload.error ?? "Invitation could not be sent.");
      setNotice({ error: false, text: "Invitation email was accepted by the CSC mail server. You can also copy the link below to share it manually. Role access remains inactive until the invitee securely accepts." });
      setEmail(""); setFullName(""); setMessage(""); setConfirmSuperAdmin(false); setPreview(false); await load();
    } catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : "Invitation could not be sent." }); await load(); }
    finally { setSending(false); }
  }

  async function act(row: InvitationRow, action: "resend" | "revoke") {
    setBusyId(row.id); setNotice(null);
    try {
      const response = await fetch(`/api/admin/invitations/${row.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Invitation action failed.");
      setNotice({ error: false, text: action === "revoke" ? "Invitation revoked." : "A fresh single-use invitation link was sent." }); await load();
    } catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : "Invitation action failed." }); }
    finally { setBusyId(null); }
  }

  return <div className="flex flex-col gap-7">
    {isDemo ? <p className="rounded-xl bg-brand-gold/50 p-4 text-sm text-brand-ink">Invitation sending is disabled in the demo preview. A live Super Admin session is required.</p> : null}
    {notice ? <p role={notice.error ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${notice.error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>{notice.text}</p> : null}
    {lastInvite ? <div className="rounded-2xl border border-brand-border bg-brand-cloud p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-base font-semibold text-brand-ink">Invitation link ready to share</h2><p className="mt-1 text-xs text-brand-muted">The email was sent automatically to <strong>{lastInvite.email}</strong> ({lastInvite.role}). You can also copy this single-use link and share it directly (e.g. on WhatsApp). It expires in 72 hours and only works for the invited verified account — keep it private.</p></div>
        <button type="button" onClick={() => setLastInvite(null)} className="shrink-0 text-xs font-medium text-brand-muted hover:text-brand-ink">Dismiss</button>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input readOnly value={lastInvite.url} onFocus={(event) => event.currentTarget.select()} aria-label="Invitation link" className="min-w-0 flex-1 rounded-lg border border-brand-border bg-white px-3 py-2 font-mono text-xs text-brand-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void copyLink()}>{copied ? "Copied ✓" : "Copy link"}</Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`You're invited to join the CSC Circle administration team as ${lastInvite.role}. Accept your invitation here: ${lastInvite.url}`)}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>Share on WhatsApp</a>
        </div>
      </div>
    </div> : null}
    <section className="grid gap-6 rounded-2xl bg-white p-5 ring-1 ring-brand-border lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] sm:p-7">
      <form onSubmit={send} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-brand-ink">Invite an administrator</h2>
        <div className="flex flex-col gap-1.5"><Label htmlFor="admin-invite-email">Invitee email address</Label><Input id="admin-invite-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="admin-invite-name">Invitee full name <span className="font-normal text-brand-muted">(optional)</span></Label><Input id="admin-invite-name" maxLength={80} value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="admin-invite-role">Administrator role</Label><select id="admin-invite-role" required value={role} onChange={(event) => { setRole(event.target.value); setConfirmSuperAdmin(false); }} className="h-11 rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><option value="" disabled>Select a role</option>{roles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="admin-invite-message">Invitation message <span className="font-normal text-brand-muted">(optional)</span></Label><Textarea id="admin-invite-message" maxLength={500} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a short personal note" /><span className="text-right text-xs text-brand-muted">{message.length}/500</span></div>
        <p className="text-xs text-brand-muted">Invitation expires after 72 hours. SMTP acceptance is tracked; the invitee’s acceptance is a separate status.</p>
        {role === "super_admin" ? <label className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><input type="checkbox" className="mt-1 accent-amber-700" checked={confirmSuperAdmin} onChange={(event) => setConfirmSuperAdmin(event.target.checked)} /><span><strong>High privilege confirmation.</strong> Super Admin grants all 18 permissions, including role assignment, settings, audit, finance and member administration.</span></label> : null}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setPreview((current) => !current)}><Mail className="size-4" />{preview ? "Hide Email Preview" : "Preview Invitation Email"}</Button><Button type="submit" disabled={isDemo || sending || !selectedRole} className="min-w-36">{sending ? <Loader2 className="size-4 animate-spin" /> : null}Send Invitation</Button></div>
      </form>
      <aside className="rounded-2xl bg-brand-cloud p-5">
        <h2 className="text-base font-semibold text-brand-ink">Role permission preview</h2>
        {selectedRole ? <><p className="mt-1 text-sm text-brand-secondary">{selectedRole.label} · {selectedRole.permissions.length} permission{selectedRole.permissions.length === 1 ? "" : "s"}</p><ul className="mt-4 flex flex-col gap-2">{selectedRole.permissions.map((permission) => <li key={permission.id} className="flex items-start gap-2 text-sm text-brand-ink"><span aria-hidden className="mt-1 size-2 shrink-0 rounded-full bg-brand-accent" /><span>{permission.label}<span className="ml-1 font-mono text-xs text-brand-muted">({permission.id})</span></span></li>)}</ul></> : <p className="mt-3 text-sm text-brand-muted">Choose a role to review its permissions before sending.</p>}
        {role === "super_admin" ? <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-900"><ShieldAlert className="mt-0.5 size-4 shrink-0" />This role has complete CSC administrator access.</div> : null}
      </aside>
      {preview ? <div className="lg:col-span-2"><div className="rounded-2xl border border-brand-border p-5"><p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Email preview · no invitation token displayed</p><h3 className="mt-3 text-lg font-bold text-brand-ink">You&apos;re Invited to Join the CSC Circle Admin Team</h3><p className="mt-2 text-sm text-brand-secondary">{fullName.trim() ? `Hello ${fullName.trim()}, ` : "Hello, "}you have been invited to join the Coimbatore Startup Community administration team as <strong>{selectedRole?.label ?? "[role]"}</strong>.</p>{message.trim() ? <p className="mt-3 rounded-xl bg-brand-cloud p-3 text-sm">{message}</p> : null}<p className="mt-3 text-sm text-brand-muted">The email includes the selected role permissions, a 72-hour expiration, a single-use acceptance link and the verified-account security notice.</p><div className="mt-3"><strong className="text-sm">Included permissions</strong><ul className="mt-1 list-inside list-disc text-sm text-brand-secondary">{selectedRole?.permissions.map((permission) => <li key={permission.id}>{permission.label}</li>)}</ul></div></div></div> : null}
    </section>
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold text-brand-ink">Invitation history</h2><p className="text-sm text-brand-muted">Access is granted only after secure, verified acceptance.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button></div>
      {loading ? <p className="py-6 text-sm text-brand-muted">Loading invitations…</p> : invitations.length ? <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted"><th className="px-3 py-3">Invitee</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Invited by / date</th><th className="px-3 py-3">Delivery</th><th className="px-3 py-3">Invitation status</th><th className="px-3 py-3">Expires / accepted</th><th className="px-3 py-3">Actions</th></tr></thead><tbody>{invitations.map((row) => <tr key={row.id} className="border-b border-brand-border/60 align-top last:border-0"><td className="px-3 py-3 font-medium text-brand-ink">{row.fullName ? <>{row.fullName}<br /></> : null}{row.email}</td><td className="px-3 py-3">{row.roleLabel}</td><td className="px-3 py-3"><div>{row.invitedBy}</div><div className="text-xs text-brand-muted">{date(row.createdAt)}</div></td><td className="px-3 py-3"><span className="capitalize">{row.deliveryStatus.replaceAll("_", " ")}</span><div className="text-xs text-brand-muted">{row.attempts} attempt{row.attempts === 1 ? "" : "s"}{row.deliveryIssue ? ` · ${row.deliveryIssue}` : ""}</div></td><td className="px-3 py-3 capitalize">{row.status}{row.acceptedBy ? <div className="text-xs text-brand-muted">Accepted by {row.acceptedBy}</div> : null}</td><td className="px-3 py-3"><div>{date(row.expiresAt)}</div>{row.acceptedAt ? <div className="text-xs text-brand-muted">Accepted {date(row.acceptedAt)}</div> : null}</td><td className="px-3 py-3"><div className="flex gap-2">{row.status === "pending" ? <><Button size="sm" variant="outline" disabled={busyId === row.id || isDemo} onClick={() => void act(row,"resend")}>Resend</Button><Button size="sm" variant="destructive" disabled={busyId === row.id || isDemo} onClick={() => void act(row,"revoke")}>Revoke</Button></> : "—"}</div></td></tr>)}</tbody></table></div> : <p className="py-6 text-sm text-brand-muted">No administrator invitations yet.</p>}
    </section>
  </div>;
}
