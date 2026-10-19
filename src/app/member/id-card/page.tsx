import Link from "next/link";
import { IdCard } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberIdCard } from "@/components/member/member-id-card";
import { EmptyState } from "@/components/common/empty-state";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";

export const metadata = { title: "Digital ID" };

export default async function IdCardPage() {
  const ctx = await getMemberContext();
  const cardRes = await memberServices.getCard();

  if (!cardRes.ok) {
    const needsPortrait = cardRes.error.message.toLowerCase().includes("portrait");
    return (
      <>
        <MemberPageHeader title="Digital membership ID" />
        <EmptyState
          icon={IdCard}
          title={needsPortrait ? "Add your 4:5 portrait to complete your digital ID." : "Your digital ID unlocks when your membership is active."}
          description={cardRes.error.message}
        >
          <Link
            href={needsPortrait ? "/member/profile#profile-portrait" : "/member/claim"}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-ink px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-ink/90"
          >
            {needsPortrait ? "Upload a 4:5 portrait" : "Claim your membership"}
          </Link>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <MemberPageHeader
        title="Digital membership ID"
        description="Your virtual CSC credential. Present it at eligible events."
      />
      <MemberIdCard card={cardRes.data} isDemo={ctx.mode === "preview"} />
    </>
  );
}
