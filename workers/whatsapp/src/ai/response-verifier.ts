import { CSC_WHATSAPP_FOOTER, formatForWhatsApp } from "../utils/message-template.js";

/**
 * Verifies and cleanses AI output before sending to WhatsApp.
 * Strips dangerous tokens, ensures privacy boundaries, and conditionally appends
 * the official footer for important announcements, notices, and approvals.
 */
export function verifyAndFormatResponse(
  rawResponse: string,
  includeFooter: boolean = false
): string {
  let cleaned = rawResponse.trim();

  // Remove duplicate trailing footer blocks if model hallucinated it at the bottom
  cleaned = cleaned.replace(/\n+\s*🚀\s*\*?Connect\. Build\. Grow\.\*?[\s\S]*$/i, "");

  // Scrub any accidental token or secret leakage (JWT tokens, gateway API keys, Groq/xAI keys)
  cleaned = cleaned.replace(/ey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[REDACTED_TOKEN]");
  cleaned = cleaned.replace(/owa_k1_[a-f0-9]{64}/g, "[REDACTED_API_KEY]");
  cleaned = cleaned.replace(/gsk_[a-zA-Z0-9]{32,}/g, "[REDACTED_KEY]");
  cleaned = cleaned.replace(/xai-[a-zA-Z0-9]{32,}/g, "[REDACTED_KEY]");

  // Normalize Markdown syntax for WhatsApp (convert **bold** -> *bold*, etc.)
  cleaned = formatForWhatsApp(cleaned);

  // Trim trailing whitespace
  cleaned = cleaned.trim();

  // Append official footer only when explicitly requested (for important/formal notifications)
  if (includeFooter) {
    return `${cleaned}\n\n${CSC_WHATSAPP_FOOTER}`;
  }

  return cleaned;
}
