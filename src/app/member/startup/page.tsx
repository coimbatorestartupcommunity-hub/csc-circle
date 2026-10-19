import { StartupForm } from "@/components/member/startup-form";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { getMemberContext } from "@/lib/services/member/context";
import { MemberUnavailable } from "@/components/member/member-unavailable";
export const metadata = { title: "Submit a startup" };
export default async function Page() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  return <><MemberPageHeader title="Submit your startup" description="Approved, opted-in listings appear in the CSC directory." /><StartupForm /></>;
}
