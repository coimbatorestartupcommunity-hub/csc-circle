import "server-only";
import { createHash } from "node:crypto";
import type { AgreementSection } from "@/lib/agreements/templates";

export function computeAgreementHash(payload: {
  referenceCode: string;
  agreementType: string;
  title: string;
  recipientEmail: string;
  effectiveDate: string;
  sections: AgreementSection[];
  signedName?: string;
  signedAt?: string;
}): string {
  const canonical = JSON.stringify({
    referenceCode: payload.referenceCode,
    agreementType: payload.agreementType,
    title: payload.title,
    recipientEmail: payload.recipientEmail.toLowerCase().trim(),
    effectiveDate: payload.effectiveDate,
    sections: payload.sections,
    signedName: payload.signedName ?? null,
    signedAt: payload.signedAt ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
