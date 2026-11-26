import { MemberPageHeader } from "@/components/member/member-page-header";
import { CommunityMemberDirectory } from "@/components/member/community-member-directory";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, Settings2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Coimbatore Founder & Entrepreneur Circle — CSC Members",
  description:
    "Discover startup founders, co-founders, idea-stage builders, early entrepreneurs, investors, and mentors across Coimbatore.",
};

export const instant = false;

export default async function MembersPage() {
  const sb = await createClient();
  const { data: initialMembers } = await sb.rpc("list_discoverable_members", {
    p_search: "",
    p_limit: 30,
    p_offset: 0,
  });

  return (
    <div className="mx-auto flex w-full min-w-0 flex-col gap-6 py-2">
      <MemberPageHeader
        title="Coimbatore Founder & Entrepreneur Circle"
        description="Connect with startup founders, co-founders, idea-stage builders, early-stage entrepreneurs, business leaders, investors, and ecosystem mentors across Coimbatore."
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          render={<Link href="/profile/account#community-sharing" />}
          className="min-h-11 w-full gap-2 rounded-xl px-4 text-xs font-semibold sm:w-auto sm:px-5 sm:text-sm"
        >
          <Settings2 className="size-4 shrink-0" />
          <span>Manage Your Profile &amp; WhatsApp Privacy</span>
          <ArrowRight className="size-4 shrink-0" />
        </Button>

        <Link
          href="/opportunities"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-xs font-semibold text-brand-ink transition hover:bg-brand-cloud sm:w-auto sm:px-5 sm:text-sm"
        >
          <Rocket className="size-4 shrink-0 text-brand-accent" />
          <span>Explore &amp; Post Founder Opportunities</span>
        </Link>
      </div>

      <CommunityMemberDirectory initialMembers={initialMembers ?? []} />
    </div>
  );
}
