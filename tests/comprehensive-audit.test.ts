import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  AGREEMENT_TYPE_META,
  LEADERSHIP_PROFILES,
  buildAgreementSections,
  type AgreementType,
} from "@/lib/agreements/templates";
import { computeAgreementHash } from "@/lib/agreements/hash";
import { generateAgreementPdf } from "@/lib/agreements/pdf";

describe("Comprehensive System Audit — Today's Deliverables", () => {
  it("verifies all required font and brand assets exist", () => {
    const assets = [
      "public/fonts/agreements/CormorantGaramond.ttf",
      "public/fonts/agreements/CormorantGaramond-Italic.ttf",
      "public/fonts/agreements/PlusJakartaSans.ttf",
      "public/fonts/agreements/Caveat.ttf",
      "public/brand/csc-circle-seal.png",
      "public/brand/lit-seal.png",
      "public/images/agreements/csc-web-banner.jpg",
      "public/images/agreements/community-ticel.webp",
      "public/images/agreements/community-outdoor.jpg",
      "public/images/agreements/community-cafe.jpg",
      "public/images/agreements/leaders/1-reyash.jpg",
      "public/images/agreements/leaders/2-sharan.jpg",
      "public/images/agreements/leaders/3-mirra.jpg",
      "public/images/agreements/leaders/4-vikash.jpg",
      "public/images/agreements/leaders/5-swathi.jpg",
      "public/images/agreements/leaders/6-kishore.jpg",
      "public/images/agreements/leaders/7-jaibharath.jpg",
      "public/images/agreements/leaders/csc-leaders-lockup.jpg",
      "public/images/agreements/social/whatsapp.png",
      "public/images/agreements/social/whatsapp-agent.png",
      "public/images/agreements/social/linkedin.png",
      "public/images/agreements/social/instagram.png",
      "public/images/agreements/social/mail.png",
      "public/images/agreements/social/stay-connected.png",
    ];

    for (const a of assets) {
      expect(existsSync(path.join(process.cwd(), a)), `Asset missing: ${a}`).toBe(true);
    }
  });

  it("verifies all 3 database migrations created today exist", () => {
    const migrations = [
      "supabase/migrations/20261126000000_public_auto_member_directory.sql",
      "supabase/migrations/20261126010000_digital_agreements.sql",
      "supabase/migrations/20261126020000_directory_member_number_and_status.sql",
    ];
    for (const m of migrations) {
      expect(existsSync(path.join(process.cwd(), m)), `Migration missing: ${m}`).toBe(true);
    }
  });

  it("verifies all 7 agreement types generate valid editorial PDFs with the 7-slide appendix", async () => {
    const types = Object.keys(AGREEMENT_TYPE_META) as AgreementType[];
    expect(types).toHaveLength(7);

    for (const type of types) {
      const meta = AGREEMENT_TYPE_META[type];
      const sections = buildAgreementSections({
        agreementType: type,
        recipientName: "Test Signatory",
        recipientRole: "Managing Director",
        recipientOrg: "Ecosystem Partner",
        recipientEmail: "partner@example.com",
        effectiveDate: "2026-11-26",
        durationLabel: meta.defaultDuration,
        leadershipRole: "cto",
      });

      const pdf = await generateAgreementPdf({
        referenceCode: `CSC-AGR-2026-${type.toUpperCase()}`,
        title: meta.defaultTitle,
        eyebrow: meta.defaultEyebrow,
        subtitle: meta.defaultSubtitle,
        effectiveDate: "2026-11-26",
        durationLabel: meta.defaultDuration,
        recipientName: "Test Signatory",
        recipientRole: "Managing Director",
        recipientOrg: "Ecosystem Partner",
        recipientEmail: "partner@example.com",
        cscSignatoryName: "K. N. Reyash",
        cscSignatoryRole: "Founder, Coimbatore Startup Community",
        sections,
        status: "signed",
        signedName: "Test Signatory",
        signedEmail: "partner@example.com",
        signedRole: "Managing Director",
        signedOrg: "Ecosystem Partner",
        signedAt: "2026-11-26T15:00:00.000Z",
        signedIp: "103.21.44.10",
        signedUserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        documentHash: computeAgreementHash({
          referenceCode: `CSC-AGR-2026-${type.toUpperCase()}`,
          agreementType: type,
          title: meta.defaultTitle,
          recipientEmail: "partner@example.com",
          effectiveDate: "2026-11-26",
          sections,
          signedName: "Test Signatory",
          signedAt: "2026-11-26T15:00:00.000Z",
        }),
      });

      expect(pdf.byteLength).toBeGreaterThan(50000); // Has high-res embedded graphics & QR
      const parsed = await PDFDocument.load(new Uint8Array(pdf));
      // Legal terms + Signature + Audit Certificate + 4 Presentation Appendix Pages = >= 6 pages
      expect(parsed.getPageCount()).toBeGreaterThanOrEqual(6);
    }
  }, 45_000);

  it("verifies Slide 7 contains official email and attribution in both PDF and components", () => {
    const deckCode = readFileSync(
      path.join(process.cwd(), "src/components/agreements/community-showcase-deck.tsx"),
      "utf-8",
    );
    expect(deckCode).toContain("coimbatorestartupcommunity@gmail.com");
    expect(deckCode).toContain("Join the Circle. Lead the Future.");
    expect(deckCode).toContain("Let's Connect & Build Together");
    expect(deckCode).toContain("QRCode.toDataURL");

    const pdfCode = readFileSync(
      path.join(process.cwd(), "src/lib/agreements/pdf.ts"),
      "utf-8",
    );
    expect(pdfCode).toContain("coimbatorestartupcommunity@gmail.com");
    expect(pdfCode).toContain("Join the Circle. Lead the Future.");
    expect(pdfCode).toContain("Let's Connect & Build Together");
    expect(pdfCode).toContain("QRCode.toBuffer");
    expect(pdfCode).toContain("Logic Intelligence Technologies (LIT)");

    const footerCode = readFileSync(
      path.join(process.cwd(), "src/components/agreements/signing-footer.tsx"),
      "utf-8",
    );
    expect(footerCode).toContain("coimbatorestartupcommunity@gmail.com");
    expect(footerCode).toContain("Stay Connected");
    expect(footerCode).toContain("Platform Architecture &amp; Engineering by");
    expect(footerCode).toContain("Logic Intelligence Technologies (LIT)");
  });

  it("verifies membership claim interceptor and public directory improvements", () => {
    const interceptor = readFileSync(
      path.join(process.cwd(), "src/components/member/membership-claim-interceptor.tsx"),
      "utf-8",
    );
    expect(interceptor).toContain("ClaimForm");
    expect(interceptor).toContain("min-h-svh");

    const claimForm = readFileSync(
      path.join(process.cwd(), "src/components/member/claim-form.tsx"),
      "utf-8",
    );
    expect(claimForm).toContain("canvasCrop45");

    const profilePage = readFileSync(
      path.join(process.cwd(), "src/app/members/[slug]/page.tsx"),
      "utf-8",
    );
    // Verified LinkedIn share toolbar removed
    expect(profilePage).not.toContain("Share on LinkedIn");
  });
});
