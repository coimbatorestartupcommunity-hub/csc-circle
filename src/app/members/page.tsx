import { MemberPageHeader } from "@/components/member/member-page-header";
import { CommunityMemberDirectory } from "@/components/member/community-member-directory";
import { getMemberContext } from "@/lib/services/member/context";
import { MemberUnavailable } from "@/components/member/member-unavailable";
export const metadata = { title: "View CSC Profiles" };
export const instant = false;
export default async function MembersPage() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  return <div className="mx-auto flex w-full min-w-0 flex-col gap-5 py-2 sm:gap-6">
    <MemberPageHeader title="View CSC Profiles" description="Discover CSC members, explore their expertise, and build meaningful connections." />
    <div className="flex justify-center"><Button render={<Link href="/member/profile#community-sharing" />} className="min-h-12 w-full gap-2 rounded-xl px-4 text-sm font-semibold sm:w-auto sm:px-5 sm:text-base"><Share2 className="size-4 shrink-0" /><span>Share Your Profile with the CSC Community</span><ArrowRight className="size-4 shrink-0" /></Button></div>
    <CommunityMemberDirectory />
  </div>;
}
import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
