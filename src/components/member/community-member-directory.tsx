"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, MapPin, ArrowUpRight, UsersRound, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type CommunityMember = { member_id: string; display_name: string; city: string | null; designation: string | null; about_me: string | null; skills: string[]; startup_name: string | null; whatsapp: string | null; has_photo: boolean };

export function CommunityMemberDirectory() {
  const [query, setQuery] = React.useState("");
  const [members, setMembers] = React.useState<CommunityMember[]>([]);
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBusy(true); setError("");
      try {
        const response = await fetch(`/api/members?q=${encodeURIComponent(query)}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Member profiles are unavailable.");
        setMembers(payload.members ?? []);
      } catch (cause) {
        if (!controller.signal.aborted) { setMembers([]); setError(cause instanceof Error ? cause.message : "Member profiles are unavailable."); }
      } finally { if (!controller.signal.aborted) setBusy(false); }
    }, query ? 220 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
    <label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-brand-muted" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search CSC members by name, city, profession or startup" className="h-14 rounded-2xl pl-12 text-base" aria-label="Search CSC members" /></label>
    {busy ? <div className="flex justify-center py-12" role="status"><Loader2 className="size-6 animate-spin text-brand-accent" /><span className="sr-only">Loading member profiles</span></div> : error ? <p role="alert" className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900">{error}</p> : members.length ? <ul className="flex flex-col gap-3">{members.map((m) => <li key={m.member_id}><Link href={`/members/${m.member_id}`} className="group flex min-w-0 items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-brand-border transition hover:-translate-y-0.5 hover:shadow-sm sm:gap-5 sm:p-5">
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-purple text-sm font-bold text-brand-ink ring-1 ring-brand-border sm:size-16">{m.has_photo ? <Image src={`/api/members/${m.member_id}/portrait`} alt="" fill unoptimized sizes="64px" className="object-cover" /> : m.display_name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}</span>
      <span className="min-w-0 flex-1"><span className="block break-words font-semibold text-brand-ink">{m.display_name}</span><span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-muted">{m.designation ? <span>{m.designation.replaceAll("_", " ")}</span> : null}{m.city ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{m.city}</span> : null}</span>{m.startup_name ? <span className="mt-1 block truncate text-sm text-brand-secondary">{m.startup_name}</span> : null}{m.skills.length ? <span className="mt-2 hidden flex-wrap gap-1.5 sm:flex">{m.skills.slice(0, 4).map((skill) => <span key={skill} className="rounded-full bg-brand-cloud px-2.5 py-1 text-xs text-brand-secondary">{skill}</span>)}</span> : null}</span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-accent sm:text-sm">View Profile <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
    </Link></li>)}</ul> : <section className="rounded-2xl bg-white p-10 text-center ring-1 ring-brand-border"><UsersRound className="mx-auto size-8 text-brand-muted" /><h2 className="mt-3 font-semibold text-brand-ink">No shared member profiles found</h2><p className="mt-1 text-sm text-brand-muted">Members appear here after they choose to share a profile with the CSC community.</p></section>}
  </div>;
}
