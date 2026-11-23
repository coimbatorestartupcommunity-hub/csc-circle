import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberUnavailable } from "@/components/member/member-unavailable";
import { MemberStartupForm } from "@/components/member/member-startup-form";
import { getMemberContext } from "@/lib/services/member/context";
export const metadata = { title: "Add Startup" };
export default async function NewStartupPage() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  return <div className="mx-auto flex w-full flex-col gap-6"><MemberPageHeader title="Add a startup" description="Enter your company and founder details. A CSC administrator will review your submission before it appears in the Founder Directory." /><MemberStartupForm /></div>;
}
