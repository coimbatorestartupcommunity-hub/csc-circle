import "server-only";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";

export interface ServerPassPdfOptions {
  eventTitle: string;
  name: string;
  email: string;
  uid: string;
  dateRange: string;
  location: string;
  qrBuffer?: Buffer;
  qrPayload?: string;
  phone?: string;
}

function escapeXml(unsafe: unknown): string {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\x27/g, "&apos;");
}

let cachedLogoBase64: string | null = null;

async function getLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const logoPath = path.join(process.cwd(), "public/brand/csc-icon.png");
    if (fs.existsSync(logoPath)) {
      const resized = await sharp(logoPath).resize(80, 80).png().toBuffer();
      cachedLogoBase64 = resized.toString("base64");
      return cachedLogoBase64;
    }
  } catch {
    // Non-fatal if logo is unavailable
  }
  return "";
}

/**
 * Generates the official CSC Event Pass as a high-resolution PNG card image,
 * matching the exact glass-office card design shown on the member pass page.
 */
export async function generateServerEventPassPng(
  options: ServerPassPdfOptions,
): Promise<Buffer> {
  const qrBuffer =
    options.qrBuffer ||
    (await QRCode.toBuffer(options.qrPayload || "https://csc.circle", {
      margin: 1,
      width: 360,
      color: { dark: "#121826", light: "#ffffff" },
    }));
  const qrBase64 = qrBuffer.toString("base64");
  const logoBase64 = await getLogoBase64();

  const name = (options.name || "Attendee").trim();
  const email = (options.email || "—").trim();
  const uid = (options.uid || "UID Pending").trim();
  const eventTitle = (options.eventTitle || "CSC Event").trim();
  const dateRange = (options.dateRange || "Date & Time to be announced").trim();
  const location = (options.location || "Online via Google Meet").trim();
  const initial = (name.charAt(0) || "A").toUpperCase();

  const titleFontSize = eventTitle.length > 32 ? 14 : 16;
  const nameFontSize = name.length > 26 ? 11 : 13;
  const emailFontSize = email.length > 28 ? 10 : 11.5;

  const W = 440;
  const H = 740;

  const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f5efff" />
      <stop offset="50%" stop-color="#e9f3ff" />
      <stop offset="100%" stop-color="#fbfaff" />
    </linearGradient>
    <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eee8ff" />
      <stop offset="100%" stop-color="#e3f0ff" />
    </linearGradient>
    <clipPath id="cardClip">
      <rect x="12" y="12" width="416" height="716" rx="28" />
    </clipPath>
  </defs>

  <!-- Outer background card -->
  <rect x="12" y="12" width="416" height="716" rx="28" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />

  <g clip-path="url(#cardClip)">
    <!-- Header banner -->
    <rect x="12" y="12" width="416" height="64" fill="url(#headerGrad)"/>
    <line x1="12" y1="76" x2="428" y2="76" stroke="#e2e8f0" stroke-width="1"/>

    <!-- CSC Logo -->
    <circle cx="44" cy="44" r="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
    ${
      logoBase64
        ? `<image href="data:image/png;base64,${logoBase64}" x="25" y="25" width="38" height="38" />`
        : `<text x="44" y="49" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="14" font-weight="800" fill="#6f64ba" text-anchor="middle">CSC</text>`
    }

    <!-- Header Titles -->
    <text x="74" y="39" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="12" font-weight="800" fill="#0f172a" letter-spacing="0.08em">CSC EVENT PASS</text>
    <text x="74" y="54" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="9.5" font-weight="500" fill="#64748b">Coimbatore Startup Community</text>

    <!-- Status Badge -->
    <rect x="324" y="32" width="92" height="24" rx="12" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1"/>
    <circle cx="336" cy="44" r="3.5" fill="#10b981"/>
    <text x="345" y="48" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="9.5" font-weight="700" fill="#047857" letter-spacing="0.05em">CONFIRMED</text>
  </g>

  <!-- Attendee Avatar Circle -->
  <circle cx="220" cy="118" r="30" fill="url(#avatarGrad)" stroke="#6f64ba" stroke-width="1.5" stroke-opacity="0.3"/>
  <text x="220" y="128" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="24" font-weight="800" fill="#4338ca" text-anchor="middle">${escapeXml(initial)}</text>

  <!-- Event Title -->
  <text x="220" y="170" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="${titleFontSize}" font-weight="800" fill="#0f172a" text-anchor="middle">${escapeXml(eventTitle)}</text>

  <!-- Date & Location Box -->
  <rect x="28" y="188" width="384" height="66" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  
  <!-- Calendar icon & row -->
  <rect x="42" y="200" width="16" height="15" rx="3" fill="none" stroke="#64748b" stroke-width="1.5"/>
  <line x1="42" y1="205" x2="58" y2="205" stroke="#64748b" stroke-width="1.5"/>
  <line x1="46" y1="198" x2="46" y2="201" stroke="#64748b" stroke-width="1.5"/>
  <line x1="54" y1="198" x2="54" y2="201" stroke="#64748b" stroke-width="1.5"/>
  <text x="66" y="212" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="11" font-weight="600" fill="#334155">${escapeXml(dateRange)}</text>
  
  <!-- Location pin icon & row -->
  <path d="M50 226 C46.7 226 44 228.7 44 232 C44 236.5 50 243 50 243 C50 243 56 236.5 56 232 C56 228.7 53.3 226 50 226 Z" fill="#0d9488"/>
  <circle cx="50" cy="232" r="2" fill="#ffffff"/>
  <text x="66" y="238" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="11" fill="#475569">
    <tspan font-weight="700" fill="#0f172a">Location:</tspan> ${escapeXml(location)}
  </text>

  <!-- Attendee Details Box -->
  <rect x="28" y="266" width="384" height="126" rx="18" fill="#f8faff" stroke="#e2e8f0" stroke-width="1"/>
  
  <!-- Name -->
  <text x="220" y="286" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle" letter-spacing="0.08em">NAME</text>
  <text x="220" y="304" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="${nameFontSize}" font-weight="800" fill="#0f172a" text-anchor="middle">${escapeXml(name.toUpperCase())}</text>

  <!-- Email -->
  <text x="220" y="326" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle" letter-spacing="0.08em">EMAIL</text>
  <text x="220" y="343" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="${emailFontSize}" font-weight="700" fill="#0f172a" text-anchor="middle">${escapeXml(email)}</text>

  <!-- UID -->
  <text x="220" y="365" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle" letter-spacing="0.08em">UID</text>
  <text x="220" y="380" font-family="Courier, monospace" font-size="11" font-weight="700" fill="#0f172a" text-anchor="middle">${escapeXml(uid)}</text>

  <!-- Entrance Verification QR Box -->
  <rect x="28" y="404" width="384" height="264" rx="18" fill="#f8faff" stroke="#e2e8f0" stroke-width="1"/>
  
  <text x="220" y="426" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="9.5" font-weight="800" fill="#64748b" text-anchor="middle" letter-spacing="0.14em">ENTRANCE VERIFICATION QR</text>

  <!-- White QR background box -->
  <rect x="120" y="438" width="200" height="200" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <image href="data:image/png;base64,${qrBase64}" x="130" y="448" width="180" height="180" />

  <text x="220" y="654" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="10.5" font-weight="600" fill="#475569" text-anchor="middle">Scan at Venue Entrance</text>

  <!-- Footer Notice -->
  <text x="220" y="694" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="9" font-weight="500" fill="#64748b" text-anchor="middle">Show this pass at the entrance. All times in India Standard Time.</text>
</svg>`;

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return pngBuffer;
}

/**
 * Generates an official, beautifully proportioned CSC Event Pass PDF
 * suitable for printing or opening directly on mobile/desktop, matching the
 * website pass card exactly.
 */
export async function generateServerEventPassPdf(
  options: ServerPassPdfOptions,
): Promise<Buffer> {
  const pngBuffer = await generateServerEventPassPng(options);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${options.eventTitle || "CSC Event"} · Event Pass`);
  pdf.setSubject("Official CSC Circle Event Pass");
  pdf.setProducer("Coimbatore Startup Community");
  pdf.setCreator("CSC Circle Portal");

  const W = 440;
  const H = 740;
  const page = pdf.addPage([W, H]);
  const uint8 = new Uint8Array(pngBuffer.buffer.slice(pngBuffer.byteOffset, pngBuffer.byteOffset + pngBuffer.byteLength));
  const image = await pdf.embedPng(uint8);
  page.drawImage(image, { x: 0, y: 0, width: W, height: H });

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}
