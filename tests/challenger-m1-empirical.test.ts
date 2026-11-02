// @vitest-environment node
/**
 * ==============================================================================
 * Milestone M1 Empirical Adversarial Challenger Verification Suite
 * ==============================================================================
 * 
 * Demonstrates empirical vulnerability reproduction against src/lib/payments/email-auth.ts.
 * Confirms which defenses hold and reproduces confirmed security vulnerabilities.
 */

import { describe, it, expect } from "vitest";
import { verifyEmailAuthentication, extractMailboxAddress } from "@/lib/payments/email-auth";

describe("Milestone M1 Empirical Challenger Verification Suite", () => {
  describe("Defenses That Hold (CONFIRMED SECURE)", () => {
    it("SEC-01: rejects spoofed From with legitimate display name", () => {
      const res = verifyEmailAuthentication({
        from: '"Axis Bank Alerts" <attacker@evil.com>',
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.senderMatches).toBe(false);
    });

    it("SEC-02: rejects permissive || bypass when From is evil and Sender is axis", () => {
      const res = verifyEmailAuthentication({
        from: "attacker@evil.com",
        sender: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.senderMatches).toBe(false);
    });

    it("SEC-03: rejects permissive || bypass when From is axis and Sender is evil", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        sender: "attacker@evil.com",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.senderMatches).toBe(false);
    });

    it("SEC-04: rejects multi-mailbox comma injection", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in, evil@attacker.com",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.senderMatches).toBe(false);
    });

    it("SEC-05: rejects obfuscated subdomains and cousin domains", () => {
      const lookalikes = [
        "alerts@axis.bank.in.evil.com",
        "alerts@axis.bank.in.attacker.org",
        "alerts@axisbank.in",
        "alerts@axis.bank.co.in",
        "alerts@fakeaxisbank.com",
      ];
      for (const from of lookalikes) {
        const res = verifyEmailAuthentication({
          from,
          "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        });
        expect(res.status).toBe("untrusted");
      }
    });

    it("SEC-06: rejects untrusted border MTAs", () => {
      const rogueMtas = [
        "foreign-mta.evil.com",
        "mx.apple.com.evil.com",
        "evilapple.com",
        "apple.com.attacker.net",
        "gmail.com",
      ];
      for (const mta of rogueMtas) {
        const res = verifyEmailAuthentication({
          from: "alerts@axis.bank.in",
          "authentication-results": `${mta}; dkim=pass header.d=axis.bank.in; spf=pass`,
        });
        expect(res.status).toBe("untrusted");
      }
    });

    it("SEC-07: rejects pure comment injection inside dkim=none", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=none (comment: dkim=pass header.d=axis.bank.in); spf=pass",
      });
      expect(res.status).toBe("needs_review");
      expect(res.dkimPass).toBe(false);
    });
  });

  describe("Vulnerabilities Remediated (CONFIRMED SECURE)", () => {
    it("VULN-01: Cross-clause rawClause comment injection does NOT leak header.d (evaluates to untrusted)", () => {
      // Attacker has valid DKIM for evil.com, but injects header.d=axis.bank.in into comment of DMARC clause.
      // Secure behavior: comment stripped, header.d remains evil.com, status is 'untrusted'.
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=evil.com; dmarc=pass (p=reject header.d=axis.bank.in); spf=pass",
      });

      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("VULN-02: DKIM AUID (header.i) does NOT allow third-party signing domain evil.com (evaluates to untrusted)", () => {
      // Attacker signs with evil.com (header.d=evil.com) but sets header.i=@axis.bank.in.
      // Secure behavior: header.d must be axis.bank.in; header.i cannot substitute; status is 'untrusted'.
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=evil.com header.i=@axis.bank.in; spf=pass",
      });

      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("VULN-03: Comment injection into subsequent clause does NOT leak header.i (evaluates to untrusted)", () => {
      // Attacker signs with evil.com, but injects header.i into comment of DMARC clause.
      // Secure behavior: comment stripped; status is 'untrusted'.
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=evil.com; dmarc=pass (comment: header.i=alerts@axis.bank.in); spf=pass",
      });

      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("VULN-04: Multi-DKIM signature decoupling flags explicit failure on failed axis.bank.in signature", () => {
      // Clause 0: dkim=fail for axis.bank.in.
      // Clause 1: dkim=pass for another signature.
      // Secure behavior: any failing signature flags explicit failure; status is 'forged'.
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=fail header.d=axis.bank.in; dkim=pass; spf=pass",
      });

      expect(res.status).toBe("forged");
      expect(res.dkimPass).toBe(false);
    });

    it("VULN-05: Injected upstream Received-SPF does NOT override border MTA spf=none", () => {
      // Apple border MTA recorded spf=none.
      // Attacker injected a Received-SPF header.
      // Secure behavior: border MTA is authoritative; Received-SPF cannot override; status is 'needs_review'.
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=none",
        "received-spf": "pass (attacker-relay.evil.com: domain of attacker@evil.com designates 198.51.100.1 as permitted sender)",
      });

      expect(res.status).toBe("needs_review");
      expect(res.spfPass).toBe(false);
    });
  });
});

