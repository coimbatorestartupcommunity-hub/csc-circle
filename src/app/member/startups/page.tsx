import Image from "next/image";
import Link from "next/link";
import { Plus, Rocket, Pencil, ExternalLink } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberUnavailable } from "@/components/member/member-unavailable";
import { Button } from "@/components/ui/button";
import { getMemberContext } from "@/lib/services/member/context";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "My Startups" };

export default async function MyStartupsPage() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  const admin = createAdminClient();
  const { data: startups, error } = await admin.from("directory_startups").select("id,slug,name,industry,description,status,updated_at,logo_url,directory_image_path,details,founder").eq("user_id", ctx.user!.id).neq("status", "archived").order("created_at", { ascending: true }).limit(5);
  if (error) return <section className="rounded-2xl bg-white p-6 text-sm text-red-700 ring-1 ring-brand-border">Your startup records could not be loaded. Refresh and try again.</section>;
  const items = startups ?? [];
  const full = items.length >= 4;
  const rows = await Promise.all(items.map(async (s) => {
    const paths = [s.directory_image_path, s.logo_url].filter((p): p is string => !!p && !/^https?:\/\//i.test(p));
    const signed = await Promise.all(paths.map((p) => admin.storage.from("member-portraits").createSignedUrl(p, 1800)));
    return { ...s, directoryUrl: signed[0]?.data?.signedUrl ?? "", logoUrl: signed[1]?.data?.signedUrl ?? "" };
  }));
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <MemberPageHeader title="My Startups" description="Create, manage, and showcase your startups within the CSC community." />
    <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div><h2 className="font-semibold text-brand-ink">Manage up to 4 startup profiles</h2><p className="mt-1 text-sm text-brand-muted">{items.length} / 4 startup profiles</p><div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-brand-cloud"><div className="h-full rounded-full bg-brand-accent" style={{ width: `${Math.min(100, items.length * 25)}%` }} /></div></div>
      {full ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">You have reached the maximum of 4 startups.</p> : <Button render={<Link href="/member/startups/new" />} className="gap-2"><Plus className="size-4" /> Add Startup</Button>}
    </section>
    {rows.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{rows.map((s) => {
      const details = (s.details ?? {}) as Record<string, unknown>;
      const pending = s.status === "pending" || s.status === "draft";
      const founder = (s.founder ?? {}) as { name?: string; role?: string };
      return <article key={s.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-brand-border">
        <div className="relative aspect-4/3 bg-brand-cloud">{s.directoryUrl ? <Image src={s.directoryUrl} alt={`${s.name} directory image`} fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" /> : <div className="flex h-full items-center justify-center"><Rocket className="size-10 text-brand-muted" /></div>}</div>
        <div className="flex flex-col gap-3 p-5"><div className="flex items-start gap-3">{s.logoUrl ? <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-brand-border"><Image src={s.logoUrl} alt="" fill unoptimized className="object-contain p-1" /></span> : null}<div className="min-w-0"><h2 className="break-words text-lg font-semibold text-brand-ink">{s.name}</h2><p className="text-sm text-brand-muted">{s.industry} · {String(details.city ?? "City not set")}</p></div></div>
          <p className="line-clamp-3 text-sm leading-6 text-brand-secondary">{s.description}</p><p className="text-xs text-brand-muted">{founder.name ?? "Founder"} · Updated {new Date(s.updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${s.status === "published" ? "bg-emerald-50 text-emerald-800" : pending ? "bg-amber-50 text-amber-900" : "bg-brand-cloud text-brand-secondary"}`}>{s.status === "published" ? "Published" : s.status === "pending" ? "Awaiting CSC review" : s.status}</span>
          <div className="mt-1 flex flex-wrap gap-2">{s.status === "published" ? <Button variant="outline" size="sm" render={<Link href={`/directory/${s.slug}`} />}><ExternalLink className="size-4" /> View Startup</Button> : null}{pending ? <Button variant="outline" size="sm" render={<Link href={`/member/startups/${s.id}/edit`} />}><Pencil className="size-4" /> Edit Startup</Button> : null}</div>
        </div>
      </article>;
    })}</div> : <section className="rounded-2xl bg-white p-10 text-center ring-1 ring-brand-border"><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-purple text-brand-ink"><Rocket className="size-6" /></span><h2 className="mt-4 text-lg font-semibold text-brand-ink">No startups yet</h2><p className="mt-2 text-sm text-brand-muted">Add your first startup profile to get started.</p>{!full ? <Button className="mt-5 gap-2" render={<Link href="/member/startups/new" />}><Plus className="size-4" /> Add your first startup</Button> : null}</section>}
  </div>;
}
