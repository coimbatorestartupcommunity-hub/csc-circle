import { MemberPageHeader } from "@/components/member/member-page-header";
import { OnboardingWizard } from "@/components/member/onboarding-wizard";
import { getMemberContext } from "@/lib/services/member/context";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const ctx = await getMemberContext();
  return (
    <>
      <MemberPageHeader
        title="Set up your membership"
        description="A few quick steps to complete your CSC Circle profile."
      />
      <OnboardingWizard isDemo={ctx.mode === "preview"} />
    </>
  );
}
