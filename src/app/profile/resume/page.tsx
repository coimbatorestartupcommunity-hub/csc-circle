import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberUnavailable } from "@/components/member/member-unavailable";
import { ResumeBuilder } from "@/components/member/resume-builder";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";
import { emptyResumeData, resumeDataSchema } from "@/lib/member/resume-schema";

export const metadata = { title: "Resume Creation" };

export default async function MemberResumePage() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live" || !ctx.user) return <MemberUnavailable />;
  const supabase = await createClient();
  const [{ data: profile }, { data: resume, error }] = await Promise.all([
    supabase.from("profiles").select("display_name,full_name").eq("id", ctx.user.id).maybeSingle(),
    supabase.rpc("get_member_resume"),
  ]);
  if (error || !profile) return <section className="rounded-2xl border border-brand-border bg-white p-6 text-sm text-red-800">Your resume workspace could not be loaded. Refresh and try again.</section>;
  const parsed = resumeDataSchema.safeParse(resume ?? {});
  const initial = parsed.success ? parsed.data : emptyResumeData;
  const name = profile.display_name || profile.full_name || "CSC Member";

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <MemberPageHeader title="Resume Creation" description="Professional Resume Builder" />
    <ResumeBuilder memberName={name} initial={initial} />
  </div>;
}
