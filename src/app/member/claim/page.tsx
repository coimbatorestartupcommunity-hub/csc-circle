import Link from "next/link";
import { Clock, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { ClaimForm } from "@/components/member/claim-form";
import { StatusBadge } from "@/components/member/status-badge";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { membershipStatusMeta } from "@/lib/content/member-taxonomy";
import type { MembershipStatus } from "@/types/member";

export const metadata = { title: "Claim membership" };

function StateView({ status }: { status: MembershipStatus }) {
  const meta = membershipStatusMeta[status];
  if (status === "claim_submitted" || status === "pending_verification") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-brand-cloud p-10 text-center ring-1 ring-brand-border">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-gold text-brand-ink">
          <Clock className="size-7" />
        </span>
        <h2 className="text-2xl font-bold text-brand-ink">
          Your CSC Membership Is Under Review.
        </h2>
        <p className="max-w-md text-brand-secondary">
          Thank you for submitting your membership request. Once verified, your
          CSC digital membership ID will become available in your member portal.
        </p>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>
    );
  }
  if (status === "approved" || status === "active") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-brand-cloud p-10 text-center ring-1 ring-brand-border">
        <span className="flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="text-2xl font-bold text-brand-ink">Welcome to the CSC Circle.</h2>
        <p className="max-w-md text-brand-secondary">
          Your membership is {status === "active" ? "active" : "approved"}. Your
          digital membership ID is ready.
        </p>
        <Link
          href="/member/id-card"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-ink px-5 py-2.5 text-sm font-medium text-brand-white hover:bg-brand-ink/90"
        >
          View My Digital ID
        </Link>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-brand-cloud p-10 text-center ring-1 ring-brand-border">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-red text-brand-ink">
          <XCircle className="size-7" />
        </span>
        <h2 className="text-2xl font-bold text-brand-ink">Your claim wasn&apos;t approved.</h2>
        <p className="max-w-md text-brand-secondary">
          If you believe this was a mistake, you can submit a new claim with
          updated information.
        </p>
      </div>
    );
  }
  if (status === "suspended" || status === "revoked" || status === "expired") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-brand-cloud p-10 text-center ring-1 ring-brand-border">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-red text-brand-ink">
          <ShieldAlert className="size-7" />
        </span>
        <h2 className="text-2xl font-bold text-brand-ink">
          Membership {meta.label.toLowerCase()}.
        </h2>
        <p className="max-w-md text-brand-secondary">
          Please contact the CSC team if you have questions about your
          membership status.
        </p>
      </div>
    );
  }
  return null;
}

export default async function ClaimPage() {
  const ctx = await getMemberContext();
  const res = await memberServices.getProfile();
  const status = res.ok ? res.data.membership.status : "not_started";

  const showForm = status === "not_started" || status === "profile_incomplete" || status === "rejected";

  return (
    <>
      <MemberPageHeader
        title="Claim your CSC membership"
        description="Request official CSC Circle membership. Claims are reviewed by administrators."
      />
      {status !== "not_started" && status !== "profile_incomplete" ? (
        <div className="mb-6">
          <StateView status={status} />
        </div>
      ) : null}
      {showForm ? <ClaimForm isDemo={ctx.mode === "preview"} /> : null}
    </>
  );
}
