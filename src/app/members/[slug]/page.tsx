import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, MessageCircle, UserRound, Share2, ShieldCheck, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMemberContext } from "@/lib/services/member/context";
import { MemberUnavailable } from "@/components/member/member-unavailable";
import { createClient } from "@/lib/supabase/server";
import { getPublicStartups } from "@/lib/services/public-data";
import { siteConfig } from "@/lib/content/site";

export const metadata = { title: "CSC Member Profile — Founder Circle" };
export const instant = false;

type PublicMember = {
  member_id: string;
  display_name: string;
  city: string | null;
  designation: string | null;
  about_me: string | null;
  skills: string[];
  startup_name: string | null;
  whatsapp: string | null;
  has_photo: boolean;
  startup_website: string | null;
};

export default async function CommunityMemberPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  const { slug } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(slug)) notFound();

  const sb = await createClient();
  const { data } = await sb.rpc("get_discoverable_member", { p_member_id: slug });
  const member = data?.[0] as PublicMember | undefined;
  if (!member) notFound();

  const startups = (await getPublicStartups()).filter(
    (startup) => startup.founder.id === member.member_id,
  );
  const phone = member.whatsapp?.replace(/\D/g, "");
  const profileUrl = `${siteConfig.url}/members/${member.member_id}`;
  const shareText = `Connect with ${member.display_name} on Coimbatore Startup Community (CSC Circle):`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;

  return (
    <article className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-5 sm:gap-6">
      <Button
        variant="outline"
        className="w-fit max-w-full gap-2 rounded-xl text-xs font-semibold"
        render={<Link href="/members" />}
      >
        <ArrowLeft className="size-4" /> Back to Founder Directory
      </Button>

      <header className="flex min-w-0 flex-col items-center rounded-3xl bg-white p-5 text-center ring-1 ring-brand-border sm:p-8 lg:p-10">
        <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-brand-purple text-2xl font-bold text-brand-ink ring-4 ring-brand-white sm:size-36">
          {member.has_photo ? (
            <Image
              src={`/api/members/${member.member_id}/portrait`}
              alt={`${member.display_name} profile`}
              fill
              unoptimized
              sizes="144px"
              className="object-cover"
            />
          ) : (
            <UserRound className="size-12" />
          )}
        </div>

        <div className="mt-4 flex items-center gap-1.5 rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
          <ShieldCheck className="size-3.5" /> Verified Community Member
        </div>

        <h1 className="mt-3 max-w-full break-words text-2xl font-bold text-brand-ink sm:text-3xl">
          {member.display_name}
        </h1>

        <div className="mt-2 flex max-w-full flex-wrap justify-center gap-2 text-sm text-brand-secondary sm:gap-3">
          {member.designation && (
            <span className="font-semibold text-brand-ink break-words">
              {member.designation.replaceAll("_", " ")}
            </span>
          )}
          {member.city && (
            <span className="inline-flex items-center gap-1 text-brand-muted">
              <MapPin className="size-4 shrink-0" />
              {member.city}
            </span>
          )}
        </div>

        {member.startup_name && (
          <p className="mt-2 flex items-center gap-1.5 max-w-full break-words text-sm font-semibold text-brand-accent sm:text-base">
            <Building2 className="size-4 shrink-0 text-brand-muted" />
            {member.startup_name}
          </p>
        )}

        <div className="mt-6 flex w-full max-w-md flex-col justify-center gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
          {phone && (
            <a
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              <MessageCircle className="size-4 shrink-0" /> Contact on WhatsApp
            </a>
          )}
          {member.startup_website && /^https?:\/\//i.test(member.startup_website) && (
            <a
              href={member.startup_website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-border px-4 text-xs font-semibold text-brand-ink transition hover:bg-brand-cloud"
            >
              <ExternalLink className="size-4 shrink-0" /> Company Website
            </a>
          )}
          <a
            href={linkedinShareUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
          >
            <Share2 className="size-4 shrink-0 text-sky-600" /> Share on LinkedIn
          </a>
        </div>
      </header>

      {member.about_me && (
        <section className="min-w-0 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7">
          <h2 className="font-bold text-brand-ink text-sm sm:text-base">About Founder</h2>
          <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-brand-secondary sm:text-sm">
            {member.about_me}
          </p>
        </section>
      )}

      {member.skills && member.skills.length > 0 && (
        <section className="min-w-0 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7">
          <h2 className="font-bold text-brand-ink text-sm sm:text-base">Ecosystem Skills &amp; Focus</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {member.skills.map((skill) => (
              <span
                key={skill}
                className="max-w-full break-words rounded-full bg-brand-cloud px-3 py-1 text-xs font-medium text-brand-secondary"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {startups.length > 0 && (
        <section className="min-w-0">
          <h2 className="mb-3 text-base font-bold text-brand-ink">Published Ventures</h2>
          <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
            {startups.map((startup) => (
              <li key={startup.id} className="min-w-0">
                <Link
                  href={`/directory/${startup.slug}`}
                  className="flex min-h-20 min-w-0 items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-brand-border transition hover:shadow-xs sm:p-5"
                >
                  <span className="min-w-0">
                    <span className="block break-words font-semibold text-brand-ink">{startup.name}</span>
                    <span className="break-words text-xs text-brand-muted">{startup.industry}</span>
                  </span>
                  <ExternalLink className="size-4 shrink-0 text-brand-accent" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
