import { MemberPageHeader } from "@/components/member/member-page-header";
import { CommunityMemberDirectory } from "@/components/member/community-member-directory";
import { getMemberContext } from "@/lib/services/member/context";
import { MemberUnavailable } from "@/components/member/member-unavailable";
export const metadata = { title: "View CSC Profiles" };
export const instant = false;
export default async function MembersPage() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  return <div className="mx-auto flex w-full flex-col gap-6"><MemberPageHeader title="View CSC Profiles" description="Discover CSC members, explore their expertise, and build meaningful connections." /><CommunityMemberDirectory /></div>;
}
