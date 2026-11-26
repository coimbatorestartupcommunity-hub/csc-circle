import { NextResponse } from "next/server";
import { getAdminContext, can } from "@/lib/admin/gate";
import {
  AGREEMENT_TYPE_META,
  buildAgreementSections,
  LEADERSHIP_PROFILES,
  type AgreementType,
  type LeadershipRoleKey,
} from "@/lib/agreements/templates";
import { computeAgreementHash } from "@/lib/agreements/hash";
import { generateAgreementPdf } from "@/lib/agreements/pdf";

export async function GET(request: Request) {
  const ctx = await getAdminContext();
  const allowed = ctx.mode === "preview" || (ctx.mode === "live" && can(ctx, "settings.manage"));
  if (!allowed) return new NextResponse(null, { status: 403 });

  const url = new URL(request.url);
  const rawType = (url.searchParams.get("type") ?? "tech_partner") as AgreementType;
  const type: AgreementType = rawType in AGREEMENT_TYPE_META ? rawType : "tech_partner";
  const rawRole = (url.searchParams.get("role") ?? "cto") as LeadershipRoleKey;
  const leadershipRole: LeadershipRoleKey = rawRole in LEADERSHIP_PROFILES ? rawRole : "cto";

  const meta = AGREEMENT_TYPE_META[type];
  const leader = LEADERSHIP_PROFILES[leadershipRole];
  const sampleName =
    type === "tech_partner"
      ? "Vikash Saravanan"
      : type === "leadership_charter"
        ? leader.defaultName
        : "Arjun Krishnan";
  const sampleOrg =
    type === "tech_partner"
      ? "Logic Intelligence Technologies"
      : type === "leadership_charter"
        ? "Coimbatore Startup Community"
        : "Coimbatore Innovation Hub";
  const sampleRole =
    type === "tech_partner"
      ? "Founder & CEO, LIT / CTO, CSC"
      : type === "leadership_charter"
        ? leader.roleTitle
        : "Managing Partner";
  const sampleEmail = "partner@example.com";
  const effectiveDate = new Date().toISOString().slice(0, 10);

  const sections = buildAgreementSections({
    agreementType: type,
    recipientName: sampleName,
    recipientRole: sampleRole,
    recipientOrg: sampleOrg,
    recipientEmail: sampleEmail,
    effectiveDate,
    durationLabel: meta.defaultDuration,
    leadershipRole,
  });

  const referenceCode = `CSC-AGR-${new Date().getFullYear()}-SAMPLE`;
  const signedAt = new Date().toISOString();
  const documentHash = computeAgreementHash({
    referenceCode,
    agreementType: type,
    title: meta.defaultTitle,
    recipientEmail: sampleEmail,
    effectiveDate,
    sections,
    signedName: sampleName,
    signedAt,
  });

  const pdfBuffer = await generateAgreementPdf({
    referenceCode,
    title: meta.defaultTitle,
    eyebrow: meta.defaultEyebrow,
    subtitle: meta.defaultSubtitle,
    effectiveDate,
    durationLabel: meta.defaultDuration,
    recipientName: sampleName,
    recipientRole: sampleRole,
    recipientOrg: sampleOrg,
    recipientEmail: sampleEmail,
    cscSignatoryName: "K. N. Reyash",
    cscSignatoryRole: "Founder, Coimbatore Startup Community",
    sections,
    status: "signed",
    signedName: sampleName,
    signedEmail: sampleEmail,
    signedRole: sampleRole,
    signedOrg: sampleOrg,
    signedAt,
    signedIp: "103.21.44.10 (Sample Preview)",
    signedUserAgent: "CSC Admin Agreement PDF Studio",
    documentHash,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${referenceCode}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
