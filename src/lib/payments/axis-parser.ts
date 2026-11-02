import { TextDecoder } from "node:util";
import PostalMime from "postal-mime";
import { UPI_CONFIG } from "./config";
import { verifyEmailAuthentication, type EmailAuthResult, type EmailAuthStatus } from "./email-auth";

export interface ParsedAxisAlert {
  bank: "AXIS_BANK";
  direction: "CREDIT" | "DEBIT";
  currency: "INR";
  amountPaise: number;
  receivingAccountSuffix: string;
  transactionTime: string; // ISO 8601 UTC string
  transactionChannel: "UPI" | "IMPS" | "NEFT" | "OTHER";
  utr: string;
  payerName?: string;
  sourceBank?: string;
  transactionInfoRaw: string;
  sender: string;
  subject: string;
  messageId: string;
  auth: EmailAuthResult;
  authStatus?: EmailAuthStatus;
  isEligibleForAutoReconcile: boolean;
  rejectionReason?: string;
}

export interface RawEmailInput {
  messageId?: string;
  subject?: string;
  from?: string;
  sender?: string;
  headers: Record<string, string | string[] | undefined>;
  rawHeaders?: Array<{ key: string; value: string }>;
  text?: string;
  html?: string;
  body?: string;
  date?: Date | string;
  attachments?: Array<{
    filename?: string | null;
    mimeType: string;
    content: Buffer | Uint8Array;
    size: number;
  }>;
  cryptographicAuth?: EmailAuthResult;
  imapUid?: number;
  imapUidValidity?: number;
  imapMailbox?: string;
}

export interface ParsedTransactionInfo {
  utr: string;
  payerName: string;
  sourceBank: string;
  channel: "UPI" | "IMPS" | "NEFT" | "OTHER";
  orderReference?: string;
  raw: string;
}

/**
 * Decodes Quoted-Printable encoded string to byte array.
 * Preserves unicode code points by encoding non-ASCII to UTF-8 bytes.
 */
export function decodeQuotedPrintableToBytes(str: string): Uint8Array {
  const sanitized = str.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < sanitized.length; i++) {
    if (sanitized[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(sanitized.slice(i + 1, i + 3))) {
      bytes.push(parseInt(sanitized.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      const code = sanitized.charCodeAt(i);
      if (code < 128) {
        bytes.push(code);
      } else {
        const charBuf = Buffer.from(sanitized[i], "utf-8");
        for (const b of charBuf) bytes.push(b);
      }
    }
  }
  return new Uint8Array(bytes);
}

const WINDOWS_1252_MAP: Record<number, number> = {
  0x80: 0x20ac, // €
  0x82: 0x201a, // ‚
  0x83: 0x0192, // ƒ
  0x84: 0x201e, // „
  0x85: 0x2026, // …
  0x86: 0x2020, // †
  0x87: 0x2021, // ‡
  0x88: 0x02c6, // ˆ
  0x89: 0x2030, // ‰
  0x8a: 0x0160, // Š
  0x8b: 0x2039, // ‹
  0x8c: 0x0152, // Œ
  0x8e: 0x017d, // Ž
  0x91: 0x2018, // ‘
  0x92: 0x2019, // ’
  0x93: 0x201c, // “
  0x94: 0x201d, // ”
  0x95: 0x2022, // •
  0x96: 0x2013, // –
  0x97: 0x2014, // —
  0x98: 0x02dc, // ˜
  0x99: 0x2122, // ™
  0x9a: 0x0161, // š
  0x9b: 0x203a, // ›
  0x9c: 0x0153, // œ
  0x9e: 0x017e, // ž
  0x9f: 0x0178, // Ÿ
};

/**
 * Decodes a byte buffer into a string according to the requested charset,
 * honoring Windows-1252 / CP1252 byte-to-character mapping where Node TextDecoder
 * defaults to ISO-8859-1.
 */
function decodeBytesWithCharset(bytes: Uint8Array, charset = "utf-8"): string {
  const norm = (charset || "utf-8").toLowerCase().trim();
  if (norm === "windows-1252" || norm === "cp1252" || norm === "cp-1252") {
    let res = "";
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b >= 0x80 && b <= 0x9f && WINDOWS_1252_MAP[b] !== undefined) {
        res += String.fromCharCode(WINDOWS_1252_MAP[b]);
      } else {
        res += String.fromCharCode(b);
      }
    }
    return res;
  }

  try {
    const decoder = new TextDecoder(norm, { fatal: false });
    return decoder.decode(bytes);
  } catch {
    return Buffer.from(bytes).toString("utf-8");
  }
}

