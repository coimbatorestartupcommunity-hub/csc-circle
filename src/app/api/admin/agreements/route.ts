import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getAdminContext, can } from "@/lib/admin/gate";
import { authResponse, isSafeOrigin, readAuthBody } from "@/lib/auth/http";
import { agreementsTable, type DigitalAgreementRow } from "@/lib/agreements/db";
import {
  AGREEMENT_TYPE_META,
  buildAgreementSections,
  type AgreementType,
  type LeadershipRoleKey,
} from "@/lib/agreements/templates";
import { computeAgreementHash } from "@/lib/agreements/hash";
import { sendAgreementInvitationEmail } from "@/lib/agreements/notify";
import { siteConfig } from "@/lib/content/site";

const sectionSchema = z.object({
  heading: z.string().trim().min(1).max(200),
  clauses: z.array(z.string().trim().min(1).max(4000)).min(1).max(20),
});

const createAgreementSchema = z.object({
  agreementType: z.enum([
    "tech_partner",
    "leadership_charter",
    "strategic_mou",
    "event_collaboration",
    "sponsorship",
    "speaker_mentor",
    "custom",
  ]),
  title: z.string().trim().min(3).max(200).optional(),
  eyebrow: z.string().trim().max(200).optional(),
  subtitle: z.string().trim().max(240).optional(),
  recipientName: z.string().trim().min(2).max(160),
  recipientEmail: z.string().trim().email().max(254),
  recipientRole: z.string().trim().max(160).optional().default(""),
  recipientOrg: z.string().trim().max(180).optional().default(""),
  recipientWhatsapp: z.string().trim().max(24).optional().default(""),
  leadershipRole: z
    .enum(["founder", "co_founder", "ceo", "cto", "cco", "coo", "cbo"])
    .optional(),
  effectiveDate: z.string().trim().min(4).max(32),
  durationLabel: z.string().trim().max(120).optional(),
  cscSignatoryName: z.string().trim().max(120).optional(),
  cscSignatoryRole: z.string().trim().max(160).optional(),
  formData: z.record(z.string(), z.string().max(4000)).optional().default({}),
  customSections: z.array(sectionSchema).max(15).optional(),
  sendEmail: z.boolean().optional().default(true),
  expiresInDays: z.number().int().min(1).max(365).optional().default(30),
});

export async function GET() {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !can(ctx, "settings.manage")) {
    return authResponse({ error: "Unauthorized" }, 403);
  }
  const { data, error } = await agreementsTable()
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return authResponse({ error: "Could not load agreements." }, 503);
  }
  return NextResponse.json({ agreements: (data ?? []) as DigitalAgreementRow[] });
}

export async function POST(request: Request) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !can(ctx, "settings.manage")) {
    return authResponse({ error: "Unauthorized" }, 403);
  }
  if (!isSafeOrigin(request)) {
    return authResponse({ error: "Request origin could not be verified." }, 403);
  }
  const body = await readAuthBody(request);
  const parsed = createAgreementSchema.safeParse(body);
  if (!parsed.success) {
    return authResponse({ error: parsed.error.issues[0]?.message ?? "Invalid agreement fields." }, 422);
  }

  const v = parsed.data;
  const meta = AGREEMENT_TYPE_META[v.agreementType as AgreementType];
  const title = v.title?.trim() || meta.defaultTitle;
  const eyebrow = v.eyebrow?.trim() || meta.defaultEyebrow;
  const subtitle = v.subtitle?.trim() || meta.defaultSubtitle;
  const durationLabel = v.durationLabel?.trim() || meta.defaultDuration;

  const sections = buildAgreementSections({
    agreementType: v.agreementType as AgreementType,
    recipientName: v.recipientName,
    recipientRole: v.recipientRole,
    recipientOrg: v.recipientOrg,
    recipientEmail: v.recipientEmail,
    effectiveDate: v.effectiveDate,
    durationLabel,
    leadershipRole: v.leadershipRole as LeadershipRoleKey | undefined,
    formData: v.formData,
    customSections: v.customSections,
  });

  const year = new Date().getFullYear();
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  const referenceCode = `CSC-AGR-${year}-${suffix}`;
  const signingToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + v.expiresInDays * 86_400_000).toISOString();

  const documentHash = computeAgreementHash({
    referenceCode,
    agreementType: v.agreementType,
    title,
    recipientEmail: v.recipientEmail,
    effectiveDate: v.effectiveDate,
    sections,
  });

  const { data, error } = await agreementsTable()
    .insert({
      reference_code: referenceCode,
      agreement_type: v.agreementType,
      title,
      eyebrow,
      subtitle,
      recipient_name: v.recipientName,
      recipient_email: v.recipientEmail.toLowerCase(),
      recipient_role: v.recipientRole,
      recipient_org: v.recipientOrg,
      recipient_whatsapp: v.recipientWhatsapp,
      leadership_role: v.leadershipRole ?? null,
      effective_date: v.effectiveDate,
      duration_label: durationLabel,
      form_data: v.formData,
      sections,
      csc_signatory_name: v.cscSignatoryName?.trim() || "K. N. Reyash",
      csc_signatory_role: v.cscSignatoryRole?.trim() || "Founder, Coimbatore Startup Community",
      signing_token: signingToken,
      status: "sent",
      expires_at: expiresAt,
      document_hash: documentHash,
      created_by: ctx.userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[agreements] create error:", error);
    return authResponse({ error: "Could not create digital agreement." }, 503);
  }

  const agreement = data as DigitalAgreementRow;
  const signingUrl = `${siteConfig.url}/agreements/sign/${agreement.signing_token}`;

  if (v.sendEmail) {
    await sendAgreementInvitationEmail({
      recipientEmail: agreement.recipient_email,
      recipientName: agreement.recipient_name,
      title: agreement.title,
      referenceCode: agreement.reference_code,
      signingUrl,
    }).catch((err) => console.warn("[agreements] invitation email error:", err));
  }

  return NextResponse.json({ agreement, signingUrl }, { status: 201 });
}
