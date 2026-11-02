// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  formatUpiAmount,
  formatTransactionNote,
  buildUpiPayload,
  buildUpiUri,
  buildAndroidIntentUri,
  getUpiAppLinks,
  buildPaymentDeepLinks,
  detectUpiPlatform,
  detectPlatform,
  isPayerNameAligned,
  ANDROID_UPI_PACKAGES,
} from "@/lib/payments/upi";
import { UPI_CONFIG } from "@/lib/payments/config";

describe("Challenger M4.1: Adversarial Stress Testing (F17 & F18)", () => {
  // ============================================================================
  // Suite 1: formatUpiAmount & Financial Precision
  // ============================================================================
  describe("Suite 1: formatUpiAmount & Financial Precision", () => {
    it("handles float injection with repeating 9s (180.14999999999 -> 180.15)", () => {
      const formatted = formatUpiAmount(180.14999999999);
      expect(formatted).toBe("180.15");
    });

    it("mitigates IEEE 754 precision drift (0.1 + 0.2 -> 0.30)", () => {
      const sum = 0.1 + 0.2; // 0.30000000000000004
      expect(formatUpiAmount(sum)).toBe("0.30");
    });

    it("rounds fraction boundaries correctly to nearest integer paise", () => {
      expect(formatUpiAmount(180.004)).toBe("180.00");
      expect(formatUpiAmount(180.005)).toBe("180.01");
      expect(formatUpiAmount(180.006)).toBe("180.01");
      expect(formatUpiAmount(49.999)).toBe("50.00");
      expect(formatUpiAmount(49.991)).toBe("49.99");
    });

    it("formats large financial amounts without exponent notation", () => {
      expect(formatUpiAmount(999999.994)).toBe("999999.99");
      expect(formatUpiAmount(999999.995)).toBe("1000000.00");
      expect(formatUpiAmount(2500000.5)).toBe("2500000.50");
    });

    it("gives strict precedence to amountPaise over amountRupees", () => {
      // Even if amountRupees is 100.00, amountPaise of 25050 must produce 250.50
      const formatted = formatUpiAmount(100.0, 25050);
      expect(formatted).toBe("250.50");
    });

    it("formats canonical integer paise directly", () => {
      expect(formatUpiAmount(undefined, 1)).toBe("0.01");
      expect(formatUpiAmount(undefined, 10)).toBe("0.10");
      expect(formatUpiAmount(undefined, 100)).toBe("1.00");
      expect(formatUpiAmount(undefined, 18000)).toBe("180.00");
      expect(formatUpiAmount(undefined, 45050)).toBe("450.50");
    });

    it("throws RangeError on negative amountRupees", () => {
      expect(() => formatUpiAmount(-0.01)).toThrow(RangeError);
      expect(() => formatUpiAmount(-1)).toThrow(RangeError);
      expect(() => formatUpiAmount(-180.0)).toThrow(RangeError);
      expect(() => formatUpiAmount(-100000)).toThrow(/amountRupees must be non-negative/);
    });

    it("throws RangeError on negative amountPaise", () => {
      expect(() => formatUpiAmount(undefined, -1)).toThrow(RangeError);
      expect(() => formatUpiAmount(undefined, -100)).toThrow(RangeError);
      expect(() => formatUpiAmount(180, -500)).toThrow(/amountPaise must be non-negative/);
    });

    it("formats zero amounts strictly as 0.00", () => {
      expect(formatUpiAmount(0)).toBe("0.00");
      expect(formatUpiAmount(undefined, 0)).toBe("0.00");
      expect(formatUpiAmount(0.0)).toBe("0.00");
      expect(formatUpiAmount(undefined, undefined)).toBe("0.00");
      expect(formatUpiAmount()).toBe("0.00");
    });

    it("handles non-finite amounts gracefully without NaN or Infinity string", () => {
      expect(formatUpiAmount(Number.NaN)).toBe("0.00");
      expect(formatUpiAmount(Number.POSITIVE_INFINITY)).toBe("0.00");
      expect(formatUpiAmount(Number.NEGATIVE_INFINITY)).toBe("0.00");
      expect(formatUpiAmount(undefined, Number.NaN)).toBe("0.00");
    });
  });

  // ============================================================================
  // Suite 2: buildUpiPayload & Parameter Injection Defense
  // ============================================================================
  describe("Suite 2: buildUpiPayload & Parameter Injection Defense", () => {
    it("prevents query parameter pollution via injected ampersand and equals signs in orderReference", () => {
      const payload = buildUpiPayload({
        vpa: "test@upi",
        payeeName: "Test Payee",
        amountRupees: 180.0,
        orderReference: "CSC-ORD-123&am=0.01&pa=evil@upi&mode=99",
        eventTitle: "Clean Event",
      });

      // The payload must not contain raw injected parameters
      expect(payload).toContain("tr=CSC-ORD-123%26am%3D0.01%26pa%3Devil%40upi%26mode%3D99");

      // Parse with URL to ensure no parameter pollution
      const url = new URL(payload);
      expect(url.searchParams.get("pa")).toBe("test@upi");
      expect(url.searchParams.get("am")).toBe("180.00");
      expect(url.searchParams.get("mode")).toBe("02");
      expect(url.searchParams.get("tr")).toBe("CSC-ORD-123&am=0.01&pa=evil@upi&mode=99");
      expect(url.searchParams.getAll("am")).toHaveLength(1);
      expect(url.searchParams.getAll("pa")).toHaveLength(1);
    });

    it("prevents CRLF header injection in payeeName and eventTitle", () => {
      const maliciousPayee = "Legit Name\r\nBcc: victim@example.com\r\nSet-Cookie: stolen=1";
      const maliciousTitle = "Normal Event\r\n&pa=attacker@ybl\n";

      const payload = buildUpiPayload({
        payeeName: maliciousPayee,
        orderReference: "CSC-ORD-SAFE123",
        eventTitle: maliciousTitle,
      });

      expect(payload).not.toContain("\r");
      expect(payload).not.toContain("\n");
      expect(payload).toContain("pn=Legit%20Name%0D%0ABcc%3A%20victim%40example.com%0D%0ASet-Cookie%3A%20stolen%3D1");

      const url = new URL(payload);
      expect(url.searchParams.get("pn")).toBe(maliciousPayee);
      expect(url.searchParams.get("pa")).toBe(UPI_CONFIG.PAYEE_VPA);
    });

    it("safely encodes special quotes, brackets, and XSS injection vectors", () => {
      const xssVector = `Test <script>alert("pwned")</script> ' OR '1'='1`;
      const payload = buildUpiPayload({
        orderReference: "CSC-ORD-XSS1234",
        eventTitle: xssVector,
      });

      expect(payload).not.toContain("<script>");
      expect(payload).not.toContain('"');

      const url = new URL(payload);
      const note = url.searchParams.get("tn");
      expect(note).toContain("Test <script>alert(");
    });

    it("throws RangeError when negative amount is passed into buildUpiPayload", () => {
      expect(() =>
        buildUpiPayload({
          amountRupees: -50,
          orderReference: "CSC-ORD-NEG1",
          eventTitle: "Negative Event",
        })
      ).toThrow(RangeError);
    });

    it("throws RangeError when negative amount is passed into buildUpiUri", () => {
      expect(() =>
        buildUpiUri({
          amountRupees: -50,
          orderReference: "CSC-ORD-NEG2",
          eventTitle: "Negative Event",
        })
      ).toThrow(RangeError);
    });

    it("defaults to UPI_CONFIG payee VPA and legal payee name when omitted", () => {
      const payload = buildUpiPayload({
        amountRupees: 180.0,
        orderReference: "CSC-ORD-DEFAULT1",
        eventTitle: "Default Payee Test",
      });

      const url = new URL(payload);
      expect(url.searchParams.get("pa")).toBe(UPI_CONFIG.PAYEE_VPA);
      expect(url.searchParams.get("pn")).toBe(UPI_CONFIG.PAYEE_NAME);
      expect(url.searchParams.get("cu")).toBe("INR");
      expect(url.searchParams.get("mode")).toBe("02");
      expect(url.searchParams.get("orgid")).toBe("000000");
    });

    it("includes optional merchant category code and digital signature when provided", () => {
      const payload = buildUpiPayload({
        amountRupees: 180.0,
        orderReference: "CSC-ORD-OPT1",
        eventTitle: "Optional Params",
        merchantCategoryCode: "8299",
        signature: "DIGITAL_SIG_ABC123==",
      });

      const url = new URL(payload);
      expect(url.searchParams.get("mc")).toBe("8299");
      expect(url.searchParams.get("sign")).toBe("DIGITAL_SIG_ABC123==");
    });
  });

  // ============================================================================
  // Suite 3: Transaction Note Truncation & UTF-8 Character Integrity
  // ============================================================================
  describe("Suite 3: Transaction Note Truncation & UTF-8 Character Integrity", () => {
    it("cleanly truncates event titles longer than 30 characters", () => {
      const longTitle = "123456789012345678901234567890EXTRA_CHARS_HERE";
      const note = formatTransactionNote(longTitle);
      expect(note).toBe("Pass for 123456789012345678901234567890");
      expect(note.length).toBe(9 + 30); // "Pass for " (9) + 30 chars
    });

    it("preserves event titles with exactly 30 characters without truncation", () => {
      const exactTitle = "123456789012345678901234567890";
      const note = formatTransactionNote(exactTitle);
      expect(note).toBe("Pass for 123456789012345678901234567890");
    });

    it("preserves short event titles", () => {
      const shortTitle = "CSC Gala";
      const note = formatTransactionNote(shortTitle);
      expect(note).toBe("Pass for CSC Gala");
    });

    it("handles empty event title cleanly", () => {
      const note = formatTransactionNote("");
      expect(note).toBe("Pass for ");
    });

    it("handles multi-byte Tamil characters in event title safely", () => {
      const tamilTitle = "தமிழ்நாடு ஸ்டார்ட்அப் திருவிழா 2026 கோயம்புத்தூர்";
      const note = formatTransactionNote(tamilTitle);
      expect(note.startsWith("Pass for ")).toBe(true);

      const payload = buildUpiPayload({
        orderReference: "CSC-ORD-TAMIL1",
        eventTitle: tamilTitle,
      });

      const url = new URL(payload);
      const decodedNote = url.searchParams.get("tn");
      expect(decodedNote).toBe(note);
      expect(decodedNote).toContain("தமிழ்நாடு");
    });

    it("handles multi-byte Devanagari (Hindi) characters safely", () => {
      const hindiTitle = "स्टार्टअप सम्मलेन 2026 भारत";
      const payload = buildUpiPayload({
        orderReference: "CSC-ORD-HINDI1",
        eventTitle: hindiTitle,
      });

      const url = new URL(payload);
      expect(url.searchParams.get("tn")).toBe(`Pass for ${hindiTitle}`);
    });

    it("handles multi-byte Japanese characters safely", () => {
      const jpTitle = "スタートアップ・コミュニティ・サミット2026";
      const payload = buildUpiPayload({
        orderReference: "CSC-ORD-JP1",
        eventTitle: jpTitle,
      });

      const url = new URL(payload);
      expect(url.searchParams.get("tn")).toBe(`Pass for ${jpTitle}`);
    });

    it("handles German umlauts and accents safely", () => {
      const deTitle = "Gründer Treffen Übergröße Café 2026";
      const payload = buildUpiPayload({
        orderReference: "CSC-ORD-DE1",
        eventTitle: deTitle,
      });

      const url = new URL(payload);
      expect(url.searchParams.get("tn")).toBe(formatTransactionNote(deTitle));
    });

    it("handles emoji within boundary without corrupting URL encoding", () => {
      const emojiTitle = "Startup Rocket 🚀 Launch 2026";
      const payload = buildUpiPayload({
        orderReference: "CSC-ORD-EMOJI1",
        eventTitle: emojiTitle,
      });

      const url = new URL(payload);
      expect(url.searchParams.get("tn")).toBe(`Pass for ${emojiTitle}`);
    });

    it("handles emoji beyond the 30-character boundary safely", () => {
      const longTitleWithEmoji = "A".repeat(30) + "🚀🎉";
      const note = formatTransactionNote(longTitleWithEmoji);
      expect(note).toBe(`Pass for ${"A".repeat(30)}`);

      const payload = buildUpiPayload({
        orderReference: "CSC-ORD-EMOJI2",
        eventTitle: longTitleWithEmoji,
      });

      const url = new URL(payload);
      expect(url.searchParams.get("tn")).toBe(note);
    });
  });

  // ============================================================================
  // Suite 4: Platform Detection & User-Agent Spoofing
  // ============================================================================
  describe("Suite 4: Platform Detection & User-Agent Spoofing", () => {
    const ANDROID_UA_SAMPLES = [
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36",
      "Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0",
      "Mozilla/5.0 (Linux; U; Android 12; en-US; Redmi Note 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 UCBrowser/13.4.0.1306 Mobile Safari/537.36",
    ];

    const IOS_UA_SAMPLES = [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.8 Mobile/15E148 Safari/604.1",
    ];

    const DESKTOP_UA_SAMPLES = [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
      "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    ];

    const BOT_UA_SAMPLES = [
      "Googlebot/2.1 (+http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "curl/8.4.0",
      "python-requests/2.31.0",
    ];

    it("correctly identifies all Android mobile devices", () => {
      for (const ua of ANDROID_UA_SAMPLES) {
        expect(detectUpiPlatform(ua)).toBe("android");
        const details = detectPlatform(ua);
        expect(details.platform).toBe("android");
        expect(details.isAndroid).toBe(true);
        expect(details.isIos).toBe(false);
        expect(details.isDesktop).toBe(false);
        expect(details.isMobile).toBe(true);
      }
    });

    it("correctly identifies all iOS devices (iPhone, iPad, iPod)", () => {
      for (const ua of IOS_UA_SAMPLES) {
        expect(detectUpiPlatform(ua)).toBe("ios");
        const details = detectPlatform(ua);
        expect(details.platform).toBe("ios");
        expect(details.isAndroid).toBe(false);
        expect(details.isIos).toBe(true);
        expect(details.isDesktop).toBe(false);
        expect(details.isMobile).toBe(true);
      }
    });

    it("correctly identifies desktop browsers as desktop platform", () => {
      for (const ua of DESKTOP_UA_SAMPLES) {
        expect(detectUpiPlatform(ua)).toBe("desktop");
        const details = detectPlatform(ua);
        expect(details.platform).toBe("desktop");
        expect(details.isAndroid).toBe(false);
        expect(details.isIos).toBe(false);
        expect(details.isDesktop).toBe(true);
        expect(details.isMobile).toBe(false);
      }
    });

    it("defaults unknown bots, crawlers, and empty strings safely to desktop", () => {
      for (const ua of BOT_UA_SAMPLES) {
        expect(detectUpiPlatform(ua)).toBe("desktop");
        expect(detectPlatform(ua).isDesktop).toBe(true);
      }
      expect(detectUpiPlatform("")).toBe("desktop");
      expect(detectUpiPlatform(undefined)).toBe("desktop");
    });
  });

  // ============================================================================
  // Suite 5: Android Intent URI & App Deep Links Verification
  // ============================================================================
  describe("Suite 5: Android Intent URI & App Deep Links Verification", () => {
    it("generates valid Android Chrome Intent URI with scheme=upi;end;", () => {
      const upiUri = buildUpiUri({
        vpa: "test@upi",
        amountRupees: 180.0,
        orderReference: "CSC-ORD-INTENT1",
        eventTitle: "Intent Test",
      });

      const intentUri = buildAndroidIntentUri(upiUri);
      expect(intentUri.startsWith("intent://pay?")).toBe(true);
      expect(intentUri.endsWith("#Intent;scheme=upi;end;")).toBe(true);
      expect(intentUri).toContain("pa=test%40upi");
      expect(intentUri).toContain("am=180.00");
    });

    it("appends package parameter correctly for targeted Android apps", () => {
      const upiUri = "upi://pay?pa=test@upi&am=180.00";
      const gpayIntent = buildAndroidIntentUri(upiUri, ANDROID_UPI_PACKAGES.GPAY);
      expect(gpayIntent).toBe(
        `intent://pay?pa=test@upi&am=180.00#Intent;scheme=upi;package=${ANDROID_UPI_PACKAGES.GPAY};end;`
      );

      const phonepeIntent = buildAndroidIntentUri(upiUri, ANDROID_UPI_PACKAGES.PHONEPE);
      expect(phonepeIntent).toBe(
        `intent://pay?pa=test@upi&am=180.00#Intent;scheme=upi;package=${ANDROID_UPI_PACKAGES.PHONEPE};end;`
      );

      const paytmIntent = buildAndroidIntentUri(upiUri, ANDROID_UPI_PACKAGES.PAYTM);
      expect(paytmIntent).toBe(
        `intent://pay?pa=test@upi&am=180.00#Intent;scheme=upi;package=${ANDROID_UPI_PACKAGES.PAYTM};end;`
      );

      const bhimIntent = buildAndroidIntentUri(upiUri, ANDROID_UPI_PACKAGES.BHIM);
      expect(bhimIntent).toBe(
        `intent://pay?pa=test@upi&am=180.00#Intent;scheme=upi;package=${ANDROID_UPI_PACKAGES.BHIM};end;`
      );
    });

    it("handles non-upi://pay URI input in buildAndroidIntentUri without corruption", () => {
      const malformed = "https://example.com/not-upi";
      const intentUri = buildAndroidIntentUri(malformed);
      expect(intentUri).toBe("intent://pay?#Intent;scheme=upi;end;");
    });

    it("generates app links preserving query parameters exactly across all schemes", () => {
      const upiUri = buildUpiPayload({
        vpa: "payee@axisbank",
        payeeName: "Coimbatore Startup Community",
        amountRupees: 250.0,
        orderReference: "CSC-ORD-PRESERVE1",
        eventTitle: "Annual Gala",
      });

      const links = getUpiAppLinks(upiUri);
      const query = upiUri.slice("upi://pay?".length);

      expect(links.standardUpi).toBe(upiUri);
      expect(links.gpay).toBe(`gpay://upi/pay?${query}`);
      expect(links.phonepe).toBe(`phonepe://pay?${query}`);
      expect(links.paytm).toBe(`paytmmp://pay?${query}`);
      expect(links.bhim).toBe(`bhim://pay?${query}`);
      expect(links.androidIntent).toBe(`intent://pay?${query}#Intent;scheme=upi;end;`);

      // Verify alias buildPaymentDeepLinks is identical
      const aliasLinks = buildPaymentDeepLinks(upiUri);
      expect(aliasLinks).toEqual(links);
    });
  });

  // ============================================================================
  // Suite 6: Payer Name Alignment (isPayerNameAligned) Adversarial Testing
  // ============================================================================
  describe("Suite 6: Payer Name Alignment (isPayerNameAligned) Adversarial Testing", () => {
    it("matches exact and reversed names with multiple tokens", () => {
      expect(isPayerNameAligned("VIKASH S", "S VIKASH")).toBe(true);
      expect(isPayerNameAligned("SARAVANAN VIKASH", "VIKASH SARAVANAN")).toBe(true);
    });

    it("matches names ignoring honorifics, titles, and punctuation", () => {
      expect(isPayerNameAligned("MR. VIKASH S.", "VIKASH S")).toBe(true);
      expect(isPayerNameAligned("DR. SHANMUGAM R", "Shanmugam")).toBe(true);
      expect(isPayerNameAligned("M/S COIMBATORE STARTUP", "Coimbatore Startup")).toBe(true);
    });

    it("ignores single-character initials and short noise words (length <= 2)", () => {
      // Single character initials must not trigger false positive matches
      expect(isPayerNameAligned("A B", "A C")).toBe(false);
      // 2-letter tokens should not match (e.g. "AN", "MR")
      expect(isPayerNameAligned("AN KUMAR", "AN SINGH")).toBe(false);
    });

    it("rejects non-overlapping and completely different names", () => {
      expect(isPayerNameAligned("RAMESH CHANDRA", "SURESH VERMA")).toBe(false);
      expect(isPayerNameAligned("HACKER ATTACKER", "VIKASH S")).toBe(false);
    });

    it("rejects empty, null, undefined, and whitespace-only strings safely", () => {
      expect(isPayerNameAligned(null, "Vikash")).toBe(false);
      expect(isPayerNameAligned("Vikash", null)).toBe(false);
      expect(isPayerNameAligned(null, null)).toBe(false);
      expect(isPayerNameAligned(undefined, undefined)).toBe(false);
      expect(isPayerNameAligned("", "")).toBe(false);
      expect(isPayerNameAligned("   ", "   ")).toBe(false);
      expect(isPayerNameAligned("...", "---")).toBe(false);
    });
  });
});