/**
 * Decodes Quoted-Printable encoded MIME text with arbitrary charset support.
 */
export function decodeQuotedPrintable(str: string, charset = "utf-8"): string {
  const bytes = decodeQuotedPrintableToBytes(str);
  return decodeBytesWithCharset(bytes, charset);
}

/**
 * Decodes RFC 2047 encoded words in email headers, supporting Windows-1252, ISO-8859-1,
 * and collapsing linear whitespace between adjacent encoded words (RFC 2047 §6.2).
 */
export function decodeRfc2047(header: string): string {
  if (!header || !header.includes("=?")) return header;

  // RFC 2047 §6.2: Strip linear white space between adjacent encoded words
  const collapsed = header.replace(/(=\?[^?]+\?[bqBQ]\?[^?]+\?=)\s+(?==\?[^?]+\?[bqBQ]\?[^?]+\?=)/g, "$1");

  return collapsed.replace(/=\?([a-zA-Z0-9_-]+)\?([bqBQ])\?([^?]+)\?=/g, (match, charset, enc, text) => {
    try {
      let bytes: Uint8Array;
      if (enc.toUpperCase() === "B") {
        bytes = Buffer.from(text, "base64");
      } else {
        const qDecoded = text.replace(/_/g, " ");
        bytes = decodeQuotedPrintableToBytes(qDecoded);
      }
      return decodeBytesWithCharset(bytes, charset);
    } catch {
      return match;
    }
  });
}

function decodeBase64(str: string, charset = "utf-8"): string {
  try {
    const cleaned = str.replace(/\s+/g, "");
    const buf = Buffer.from(cleaned, "base64");
    return decodeBytesWithCharset(buf, charset);
  } catch {
    return str;
  }
}

interface ParsedBodyParts {
  text?: string;
  html?: string;
  attachments: Array<{
    filename?: string | null;
    mimeType: string;
    content: Buffer | Uint8Array;
    size: number;
  }>;
}

/**
 * Recursively parses MIME body parts, handling nested multipart/mixed,
 * multipart/alternative, Quoted-Printable, Base64, and non-UTF-8 charsets.
 */
function parseMimeBodyParts(
  contentType: string,
  transferEncoding: string,
  bodyRaw: string
): ParsedBodyParts {
  let text = "";
  let html = "";
  const attachments: ParsedBodyParts["attachments"] = [];

  const isMultipart = /^multipart\//i.test(contentType.trim());
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);

  if (isMultipart && boundaryMatch) {
    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const escaped = boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`--${escaped}(?:--)?(?:\\r?\\n)?`);
    const parts = bodyRaw.split(regex);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed === "--") continue;

      const splitIdx =
        trimmed.indexOf("\r\n\r\n") !== -1
          ? trimmed.indexOf("\r\n\r\n")
          : trimmed.indexOf("\n\n");
      if (splitIdx === -1) continue;

      const delimLen = trimmed.indexOf("\r\n\r\n") !== -1 ? 4 : 2;
      const pHeadersRaw = trimmed.slice(0, splitIdx);
      const pBodyRaw = trimmed.slice(splitIdx + delimLen);

      const pHeaders: Record<string, string> = {};
      for (const line of pHeadersRaw.split(/\r?\n(?=[^\s])/)) {
        const c = line.indexOf(":");
        if (c > 0) {
          pHeaders[line.slice(0, c).trim().toLowerCase()] = line
            .slice(c + 1)
            .replace(/\r?\n\s+/g, " ")
            .trim();
        }
      }

      const pType = pHeaders["content-type"] || "text/plain";
      const pEnc = pHeaders["content-transfer-encoding"] || "";

      const sub = parseMimeBodyParts(pType, pEnc, pBodyRaw);
      if (sub.text) text = (text ? text + "\n" : "") + sub.text;
      if (sub.html) html = (html ? html + "\n" : "") + sub.html;
      if (sub.attachments.length > 0) attachments.push(...sub.attachments);
    }
  } else {
    const charsetMatch = contentType.match(/charset=(?:"([^"]+)"|([^;\s]+))/i);
    const charset = charsetMatch ? charsetMatch[1] || charsetMatch[2] : "utf-8";

    let decoded = bodyRaw;
    if (transferEncoding.toLowerCase().includes("quoted-printable")) {
      decoded = decodeQuotedPrintable(bodyRaw, charset);
    } else if (transferEncoding.toLowerCase().includes("base64")) {
      decoded = decodeBase64(bodyRaw, charset);
    }

    if (contentType.toLowerCase().includes("text/html")) {
      html = decoded;
    } else if (contentType.toLowerCase().includes("text/plain") || !contentType.trim()) {
      text = decoded;
    } else {
      const buf = Buffer.from(bodyRaw, transferEncoding.includes("base64") ? "base64" : "utf-8");
      attachments.push({
        mimeType: contentType.split(";")[0].trim().toLowerCase(),
        content: buf,
        size: buf.byteLength,
      });
    }
  }

  return {
    text: text || undefined,
    html: html || undefined,
    attachments,
  };
}

