import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PhoneVerificationCard } from "@/components/member/phone-verification-card";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";

export const metadata = { title: "Account Security & Password · Member Settings" };

export default async function MemberSecurityPage() {
  const ctx = await getMemberContext();
  const res = await memberServices.getProfile();
  const profile = res.ok ? res.data : null;

  return (
    <>
      <div className="mb-2">
        <Link
          href="/member/settings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="size-4" /> Back to Settings
        </Link>
      </div>

      <MemberPageHeader
        title="Account Security & Password"
        description="Verify your identity with mobile and email security codes before updating sensitive credentials."
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <PhoneVerificationCard
          initialPhone={profile?.whatsapp}
          isVerified={Boolean((profile?.consent as any)?.phone_verified)}
        />

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-3 border-b border-slate-100 pb-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Two-Step Security Verification</h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                To protect your CSC identity, membership, and founder directory profile, an email verification code is required before password modification can proceed.
              </p>
            </div>
          </div>

          <ChangePasswordForm isDedicatedPage={true} />
        </div>
      </div>
    </>
  );
}
