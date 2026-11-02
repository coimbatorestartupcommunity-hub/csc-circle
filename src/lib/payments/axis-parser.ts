import { UPI_CONFIG } from "./config";
import { verifyEmailAuthentication, type EmailAuthResult } from "./email-auth";

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
  isEligibleForAutoReconcile: boolean;
  rejectionReason?: string;
}

export interface RawEmailInput {
  messageId: string;
  subject: string;
  from: string;
  headers: Record<string, string | string[] | undefined>;
  text?: string;
  html?: string;
  date?: Date | string;
}

/**
 * Decodes Quoted-Printable encoded MIME text to UTF-8.
 */
export function decodeQuotedPrintable(str: string): string {
  const sanitized = str.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < sanitized.length; i++) {
    if (sanitized[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(sanitized.slice(i + 1, i + 3))) {
      bytes.push(parseInt(sanitized.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(sanitized.charCodeAt(i));
    }
  }
  return Buffer.from(bytes).toString("utf-8");
}

/**
 * Decodes RFC 2047 encoded words in email headers (e.g. =?utf-8?B?...?= or =?utf-8?Q?...?=).
 */
export function decodeRfc2047(header: string): string {
  return header.replace(/=\?([a-zA-Z0-9_-]+)\?([bqBQ])\?([^?]+)\?=/g, (match, charset, enc, text) => {
    try {
      if (enc.toUpperCase() === "B") {
        return Buffer.from(text, "base64").toString(charset as BufferEncoding);
      } else if (enc.toUpperCase() === "Q") {
        const qDecoded = text.replace(/_/g, " ");
        return decodeQuotedPrintable(qDecoded);
      }
    } catch {
      return match;
    }
    return match;
  });
}

/**
 * Parses raw MIME email source into clean RawEmailInput.
 * Decodes RFC 2047 headers, multipart boundaries, Quoted-Printable, and Base64 body parts.
 */
export function parseMimeEmail(rawMime: string | Buffer): RawEmailInput {
  const raw = typeof rawMime === "string" ? rawMime : rawMime.toString("utf-8");
  const headerEnd = raw.indexOf("\r\n\r\n");
  const altHeaderEnd = raw.indexOf("\n\n");
  const splitIdx = headerEnd !== -1 ? headerEnd : altHeaderEnd;
  const delimiterLen = headerEnd !== -1 ? 4 : 2;

  const headersRaw = splitIdx !== -1 ? raw.slice(0, splitIdx) : "";
  const bodyRaw = splitIdx !== -1 ? raw.slice(splitIdx + delimiterLen) : raw;

  const headers: Record<string, string> = {};
  const headerLines = headersRaw.split(/\r?\n(?=[^\s])/);
  for (const line of headerLines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const name = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).replace(/\r?\n\s+/g, " ").trim();
      headers[name] = decodeRfc2047(val);
    }
  }

  const contentType = headers["content-type"] || "text/plain";
  const transferEncoding = (headers["content-transfer-encoding"] || "").toLowerCase().trim();

  let text: string | undefined;
  let html: string | undefined;

  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const parts = bodyRaw.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?`));

    for (const part of parts) {
      const trimmedPart = part.trim();
      if (!trimmedPart || trimmedPart === "--") continue;

      const pHeaderEnd = trimmedPart.indexOf("\r\n\r\n") !== -1 ? trimmedPart.indexOf("\r\n\r\n") : trimmedPart.indexOf("\n\n");
      const pDelimLen = trimmedPart.indexOf("\r\n\r\n") !== -1 ? 4 : 2;
      if (pHeaderEnd === -1) continue;

      const pHeadersRaw = trimmedPart.slice(0, pHeaderEnd);
      const pBodyRaw = trimmedPart.slice(pHeaderEnd + pDelimLen);

      const pHeaders: Record<string, string> = {};
      for (const line of pHeadersRaw.split(/\r?\n(?=[^\s])/)) {
        const cIdx = line.indexOf(":");
        if (cIdx > 0) {
          pHeaders[line.slice(0, cIdx).trim().toLowerCase()] = line.slice(cIdx + 1).replace(/\r?\n\s+/g, " ").trim();
        }
      }

      const pType = pHeaders["content-type"] || "text/plain";
      const pEnc = (pHeaders["content-transfer-encoding"] || "").toLowerCase();

      let decodedBody = pBodyRaw;
      if (pEnc.includes("quoted-printable")) {
        decodedBody = decodeQuotedPrintable(pBodyRaw);
      } else if (pEnc.includes("base64")) {
        try {
          decodedBody = Buffer.from(pBodyRaw.replace(/\s+/g, ""), "base64").toString("utf-8");
        } catch {
          decodedBody = pBodyRaw;
        }
      }

      if (pType.includes("text/html")) {
        html = (html ? html + "\n" : "") + decodedBody;
      } else if (pType.includes("text/plain")) {
        text = (text ? text + "\n" : "") + decodedBody;
      }
    }
  } else {
    let decoded = bodyRaw;
    if (transferEncoding.includes("quoted-printable")) {
      decoded = decodeQuotedPrintable(bodyRaw);
    } else if (transferEncoding.includes("base64")) {
      try {
        decoded = Buffer.from(bodyRaw.replace(/\s+/g, ""), "base64").toString("utf-8");
      } catch {
        decoded = bodyRaw;
      }
    }

    if (contentType.includes("text/html")) {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  return {
    messageId: headers["message-id"] || `<generated-${Date.now()}@axis.bank.in>`,
    subject: headers["subject"] || "",
    from: headers["from"] || "",
    headers,
    text,
    html,
  };
}

/**
 * Parses an Axis Bank date string into an ISO UTC string.
 * Example formats:
 * - '02-11-26, 00:14:02 IST'
 * - '02-11-2026, 00:14:02 IST'
 * - '02-11-2026 00:14:02'
 */
export function parseAxisTimestamp(dateStr: string): string | null {
  const cleaned = dateStr.trim();
  const match = cleaned.match(/(\d{2})[-/](\d{2})[-/](\d{2,4}),?\s+(\d{2}):(\d{2}):(\d{2})\s*(?:IST)?/i);
  if (!match) return null;

  const [, d, m, y, hh, mm, ss] = match;
  const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
  const isoStr = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${hh}:${mm}:${ss}+05:30`;
  const date = new Date(isoStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Strips HTML tags and normalizes whitespace.
 */
function stripHtml(html: string): string {
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
 * Parses raw transaction info string like:
 * 'UPI/P2A/630722119955/VIKASH S/IOBA/UPI'
 */
export function parseTransactionInfo(raw: string) {
  const parts = raw.split("/").map((s) => s.trim());
  let utr = "";
  let payerName = "";
  let sourceBank = "";
  let channel: "UPI" | "IMPS" | "NEFT" | "OTHER" = "UPI";

  if (parts.length >= 4 && parts[0].toUpperCase() === "UPI") {
    channel = "UPI";
    // Check if parts[2] is 12-digit UTR
    if (/^\d{12}$/.test(parts[2])) {
      utr = parts[2];
      payerName = parts[3] || "";
      sourceBank = parts[4] || "";
    } else {
      // Find any 12-digit part
      const foundUtr = parts.find((p) => /^\d{12}$/.test(p));
      if (foundUtr) utr = foundUtr;
      payerName = parts[3] || "";
      sourceBank = parts[4] || "";
    }
  } else if (raw.toUpperCase().includes("IMPS")) {
    channel = "IMPS";
  } else if (raw.toUpperCase().includes("NEFT")) {
    channel = "NEFT";
  }

  // Fallback: search for 12-digit UTR in raw text
  if (!utr) {
    const utrMatch = raw.match(/\b\d{12}\b/);
    if (utrMatch) utr = utrMatch[0];
  }

  return { utr, payerName, sourceBank, channel, raw };
}

/**
 * Core Axis Bank Transaction Alert Parser.
 */
export function parseAxisCreditAlert(email: RawEmailInput): ParsedAxisAlert | null {
  const subject = email.subject || "";
  const content = [email.text || "", email.html ? stripHtml(email.html) : ""].join("\n");

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
  // Subject pattern: 'INR 1.00 was credited to your A/c.'
  // Body pattern: 'Amount Credited: INR 1.00' or 'INR 180.00'
  let amountStr = "";
  const subAmtMatch = subject.match(/(?:INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (subAmtMatch) {
    amountStr = subAmtMatch[1];
  } else {
    const bodyAmtMatch = content.match(/Amount\s*Credited\s*:?\s*(?:INR|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i) ||
      content.match(/(?:INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:was|has been)?\s*credited/i);
    if (bodyAmtMatch) {
      amountStr = bodyAmtMatch[1];
    }
  }

  if (!amountStr) {
    return null; // Amount is mandatory
  }

  const numericAmount = parseFloat(amountStr.replace(/,/g, ""));
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return null;
  }
  const amountPaise = Math.round(numericAmount * 100);

  // 3. Extract Receiving Account Suffix
  // Observed pattern: 'Account Number: XX1995' or 'A/c XX1995' or 'ending in 1995'
  let accountSuffix = "";
  const accMatch = content.match(/Account\s*Number\s*:?\s*(?:X+|[*\s]+)?(\d{4})/i) ||
    content.match(/A\/c\s*(?:no\.?)?\s*(?:X+|[*\s]+)?(\d{4})/i) ||
    content.match(/(?:XX|ending in\s*)(\d{4})/i);

  if (accMatch) {
    accountSuffix = accMatch[1];
  } else {
    // If not found in body, check subject or fallback
    const subAccMatch = subject.match(/(?:A\/c|account)[\s.]*(?:XX)?(\d{4})/i);
    if (subAccMatch) accountSuffix = subAccMatch[1];
  }

  // 4. Extract Date & Time
  // Observed: 'Date & Time: 02-11-26, 00:14:02 IST'
  let transactionTime: string | null = null;
  const dateMatch = content.match(/Date\s*(?:&|and)?\s*Time\s*:?\s*([0-9\-/]+,?\s+[0-9:]+(?:\s*IST)?)/i);
  if (dateMatch) {
    transactionTime = parseAxisTimestamp(dateMatch[1]);
  }
  if (!transactionTime && email.date) {
    const d = new Date(email.date);
    if (!isNaN(d.getTime())) transactionTime = d.toISOString();
  }
  if (!transactionTime) {
    transactionTime = new Date().toISOString();
  }

  // 5. Extract Transaction Info / Reference / UTR
  // Observed: 'Transaction Info: UPI/P2A/630722119955/VIKASH S/IOBA/UPI'
  let rawTxnInfo = "";
  const txnInfoMatch = content.match(/Transaction\s*Info\s*:?\s*(UPI\/[^\r\n<]+)/i) ||
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
  const auth = verifyEmailAuthentication({
    ...email.headers,
    from: email.from,
  });

  // 7. Auto-reconcile eligibility evaluation
  let isEligibleForAutoReconcile = true;
  let rejectionReason: string | undefined;

  if (auth.status === "untrusted" || auth.status === "forged") {
    isEligibleForAutoReconcile = false;
    rejectionReason = `Email failed sender/cryptographic authentication (${auth.status})`;
  } else if (accountSuffix && accountSuffix !== UPI_CONFIG.RECEIVING_ACCOUNT_SUFFIX) {
    isEligibleForAutoReconcile = false;
    rejectionReason = `Receiving account XX${accountSuffix} does not match expected CSC account XX${UPI_CONFIG.RECEIVING_ACCOUNT_SUFFIX}`;
  } else if (!utr || utr.length < 6) {
    isEligibleForAutoReconcile = false;
    rejectionReason = "Missing or malformed UTR/payment reference";
  }

  return {
    bank: "AXIS_BANK",
    direction: "CREDIT",
    currency: "INR",
    amountPaise,
    receivingAccountSuffix: accountSuffix || UPI_CONFIG.RECEIVING_ACCOUNT_SUFFIX,
    transactionTime,
    transactionChannel: channel,
    utr,
    payerName: payerName || undefined,
    sourceBank: sourceBank || undefined,
    transactionInfoRaw: rawTxnInfo || `UPI/${utr}`,
    sender: email.from,
    subject,
    messageId: email.messageId || `gen-${utr}-${Date.now()}`,
    auth,
    isEligibleForAutoReconcile,
    rejectionReason,
  };
}