/**
 * Strips HTML tags and normalizes whitespace.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Synchronous internal MIME parser fallback for non-await callers.
 */
function parseMimeSync(rawMime: string | Buffer | Uint8Array): RawEmailInput & { text: string } {
  const raw = typeof rawMime === "string" ? rawMime : Buffer.from(rawMime).toString("utf-8");
  const splitIdx =
    raw.indexOf("\r\n\r\n") !== -1
      ? raw.indexOf("\r\n\r\n")
      : raw.indexOf("\n\n");
  const delimLen = raw.indexOf("\r\n\r\n") !== -1 ? 4 : 2;

  const headersRaw = splitIdx !== -1 ? raw.slice(0, splitIdx) : "";
  const bodyRaw = splitIdx !== -1 ? raw.slice(splitIdx + delimLen) : raw;

  const headers: Record<string, string | string[]> = {};
  const rawHeaders: Array<{ key: string; value: string }> = [];

  const lines = headersRaw.split(/\r?\n(?=[^\s])/);
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const rawVal = line.slice(colonIdx + 1).replace(/\r?\n\s+/g, " ").trim();
      const val = decodeRfc2047(rawVal);
      rawHeaders.push({ key, value: val });

      const existing = headers[key];
      if (existing === undefined) {
        headers[key] = val;
      } else if (Array.isArray(existing)) {
        existing.push(val);
      } else {
        headers[key] = [existing, val];
      }
    }
  }

  const contentType = (typeof headers["content-type"] === "string" ? headers["content-type"] : "") || "text/plain";
  const transferEncoding = (typeof headers["content-transfer-encoding"] === "string" ? headers["content-transfer-encoding"] : "") || "";

  const { text, html, attachments } = parseMimeBodyParts(contentType, transferEncoding, bodyRaw);

  const from = (headers["from"] as string) || "";
  const sender = (headers["sender"] as string) || undefined;
  const subject = (headers["subject"] as string) || "";
  const messageId = (headers["message-id"] as string) || `<generated-${Date.now()}@axis.bank.in>`;
  const date = (headers["date"] as string) || undefined;
  const textVal = text ?? "";

  return {
    messageId,
    subject,
    from,
    sender,
    date,
    headers,
    rawHeaders,
    text: textVal,
    html,
    body: textVal,
    attachments,
  };
}

export type ParsedMimeResult = RawEmailInput & { text: string };

/**
 * Parses raw MIME email source into clean RawEmailInput using postal-mime.
 * Decodes RFC 2047 headers, handles nested multiparts recursively,
 * and decodes Quoted-Printable and Base64 bodies across charsets.
 */
