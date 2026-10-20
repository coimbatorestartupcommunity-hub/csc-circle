import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, MessageCircle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMemberContext } from "@/lib/services/member/context";
import { MemberUnavailable } from "@/components/member/member-unavailable";
import { createClient } from "@/lib/supabase/server";
import { getPublicStartups } from "@/lib/services/public-data";

export const metadata = { title: "CSC Member Profile" };
export const instant = false;
type PublicMember = { member_id: string; display_name: string; city: string | null; designation: string | null; about_me: string | null; skills: string[]; startup_name: string | null; whatsapp: string | null; has_photo: boolean; startup_website: string | null };
export default async function CommunityMemberPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  const { slug } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(slug)) notFound();
  const sb = await createClient();
  const { data } = await sb.rpc("get_discoverable_member", { p_member_id: slug });
  const member = data?.[0] as PublicMember | undefined;
  if (!member) notFound();
  const startups = (await getPublicStartups()).filter((startup) => startup.founder.id === member.member_id);
  const phone = member.whatsapp?.replace(/\D/g, "");
  return <article className="mx-auto flex w-full max-w-4xl flex-col gap-6">
    <Button variant="outline" className="w-fit gap-2" render={<Link href="/members" />}><ArrowLeft className="size-4" /> View CSC Profiles</Button>
    <header className="flex flex-col items-center rounded-3xl bg-white p-7 text-center ring-1 ring-brand-border sm:p-10"><div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-brand-purple text-2xl font-bold text-brand-ink ring-4 ring-brand-white sm:size-36">{member.has_photo ? <Image src={`/api/members/${member.member_id}/portrait`} alt={`${member.display_name} profile`} fill unoptimized sizes="144px" className="object-cover" /> : <UserRound className="size-12" />}</div><h1 className="mt-5 break-words text-2xl font-bold text-brand-ink sm:text-3xl">{member.display_name}</h1><div className="mt-2 flex flex-wrap justify-center gap-3 text-sm text-brand-secondary">{member.designation ? <span>{member.designation.replaceAll("_", " ")}</span> : null}{member.city ? <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{member.city}</span> : null}</div>{member.startup_name ? <p className="mt-2 text-sm font-medium text-brand-accent">{member.startup_name}</p> : null}
      <div className="mt-5 flex flex-wrap justify-center gap-3">{phone ? <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white"><MessageCircle className="size-4" /> Contact on WhatsApp</a> : null}{member.startup_website && /^https?:\/\//i.test(member.startup_website) ? <a href={member.startup_website} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-ink"><ExternalLink className="size-4" /> Professional website</a> : null}</div>
    </header>
    {member.about_me ? <section className="rounded-2xl bg-white p-6 ring-1 ring-brand-border"><h2 className="font-semibold text-brand-ink">About</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-brand-secondary">{member.about_me}</p></section> : null}
    {member.skills.length ? <section className="rounded-2xl bg-white p-6 ring-1 ring-brand-border"><h2 className="font-semibold text-brand-ink">Skills and expertise</h2><div className="mt-3 flex flex-wrap gap-2">{member.skills.map((skill) => <span key={skill} className="rounded-full bg-brand-cloud px-3 py-1.5 text-sm text-brand-secondary">{skill}</span>)}</div></section> : null}
    {startups.length ? <section><h2 className="mb-3 text-lg font-semibold text-brand-ink">Published startups</h2><ul className="grid gap-3 sm:grid-cols-2">{startups.map((startup) => <li key={startup.id}><Link href={`/directory/${startup.slug}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-5 ring-1 ring-brand-border"><span><span className="block font-semibold text-brand-ink">{startup.name}</span><span className="text-sm text-brand-muted">{startup.industry}</span></span><ExternalLink className="size-4 shrink-0 text-brand-accent" /></Link></li>)}</ul></section> : null}
  </article>;
}
