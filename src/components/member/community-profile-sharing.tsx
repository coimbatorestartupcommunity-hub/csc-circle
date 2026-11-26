"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Eye, Loader2, MapPin, Share2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

type SharingState = {
  eligible: boolean;
  reason: string | null;
  membershipStatus: string | null;
  digitalIdIssued: boolean;
  sharingEnabled: boolean;
  shareWhatsapp: boolean;
  showPhoto: boolean;
  showCity: boolean;
  showRole: boolean;
  showAbout: boolean;
  showSkills: boolean;
  showStartups: boolean;
  displayName: string;
  city: string | null;
  designation: string | null;
  aboutMe: string | null;
  skills: string[];
  hasPhoto: boolean;
};

type PreferenceKey = "showPhoto" | "showCity" | "showRole" | "showAbout" | "showSkills" | "showStartups" | "shareWhatsapp";
const preferenceLabels: { key: PreferenceKey; label: string }[] = [
  { key: "shareWhatsapp", label: "Share my WhatsApp contact publicly in the CSC Member Directory" },
];

export function CommunityProfileSharing({ memberId, portraitUrl }: { memberId: string; portraitUrl?: string | null }) {
  const [state, setState] = React.useState<SharingState | null>(null);
  const [preferences, setPreferences] = React.useState<Record<PreferenceKey, boolean>>({ showPhoto: true, showCity: true, showRole: true, showAbout: true, showSkills: true, showStartups: true, shareWhatsapp: false });
  const [confirming, setConfirming] = React.useState(false);
  const [stopping, setStopping] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const statusLabel = state?.membershipStatus === "expired" ? "Membership Expired"
    : state?.membershipStatus === "revoked" ? "Membership Revoked"
    : state?.membershipStatus === "suspended" ? "Directory Hidden"
    : state?.eligible ? "Auto-Listed in Directory"
    : state && state.membershipStatus !== "active" ? "Membership Approval Required"
    : state && !state.digitalIdIssued ? "Digital ID Required"
    : state ? "Pending Activation" : "Checking eligibility…";

  const refresh = React.useCallback(async () => {
    const response = await fetch("/api/member/community-sharing", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Profile sharing status could not be loaded.");
    const next = payload.state as SharingState;
    setState(next);
    setPreferences({ showPhoto: next.showPhoto, showCity: next.showCity, showRole: next.showRole, showAbout: next.showAbout, showSkills: next.showSkills, showStartups: next.showStartups, shareWhatsapp: next.shareWhatsapp });
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/member/community-sharing", { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Profile sharing status could not be loaded.");
        const next = payload.state as SharingState;
        setState(next);
        setPreferences({ showPhoto: next.showPhoto, showCity: next.showCity, showRole: next.showRole, showAbout: next.showAbout, showSkills: next.showSkills, showStartups: next.showStartups, shareWhatsapp: next.shareWhatsapp });
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Profile sharing status could not be loaded.");
      }
    })();
    return () => controller.abort();
  }, []);

  async function save(enabled: boolean) {
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/member/community-sharing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, preferences }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Profile sharing could not be updated.");
      setConfirming(false); setStopping(false);
      await refresh();
      setNotice(enabled ? "Your profile is now shared with the CSC community." : "Your profile is no longer shared with the CSC community.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Profile sharing could not be updated."); }
    finally { setSaving(false); }
  }

  return <section id="community-sharing" className="scroll-mt-28 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent">Community visibility</p><h2 className="mt-1 text-lg font-semibold text-brand-ink">CSC Member Directory &amp; WhatsApp Privacy</h2><p className="mt-1 text-sm leading-6 text-brand-muted">Active CSC members are automatically listed in the public Member Directory. Your WhatsApp number remains private unless you opt in below.</p></div>
      <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${state?.eligible ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
        {statusLabel}
      </span>
    </div>
    {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    {notice ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p> : null}
    {state?.eligible ? <div className="mt-5 flex flex-col gap-3 rounded-xl bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-emerald-950">Your active profile is automatically visible in the CSC Member Directory.</p>
        <p className="mt-0.5 text-xs text-emerald-800">{preferences.shareWhatsapp ? "WhatsApp contact sharing is currently enabled." : "WhatsApp number is private (opt-in off)."}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" render={<Link href={`/members/${memberId}`} />} className="gap-2"><Eye className="size-4" /> View My Public Profile</Button><Button variant="outline" onClick={() => setConfirming(true)} className="gap-2"><Share2 className="size-4" /> WhatsApp Privacy</Button></div>
    </div> : state ? <div className="mt-5 flex flex-col gap-3 rounded-xl bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm leading-6 text-amber-950">{state.reason ?? "Your CSC membership and issued Digital ID must be active to appear in the Member Directory."}</p><div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" render={<Link href="/profile/id-card" />}>View Digital ID</Button><Button variant="outline" render={<Link href="/profile/claim" />}>View Membership Status</Button></div></div> : <p className="mt-5 flex items-center gap-2 text-sm text-brand-muted"><Loader2 className="size-4 animate-spin" /> Checking your membership and Digital ID…</p>}

    {confirming && state ? <div className="mt-5 rounded-2xl border border-brand-border bg-brand-cloud/60 p-4 sm:p-5" role="dialog" aria-labelledby="share-confirm-title" aria-modal="false">
      <h3 id="share-confirm-title" className="text-base font-semibold text-brand-ink">Manage WhatsApp Visibility</h3><p className="mt-1 text-sm leading-6 text-brand-secondary">Your name, designation, city, bio, skills, photo, and published startups are automatically shown in the public CSC Member Directory. Choose below whether to also display your WhatsApp number.</p>
      <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-brand-border"><div className="flex items-center gap-3"><span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-lilac text-sm font-semibold text-brand-ink">{state.hasPhoto && portraitUrl ? <Image src={portraitUrl} alt="" fill unoptimized sizes="56px" className="object-cover" /> : <UserRound className="size-6" />}</span><span className="min-w-0"><span className="block break-words font-semibold text-brand-ink">{state.displayName}</span><span className="mt-1 flex flex-wrap gap-x-3 text-sm text-brand-muted">{state.designation ? <span>{state.designation.replaceAll("_", " ")}</span> : null}{state.city ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{state.city}</span> : null}</span></span></div>{state.aboutMe ? <p className="mt-3 line-clamp-3 text-sm text-brand-secondary">{state.aboutMe}</p> : null}{state.skills.length ? <p className="mt-2 text-xs text-brand-muted">Skills: {state.skills.slice(0, 6).join(", ")}</p> : null}<p className="mt-3 text-xs text-brand-muted">{preferences.shareWhatsapp ? "Your WhatsApp contact will be visible in the Member Directory." : "WhatsApp contact remains private."}</p></div>
      <div className="mt-4 grid gap-x-5 gap-y-2">{preferenceLabels.map(({ key, label }) => <label key={key} className="flex items-start gap-2 text-sm text-brand-secondary"><input type="checkbox" className="mt-1 accent-[var(--brand-accent)]" checked={preferences[key]} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setConfirming(false)} disabled={saving}>Cancel</Button><Button onClick={() => void save(true)} disabled={saving} className="gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Save Privacy Preferences</Button></div>
    </div> : null}

    {stopping ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4" role="alertdialog" aria-label="Stop sharing confirmation"><h3 className="font-semibold text-red-950">Stop sharing WhatsApp?</h3><p className="mt-1 text-sm text-red-900">Your WhatsApp number will no longer be visible.</p><div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setStopping(false)} disabled={saving}>Cancel</Button><Button variant="destructive" onClick={() => void save(false)} disabled={saving}>{saving ? "Updating…" : "Confirm"}</Button></div></div> : null}
  </section>;
}