export function parseMimeEmail(
  rawMime: string | Buffer | Uint8Array
): Promise<ParsedMimeResult> & ParsedMimeResult {
  const syncResult = parseMimeSync(rawMime);

  const asyncPromise = (async (): Promise<ParsedMimeResult> => {
    const email = await new PostalMime().parse(rawMime ?? "");

    const headers: Record<string, string | string[]> = {};
    const rawHeaders: Array<{ key: string; value: string }> = [];

    for (const h of email.headers || []) {
      const key = h.key.toLowerCase();
      const val = decodeRfc2047(h.value);
      rawHeaders.push({ key, value: val });

      const existing = headers[key];
      if (existing === undefined) {
        headers[key] = val;
      } else if (Array.isArray(existing)) {
        existing.push(val);
      } else {
        headers[key] = [existing, val];
      }
    }

    // Preserve raw RFC 5322 header string from headers["from"] for extractMailboxAddress
    const rawFromHeader = headers["from"];
    const fromHeaderStr = Array.isArray(rawFromHeader)
      ? rawFromHeader[0]
      : typeof rawFromHeader === "string"
        ? rawFromHeader
        : "";
    const fromAddr = email.from ? (email.from.address || email.from.name || "") : "";
    const from = fromHeaderStr || fromAddr;

    const rawSenderHeader = headers["sender"];
    const senderHeaderStr = Array.isArray(rawSenderHeader)
      ? rawSenderHeader[0]
      : typeof rawSenderHeader === "string"
        ? rawSenderHeader
        : undefined;
    const senderAddr = email.sender ? (email.sender.address || email.sender.name) : undefined;
    const sender = senderHeaderStr || senderAddr;

    const subject =
      email.subject ||
      (typeof headers["subject"] === "string" ? headers["subject"] : "") ||
      "";

    const messageId =
      email.messageId ||
      (typeof headers["message-id"] === "string" ? headers["message-id"] : "") ||
      `<generated-${Date.now()}@axis.bank.in>`;

    const date =
      email.date ||
      (typeof headers["date"] === "string" ? headers["date"] : undefined);

    let textVal = email.text ?? (email.html ? stripHtml(email.html) : "");
    if (typeof rawMime === "string" && !rawMime.endsWith("\n") && !rawMime.endsWith("\r") && textVal.endsWith("\n")) {
      textVal = textVal.slice(0, -1);
    } else if (Buffer.isBuffer(rawMime) && rawMime.length > 0 && rawMime[rawMime.length - 1] !== 10 && rawMime[rawMime.length - 1] !== 13 && textVal.endsWith("\n")) {
      textVal = textVal.slice(0, -1);
    }

    const htmlVal = email.html || undefined;

    const attachments = (email.attachments || []).map((att) => {
      let contentBuf: Buffer;
      if (Buffer.isBuffer(att.content)) {
        contentBuf = att.content;
      } else if (att.content instanceof Uint8Array) {
        contentBuf = Buffer.from(att.content.buffer, att.content.byteOffset, att.content.byteLength);
      } else if (att.content instanceof ArrayBuffer) {
        contentBuf = Buffer.from(att.content);
      } else {
        contentBuf = Buffer.from(String(att.content || ""), "utf-8");
      }

      return {
        filename: att.filename ?? null,
        mimeType: (att.mimeType || "application/octet-stream").toLowerCase(),
        content: contentBuf,
        size: contentBuf.byteLength,
      };
    });

    return {
      messageId,
      subject,
      from,
      sender,
      date,
      headers,
      rawHeaders,
      text: textVal,
      html: htmlVal,
      body: textVal,
      attachments,
    };
  })();

  return Object.assign(asyncPromise, syncResult);
}

const MONTH_NAMES: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

/**
 * Parses an Axis Bank date string into an ISO UTC string.
 * Supports:
 * - '02-11-26, 00:14:02 IST'
 * - '02-11-2026, 00:14:02 IST'
 * - '02-Nov-26, 00:14:02 IST'
 * - '02-Nov-2026 00:14:02'
 * - '02-11-26 10:30:00 AM IST'
 */
