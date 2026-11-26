import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/supabase/server";
import { authResponse, isSafeOrigin, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { agreementsTable, downloadPartnerLogo, type DigitalAgreementRow } from "@/lib/agreements/db";
import { computeAgreementHash } from "@/lib/agreements/hash";
import { generateAgreementPdf } from "@/lib/agreements/pdf";
import { sendSignedAgreementEmailsAndAlerts } from "@/lib/agreements/notify";

const signSchema = z.object({
  token: z.string().trim().min(32).max(128),
  signedName: z.string().trim().min(2, "Enter your full legal name to sign.").max(140),
  signedRole: z.string().trim().max(160).optional().default(""),
  signedOrg: z.string().trim().max(180).optional().default(""),
  accepted: z.literal(true, {
    message: "Please confirm that you have read and accept all terms of this agreement.",
  }),
});

export async function POST(request: Request) {
  if (!isSafeOrigin(request)) {
    return authResponse({ error: "Request origin could not be verified." }, 403);
  }

  const user = await getAuthUser();
  if (!user || !user.email) {
    return authResponse(
      { error: "Please log in with your verified email address before signing this agreement." },
      401,
    );
  }

  if (!rateLimit(`agreement-sign:${user.id}`, 8, 60_000).allowed) {
    return authResponse({ error: "Too many attempts. Please wait a moment." }, 429);
  }

  const body = await readAuthBody(request);
  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return authResponse({ error: parsed.error.issues[0]?.message ?? "Invalid signature details." }, 422);
  }

  const { token, signedName, signedRole, signedOrg } = parsed.data;
  const { data, error } = await agreementsTable()
    .select("*")
    .eq("signing_token", token)
    .maybeSingle();

  const agreement = data as DigitalAgreementRow | null;
  if (error || !agreement) {
    return authResponse({ error: "Agreement link is invalid or unavailable." }, 404);
  }

  if (agreement.recipient_email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    return authResponse(
      {
        error: `This agreement is addressed to ${agreement.recipient_email}. You are signed in as ${user.email}.`,
      },
      403,
    );
  }

  if (agreement.status === "signed") {
    return authResponse({ error: "This agreement has already been signed." }, 409);
  }
  if (agreement.status === "voided") {
    return authResponse({ error: "This agreement has been voided by CSC." }, 409);
  }
  if (agreement.expires_at && new Date(agreement.expires_at).getTime() < Date.now()) {
    return authResponse({ error: "This signing link has expired. Request a fresh link from CSC." }, 410);
  }

  const signedAt = new Date().toISOString();
  const signedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const signedUserAgent = (request.headers.get("user-agent") ?? "unknown").slice(0, 300);

  const finalRole = signedRole || agreement.recipient_role;
  const finalOrg = signedOrg || agreement.recipient_org;
  const documentHash = computeAgreementHash({
    referenceCode: agreement.reference_code,
    agreementType: agreement.agreement_type,
    title: agreement.title,
    recipientEmail: agreement.recipient_email,
    effectiveDate: agreement.effective_date,
    sections: agreement.sections,
    signedName,
    signedAt,
  });

  const { data: updated, error: updateError } = await agreementsTable()
    .update({
      status: "signed",
      signed_name: signedName,
      signed_email: user.email.toLowerCase(),
      signed_role: finalRole,
      signed_org: finalOrg,
      signed_at: signedAt,
      signed_ip: signedIp,
      signed_user_agent: signedUserAgent,
      signed_user_id: user.id,
      document_hash: documentHash,
      updated_at: signedAt,
    })
    .eq("id", agreement.id)
    .eq("status", "sent")
    .select("*")
    .single();

  if (updateError || !updated) {
    return authResponse({ error: "Could not finalize signature. Please try again." }, 409);
  }

  const finalized = updated as DigitalAgreementRow;
  const partnerLogoBuffer = await downloadPartnerLogo(finalized.partner_logo_path);
  const pdfBuffer = await generateAgreementPdf({
    referenceCode: finalized.reference_code,
    title: finalized.title,
    eyebrow: finalized.eyebrow,
    subtitle: finalized.subtitle,
    effectiveDate: finalized.effective_date,
    durationLabel: finalized.duration_label,
    recipientName: finalized.recipient_name,
    recipientRole: finalized.recipient_role,
    recipientOrg: finalized.recipient_org,
    recipientEmail: finalized.recipient_email,
    cscSignatoryName: finalized.csc_signatory_name,
    cscSignatoryRole: finalized.csc_signatory_role,
    sections: finalized.sections,
    status: finalized.status,
    signedName: finalized.signed_name,
    signedEmail: finalized.signed_email,
    signedRole: finalized.signed_role,
    signedOrg: finalized.signed_org,
    signedAt: finalized.signed_at,
    signedIp: finalized.signed_ip,
    signedUserAgent: finalized.signed_user_agent,
    documentHash: finalized.document_hash,
    partnerLogoBuffer,
  });

  await sendSignedAgreementEmailsAndAlerts({
    agreementId: finalized.id,
    referenceCode: finalized.reference_code,
    title: finalized.title,
    recipientEmail: finalized.recipient_email,
    recipientName: finalized.recipient_name,
    signedName,
    signedAt,
    pdfBuffer,
  });

  return NextResponse.json({
    ok: true,
    agreement: {
      id: finalized.id,
      reference_code: finalized.reference_code,
      status: finalized.status,
      signed_name: finalized.signed_name,
      signed_at: finalized.signed_at,
      document_hash: finalized.document_hash,
    },
  });
}
