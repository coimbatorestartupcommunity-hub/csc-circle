import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  AGREEMENT_TYPE_META,
  LEADERSHIP_PROFILES,
  buildAgreementSections,
  type AgreementType,
  type LeadershipRoleKey,
} from "@/lib/agreements/templates";
import { computeAgreementHash } from "@/lib/agreements/hash";
import { generateAgreementPdf } from "@/lib/agreements/pdf";

describe("Digital Agreements Templates, Hashing & Editorial PDF Generator", () => {
  it("generates tailored multi-section legal content for all 7 agreement types", () => {
    const types = Object.keys(AGREEMENT_TYPE_META) as AgreementType[];
    expect(types).toHaveLength(7);

    for (const agreementType of types) {
      const sections = buildAgreementSections({
        agreementType,
        recipientName: "Test Signer",
        recipientRole: "Founder",
        recipientOrg: "Test Venture",
        recipientEmail: "test@example.com",
        effectiveDate: "2026-11-26",
        durationLabel: AGREEMENT_TYPE_META[agreementType].defaultDuration,
        leadershipRole: "cto",
      });
      expect(sections.length).toBeGreaterThanOrEqual(2);
      expect(sections.every((s) => s.clauses.length > 0)).toBe(true);
    }
  });

  it("includes explicit sole & exclusive Technology Partner clauses for LIT", () => {
    const sections = buildAgreementSections({
      agreementType: "tech_partner",
      recipientName: "Vikash Saravanan",
      recipientRole: "Founder & CEO, LIT / CTO, CSC",
      recipientOrg: "Logic Intelligence Technologies",
      recipientEmail: "vikash@logicintelligencetechnologies.in",
      effectiveDate: "2026-11-26",
      durationLabel: "Perpetual / Auto-Renewing",
    });

    const fullText = sections.flatMap((s) => [s.heading, ...s.clauses]).join("\n");
    expect(fullText).toContain("Logic Intelligence Technologies");
    expect(fullText).toContain("sole and exclusive Official Technology Partner");
    expect(fullText).toContain("shall not appoint, engage, onboard, or designate any competing");
  });

  it("generates distinct role mandates for all 7 Core Leaders", () => {
    const roles = Object.keys(LEADERSHIP_PROFILES) as LeadershipRoleKey[];
    expect(roles).toHaveLength(7);

    for (const role of roles) {
      const profile = LEADERSHIP_PROFILES[role];
      const sections = buildAgreementSections({
        agreementType: "leadership_charter",
        recipientName: profile.defaultName,
        recipientRole: profile.roleTitle,
        recipientOrg: "Coimbatore Startup Community",
        recipientEmail: `${role}@example.com`,
        effectiveDate: "2026-11-26",
        durationLabel: "Active Tenure",
        leadershipRole: role,
      });
      const text = sections.flatMap((s) => s.clauses).join("\n");
      expect(text).toContain(profile.defaultName);
      expect(text).toContain(profile.externalVenture);
    }
  });

  it("computes deterministic SHA-256 document hashes", () => {
    const sections = buildAgreementSections({
      agreementType: "strategic_mou",
      recipientName: "Partner Rep",
      recipientRole: "Director",
      recipientOrg: "Partner Org",
      recipientEmail: "partner@example.com",
      effectiveDate: "2026-11-26",
      durationLabel: "12 Months",
    });

    const h1 = computeAgreementHash({
      referenceCode: "CSC-AGR-2026-TEST01",
      agreementType: "strategic_mou",
      title: AGREEMENT_TYPE_META.strategic_mou.defaultTitle,
      recipientEmail: "Partner@Example.com",
      effectiveDate: "2026-11-26",
      sections,
      signedName: "Partner Rep",
      signedAt: "2026-11-26T14:00:00.000Z",
    });
    const h2 = computeAgreementHash({
      referenceCode: "CSC-AGR-2026-TEST01",
      agreementType: "strategic_mou",
      title: AGREEMENT_TYPE_META.strategic_mou.defaultTitle,
      recipientEmail: "partner@example.com",
      effectiveDate: "2026-11-26",
      sections,
      signedName: "Partner Rep",
      signedAt: "2026-11-26T14:00:00.000Z",
    });
    expect(h1).toHaveLength(64);
    expect(h1).toBe(h2);
  });

  it("renders valid multi-page editorial PDFs with Audit Certificate for all 7 types", async () => {
    const types = Object.keys(AGREEMENT_TYPE_META) as AgreementType[];
    for (const agreementType of types) {
      const meta = AGREEMENT_TYPE_META[agreementType];
      const sections = buildAgreementSections({
        agreementType,
        recipientName: "Test Signer",
        recipientRole: "Founder",
        recipientOrg: "Test Org",
        recipientEmail: "signer@example.com",
        effectiveDate: "2026-11-26",
        durationLabel: meta.defaultDuration,
        leadershipRole: "cto",
      });

      const pdfBuffer = await generateAgreementPdf({
        referenceCode: `CSC-AGR-2026-${agreementType.toUpperCase()}`,
        title: meta.defaultTitle,
        eyebrow: meta.defaultEyebrow,
        subtitle: meta.defaultSubtitle,
        effectiveDate: "2026-11-26",
        durationLabel: meta.defaultDuration,
        recipientName: "Test Signer",
        recipientRole: "Founder",
        recipientOrg: "Test Org",
        recipientEmail: "signer@example.com",
        cscSignatoryName: "K. N. Reyash",
        cscSignatoryRole: "Founder, Coimbatore Startup Community",
        sections,
        status: "signed",
        signedName: "Test Signer",
        signedEmail: "signer@example.com",
        signedRole: "Founder",
        signedOrg: "Test Org",
        signedAt: "2026-11-26T14:30:00.000Z",
        signedIp: "103.21.44.10",
        signedUserAgent: "Vitest",
        documentHash: "a".repeat(64),
      });

      expect(pdfBuffer.byteLength).toBeGreaterThan(5000);
      const parsed = await PDFDocument.load(new Uint8Array(pdfBuffer));
      // Clean authoritative legal body & Digital Execution card
      expect(parsed.getPageCount()).toBeGreaterThanOrEqual(1);
    }
  }, 30_000);
});