export function parseAxisTimestamp(dateStr: string): string | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();

  // Supports DD-MM-YY, DD-MM-YYYY, DD-Mon-YYYY, 24h & 12h AM/PM
  const match = cleaned.match(
    /(\d{1,2})[-/]([0-9]{2}|[a-zA-Z]{3})[-/](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\s*(?:IST)?/i
  );
  if (!match) return null;

  const [, rawDay, rawMonth, rawYear, rawHour, mm, rawSec, ampm] = match;
  const d = rawDay.padStart(2, "0");
  let m = rawMonth;
  if (/^[a-zA-Z]{3}$/.test(rawMonth)) {
    const monthNum = MONTH_NAMES[rawMonth.toLowerCase()];
    if (!monthNum) return null;
    m = monthNum;
  } else {
    m = rawMonth.padStart(2, "0");
  }

  const year = rawYear.length === 2 ? 2000 + parseInt(rawYear, 10) : parseInt(rawYear, 10);
  let hhNum = parseInt(rawHour, 10);
  if (ampm) {
    if (ampm.toLowerCase() === "pm" && hhNum < 12) hhNum += 12;
    if (ampm.toLowerCase() === "am" && hhNum === 12) hhNum = 0;
  }
  const hh = String(hhNum).padStart(2, "0");
  const ss = (rawSec || "00").padStart(2, "0");

  const isoStr = `${year}-${m}-${d}T${hh}:${mm}:${ss}+05:30`;
  const date = new Date(isoStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}


/**
 * Converts INR string with optional commas/decimals into integer paise.
 * Avoids IEEE 754 floating point arithmetic.
 * Examples: '180.00' -> 18000, '1.14' -> 114, '1,500.50' -> 150050, '180' -> 18000.
 */
export function parseInrToPaise(amountStr: string): number | null {
  if (!amountStr) return null;
  const cleaned = amountStr.replace(/,/g, "").trim();
  const match = cleaned.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const rupees = parseInt(match[1], 10);
  const paiseStr = match[2] ? match[2].padEnd(2, "0").slice(0, 2) : "00";
  const paise = parseInt(paiseStr, 10);
  const totalPaise = rupees * 100 + paise;
  return totalPaise > 0 ? totalPaise : null;
}

/**
 * Parses raw transaction info string like:
 * 'UPI/P2A/630722119955/VIKASH S/IOBA/UPI'
 * 'UPI/CR/01/630722119955/VIKASH S/IOBA/UPI'
 * 'UPI/CR/CSC-ORD-ABC123/630722119955/VIKASH S/IOBA/UPI'
 */
export function parseTransactionInfo(raw: string): ParsedTransactionInfo {
  const cleaned = raw.replace(/[.\s]+$/, "").trim();
  const parts = cleaned.split("/").map((s) => s.trim()).filter((s) => s.length > 0);

  let utr = "";
  let payerName = "";
  let sourceBank = "";
  let orderReference: string | undefined;
  let channel: "UPI" | "IMPS" | "NEFT" | "OTHER" = "UPI";

  const upperRaw = cleaned.toUpperCase();
  if (upperRaw.includes("IMPS")) channel = "IMPS";
  else if (upperRaw.includes("NEFT")) channel = "NEFT";
  else if (upperRaw.includes("RTGS")) channel = "OTHER";
  else channel = "UPI";

  // Check if any part matches order reference format (e.g. CSC-ORD-XXXX or CSC-*)
  const orderRefPart = parts.find((p) => /^CSC-[A-Z0-9-]+$/i.test(p));
  if (orderRefPart) orderReference = orderRefPart;

  // Locate 12-digit UTR part
  let utrIndex = parts.findIndex((p) => /^\d{12}$/.test(p));
  const keywords = new Set(["UPI", "IMPS", "NEFT", "RTGS", "CR", "DR", "P2A", "P2P", "P2M"]);

  // If no strictly 12-digit part is found, check structural UPI/P2A/<utr> or UPI/CR/<ref>/<utr>
  if (utrIndex === -1 && parts[0]?.toUpperCase() === "UPI") {
    if ((parts[1]?.toUpperCase() === "P2A" || parts[1]?.toUpperCase() === "P2P") && parts[2] && !keywords.has(parts[2].toUpperCase())) {
      utrIndex = 2;
    } else if (parts[1]?.toUpperCase() === "CR" && parts.length > 3) {
      if (parts[3] && !keywords.has(parts[3].toUpperCase()) && parts[3] !== orderReference) {
        utrIndex = 3;
      }
    }
  }

  if (utrIndex !== -1) {
    utr = parts[utrIndex];
    const candidates = parts.filter(
      (p, idx) => idx !== utrIndex && !keywords.has(p.toUpperCase()) && p !== orderReference && !/^\d{12}$/.test(p)
    );

    if (utrIndex === 2 && parts.length > 3) {
      // Format: UPI/P2A/<UTR>/<PAYER>/<BANK>/UPI
      payerName = !keywords.has(parts[3].toUpperCase()) ? parts[3] : "";
      sourceBank = parts[4] && !keywords.has(parts[4].toUpperCase()) ? parts[4] : "";
    } else if (utrIndex > 2 && parts.length > utrIndex + 1) {
      // Format: UPI/CR/<REF>/<UTR>/<PAYER>/<BANK>
      payerName = !keywords.has(parts[utrIndex + 1].toUpperCase()) ? parts[utrIndex + 1] : "";
      sourceBank = parts[utrIndex + 2] && !keywords.has(parts[utrIndex + 2].toUpperCase()) ? parts[utrIndex + 2] : "";
    } else if (candidates.length > 0) {
      payerName = candidates[0];
      sourceBank = candidates.length > 1 ? candidates[1] : "";
    }
  } else {
    // Fallback: search 12-digit UTR anywhere in string
    const match12 = cleaned.match(/\b\d{12}\b/);
    if (match12) utr = match12[0];
  }

  if (payerName) payerName = payerName.replace(/[./]+$/, "").trim();
  if (sourceBank) sourceBank = sourceBank.replace(/[./]+$/, "").trim();

  return { utr, payerName, sourceBank, channel, orderReference, raw: cleaned };
}

/**
 * Extracts 4-digit receiving account suffix with word boundaries.
 * Matches: 'Account Number: XX1995', 'A/c XX1995', 'ending in 1995', etc.
 */
export function extractReceivingAccountSuffix(content: string, subject = ""): string | null {
  const patterns = [
    /Account\s*Number\s*:?\s*(?:[xX*]+|ending\s+in\s+)?(\d{4})\b/i,
    /A\/c\s*(?:no\.?)?\s*:?\s*(?:[xX*]+|ending\s+in\s+)?(\d{4})\b/i,
    /\b(?:[xX]{2,}|ending\s+in\s*)(\d{4})\b/i,
    /to\s+your\s+A\/c\s*(?:XX)?(\d{4})\b/i,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) return match[1];
  }
  const subMatch = subject.match(/(?:A\/c|account)[\s.]*(?:XX)?(\d{4})\b/i);
  if (subMatch && subMatch[1]) return subMatch[1];
  return null;
}

