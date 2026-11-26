import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import QRCode from "qrcode";
import type { AgreementSection } from "@/lib/agreements/templates";

export interface AgreementPdfInput {
  referenceCode: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  effectiveDate: string;
  durationLabel: string;
  recipientName: string;
  recipientRole: string;
  recipientOrg: string;
  recipientEmail: string;
  cscSignatoryName: string;
  cscSignatoryRole: string;
  sections: AgreementSection[];
  status: string;
  signedName?: string | null;
  signedEmail?: string | null;
  signedRole?: string | null;
  signedOrg?: string | null;
  signedAt?: string | null;
  signedIp?: string | null;
  signedUserAgent?: string | null;
  documentHash?: string | null;
  partnerLogoBuffer?: Buffer | null;
}

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN_X = 40;
const CONTENT_W = A4_W - MARGIN_X * 2; // 515.28

// Colors matching CSC Circle Web Theme
const PAGE_BG = rgb(0.965, 0.973, 0.984); // #F7F9FC subtle web background
const WHITE = rgb(1, 1, 1); // Card background #FFFFFF
const INK_DARK = rgb(0.06, 0.09, 0.16); // #0F172A brand-ink
const INK_BODY = rgb(0.2, 0.25, 0.33); // #334155 brand-secondary
const INK_MUTED = rgb(0.45, 0.52, 0.62); // #718096 brand-muted
const CARD_BORDER = rgb(0.88, 0.91, 0.94); // #E2E8F0 brand-border
const SUB_CARD_BG = rgb(0.94, 0.955, 0.972); // #F1F5F9 brand-cloud
const ACCENT_BLUE = rgb(0.145, 0.388, 0.922); // #2563EB brand-accent
const SIG_BLUE = rgb(0.118, 0.251, 0.686); // #1E40AF ink-blue signature
const BADGE_GREEN_BG = rgb(0.925, 0.985, 0.95);
const BADGE_GREEN_BORDER = rgb(0.65, 0.88, 0.74);
const BADGE_GREEN_TEXT = rgb(0.04, 0.45, 0.25);

async function loadFontFile(filename: string): Promise<Uint8Array> {
  const fullPath = path.join(process.cwd(), "public", "fonts", "agreements", filename);
  return new Uint8Array(await readFile(fullPath));
}

async function loadCachedPng(relPath: string, maxW = 800, maxH = 800): Promise<Buffer | null> {
  try {
    const fullPath = path.join(process.cwd(), relPath);
    const raw = await readFile(fullPath);
    return await sharp(raw).resize(maxW, maxH, { fit: "inside" }).png().toBuffer();
  } catch {
    return null;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];
  const paragraphs = clean.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = INK_DARK,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (A4_W - width) / 2, y, size, font, color });
}

