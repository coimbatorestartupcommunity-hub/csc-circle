import { ChangePasswordForm } from "@/components/auth/change-password-form";
import Link from "next/link";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberSettingsForm } from "@/components/member/member-settings-form";
import { PhoneVerificationCard } from "@/components/member/phone-verification-card";
import { DpdpCompliancePanel } from "@/components/member/dpdp-compliance-panel";
import { EmptyState } from "@/components/common/empty-state";
import { Settings, ShieldCheck, CheckCircle2, Phone, Mail } from "lucide-react";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";

export const metadata = { title: "Settings" };

export default async function MemberSettingsPage() {
  const ctx = await getMemberContext();
  const res = await memberServices.getProfile();

  if (!res.ok) {
    return (
      <>
        <MemberPageHeader title="Settings" />
        <EmptyState icon={Settings} title="Settings unavailable." description={res.error.message} />
      </>
    );
  }

  const profile = res.data;
  const isPhoneVerified = Boolean(
    (profile?.consent as Record<string, unknown> | undefined)?.phone_verified ||
    (profile as any)?.phone_verified ||
    ctx.user?.user_metadata?.phone_verified
  );

  return (
    <>
      <MemberPageHeader
        title="Settings"
        description="Manage your account preferences and privacy."
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <section className="flex h-full flex-col rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
            <h2 className="text-sm font-semibold text-brand-ink">Account &amp; Verified Contacts</h2>
            <dl className="mt-5 flex flex-col gap-3.5 text-sm">
              {/* Mobile Number (Prominently Placed Above Email) */}
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-brand-muted">
                  <Phone className="size-3.5 text-brand-muted" />
                  <span>Mobile Number</span>
                </dt>
                <dd className="flex items-center gap-2 font-medium text-brand-ink">
                  <span className="font-mono text-xs sm:text-sm">
                    {profile.whatsapp ? `+91 ${profile.whatsapp.replace(/\D/g, "").slice(-10)}` : (profile as any).phone || "—"}
                  </span>
                  {isPhoneVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-600/20">
                      Unverified
                    </span>
                  )}
                </dd>
              </div>

              {/* Email Address */}
              <div className="flex items-center justify-between gap-4 border-t border-brand-border/60 pt-3">
                <dt className="flex items-center gap-1.5 text-brand-muted">
                  <Mail className="size-3.5 text-brand-muted" />
                  <span>Email ID</span>
                </dt>
                <dd className="flex items-center gap-2 min-w-0 text-right font-medium text-brand-ink">
                  <span className="min-w-0 truncate text-xs sm:text-sm">{profile.email || "—"}</span>
                  <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    Verified
                  </span>
                </dd>
              </div>
            </dl>
            <div className="mt-auto flex flex-wrap gap-2 pt-6">
              <Link
                href="/profile/account"
                prefetch={true}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-border px-4 text-sm font-medium text-brand-ink transition hover:bg-brand-cloud focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Edit profile
              </Link>
              <Link
                href="/profile/settings/security"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-brand-border px-4 text-sm font-medium text-brand-ink transition hover:bg-brand-cloud focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ShieldCheck className="size-4 text-teal-600" />
                Security &amp; Password
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-border px-4 text-sm font-medium text-brand-ink transition hover:bg-brand-cloud focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </section>

          <MemberSettingsForm key={profile.id} profile={profile} isDemo={ctx.mode === "preview"} />
        </div>

        {/* Display phone verification card only when phone is not yet verified */}
        {!isPhoneVerified && (
          <PhoneVerificationCard
            initialPhone={profile.whatsapp}
            isVerified={isPhoneVerified}
          />
        )}

        <DpdpCompliancePanel
          email={profile.email}
          fullName={profile.fullName}
          memberNumber={profile.membership?.memberNumber}
        />

        {ctx.mode === "live" ? <ChangePasswordForm /> : null}
      </div>
    </>
  );
}
