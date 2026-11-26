import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
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

    // Section Heading
    page.drawText(section.heading.toUpperCase(), {
      x: MARGIN_X + 16,
      y: cursorY,
      size: 8.5,
      font: sans,
      color: INK_DARK,
    });
    cursorY -= 14;

    for (const clause of section.clauses) {
      const cLines = wrapText(clause, sans, 8, textW);
      for (const cl of cLines) {
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
        page.drawText(cl, {
          x: MARGIN_X + 16,
          y: cursorY,
          size: 8,
          font: sans,
          color: INK_BODY,
        });
        cursorY -= 12;
      }
      cursorY -= 4;
    }
    cursorY -= 8;
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

  // =========================================================================
  // APPENDED 7-SLIDE COMMUNITY SHOWCASE DECK (Matching Web Showcase Deck)
  // =========================================================================

  const drawSlidePresentationCard = (
    p: PDFPage,
    topY: number,
    cardH: number,
    slideNum: number,
    eyebrow: string,
    title: string,
    subtitle: string,
  ) => {
    p.drawRectangle({
      x: MARGIN_X,
      y: topY - cardH,
      width: CONTENT_W,
      height: cardH,
      color: WHITE,
      borderColor: CARD_BORDER,
      borderWidth: 0.75,
    });

    p.drawText(`SLIDE 0${slideNum} OF 07 · ${eyebrow.toUpperCase()}`, {
      x: MARGIN_X + 16,
      y: topY - 18,
      size: 7,
      font: sans,
      color: ACCENT_BLUE,
    });

    p.drawText(title, {
      x: MARGIN_X + 16,
      y: topY - 34,
      size: 11.5,
      font: sans,
      color: INK_DARK,
    });

    p.drawText(subtitle, {
      x: MARGIN_X + 16,
      y: topY - 47,
      size: 7.5,
      font: sans,
      color: INK_MUTED,
    });

    p.drawLine({
      start: { x: MARGIN_X + 16, y: topY - 54 },
      end: { x: MARGIN_X + CONTENT_W - 16, y: topY - 54 },
      thickness: 0.5,
      color: CARD_BORDER,
    });
  };

  // --- APPENDIX PAGE 1: SLIDES 1 & 2 ---
  {
    const ap1 = createWebCardPage("Community Deck · Slides 1 & 2");
    let y = ap1.cursorY;

    // Slide 1: Ecosystem Overview
    const card1H = 350;
    drawSlidePresentationCard(
      ap1.page,
      y,
      card1H,
      1,
      "Ecosystem Overview",
      "Great Ideas Grow in the Right Circle",
      "Coimbatore Startup Community — Connect. Build. Grow.",
    );

    if (bannerImg) {
      const bannerW = CONTENT_W - 32;
      const bannerH = 145;
      ap1.page.drawImage(bannerImg, {
        x: MARGIN_X + 16,
        y: y - 64 - bannerH,
        width: bannerW,
        height: bannerH,
      });
    }

    const colW = (CONTENT_W - 48) / 3;
    const colY = y - 225;
    const bullets = [
      ["FOUNDERS & BUILDERS", "Bridging early-stage creators with experienced operators and angels."],
      ["COIMBATORE HUB", "Rooted in South India's premier industrial and engineering corridor."],
      ["GIVE-FIRST ETHOS", "Peer problem-solving, transparency, and collaborative acceleration."],
    ];

    bullets.forEach(([btitle, bdesc], i) => {
      const bx = MARGIN_X + 16 + i * (colW + 8);
      ap1.page.drawRectangle({
        x: bx,
        y: colY - 95,
        width: colW,
        height: 95,
        color: SUB_CARD_BG,
        borderColor: CARD_BORDER,
        borderWidth: 0.5,
      });
      ap1.page.drawText(btitle, { x: bx + 10, y: colY - 18, size: 7.2, font: sans, color: INK_DARK });
      const dLines = wrapText(bdesc, sans, 7, colW - 20);
      dLines.forEach((dl, di) => {
        ap1.page.drawText(dl, { x: bx + 10, y: colY - 32 - di * 10, size: 7, font: sans, color: INK_MUTED });
      });
    });

    y -= card1H + 18;

    // Slide 2: About CSC & Founding Movement
    const card2H = 350;
    drawSlidePresentationCard(
      ap1.page,
      y,
      card2H,
      2,
      "Our Story & Movement",
      "Building South India's Most Dynamic Founder Hub",
      "Founded with a mission to unite ambitious minds across Coimbatore.",
    );

    if (ticelImg) {
      const imgW = 200;
      const imgH = 150;
      ap1.page.drawImage(ticelImg, {
        x: MARGIN_X + 16,
        y: y - 66 - imgH,
        width: imgW,
        height: imgH,
      });

      const textX = MARGIN_X + 16 + imgW + 16;
      const storyW = CONTENT_W - 48 - imgW;
      const story =
        "Coimbatore Startup Community (CSC Circle) was established to provide aspiring founders, creators, and builders with an authentic home base.\n\nFrom closed-door founder roundtables at TICEL Bio Park to open-air masterminds and coffee house pitch teardowns, we create intentional spaces for builders to solve real problems and build enduring ventures.";
      const sLines = wrapText(story, sans, 8, storyW);
      let sy = y - 76;
      sLines.forEach((sl) => {
        ap1.page.drawText(sl, { x: textX, y: sy, size: 8, font: sans, color: INK_BODY });
        sy -= 12;
      });

      // Quick Stats Pills
      ap1.page.drawRectangle({
        x: textX,
        y: sy - 40,
        width: 110,
        height: 36,
        color: SUB_CARD_BG,
        borderColor: CARD_BORDER,
        borderWidth: 0.5,
      });
      ap1.page.drawText("100+ FOUNDERS", { x: textX + 10, y: sy - 20, size: 7.5, font: sans, color: INK_DARK });
      ap1.page.drawText("Active Startups", { x: textX + 10, y: sy - 31, size: 6.8, font: sans, color: INK_MUTED });

      ap1.page.drawRectangle({
        x: textX + 118,
        y: sy - 40,
        width: 110,
        height: 36,
        color: SUB_CARD_BG,
        borderColor: CARD_BORDER,
        borderWidth: 0.5,
      });
      ap1.page.drawText("BI-WEEKLY", { x: textX + 128, y: sy - 20, size: 7.5, font: sans, color: INK_DARK });
      ap1.page.drawText("Meetups & Clinics", { x: textX + 128, y: sy - 31, size: 6.8, font: sans, color: INK_MUTED });
    }
  }

  // --- APPENDIX PAGE 2: SLIDES 3 & 4 ---
  {
    const ap2 = createWebCardPage("Community Deck · Slides 3 & 4");
    let y = ap2.cursorY;

    // Slide 3: The People Behind CSC Circle
    const card3H = 350;
    drawSlidePresentationCard(
      ap2.page,
      y,
      card3H,
      3,
      "Leadership & Stewards",
      "The People Behind CSC Circle",
      "Seven dedicated leaders steering the community's vision and operations.",
    );

    if (leadersImg) {
      const lockupW = 220;
      const lockupH = 154;
      ap2.page.drawImage(leadersImg, {
        x: MARGIN_X + 16,
        y: y - 66 - lockupH,
        width: lockupW,
        height: lockupH,
      });

      const rosterX = MARGIN_X + 16 + lockupW + 14;
      const rosterW = CONTENT_W - 46 - lockupW;
      const leadersList = [
        ["K. N. Reyash", "Founder & President · Ecosystem Vision"],
        ["E. R. Sharan", "Co-Founder & VP · Strategic Growth"],
        ["Mirra Mahendran", "Chief Executive Officer · Operations & Alliances"],
        ["Vikash Saravanan", "Chief Technology Officer · LIT Tech Partner"],
        ["Swathi", "Chief Community Officer · Member Experience"],
        ["Kishore C", "Chief Operating Officer · Programs & Logistics"],
        ["Jaibharath V", "Chief Business Officer · Partnerships & Value"],
      ];

      let ry = y - 72;
      leadersList.forEach(([lname, lrole]) => {
        ap2.page.drawText(lname, { x: rosterX, y: ry, size: 8.5, font: sans, color: INK_DARK });
        ap2.page.drawText(lrole, { x: rosterX, y: ry - 11, size: 7.2, font: sans, color: INK_MUTED });
        ap2.page.drawLine({
          start: { x: rosterX, y: ry - 16 },
          end: { x: rosterX + rosterW, y: ry - 16 },
          thickness: 0.4,
          color: CARD_BORDER,
        });
        ry -= 27;
      });
    }

    y -= card3H + 18;

    // Slide 4: Technology Partner Spotlight (LIT)
    const card4H = 350;
    drawSlidePresentationCard(
      ap2.page,
      y,
      card4H,
      4,
      "Engineering Architecture",
      "Exclusive Technology Partner: Logic Intelligence Technologies",
      "Enterprise-grade digital infrastructure engineered specifically for CSC Circle.",
    );

    if (litLogoImg) {
      const logoSize = 105;
      ap2.page.drawImage(litLogoImg, {
        x: MARGIN_X + 24,
        y: y - 76 - logoSize,
        width: logoSize,
        height: logoSize,
      });

      ap2.page.drawText("LOGIC INTELLIGENCE TECHNOLOGIES", {
        x: MARGIN_X + 16,
        y: y - 198,
        size: 7.2,
        font: sans,
        color: INK_DARK,
      });
      ap2.page.drawText("Sole & Exclusive Technology Partner", {
        x: MARGIN_X + 16,
        y: y - 210,
        size: 7,
        font: sans,
        color: ACCENT_BLUE,
      });

      const techX = MARGIN_X + 16 + 145;
      const techW = CONTENT_W - 48 - 145;
      const pillars = [
        ["Tamper-Evident Legal Engine", "Cryptographic SHA-256 agreement generation compliant with Section 10A & 65B."],
        ["AI WhatsApp Concierge", "24/7 automated community query handling, event RSVPs, and member triage."],
        ["Digital Founder Pass", "Dynamic QR check-in badges for partner discounts and verified co-working access."],
      ];

      let ty = y - 76;
      pillars.forEach(([pTitle, pDesc]) => {
        ap2.page.drawText(pTitle, { x: techX, y: ty, size: 8.5, font: sans, color: INK_DARK });
        const pLines = wrapText(pDesc, sans, 7.5, techW);
        pLines.forEach((pl, pli) => {
          ap2.page.drawText(pl, { x: techX, y: ty - 12 - pli * 10, size: 7.5, font: sans, color: INK_BODY });
        });
        ty -= 44;
      });
    }
  }

  // --- APPENDIX PAGE 3: SLIDES 5 & 6 ---
  {
    const ap3 = createWebCardPage("Community Deck · Slides 5 & 6");
    let y = ap3.cursorY;

    // Slide 5: Flagship Programs
    const card5H = 350;
    drawSlidePresentationCard(
      ap3.page,
      y,
      card5H,
      5,
      "Ecosystem Initiatives",
      "Programs Designed for Tangible Founder Outcomes",
      "High-signal gatherings and structured acceleration clinics.",
    );

    const progW = (CONTENT_W - 48) / 3;
    const progs = [
      [
        "CSC CONNECT",
        "Bi-Weekly Curated Meetups",
        "Curated founder roundtables designed to bypass polite small talk. Founders share actual metrics, bottlenecks, and peer solutions.",
        "Format: Stranger-to-Partner",
      ],
      [
        "PITCH CLINICS",
        "Closed-Door Deck Teardowns",
        "Live teardowns with active angel investors, venture capital scouts, and seasoned operators before taking seed rounds to market.",
        "Format: Closed Mastermind",
      ],
      [
        "FOUNDER PASS",
        "Verified Perks & Benefits",
        "Exclusive community partner perks including cloud hosting credits, co-working desks across Coimbatore, and legal templates.",
        "Format: Digital QR Badge",
      ],
    ];

    progs.forEach(([pHeader, pSub, pBody, pFoot], idx) => {
      const px = MARGIN_X + 16 + idx * (progW + 8);
      const py = y - 70;
      ap3.page.drawRectangle({
        x: px,
        y: py - 235,
        width: progW,
        height: 235,
        color: SUB_CARD_BG,
        borderColor: CARD_BORDER,
        borderWidth: 0.5,
      });

      ap3.page.drawText(pHeader, { x: px + 10, y: py - 18, size: 8, font: sans, color: INK_DARK });
      ap3.page.drawText(pSub, { x: px + 10, y: py - 30, size: 6.8, font: sans, color: INK_MUTED });
      ap3.page.drawLine({
        start: { x: px + 10, y: py - 36 },
        end: { x: px + progW - 10, y: py - 36 },
        thickness: 0.4,
        color: CARD_BORDER,
      });

      const bLines = wrapText(pBody, sans, 7.2, progW - 20);
      let by = py - 50;
      bLines.forEach((bl) => {
        ap3.page.drawText(bl, { x: px + 10, y: by, size: 7.2, font: sans, color: INK_BODY });
        by -= 11;
      });

      ap3.page.drawText(pFoot, { x: px + 10, y: py - 220, size: 6.5, font: sans, color: ACCENT_BLUE });
    });

    y -= card5H + 18;

    // Slide 6: Operating Principles & Code of Conduct
    const card6H = 350;
    drawSlidePresentationCard(
      ap3.page,
      y,
      card6H,
      6,
      "Community Principles",
      "Our Core Operating Principles & Code of Conduct",
      "A high-trust sanctuary where Coimbatore's founders thrive.",
    );

    const values = [
      [
        "1. Give First, Ask Later",
        "True networks flourish when founders offer insights, introductions, and feedback before seeking immediate transactions.",
      ],
      [
        "2. Zero Tolerance for Spam",
        "Unsolicited promotional sales pitches and indiscriminate DM blasts are strictly prohibited to preserve high signal-to-noise ratio.",
      ],
      [
        "3. Radical Confidentiality (Vegas Rule)",
        "Unreleased product teardowns, sensitive numbers, and struggles shared in closed circles remain strictly confidential.",
      ],
      [
        "4. Inclusivity & Meritocracy",
        "Whether you are a solo student hacker or a seasoned serial entrepreneur, everyone is evaluated on grit and integrity.",
      ],
    ];

    const valW = (CONTENT_W - 44) / 2;
    values.forEach(([vTitle, vDesc], idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2;
      const vx = MARGIN_X + 16 + col * (valW + 12);
      const vy = y - 70 - row * 110;

      ap3.page.drawRectangle({
        x: vx,
        y: vy - 96,
        width: valW,
        height: 96,
        color: SUB_CARD_BG,
        borderColor: CARD_BORDER,
        borderWidth: 0.5,
      });

      ap3.page.drawText(vTitle, { x: vx + 12, y: vy - 18, size: 8.5, font: sans, color: INK_DARK });
      const vdLines = wrapText(vDesc, sans, 7.5, valW - 24);
      let vdy = vy - 32;
      vdLines.forEach((vdl) => {
        ap3.page.drawText(vdl, { x: vx + 12, y: vdy, size: 7.5, font: sans, color: INK_BODY });
        vdy -= 11.5;
      });
    });
  }

  // --- APPENDIX PAGE 4: SLIDE 7 & BESPOKE FOOTER ---
  {
    const ap4 = createWebCardPage("Community Deck · Slide 7 & Contact");
    let y = ap4.cursorY;

    // Slide 7: Official Community Hub & Channels
    const card7H = 680;
    drawSlidePresentationCard(
      ap4.page,
      y,
      card7H,
      7,
      "Let's Connect & Build Together",
      "Join the Circle. Lead the Future.",
      "Official community contact hub, partnerships & platform access.",
    );

    const qrCardW = 160;
    const qrCardH = 170;
    const qrCardX = MARGIN_X + 20;
    const qrCardY = y - 68;

    // QR Code Box (Left)
    ap4.page.drawRectangle({
      x: qrCardX,
      y: qrCardY - qrCardH,
      width: qrCardW,
      height: qrCardH,
      color: SUB_CARD_BG,
      borderColor: CARD_BORDER,
      borderWidth: 0.5,
    });

    if (qrImg) {
      const qrSize = 118;
      ap4.page.drawImage(qrImg, {
        x: qrCardX + (qrCardW - qrSize) / 2,
        y: qrCardY - qrSize - 12,
        width: qrSize,
        height: qrSize,
      });
    }

    ap4.page.drawText("SCAN TO VISIT PLATFORM", {
      x: qrCardX + 16,
      y: qrCardY - 145,
      size: 7.2,
      font: sans,
      color: INK_DARK,
    });
    ap4.page.drawText("csc.logicintelligencetechnologies.in", {
      x: qrCardX + 10,
      y: qrCardY - 158,
      size: 6.2,
      font: sans,
      color: ACCENT_BLUE,
    });

    // Right Column: Official Contact Hub Header & Description
    const rightX = qrCardX + qrCardW + 16;
    const rightW = CONTENT_W - qrCardW - 56;

    if (cscLogoImg) {
      const logoW = 32;
      ap4.page.drawImage(cscLogoImg, {
        x: rightX,
        y: qrCardY - logoW,
        width: logoW,
        height: logoW,
      });
    }

    ap4.page.drawText("COIMBATORE STARTUP COMMUNITY", {
      x: rightX + 40,
      y: qrCardY - 14,
      size: 10,
      font: sans,
      color: INK_DARK,
    });
    ap4.page.drawText("Official Community Contact Hub", {
      x: rightX + 40,
      y: qrCardY - 26,
      size: 7.5,
      font: sans,
      color: INK_MUTED,
    });

    const contactBlurb =
      "CSC Circle welcomes collaborative partnerships with forward-thinking enterprises, founders, student innovators, and academic incubators across Tamil Nadu.";
    const cbLines = wrapText(contactBlurb, sans, 7.5, rightW);
    let cby = qrCardY - 44;
    cbLines.forEach((cbl) => {
      ap4.page.drawText(cbl, { x: rightX, y: cby, size: 7.5, font: sans, color: INK_BODY });
      cby -= 11;
    });

    // Highlighted Official Email Card
    ap4.page.drawRectangle({
      x: rightX,
      y: cby - 34,
      width: rightW,
      height: 34,
      color: SUB_CARD_BG,
      borderColor: CARD_BORDER,
      borderWidth: 0.5,
    });
    ap4.page.drawText("OFFICIAL COMMUNITY INQUIRIES & PARTNERSHIPS", {
      x: rightX + 10,
      y: cby - 13,
      size: 6.5,
      font: sans,
      color: INK_MUTED,
    });
    ap4.page.drawText("coimbatorestartupcommunity@gmail.com", {
      x: rightX + 10,
      y: cby - 25,
      size: 8.5,
      font: sans,
      color: ACCENT_BLUE,
    });

    // Middle Section: Stay Connected Banner Graphic
    let bannerBottomY = qrCardY - qrCardH - 12;
    if (stayConnectedImg) {
      const bannerW = 380;
      const bannerH = 177;
      const bannerX = MARGIN_X + 20 + ((CONTENT_W - 40) - bannerW) / 2;
      bannerBottomY = qrCardY - qrCardH - 12 - bannerH;
      ap4.page.drawImage(stayConnectedImg, {
        x: bannerX,
        y: bannerBottomY,
        width: bannerW,
        height: bannerH,
      });
    }

    // 2-Column Channel Links below banner
    const channelCols = [
      [
        ["Official Community Email", "coimbatorestartupcommunity@gmail.com"],
        ["WhatsApp Founder Network", "chat.whatsapp.com/HGWEu9dm7Jc6C3sH7V1PTB"],
        ["WhatsApp 24/7 AI Concierge", "+91 75500 67712 (wa.me/917550067712)"],
      ],
      [
        ["Official LinkedIn", "linkedin.com/in/csc-coimbatore-startup-community"],
        ["Instagram Channel", "@coimbatorestartupcommunity"],
        ["Technology Partner (LIT)", "Logic Intelligence Technologies (LIT)"],
      ],
    ];

    const colW = (CONTENT_W - 48) / 2;
    let cy = bannerBottomY - 14;
    for (let r = 0; r < 3; r++) {
      const rowY = cy - r * 32;
      channelCols.forEach((colData, colIdx) => {
        const item = colData[r];
        if (!item) return;
        const [cTitle, cVal] = item;
        const cx = MARGIN_X + 20 + colIdx * (colW + 8);

        ap4.page.drawRectangle({
          x: cx,
          y: rowY - 26,
          width: colW,
          height: 26,
          color: SUB_CARD_BG,
          borderColor: CARD_BORDER,
          borderWidth: 0.5,
        });

        ap4.page.drawText(cTitle, { x: cx + 8, y: rowY - 10, size: 7, font: sans, color: INK_DARK });
        ap4.page.drawText(cVal, { x: cx + 8, y: rowY - 20, size: 6.5, font: sans, color: ACCENT_BLUE });
      });
    }

    const attributionY = cy - 3 * 32 - 10;
    // Minimal 2-line attribution at base of slide 7
    drawCenteredText(
      ap4.page,
      "Coimbatore Startup Community — A Community-Led Initiative",
      attributionY,
      sans,
      8.5,
      INK_BODY,
    );
    drawCenteredText(
      ap4.page,
      "Platform Architecture & Engineering by Logic Intelligence Technologies (LIT)",
      attributionY - 14,
      sans,
      7.5,
      INK_MUTED,
    );
  }

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
