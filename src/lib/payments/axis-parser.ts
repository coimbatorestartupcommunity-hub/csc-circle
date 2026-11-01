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
