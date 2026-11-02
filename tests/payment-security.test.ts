// @vitest-environment node
import { describe, it, expect } from "vitest";
import { verifyEmailAuthentication } from "@/lib/payments/email-auth";
import { parseAxisCreditAlert, parseAxisTimestamp, parseTransactionInfo, parseMimeEmail, decodeQuotedPrintable, decodeRfc2047 } from "@/lib/payments/axis-parser";
import {
  generateGuestCheckoutToken,
  hashGuestToken,
  verifyOrderAccess,
  isPayerNameAligned,
  parseAttendeeList,
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

  describe("Payment Attribution & Payer Alignment Security", () => {
    it("aligns payer names across different word orders and casing", () => {
      expect(isPayerNameAligned("VIKASH S", "S Vikash")).toBe(true);
      expect(isPayerNameAligned("RAMANATHAN K", "Ramanathan K")).toBe(true);
      expect(isPayerNameAligned("MR KARTHIK RAJAN", "Karthik Rajan")).toBe(true);
    });

    it("rejects attribution when payer name is completely disjoint", () => {
      expect(isPayerNameAligned("ALICE CHEN", "Bob Smith")).toBe(false);
      expect(isPayerNameAligned("MALLORY ATTACKER", "Vikash S")).toBe(false);
      expect(isPayerNameAligned(null, "Vikash S")).toBe(false);
      expect(isPayerNameAligned("VIKASH S", null)).toBe(false);
    });
  });

  describe("MIME Parsing & Character Decoding", () => {
    it("decodes Quoted-Printable encoded bank alert content", () => {
      const qpRaw = "INR=20180.00=20was=20credited=20to=20your=20A/c=20XX1995";
      expect(decodeQuotedPrintable(qpRaw)).toBe("INR 180.00 was credited to your A/c XX1995");
    });

    it("decodes RFC 2047 encoded email subject headers", () => {
      const base64Subject = "=?utf-8?B?SU5SIDE4MC4wMCB3YXMgY3JlZGl0ZWQgdG8geW91ciBBL2Mu?=";
      expect(decodeRfc2047(base64Subject)).toBe("INR 180.00 was credited to your A/c.");
    });

    it("parses multipart/alternative MIME emails into clean text and html", () => {
      const mime = [
        "From: alerts@axis.bank.in",
        "Subject: =?utf-8?B?SU5SIDE4MC4wMCB3YXMgY3JlZGl0ZWQ=?=",
        "Content-Type: multipart/alternative; boundary=\"boundary_axis_123\"",
        "Message-ID: <axis-msg-999@axis.bank.in>",
        "",
        "--boundary_axis_123",
        "Content-Type: text/plain; charset=utf-8",
        "Content-Transfer-Encoding: quoted-printable",
        "",
        "INR=20180.00=20was=20credited=20to=20your=20A/c=20XX1995.",
        "Transaction Info: UPI/P2A/630799112233/VIKASH S/IOBA/UPI",
        "",
        "--boundary_axis_123",
        "Content-Type: text/html; charset=utf-8",
        "",
        "<html><body><p>INR 180.00 was credited to your A/c XX1995.</p></body></html>",
        "",
        "--boundary_axis_123--",
      ].join("\r\n");

      const parsed = parseMimeEmail(mime);
      expect(parsed.subject).toBe("INR 180.00 was credited");
      expect(parsed.from).toBe("alerts@axis.bank.in");
      expect(parsed.text).toContain("INR 180.00 was credited to your A/c XX1995.");
      expect(parsed.text).toContain("630799112233");
      expect(parsed.html).toContain("<p>INR 180.00 was credited to your A/c XX1995.</p>");
    });
  });

  describe("Group Pass Structure Guarantee", () => {
    it("guarantees exactly N passes for group bookings", () => {
      // 3 attendees with 1 extra name provided -> 1 primary + 1 named extra + 1 labeled guest
      const passes3 = parseAttendeeList("Vikash S", 3, "Karthik R");
      expect(passes3).toEqual(["Vikash S", "Karthik R", "Vikash S (Guest 3)"]);

      // 1 attendee -> 1 pass
      const pass1 = parseAttendeeList("Vikash S", 1, null);
      expect(pass1).toEqual(["Vikash S"]);

      // 4 attendees with 3 extra names -> all 4 named
      const passes4 = parseAttendeeList("Vikash S", 4, "A; B\nC");
      expect(passes4).toEqual(["Vikash S", "A", "B", "C"]);
    });
  });

  describe("Order Takeover Defense & Consent Invariants", () => {
    it("protects guest token hashes from unauthorized rotation", () => {
      const originalToken = generateGuestCheckoutToken();
      const originalHash = hashGuestToken(originalToken);

      const attackerToken = generateGuestCheckoutToken();
      const attackerHash = hashGuestToken(attackerToken);

      // Verify that attacker token cannot authorize original order
      const order = { user_id: null, guest_token_hash: originalHash };
      expect(verifyOrderAccess(order, null, attackerToken)).toBe(false);
      expect(verifyOrderAccess(order, null, originalToken)).toBe(true);
      expect(originalHash).not.toBe(attackerHash);
    });
  });
});
