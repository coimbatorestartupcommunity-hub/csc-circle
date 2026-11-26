import { NextResponse } from "next/server";
import { getAdminContext, can } from "@/lib/admin/gate";
import { agreementsTable, downloadPartnerLogo, type DigitalAgreementRow } from "@/lib/agreements/db";
import { generateAgreementPdf } from "@/lib/agreements/pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !can(ctx, "settings.manage")) {
    return new NextResponse(null, { status: 403 });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });

  const { data, error } = await agreementsTable().select("*").eq("id", id).maybeSingle();
  const agreement = data as DigitalAgreementRow | null;
  if (error || !agreement) return new NextResponse(null, { status: 404 });

  const partnerLogoBuffer = await downloadPartnerLogo(agreement.partner_logo_path);
  const pdfBuffer = await generateAgreementPdf({
    referenceCode: agreement.reference_code,
    title: agreement.title,
    eyebrow: agreement.eyebrow,
    subtitle: agreement.subtitle,
    effectiveDate: agreement.effective_date,
    durationLabel: agreement.duration_label,
    recipientName: agreement.recipient_name,
    recipientRole: agreement.recipient_role,
    recipientOrg: agreement.recipient_org,
    recipientEmail: agreement.recipient_email,
    cscSignatoryName: agreement.csc_signatory_name,
    cscSignatoryRole: agreement.csc_signatory_role,
    sections: agreement.sections,
    status: agreement.status,
    signedName: agreement.signed_name,
    signedEmail: agreement.signed_email,
    signedRole: agreement.signed_role,
    signedOrg: agreement.signed_org,
    signedAt: agreement.signed_at,
    signedIp: agreement.signed_ip,
    signedUserAgent: agreement.signed_user_agent,
    documentHash: agreement.document_hash,
    partnerLogoBuffer,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${agreement.reference_code}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