export async function generateAgreementPdf(input: AgreementPdfInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Load typography & brand images
  const [
    sansBytes,
    scriptBytes,
    serifBytes,
    cscLogoPng,
    litLogoPng,
    bannerPng,
    ticelPng,
    leadersPng,
    qrPng,
    stayConnectedPng,
  ] = await Promise.all([
    loadFontFile("PlusJakartaSans.ttf"),
    loadFontFile("Caveat.ttf"),
    loadFontFile("CormorantGaramond.ttf"),
    loadCachedPng("public/brand/csc-circle-seal.png", 240, 240),
    loadCachedPng("public/brand/lit-seal.png", 240, 240),
    loadCachedPng("public/images/agreements/csc-web-banner.jpg", 720, 380),
    loadCachedPng("public/images/agreements/community-ticel.webp", 640, 480),
    loadCachedPng("public/images/agreements/leaders/csc-leaders-lockup.jpg", 640, 800),
    QRCode.toBuffer("https://csc.logicintelligencetechnologies.in", {
      margin: 1,
      width: 280,
      color: { dark: "#09090b", light: "#ffffff" },
    }),
    loadCachedPng("public/images/agreements/social/stay-connected.png", 900, 420),
  ]);

  const sans = await doc.embedFont(sansBytes);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const script = await doc.embedFont(scriptBytes);
  const serif = await doc.embedFont(serifBytes);

  let cscLogoImg: PDFImage | null = null;
  if (cscLogoPng) {
    try {
      cscLogoImg = await doc.embedPng(new Uint8Array(cscLogoPng));
    } catch {
      cscLogoImg = null;
    }
  }

  let litLogoImg: PDFImage | null = null;
  if (litLogoPng) {
    try {
      litLogoImg = await doc.embedPng(new Uint8Array(litLogoPng));
    } catch {
      litLogoImg = null;
    }
  }

  let partnerLogoImg: PDFImage | null = null;
  if (input.partnerLogoBuffer && input.partnerLogoBuffer.length > 0) {
    try {
      const normalized = await sharp(input.partnerLogoBuffer)
        .resize(240, 120, { fit: "inside" })
        .png()
        .toBuffer();
      partnerLogoImg = await doc.embedPng(new Uint8Array(normalized));
    } catch {
      partnerLogoImg = null;
    }
  }

  let bannerImg: PDFImage | null = null;
  if (bannerPng) {
    try {
      bannerImg = await doc.embedPng(new Uint8Array(bannerPng));
    } catch {
      bannerImg = null;
    }
  }

  let ticelImg: PDFImage | null = null;
  if (ticelPng) {
    try {
      ticelImg = await doc.embedPng(new Uint8Array(ticelPng));
    } catch {
      ticelImg = null;
    }
  }

  let leadersImg: PDFImage | null = null;
  if (leadersPng) {
    try {
      leadersImg = await doc.embedPng(new Uint8Array(leadersPng));
    } catch {
      leadersImg = null;
    }
  }

  let qrImg: PDFImage | null = null;
  if (qrPng) {
    try {
      qrImg = await doc.embedPng(new Uint8Array(qrPng));
    } catch {
      qrImg = null;
    }
  }

  let stayConnectedImg: PDFImage | null = null;
  if (stayConnectedPng) {
    try {
      stayConnectedImg = await doc.embedPng(new Uint8Array(stayConnectedPng));
    } catch {
      stayConnectedImg = null;
    }
  }

  const pages: PDFPage[] = [];

  const createWebCardPage = (topHeaderTitle: string): { page: PDFPage; cursorY: number } => {
    const page = doc.addPage([A4_W, A4_H]);
    // Page canvas uses soft web background
    page.drawRectangle({ x: 0, y: 0, width: A4_W, height: A4_H, color: PAGE_BG });
    pages.push(page);

    // Web top navigation bar simulation
    page.drawText("CSC CIRCLE · DIGITAL AGREEMENT PORTAL", {
      x: MARGIN_X,
      y: A4_H - 32,
      size: 7.5,
      font: sans,
      color: INK_MUTED,
    });
    page.drawText(topHeaderTitle.toUpperCase(), {
      x: A4_W - MARGIN_X - sans.widthOfTextAtSize(topHeaderTitle.toUpperCase(), 7.5),
      y: A4_H - 32,
      size: 7.5,
      font: sans,
      color: INK_MUTED,
    });

    page.drawLine({
      start: { x: MARGIN_X, y: A4_H - 42 },
      end: { x: A4_W - MARGIN_X, y: A4_H - 42 },
      thickness: 0.5,
      color: CARD_BORDER,
    });

    return { page, cursorY: A4_H - 62 };
  };

  // =========================================================================
  // PAGE 1: WEB SIGNING PAGE HEADER CARD & METADATA
  // =========================================================================
  let { page, cursorY } = createWebCardPage(`Ref: ${input.referenceCode}`);

  // Header Card Box (exact replica of AgreementSigningClient header card)
  const headerCardH = 145;
  page.drawRectangle({
    x: MARGIN_X,
    y: cursorY - headerCardH,
    width: CONTENT_W,
    height: headerCardH,
    color: WHITE,
    borderColor: CARD_BORDER,
    borderWidth: 0.75,
  });

  // Logo & Title Block
  if (cscLogoImg) {
    page.drawImage(cscLogoImg, {
      x: MARGIN_X + 16,
      y: cursorY - 50,
      width: 36,
      height: 36,
    });
  }

  const textStartX = MARGIN_X + 60;
  page.drawText((input.eyebrow || "CSC Circle Official Agreement").toUpperCase(), {
    x: textStartX,
    y: cursorY - 24,
    size: 7.2,
    font: sans,
    color: ACCENT_BLUE,
  });

  const headerTitle = input.title.slice(0, 48);
  page.drawText(headerTitle, {
    x: textStartX,
    y: cursorY - 40,
    size: 13,
    font: sans,
    color: INK_DARK,
  });

  // Status Badge Pill on Right
  const isSigned = input.status === "signed";
  const badgeText = isSigned ? "Digitally Signed & Sealed" : "Awaiting Signature";
  const badgeW = sans.widthOfTextAtSize(badgeText, 7.5) + 16;
  const badgeX = MARGIN_X + CONTENT_W - badgeW - 16;
  page.drawRectangle({
    x: badgeX,
    y: cursorY - 38,
    width: badgeW,
    height: 20,
    color: isSigned ? BADGE_GREEN_BG : SUB_CARD_BG,
    borderColor: isSigned ? BADGE_GREEN_BORDER : CARD_BORDER,
    borderWidth: 0.5,
  });
  page.drawText(badgeText, {
    x: badgeX + 8,
    y: cursorY - 32,
    size: 7.5,
    font: sans,
    color: isSigned ? BADGE_GREEN_TEXT : INK_MUTED,
  });

  // Metadata Sub-Card inside Header Card
  const subCardY = cursorY - 60;
  const subCardH = 70;
  page.drawRectangle({
    x: MARGIN_X + 16,
    y: subCardY - subCardH,
    width: CONTENT_W - 32,
    height: subCardH,
    color: SUB_CARD_BG,
    borderColor: CARD_BORDER,
    borderWidth: 0.5,
  });

  // Left column: Reference & Effective Date
  const col1X = MARGIN_X + 28;
  page.drawText("Reference & Effective Date", {
    x: col1X,
    y: subCardY - 18,
    size: 7.5,
    font: sans,
    color: INK_DARK,
  });
  page.drawText(input.referenceCode, {
    x: col1X,
    y: subCardY - 31,
    size: 7.5,
    font: sans,
    color: ACCENT_BLUE,
  });
  page.drawText(`Effective: ${input.effectiveDate} · Term: ${input.durationLabel}`, {
    x: col1X,
    y: subCardY - 45,
    size: 7.2,
    font: sans,
    color: INK_MUTED,
  });
  page.drawText(`Platform Status: ${input.status.toUpperCase()}`, {
    x: col1X,
    y: subCardY - 57,
    size: 6.8,
    font: sans,
    color: isSigned ? BADGE_GREEN_TEXT : INK_MUTED,
  });

  // Right column: Addressed To
  const col2X = MARGIN_X + CONTENT_W / 2 + 10;
  page.drawText("Addressed To (Signer / Recipient)", {
    x: col2X,
    y: subCardY - 18,
    size: 7.5,
    font: sans,
    color: INK_DARK,
  });
  page.drawText(
    `${input.recipientName}${input.recipientOrg ? ` — ${input.recipientOrg}` : ""}`.slice(0, 42),
    {
      x: col2X,
      y: subCardY - 31,
      size: 8,
      font: sans,
      color: INK_DARK,
    },
  );
  page.drawText((input.recipientRole || "Authorized Signatory").slice(0, 42), {
    x: col2X,
    y: subCardY - 45,
    size: 7.2,
    font: sans,
    color: INK_MUTED,
  });
  page.drawText(input.recipientEmail.slice(0, 42), {
    x: col2X,
    y: subCardY - 57,
    size: 7.2,
    font: sans,
    color: INK_MUTED,
  });

  cursorY -= headerCardH + 18;

  // =========================================================================
  // AGREEMENT TERMS & COVENANTS CARD (Matching Web Page)
  // =========================================================================
  const ensureSpace = (needed: number) => {
    if (cursorY - needed < 70) {
      ({ page, cursorY } = createWebCardPage("Agreement Terms & Covenants"));
    }
  };

  // Start Terms Card Box
  page.drawRectangle({
    x: MARGIN_X,
    y: 70,
    width: CONTENT_W,
    height: cursorY - 70,
    color: WHITE,
    borderColor: CARD_BORDER,
    borderWidth: 0.75,
  });

  // Subtitle header bar
  page.drawText((input.subtitle || "Agreement Terms & Covenants").toUpperCase(), {
    x: MARGIN_X + 16,
    y: cursorY - 20,
    size: 7.5,
    font: sans,
    color: INK_MUTED,
  });
  page.drawText("Laws of India · Coimbatore Jurisdiction", {
    x: MARGIN_X + CONTENT_W - 16 - sans.widthOfTextAtSize("Laws of India · Coimbatore Jurisdiction", 7.5),
    y: cursorY - 20,
    size: 7.5,
    font: sans,
    color: INK_MUTED,
  });
  page.drawLine({
    start: { x: MARGIN_X + 16, y: cursorY - 28 },
    end: { x: MARGIN_X + CONTENT_W - 16, y: cursorY - 28 },
    thickness: 0.5,
    color: CARD_BORDER,
  });
  cursorY -= 44;

  const textW = CONTENT_W - 32;

  // Render all numbered sections & clauses
  for (const section of input.sections) {
    if (cursorY < 110) {
      ({ page, cursorY } = createWebCardPage("Agreement Terms & Covenants"));
      // Draw card frame on continuation page
      page.drawRectangle({
        x: MARGIN_X,
        y: 70,
        width: CONTENT_W,
        height: cursorY - 70,
        color: WHITE,
        borderColor: CARD_BORDER,
        borderWidth: 0.75,
      });
      cursorY -= 20;
    }

    // Section Heading with subtle bar
    page.drawRectangle({
      x: MARGIN_X + 16,
      y: cursorY - 18,
      width: textW,
      height: 20,
      color: SUB_CARD_BG,
      borderColor: CARD_BORDER,
      borderWidth: 0.5,
    });
    page.drawText(section.heading.toUpperCase(), {
      x: MARGIN_X + 24,
      y: cursorY - 13,
      size: 8.5,
      font: bold,
      color: INK_DARK,
    });
    cursorY -= 28;

    for (const clause of section.clauses) {
      // Check for bullet or number prefix
      const numMatch = clause.match(/^([0-9]+\.[0-9]+(?:\.[0-9]+)?|[•✦\-])\s*([\s\S]*)/);
      let prefix = "";
      let titleBold = "";
      let bodyText = clause;

      if (numMatch) {
        prefix = numMatch[1];
        bodyText = numMatch[2];
        const colonMatch = bodyText.match(/^([^:]+:)\s*([\s\S]*)/);
        if (colonMatch && colonMatch[1].length < 70) {
          titleBold = colonMatch[1];
          bodyText = colonMatch[2];
        }
      }

      const boldPrefix = [prefix, titleBold].filter(Boolean).join(" ");
      const fullText = boldPrefix ? `${boldPrefix} ${bodyText}` : clause;
      const cLines = wrapText(fullText, sans, 8, textW - 8);

      for (let lineIdx = 0; lineIdx < cLines.length; lineIdx++) {
        const cl = cLines[lineIdx];
        if (cursorY < 90) {
          ({ page, cursorY } = createWebCardPage("Agreement Terms & Covenants"));
          page.drawRectangle({
            x: MARGIN_X,
            y: 70,
            width: CONTENT_W,
            height: cursorY - 70,
            color: WHITE,
            borderColor: CARD_BORDER,
            borderWidth: 0.75,
          });
          cursorY -= 20;
        }

        // On first line, if we have a bold prefix, draw prefix in boldFont
        if (lineIdx === 0 && boldPrefix) {
          const prefixLead = `${boldPrefix} `;
          if (cl.startsWith(prefixLead)) {
            const leadW = bold.widthOfTextAtSize(prefixLead, 8);
            page.drawText(prefixLead, {
              x: MARGIN_X + 20,
              y: cursorY,
              size: 8,
              font: bold,
              color: INK_DARK,
            });
            const rest = cl.slice(prefixLead.length);
            if (rest) {
              page.drawText(rest, {
                x: MARGIN_X + 20 + leadW,
                y: cursorY,
                size: 8,
                font: sans,
                color: INK_BODY,
              });
            }
          } else {
            page.drawText(cl, {
              x: MARGIN_X + 20,
              y: cursorY,
              size: 8,
              font: sans,
              color: INK_BODY,
            });
          }
        } else {
          page.drawText(cl, {
            x: MARGIN_X + 20,
            y: cursorY,
            size: 8,
            font: sans,
            color: INK_BODY,
          });
        }
        cursorY -= 12.5;
      }
      cursorY -= 6; // Comfortable gap between clauses
    }
    cursorY -= 10; // Comfortable gap between sections
  }

  // =========================================================================
  // EXECUTION & DIGITAL SIGNATURES CARD (Matching Web Form)
  // =========================================================================
  ensureSpace(230);
  if (cursorY < 240) {
    ({ page, cursorY } = createWebCardPage("Execution & Digital Signatures"));
  }

  const sigCardH = 205;
  page.drawRectangle({
    x: MARGIN_X,
    y: cursorY - sigCardH,
    width: CONTENT_W,
    height: sigCardH,
    color: WHITE,
    borderColor: CARD_BORDER,
    borderWidth: 0.75,
  });

  page.drawText("DIGITAL EXECUTION & SIGNATURES", {
    x: MARGIN_X + 16,
    y: cursorY - 20,
    size: 8,
    font: sans,
    color: INK_DARK,
  });
  page.drawText(
    isSigned ? `Verified Signature · ${input.signedEmail || input.recipientEmail}` : "Pending Digital Execution",
    {
      x: MARGIN_X + CONTENT_W - 16 - sans.widthOfTextAtSize(isSigned ? `Verified Signature · ${input.signedEmail || input.recipientEmail}` : "Pending Digital Execution", 7.2),
      y: cursorY - 20,
      size: 7.2,
      font: sans,
      color: isSigned ? BADGE_GREEN_TEXT : INK_MUTED,
    },
  );
  page.drawLine({
    start: { x: MARGIN_X + 16, y: cursorY - 28 },
    end: { x: MARGIN_X + CONTENT_W - 16, y: cursorY - 28 },
    thickness: 0.5,
    color: CARD_BORDER,
  });

  const sigBoxW = (CONTENT_W - 44) / 2;
  const sigBoxH = 92;
  const sigY = cursorY - 38;

  // CSC Signatory (Left Box)
  page.drawRectangle({
    x: MARGIN_X + 16,
    y: sigY - sigBoxH,
    width: sigBoxW,
    height: sigBoxH,
    color: SUB_CARD_BG,
    borderColor: CARD_BORDER,
    borderWidth: 0.5,
  });
  page.drawText("FOR COIMBATORE STARTUP COMMUNITY", {
    x: MARGIN_X + 26,
    y: sigY - 16,
    size: 6.8,
    font: sans,
    color: INK_MUTED,
  });
  page.drawText(input.cscSignatoryName, {
    x: MARGIN_X + 26,
    y: sigY - 42,
    size: 20,
    font: script,
    color: SIG_BLUE,
  });
  page.drawLine({
    start: { x: MARGIN_X + 26, y: sigY - 50 },
    end: { x: MARGIN_X + 26 + sigBoxW - 20, y: sigY - 50 },
    thickness: 0.5,
    color: CARD_BORDER,
  });
  page.drawText(input.cscSignatoryName, {
    x: MARGIN_X + 26,
    y: sigY - 64,
    size: 8.5,
    font: sans,
    color: INK_DARK,
  });
  page.drawText(input.cscSignatoryRole, {
    x: MARGIN_X + 26,
    y: sigY - 76,
    size: 7.2,
    font: sans,
    color: INK_MUTED,
  });

  // Counterparty Signatory (Right Box)
  const rightBoxX = MARGIN_X + 16 + sigBoxW + 12;
  page.drawRectangle({
    x: rightBoxX,
    y: sigY - sigBoxH,
    width: sigBoxW,
    height: sigBoxH,
    color: SUB_CARD_BG,
    borderColor: CARD_BORDER,
    borderWidth: 0.5,
  });
  page.drawText("FOR COUNTERPARTY / RECIPIENT", {
    x: rightBoxX + 10,
    y: sigY - 16,
    size: 6.8,
    font: sans,
    color: INK_MUTED,
  });

  if (isSigned && input.signedName) {
    page.drawText(input.signedName.slice(0, 32), {
      x: rightBoxX + 10,
      y: sigY - 42,
      size: 20,
      font: script,
      color: SIG_BLUE,
    });
  } else {
    page.drawText("Awaiting Email Signature", {
      x: rightBoxX + 10,
      y: sigY - 38,
      size: 9,
      font: sans,
      color: INK_MUTED,
    });
  }

  page.drawLine({
    start: { x: rightBoxX + 10, y: sigY - 50 },
    end: { x: rightBoxX + 10 + sigBoxW - 20, y: sigY - 50 },
    thickness: 0.5,
    color: CARD_BORDER,
  });
  page.drawText(input.signedName || input.recipientName, {
    x: rightBoxX + 10,
    y: sigY - 64,
    size: 8.5,
    font: sans,
    color: INK_DARK,
  });
  page.drawText(
    `${input.signedRole || input.recipientRole || "Authorized Signatory"}${
      input.signedOrg || input.recipientOrg ? ` · ${input.signedOrg || input.recipientOrg}` : ""
    }`.slice(0, 42),
    {
      x: rightBoxX + 10,
      y: sigY - 76,
      size: 7.2,
      font: sans,
      color: INK_MUTED,
    },
  );

  // Legal Acceptance Declaration Note (Section 10A & 65B)
  const declY = sigY - sigBoxH - 12;
  page.drawRectangle({
    x: MARGIN_X + 16,
    y: declY - 46,
    width: CONTENT_W - 32,
    height: 46,
    color: WHITE,
    borderColor: CARD_BORDER,
    borderWidth: 0.5,
  });
  page.drawText("[✓] STATUTORY ACCEPTANCE & TAMPER-EVIDENT RECORD", {
    x: MARGIN_X + 24,
    y: declY - 14,
    size: 7,
    font: sans,
    color: INK_DARK,
  });
  const statutoryText =
    "I confirm that I have read the entire agreement above, am authorized to execute it on behalf of myself / my organization, and agree to be legally bound under Section 10A of the Information Technology Act, 2000 and the Indian Contract Act, 1872.";
  const stLines = wrapText(statutoryText, sans, 6.8, CONTENT_W - 48);
  let sty = declY - 26;
  stLines.forEach((stl) => {
    page.drawText(stl, { x: MARGIN_X + 24, y: sty, size: 6.8, font: sans, color: INK_MUTED });
    sty -= 9.5;
  });

  cursorY -= sigCardH + 18;


  // Minimal 2-line attribution at base of agreement
  if (cursorY < 60) {
    ({ page, cursorY } = createWebCardPage("Attribution & Verification"));
  }
  drawCenteredText(
    page,
    "Coimbatore Startup Community — A Community-Led Initiative",
    cursorY - 16,
    sans,
    8.5,
    INK_BODY,
  );
  drawCenteredText(
    page,
    "Platform Architecture & Engineering by Logic Intelligence Technologies (LIT)",
    cursorY - 28,
    sans,
    7.5,
    INK_MUTED,
  );
  // Global Page Numbering Footer on Every Page
  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    drawCenteredText(
      p,
      "csc.logicintelligencetechnologies.in · CSC Circle Official Platform",
      24,
      sans,
      7.5,
      INK_MUTED,
    );
    p.drawText(`PAGE ${idx + 1} OF ${totalPages}`, {
      x: A4_W - MARGIN_X - sans.widthOfTextAtSize(`PAGE ${idx + 1} OF ${totalPages}`, 6.8),
      y: 24,
      size: 6.8,
      font: sans,
      color: INK_MUTED,
    });
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
