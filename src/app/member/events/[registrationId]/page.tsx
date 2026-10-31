import Link from "next/link";
import { ArrowLeft, Ticket } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { EventPassCard } from "@/components/member/event-pass-card";
import { EmptyState } from "@/components/common/empty-state";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";

export const metadata = { title: "Events Pass" };

export default async function EventPassPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = await params;
  const ctx = await getMemberContext();
  const [regRes, passRes] = await Promise.all([
    memberServices.getRegistration(registrationId),
    memberServices.getPass(registrationId),
  ]);

  const title = regRes.ok ? regRes.data.eventTitle : "Events Pass";

  return (
    <>
      <Link
        href="/member/events"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink"
      >
        <ArrowLeft className="size-4" /> Back to Events Pass
      </Link>
      <MemberPageHeader title={title} description="Your verified admission ticket and entrance QR." />
      {passRes.ok ? (
        <EventPassCard pass={passRes.data} isDemo={ctx.mode === "preview"} />
      ) : (
        <EmptyState
          icon={Ticket}
          title="No valid pass for this registration yet."
          description={passRes.error.message}
        />
      )}
    </>
  );
}
