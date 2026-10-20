import { MemberPageHeader } from "@/components/member/member-page-header";
import { CommunityMemberDirectory } from "@/components/member/community-member-directory";
import { getMemberContext } from "@/lib/services/member/context";
import { MemberUnavailable } from "@/components/member/member-unavailable";
export const metadata = { title: "View CSC Profiles" };
export const instant = false;
export default async function MembersPage() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  return <div className="mx-auto flex w-full flex-col gap-6"><MemberPageHeader title="View CSC Profiles" description="Discover CSC members, explore their expertise, and build meaningful connections." /><div className="flex justify-center"><Button render={<Link href="/member/profile#community-sharing" />} className="min-h-12 w-full gap-2 rounded-xl px-5 font-semibold sm:w-auto"><Share2 className="size-4" />Share Your Profile with the CSC Community<ArrowRight className="size-4" /></Button></div><CommunityMemberDirectory /></div>;
}
import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
