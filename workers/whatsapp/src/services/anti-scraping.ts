import type { Redis } from "ioredis";
import { logger } from "../utils/logger.js";
import { getSupabase } from "./live-queries.js";

const SCRAPING_PATTERNS = [
  /\b(give me all|list all|dump|export|fetch all|download)\b.*\b(emails?|phones?|contacts?|members?|founders?|database|attendees?)\b/i,
  /\b(every email|every phone|all member numbers?|database dump|download member data)\b/i,
  /\b(select\s+\*\s+from|drop\s+table|insert\s+into|union\s+select)\b/i,
  /\b(scrape|harvest|extract|leak)\b.*\b(members?|directory|contacts?)\b/i,
];

export interface AntiScrapingResult {
  isMalicious: boolean;
  reason?: string;
  securityNotice?: string;
}

/**
 * Inspects incoming message for bulk scraping and unauthorized harvesting attempts.
 */
export async function detectScrapingAttempt(
  redis: Redis | null,
  phone: string,
  messageText: string
): Promise<AntiScrapingResult> {
  const text = messageText.toLowerCase().trim();

  // 1. Check if sender is currently flagged for security restriction in Redis
  if (redis) {
    try {
      const isRestricted = await redis.get(`security:restricted:${phone}`);
      if (isRestricted) {
        return {
          isMalicious: true,
          reason: "Sender under active security quarantine",
          securityNotice:
            "⚠️ *Access Restricted:* Your account has been temporarily restricted due to policy violations. Contact support at https://csc.logicintelligencetechnologies.in/contact for assistance.",
        };
      }
    } catch (e) {
      logger.error("Redis security check failed", { error: e });
    }
  }

  // 2. Pattern Matching against scraping signatures
  for (const pattern of SCRAPING_PATTERNS) {
    if (pattern.test(text)) {
      logger.warn("Anti-scraping honeypot triggered!", { phone, query: text });

      // Quarantine sender for 1 hour (3600 seconds)
      if (redis) {
        try {
          await redis.set(`security:restricted:${phone}`, "scraping_attempt", "EX", 3600);
        } catch {}
      }

      // Log incident into database audit
      try {
        const sb = getSupabase();
        await sb.from("audit_logs").insert({
          action: "security.anti_scraping_triggered",
          actor_email: `${phone}@whatsapp.user`,
          target_id: phone,
          target_type: "whatsapp_security",
          metadata: { query: messageText, timestamp: new Date().toISOString() },
        });
      } catch {}

      return {
        isMalicious: true,
        reason: "Bulk member data extraction attempt",
        securityNotice:
          "🛡️ *Security Warning:* Systematic harvesting of community member contacts is strictly forbidden by CSC Circle privacy guidelines. Your session has been restricted. You may only view your own verified membership credentials.",
      };
    }
  }

  return { isMalicious: false };
}
