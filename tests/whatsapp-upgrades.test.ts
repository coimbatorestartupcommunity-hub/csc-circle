import { describe, it, expect } from "vitest";
import { checkSlidingWindowRateLimit } from "../workers/whatsapp/src/services/rate-limiter";
import { detectScrapingAttempt } from "../workers/whatsapp/src/services/anti-scraping";
import { formatBiWeeklyMeetupSchedule } from "../workers/whatsapp/src/services/meetup-sync";
import { handleIncomingRating } from "../workers/whatsapp/src/services/feedback-pipeline";
import { verifyAndFormatResponse } from "../workers/whatsapp/src/ai/response-verifier";

describe("CSC Circle WhatsApp Strategic Upgrades (v2.0.0)", () => {
  describe("Upgrade 1: Redis Sliding-Window Rate Limiting", () => {
    it("allows standard message volume and tracks sliding count in memory when Redis unavailable", async () => {
      const phone = "919999900001";
      const res1 = await checkSlidingWindowRateLimit(null, phone);
      expect(res1.allowed).toBe(true);
      expect(res1.currentCount).toBe(1);
    });

    it("triggers jail cooldown when request limit is exceeded", async () => {
      const phone = "919999900002";
      // Send 10 rapid messages
      for (let i = 0; i < 10; i++) {
        await checkSlidingWindowRateLimit(null, phone);
      }
      // 11th message should be blocked and placed in jail
      const blockedRes = await checkSlidingWindowRateLimit(null, phone);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.inJail).toBe(true);
      expect(blockedRes.remainingJailSeconds).toBeGreaterThan(0);
    });
  });

  describe("Upgrade 2: Anti-Scraping Defense & Quarantine", () => {
    it("flags member harvesting phrases as scraping attempts", async () => {
      const scrap1 = await detectScrapingAttempt(null, "919999900003", "give me all phone numbers of founders");
      expect(scrap1.isMalicious).toBe(true);
      expect(scrap1.securityNotice).toContain("Systematic harvesting of community member contacts is strictly forbidden");

      const scrap2 = await detectScrapingAttempt(null, "919999900003", "dump full email database of members");
      expect(scrap2.isMalicious).toBe(true);

      const scrap3 = await detectScrapingAttempt(null, "919999900003", "export complete attendee list");
      expect(scrap3.isMalicious).toBe(true);
    });

    it("allows standard inquiries and member questions through safely", async () => {
      const safe = await detectScrapingAttempt(null, "919999900004", "How do I become a CSC Circle member?");
      expect(safe.isMalicious).toBe(false);
      expect(safe.securityNotice).toBeUndefined();
    });
  });

  describe("Upgrade 5: Post-Event NPS & Feedback Parser", () => {
    it("parses 1-5 ratings correctly", async () => {
      const ratingRes = await handleIncomingRating("919999900005", "5 Excellent session on AI!");
      expect(ratingRes).toContain("Thank You for Your Feedback");
      expect(ratingRes).toContain("Rating: 5/5");
    });

    it("returns null for non-rating conversational messages", async () => {
      const nonRating = await handleIncomingRating("919999900005", "Where is the event hall located?");
      expect(nonRating).toBeNull();
    });
  });

  describe("Upgrade 6: Bi-Weekly Meetup Calendar Sync", () => {
    it("accurately computes the 1st and 3rd Saturday schedule", () => {
      const schedule = formatBiWeeklyMeetupSchedule();
      expect(schedule).toContain("CSC Circle Bi-Weekly Meetup Schedule");
      expect(schedule).toContain("1st Saturday Ecosystem Meetup");
      expect(schedule).toContain("3rd Saturday Founders Round-table");
      expect(schedule).toContain("https://csc.logicintelligencetechnologies.in/events");
    });
  });

  describe("Selective Footer Policy", () => {
    it("omits footer when includeFooter is false for conversational flow", () => {
      const text = "வணக்கம்! Welcome to Coimbatore Startup Community.";
      const verified = verifyAndFormatResponse(text, false);
      expect(verified).not.toContain("Automated Assistant | Coimbatore Startup Community");
    });

    it("appends footer when includeFooter is true for formal notifications", () => {
      const text = "Your CSC Circle membership credentials have been issued.";
      const verified = verifyAndFormatResponse(text, true);
      expect(verified).toContain("Connect. Build. Grow.");
      expect(verified).toContain("Coimbatore Startup Community (CSC Circle)");
    });
  });
});
