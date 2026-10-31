"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Assignment = { id: string; userId: string; role: string; roleLabel: string; email: string; name: string; createdAt: string };
type Role = { id: string; label: string; permissions: { id: string; label: string }[] };
type AuditEvent = { id: string; action: string; actorRole: string | null; targetType: string | null; targetId: string | null; after: unknown; createdAt: string };

export function AdminRoleManager({ isDemo }: { isDemo: boolean }) {
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [history, setHistory] = React.useState<AuditEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ error: boolean; message: string } | null>(null);
  const load = React.useCallback(async () => {
    if (isDemo) { setLoading(false); return; }
    setLoading(true);
    try { const response = await fetch("/api/admin/roles", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Roles could not be loaded."); setAssignments(payload.assignments ?? []); setRoles(payload.roles ?? []); setHistory(payload.history ?? []); }
    catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : "Roles could not be loaded." }); }
    finally { setLoading(false); }
  }, [isDemo]);
  React.useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function revoke(assignment: Assignment) {
    if (!window.confirm(`Revoke ${assignment.roleLabel} access for ${assignment.email}?`)) return;
    setBusy(assignment.id); setNotice(null);
    try { const response = await fetch("/api/admin/roles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: assignment.userId, role: assignment.role }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Role could not be revoked."); setNotice({ error: false, message: `${assignment.roleLabel} access was revoked. Subsequent privileged requests will be checked against the updated role.` }); await load(); }
    catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : "Role could not be revoked." }); }
    finally { setBusy(null); }
  }
  const grouped = new Map<string, Assignment[]>(); for (const item of assignments) grouped.set(item.userId, [...(grouped.get(item.userId) ?? []), item]);
  return <div className="flex flex-col gap-6">
    {isDemo ? <p className="rounded-xl bg-brand-gold/50 p-4 text-sm text-brand-ink">Live role assignments are visible only to an authenticated Super Admin. No changes are available in demo preview.</p> : null}
    {notice ? <p role={notice.error ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${notice.error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>{notice.message}</p> : null}
    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7"><div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="text-lg font-semibold text-brand-ink">Active administrators</h2><p className="text-sm text-brand-muted">An account may hold more than one role; effective permissions are the union of current assignments.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button></div>
      {loading ? (
        <p className="py-6 text-sm text-brand-muted">Loading administrator assignments…</p>
      ) : assignments.length ? (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {assignments.map((item) => {
              const userRoles = grouped.get(item.userId) ?? [];
              const isLastSuperAdmin = item.role === "super_admin" && assignments.filter((candidate) => candidate.role === "super_admin").length <= 1;
              return (
                <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-brand-border bg-white p-4 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-ink">{item.name}</p>
                      <p className="break-all text-xs text-brand-muted">{item.email}</p>
                    </div>
                    <span className="rounded-full bg-brand-cloud px-2.5 py-0.5 text-xs font-semibold text-brand-secondary shrink-0">
                      {item.roleLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-brand-border/60 pt-2 text-xs text-brand-muted">
                    <span>{userRoles.length} role assignment{userRoles.length === 1 ? "" : "s"}</span>
                    <span>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(item.createdAt))}</span>
                  </div>
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full h-9 rounded-xl"
                      disabled={isDemo || isLastSuperAdmin || busy === item.id}
                      onClick={() => void revoke(item)}
                    >
                      {busy === item.id ? <Loader2 className="size-4 animate-spin" /> : null}
                      {isLastSuperAdmin ? "Protected last Super Admin" : "Revoke role"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted"><th className="px-3 py-3">Administrator</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Assigned role</th><th className="px-3 py-3">Assigned</th><th className="px-3 py-3">Action</th></tr></thead>
              <tbody>{assignments.map((item) => { const userRoles = grouped.get(item.userId) ?? []; const isLastSuperAdmin = item.role === "super_admin" && assignments.filter((candidate) => candidate.role === "super_admin").length <= 1; return <tr key={item.id} className="border-b border-brand-border/60 last:border-0"><td className="px-3 py-3 font-medium text-brand-ink">{item.name}</td><td className="px-3 py-3">{item.email}</td><td className="px-3 py-3"><span>{item.roleLabel}</span><div className="text-xs text-brand-muted">{userRoles.length} role assignment{userRoles.length === 1 ? "" : "s"}</div></td><td className="px-3 py-3">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(item.createdAt))}</td><td className="px-3 py-3"><Button size="sm" variant="destructive" disabled={isDemo || isLastSuperAdmin || busy === item.id} onClick={() => void revoke(item)}>{busy === item.id ? <Loader2 className="size-4 animate-spin" /> : null}{isLastSuperAdmin ? "Protected last Super Admin" : "Revoke role"}</Button></td></tr>; })}</tbody>
            </table>
          </div>
        </>
      ) : <p className="py-6 text-sm text-brand-muted">No active administrator roles found.</p>}
    </section>
    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7"><h2 className="text-lg font-semibold text-brand-ink">Approved role permissions</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{roles.map((item) => <article key={item.id} className="rounded-xl bg-brand-cloud p-4"><h3 className="font-semibold text-brand-ink">{item.label}</h3><ul className="mt-2 flex flex-col gap-1 text-sm text-brand-secondary">{item.permissions.map((permission) => <li key={permission.id}>{permission.label}<span className="ml-1 font-mono text-xs text-brand-muted">({permission.id})</span></li>)}</ul></article>)}</div><p className="mt-4 text-xs text-brand-muted">The permission matrix is fixed to the CSC-approved role matrix. Role changes are audited and enforced again on each privileged request.</p></section>
    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7">
      <h2 className="text-lg font-semibold text-brand-ink">Recent role and invitation history</h2>
      {history.length ? (
        <>
          <div className="mt-3 flex flex-col gap-2.5 md:hidden">
            {history.map((event) => (
              <div key={event.id} className="rounded-xl border border-brand-border bg-white p-3 text-xs shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-brand-ink">{event.action}</span>
                  <span className="text-brand-muted">{new Intl.DateTimeFormat("en-IN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(event.createdAt))}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-brand-secondary">
                  <span>Actor: {event.actorRole ?? "system"}</span>
                  <span>·</span>
                  <span className="truncate">{event.targetType} · {event.targetId}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted"><th className="px-3 py-2">Action</th><th className="px-3 py-2">Actor role</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">When</th></tr></thead>
              <tbody>{history.map((event) => <tr key={event.id} className="border-b border-brand-border/60 last:border-0"><td className="px-3 py-2 font-mono text-xs">{event.action}</td><td className="px-3 py-2">{event.actorRole ?? "system"}</td><td className="px-3 py-2 font-mono text-xs">{event.targetType} · {event.targetId}</td><td className="px-3 py-2">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(event.createdAt))}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      ) : <p className="py-5 text-sm text-brand-muted">No administrator role history recorded.</p>}
    </section>
  </div>;
}
