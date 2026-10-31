import { designationLabels } from "@/lib/content/member-taxonomy";
import type { MemberDesignation } from "@/types/member";

const isMemberDesignation = (value: string): value is MemberDesignation => value in designationLabels;

/**
 * Build the card label from every specific profile category. Legacy profiles
 * that contain only `other` fall back to the category saved on the approved
 * membership claim, which is the member's verified selection.
 */
export function membershipDesignationLabel(
  profileDesignations: readonly string[] | null | undefined,
  approvedClaimDesignation?: string | null,
  profileOtherLabel?: string | null,
  approvedClaimOtherLabel?: string | null,
) {
  const cleanProfileOther = profileOtherLabel?.trim() || null;
  const cleanClaimOther = approvedClaimOtherLabel?.trim() || null;
  const profileLabels = [...new Set(
    (profileDesignations ?? [])
      .filter(isMemberDesignation)
      .flatMap((value) => value === "other"
        ? cleanProfileOther ? [cleanProfileOther] : []
        : [designationLabels[value]]),
  )];
  const claimDesignation = approvedClaimDesignation && isMemberDesignation(approvedClaimDesignation)
    ? approvedClaimDesignation
    : null;
  if (profileLabels.length) return profileLabels.join(" · ");

  if (claimDesignation && claimDesignation !== "other") return designationLabels[claimDesignation];
  if (claimDesignation === "other" && cleanClaimOther) return cleanClaimOther;

  return (profileDesignations ?? []).includes("other") || claimDesignation === "other"
    ? "Other"
    : "CSC Member";
}
