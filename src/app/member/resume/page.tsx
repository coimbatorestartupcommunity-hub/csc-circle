import { FileText } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberResumeBuilder } from "@/components/member/member-resume-builder";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { createClient } from "@/lib/supabase/server";
import { blankResume, profileResumeDefaults, resumeSchema } from "@/lib/resume/schema";
import { EmptyState } from "@/components/common/empty-state";

export const metadata = { title: "Resume Creation" };

export default async function MemberResumePage() {
  const ctx = await getMemberContext();
  if (ctx.mode === "closed") return <EmptyState icon={FileText} title="Sign in to create your resume." description="Your resume is private and saved under your CSC account." />;
  if (ctx.mode === "preview") return <><MemberPageHeader title="Resume Creation" description="Build a professional, ATS-friendly resume from your own information." /><MemberResumeBuilder initialData={blankResume()} isDemo /></>;
  const profileResult = await memberServices.getProfile();
  const profile = profileResult.ok ? profileResult.data : null;
  const db = await createClient();
  const { data: saved } = await db.from("member_resumes").select("resume_data").eq("user_id", ctx.user!.id).maybeSingle();
  const parsed = saved ? resumeSchema.safeParse(saved.resume_data) : null;
  const initialData = parsed?.success ? parsed.data : profileResumeDefaults(profile ?? {});
  return <>
    <MemberPageHeader title="Resume Creation" description="Create a clear, ATS-friendly resume from information you choose to include." />
    <MemberResumeBuilder key={ctx.user!.id} initialData={initialData} isDemo={false} />
  </>;
}