/**
 * Core Axis Bank Transaction Alert Parser.
 */
export function parseAxisCreditAlert(email: RawEmailInput): ParsedAxisAlert | null {
  const subject = email.subject || "";
  const content = [email.text || email.body || "", email.html ? stripHtml(email.html) : ""].join("\n");

  // 1. Check if this is a credit notification
  const isCreditSubject = /credited/i.test(subject);
  const isDebitSubject = /debited/i.test(subject);

  if (isDebitSubject && !isCreditSubject) {
    return null; // Ignore debits
  }

  const direction: "CREDIT" | "DEBIT" = isCreditSubject || /credited/i.test(content) ? "CREDIT" : "DEBIT";
  if (direction !== "CREDIT") {
    return null; // We only reconcile credit alerts
  }

  // 2. Extract Amount
  // Subject pattern: 'INR 1.00 was credited to your A/c.' or '₹ 180.00 was credited'
  // Body pattern: 'Amount Credited: INR 1.00' or '₹180.00' or '&#8377; 180.00'
  let amountPaise: number | null = null;
  const CURRENCY_PATTERN = "(?:INR|Rs\\.?|₹|&#8377;)";
  const AMOUNT_NUM_PATTERN = "([\\d,]+(?:\\.\\d{1,2})?)";

  const subAmtMatch = subject.match(new RegExp(`${CURRENCY_PATTERN}\\s*${AMOUNT_NUM_PATTERN}`, "i"));
  if (subAmtMatch) {
    amountPaise = parseInrToPaise(subAmtMatch[1]);
  }

  if (!amountPaise) {
    const bodyExplicitMatch = content.match(
      new RegExp(`Amount\\s*Credited\\s*:?\\s*${CURRENCY_PATTERN}?\\s*${AMOUNT_NUM_PATTERN}`, "i")
    );
    if (bodyExplicitMatch) {
      amountPaise = parseInrToPaise(bodyExplicitMatch[1]);
    }
  }

  if (!amountPaise) {
    const bodyCreditedMatch =
      content.match(new RegExp(`${CURRENCY_PATTERN}\\s*${AMOUNT_NUM_PATTERN}\\s*(?:was|has\\s+been)?\\s*credited`, "i")) ||
      content.match(new RegExp(`credited\\s*(?:with|by)?\\s*${CURRENCY_PATTERN}?\\s*${AMOUNT_NUM_PATTERN}`, "i"));
    if (bodyCreditedMatch) {
      amountPaise = parseInrToPaise(bodyCreditedMatch[1]);
    }
  }

  if (!amountPaise || amountPaise <= 0) {
    return null; // Amount is mandatory
  }

  // 3. Extract Receiving Account Suffix
  const accountSuffix = extractReceivingAccountSuffix(content, subject) || "";

  // 4. Extract Date & Time
  let transactionTime: string | null = null;
  const dateMatch =
    content.match(
      /Date\s*(?:&|and)?\s*Time\s*:?\s*([0-9a-zA-Z\-/]+,?\s+[0-9:]+(?:\s*(?:am|pm))?(?:\s*IST)?)/i
    ) ||
    content.match(
      /\bon\s+([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4},?\s+[0-9:]+(?:\s*(?:am|pm))?(?:\s*IST)?)/i
    );
  if (dateMatch) {
    transactionTime = parseAxisTimestamp(dateMatch[1]);
  }
  // The bank transaction timestamp is financial evidence. Do not replace it
  // with a mail Date header or processing time when parsing fails.

  // 5. Extract Transaction Info / Reference / UTR
  let rawTxnInfo = "";
  const txnInfoMatch =
    content.match(/Transaction\s*Info\s*:?\s*(UPI\/[^\r\n<]+)/i) ||
    content.match(/Transaction\s*Info\s*:?\s*([^\r\n<]+)/i);

  if (txnInfoMatch) {
    rawTxnInfo = txnInfoMatch[1].trim();
  } else {
    // Look for UPI slash pattern anywhere
    const upiMatch = content.match(/UPI\/(?:P2A|P2P|CR)\/[^\r\n<]+/i);
    if (upiMatch) rawTxnInfo = upiMatch[0].trim();
  }

  const { utr, payerName, sourceBank, channel } = parseTransactionInfo(rawTxnInfo || content);

  if (!utr) {
    // Cannot proceed without an unambiguous transaction reference
    return null;
  }

  // 6. Email Authentication Verification
  const headerFrom = typeof email.headers?.["from"] === "string" ? email.headers["from"] : undefined;
  const headerSender = typeof email.headers?.["sender"] === "string" ? email.headers["sender"] : undefined;
  const diagnosticAuth = verifyEmailAuthentication({
    ...email.headers,
    from: email.from || headerFrom,
    sender: email.sender || headerSender,
  });
  const auth = email.cryptographicAuth ?? diagnosticAuth;

  // 7. Auto-reconcile eligibility evaluation
  let isEligibleForAutoReconcile = true;
  let rejectionReason: string | undefined;

  if (!accountSuffix) {
    isEligibleForAutoReconcile = false;
    rejectionReason = "Receiving account suffix is missing from the bank evidence";
  } else if (accountSuffix !== UPI_CONFIG.RECEIVING_ACCOUNT_SUFFIX) {
    isEligibleForAutoReconcile = false;
    rejectionReason = `Receiving account XX${accountSuffix} does not match expected CSC account XX${UPI_CONFIG.RECEIVING_ACCOUNT_SUFFIX}`;
  } else if (auth.status === "untrusted" || auth.status === "forged") {
    isEligibleForAutoReconcile = false;
    rejectionReason = `Email failed sender/cryptographic authentication (${auth.status})`;
  } else if (auth.status === "needs_review") {
    isEligibleForAutoReconcile = false;
    rejectionReason = "Email authentication requires review before automated reconciliation";
  } else if (!transactionTime) {
    isEligibleForAutoReconcile = false;
    rejectionReason = "Bank transaction timestamp is missing or invalid";
  } else if (!utr || utr.length < 6) {
    isEligibleForAutoReconcile = false;
    rejectionReason = "Missing or malformed UTR/payment reference";
  }

  return {
    bank: "AXIS_BANK",
    direction: "CREDIT",
    currency: "INR",
    amountPaise,
    receivingAccountSuffix: accountSuffix || "",
    transactionTime: transactionTime || "",
    transactionChannel: channel,
    utr,
    payerName: payerName || undefined,
    sourceBank: sourceBank || undefined,
    transactionInfoRaw: rawTxnInfo || `UPI/${utr}`,
    sender: email.from || headerFrom || "",
    subject,
    messageId: email.messageId || `gen-${utr}-${Date.now()}`,
    auth,
    authStatus: auth.status,
    isEligibleForAutoReconcile,
    rejectionReason,
  };
}
