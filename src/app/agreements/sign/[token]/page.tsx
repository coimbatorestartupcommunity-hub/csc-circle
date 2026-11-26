import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Container } from "@/components/common/container";
import { getAuthUser } from "@/lib/supabase/server";
import { agreementsTable, type DigitalAgreementRow } from "@/lib/agreements/db";
import {
  AgreementSigningClient,
  type PublicAgreementView,
} from "@/components/agreements/agreement-signing-client";

export const metadata: Metadata = {
  title: "Digital Agreement — CSC Circle",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function SignAgreementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  if (!token || token.length < 32) notFound();

  const [{ data, error }, user] = await Promise.all([
    agreementsTable().select("*").eq("signing_token", token).maybeSingle(),
    getAuthUser(),
  ]);

  const row = data as DigitalAgreementRow | null;
  if (error || !row) notFound();

  const isExpired =
    row.status === "sent" && row.expires_at && new Date(row.expires_at).getTime() < Date.now();

  const view: PublicAgreementView = {
    id: row.id,
    referenceCode: row.reference_code,
    title: row.title,
    eyebrow: row.eyebrow,
    subtitle: row.subtitle,
    effectiveDate: row.effective_date,
    durationLabel: row.duration_label,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    recipientRole: row.recipient_role,
    recipientOrg: row.recipient_org,
    cscSignatoryName: row.csc_signatory_name,
    cscSignatoryRole: row.csc_signatory_role,
    sections: row.sections,
    status: isExpired ? "expired" : row.status,
    hasPartnerLogo: Boolean(row.partner_logo_path),
    signedName: row.signed_name,
    signedAt: row.signed_at,
    documentHash: row.document_hash,
  };

  return (
    <section className="bg-brand-cloud/30 py-10 sm:py-14">
      <Container>
        <AgreementSigningClient
          token={token}
          agreement={view}
          currentUserEmail={user?.email ?? null}
        />
      </Container>
    </section>
  );
}
