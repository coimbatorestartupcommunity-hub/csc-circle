/**
 * Configuration and constants for the CSC Circle Custom UPI Payment & Axis Bank Verification.
 */

export const UPI_CONFIG = {
  // Verified payee details from supplied QR
  PAYEE_VPA: "9342877474@ptyes",
  PAYEE_NAME: "S VIKASH",
  CURRENCY: "INR",

  // Receiving bank account details from genuine Axis Bank alert
  RECEIVING_BANK: "AXIS_BANK",
  RECEIVING_ACCOUNT_SUFFIX: "1995",

  // Bank alert email source
  BANK_ALERT_SENDER: "alerts@axis.bank.in",
  MAILBOX_ADDRESS: "vikash752008@icloud.com",

  // Default order expiration window (minutes)
  ORDER_EXPIRY_MINUTES: 30,

  // Maximum order time window for matching bank alerts (e.g. 2 hours)
  MATCH_TIME_WINDOW_MS: 2 * 60 * 60 * 1000,
} as const;

export const ICLOUD_IMAP_DEFAULTS = {
  host: process.env.ICLOUD_IMAP_HOST || "imap.mail.me.com",
  port: Number(process.env.ICLOUD_IMAP_PORT || 993),
  username: process.env.ICLOUD_IMAP_USERNAME || "vikash752008@icloud.com",
  password: process.env.ICLOUD_IMAP_APP_PASSWORD || "",
  secure: true,
} as const;

export function getImapConfig() {
  const host = process.env.ICLOUD_IMAP_HOST || ICLOUD_IMAP_DEFAULTS.host;
  const port = Number(process.env.ICLOUD_IMAP_PORT || ICLOUD_IMAP_DEFAULTS.port);
  const username = process.env.ICLOUD_IMAP_USERNAME || ICLOUD_IMAP_DEFAULTS.username;
  const password = process.env.ICLOUD_IMAP_APP_PASSWORD || "";

  return {
    host,
    port,
    username,
    password,
    secure: true,
    isConfigured: Boolean(password && username),
  };
}
