// @vitest-environment node
import { describe, it, expect } from "vitest";
import { verifyEmailAuthentication } from "@/lib/payments/email-auth";
import { parseAxisCreditAlert, parseAxisTimestamp, parseTransactionInfo } from "@/lib/payments/axis-parser";
import {
  generateGuestCheckoutToken,
  hashGuestToken,
  verifyOrderAccess,
} from "@/lib/payments/orders";

describe("Payment Security & Cryptographic Verification", () => {
  describe("Guest Capability Token Security", () => {
    it("verifies order access with matching guest token and rejects forged tokens", () => {
      const token = generateGuestCheckoutToken();
      const hash = hashGuestToken(token);

      const order = {
        user_id: null,
        guest_token_hash: hash,
      };

      // Exact token matches
      expect(verifyOrderAccess(order, null, token)).toBe(true);

      // Wrong token fails
      expect(verifyOrderAccess(order, null, "wrong-token-abc-123")).toBe(false);

      // Missing token fails
      expect(verifyOrderAccess(order, null, null)).toBe(false);
      expect(verifyOrderAccess(order, null, "")).toBe(false);
    });

    it("allows registered user to access their own order regardless of guest token", () => {
      const userA = "11111111-1111-4111-8111-111111111111";
      const userB = "22222222-2222-4222-8222-222222222222";
      const order = {
        user_id: userA,
        guest_token_hash: null,
      };

      expect(verifyOrderAccess(order, userA, null)).toBe(true);
      expect(verifyOrderAccess(order, userB, null)).toBe(false);
      expect(verifyOrderAccess(order, null, null)).toBe(false);
    });
  });

  describe("Email Provenance & Spoofing Defense", () => {
    it("authenticates legitimate Axis Bank alert through trusted Apple MTA", () => {
      const headers = {
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass (1024-bit key) header.d=axis.bank.in header.i=@axis.bank.in; spf=pass (mx.apple.com: domain of alerts@axis.bank.in designates 198.51.100.1 as permitted sender); dmarc=pass",
        "received-spf": "pass (mx.apple.com: domain of alerts@axis.bank.in designates 198.51.100.1 as permitted sender)",
      };

      const result = verifyEmailAuthentication(headers);
      expect(result.status).toBe("authenticated");
      expect(result.dkimPass).toBe(true);
      expect(result.spfPass).toBe(true);
      expect(result.senderMatches).toBe(true);
    });

    it("rejects attacker-forged Authentication-Results from untrusted MTA", () => {
      const headers = {
        from: "alerts@axis.bank.in",
        "authentication-results":
          "attacker-relay.evil.net; dkim=pass header.d=axis.bank.in; spf=pass",
      };

      const result = verifyEmailAuthentication(headers);
      expect(result.status).toBe("untrusted");
      expect(result.reasons.some((r) => r.includes("trusted Apple/iCloud"))).toBe(true);
    });

    it("flags explicit DKIM failure as forged", () => {
      const headers = {
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=fail (bad signature) header.d=axis.bank.in; spf=pass",
      };

      const result = verifyEmailAuthentication(headers);
      expect(result.status).toBe("forged");
      expect(result.reasons.some((r) => r.includes("failed"))).toBe(true);
    });

    it("rejects spoofed sender domain", () => {
      const headers = {
        from: "scammer@axis-bank-verify.fake",
        "authentication-results": "mx.apple.com; dkim=pass; spf=pass",
      };

      const result = verifyEmailAuthentication(headers);
      expect(result.status).toBe("untrusted");
      expect(result.senderMatches).toBe(false);
    });
  });

  describe("Axis Bank Parser & Timestamp Accuracy", () => {
    it("parses IST timestamps into exact ISO UTC strings", () => {
      // 02-11-26, 00:14:02 IST -> 2026-11-01T18:44:02.000Z
      const parsed = parseAxisTimestamp("02-11-26, 00:14:02 IST");
      expect(parsed).toBe("2026-11-01T18:44:02.000Z");
    });

    it("extracts 12-digit UTR, payee, and source bank from UPI slash format", () => {
      const raw = "UPI/P2A/630722119955/VIKASH S/IOBA/UPI";
      const info = parseTransactionInfo(raw);
      expect(info.utr).toBe("630722119955");
      expect(info.payerName).toBe("VIKASH S");
      expect(info.sourceBank).toBe("IOBA");
      expect(info.channel).toBe("UPI");
    });

    it("extracts complete alert attributes from real sample", () => {
      const email = {
        messageId: "<alert-12345@axis.bank.in>",
        subject: "INR 1.00 was credited to your A/c.",
        from: "alerts@axis.bank.in",
        headers: {
          from: "alerts@axis.bank.in",
          "authentication-results":
            "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass (mx.apple.com: permitted sender)",
        },
        text: `
          Dear Customer,
          INR 1.00 was credited to your A/c XX1995 on 02-11-26, 00:14:02 IST.
          Transaction Info: UPI/P2A/630722119955/VIKASH S/IOBA/UPI.
          Available Balance: INR 1,234.56.
        `,
      };

      const alert = parseAxisCreditAlert(email);
      expect(alert).not.toBeNull();
      expect(alert?.amountPaise).toBe(100);
      expect(alert?.receivingAccountSuffix).toBe("1995");
      expect(alert?.utr).toBe("630722119955");
      expect(alert?.payerName).toBe("VIKASH S");
      expect(alert?.isEligibleForAutoReconcile).toBe(true);
    });

    it("disqualifies alerts directed to wrong receiving account suffix", () => {
      const email = {
        messageId: "<alert-wrong-acc@axis.bank.in>",
        subject: "INR 180.00 was credited to your A/c.",
        from: "alerts@axis.bank.in",
        headers: {
          from: "alerts@axis.bank.in",
          "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        },
        text: "INR 180.00 was credited to your A/c XX8888 on 02-11-26, 00:14:02 IST. Transaction Info: UPI/P2A/630722119955/PAYER/IOBA/UPI",
      };

      const alert = parseAxisCreditAlert(email);
      expect(alert).not.toBeNull();
      expect(alert?.receivingAccountSuffix).toBe("8888");
      expect(alert?.isEligibleForAutoReconcile).toBe(false);
      expect(alert?.rejectionReason).toContain("does not match expected CSC account XX1995");
    });
  });
});
