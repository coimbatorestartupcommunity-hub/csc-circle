import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Container } from "@/components/common/container";
import { getAuthUser } from "@/lib/supabase/server";
import { agreementsTable, downloadPartnerLogo, type DigitalAgreementRow } from "@/lib/agreements/db";
import {
  AgreementSigningClient,
  type PublicAgreementView,
} from "@/components/agreements/agreement-signing-client";
import { SigningFooter } from "@/components/agreements/signing-footer";

export const metadata: Metadata = {
  title: "Digital Agreement — CSC Circle",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
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

  // If status is "sent", record that the recipient has opened and viewed the agreement
  if (row.status === "sent") {
    const nowIso = new Date().toISOString();
    await agreementsTable()
      .update({
        status: "opened",
        opened_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", row.id);
    row.status = "opened";
    row.opened_at = nowIso;
  }

  const isExpired =
    ((row.status as string) === "sent" || row.status === "opened") &&
    row.expires_at &&
    new Date(row.expires_at).getTime() < Date.now();

  const partnerLogoBuffer = row.partner_logo_path
    ? await downloadPartnerLogo(row.partner_logo_path)
    : null;
  const partnerLogoUrl = partnerLogoBuffer
    ? `data:image/png;base64,${partnerLogoBuffer.toString("base64")}`
    : null;

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
    partnerLogoUrl,
    signedName: row.signed_name,
    signedAt: row.signed_at,
    documentHash: row.document_hash,
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-cloud/30">
      <section className="flex-1 py-10 sm:py-14">
        <Container>
          <AgreementSigningClient
            token={token}
            agreement={view}
            currentUserEmail={user?.email ?? null}
          />
        </Container>
      </section>
      <SigningFooter />
    </div>
  );
}
