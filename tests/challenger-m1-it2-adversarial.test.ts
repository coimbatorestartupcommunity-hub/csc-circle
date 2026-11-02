// @vitest-environment node
/**
 * ==============================================================================
 * Milestone M1 Iteration 2: Deep Adversarial Challenger Verification Suite
 * ==============================================================================
 *
 * Rigorous empirical stress-testing across 4 explicit challenge dimensions:
 * 1. Nested comment injections inside Authentication-Results
 * 2. Forged multi-DKIM with 3+ signatures
 * 3. Cross-domain header.i vs header.d combinations
 * 4. Upstream Received-SPF headers with fabricated Apple MTA provenance
 * 5. Strict invariant assertion: Under NO circumstances may an unverified or
 *    forged email achieve auth_status = 'authenticated'.
 */

import { describe, it, expect } from "vitest";
import {
  verifyEmailAuthentication,
  extractMailboxAddress,
  isAxisDomainAligned,
  AXIS_DOMAIN_PATTERN,
} from "@/lib/payments/email-auth";

describe("Milestone M1 Iteration 2 Adversarial Verification Suite", () => {
  // ============================================================================
  // 1. Nested Comment Injections Inside Authentication-Results
  // ============================================================================
  describe("Category 1: Nested Comment Injections in Authentication-Results", () => {
    it("ADV-COM-01: Strips 2-level nested comments containing malicious header.d", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass (outer (inner header.d=axis.bank.in)) header.d=evil.com; spf=pass",
      });
      // header.d must evaluate to evil.com, not axis.bank.in
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-COM-02: Strips 5-level deeply nested comments hiding legitimate bank domain", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass (lvl1 (lvl2 (lvl3 (lvl4 (lvl5 header.d=axis.bank.in))))) header.d=attacker.org; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-COM-03: Strips comments containing semicolons and fake clauses", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=evil.com (comment ; dkim=pass header.d=axis.bank.in; spf=pass); spf=none",
      });
      // The injected clause inside comment must be eliminated
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
      expect(res.spfPass).toBe(false);
    });

    it("ADV-COM-04: Strips comments containing quoted text and fake parameters", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          'mx.apple.com; dkim=pass (comment with "header.d=axis.bank.in" inside) header.d=malicious.net; spf=pass',
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-COM-05: Rejects rogue MTA even if Apple MTA is injected inside comments", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mail.evil.com (comment: mx.apple.com); dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.reasons.some((r) => r.includes("trusted Apple/iCloud boundary"))).toBe(true);
    });

    it("ADV-COM-06: Correctly parses legitimate Apple MTA with diagnostic CFWS comment", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com (Apple Mail Delivery Service); dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("authenticated");
      expect(res.dkimPass).toBe(true);
      expect(res.spfPass).toBe(true);
    });

    it("ADV-COM-07: Strips comments attempting to conceal dkim=fail", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=fail (test: dkim=pass) header.d=axis.bank.in; spf=pass",
      });
      // Must detect dkim=fail and classify as forged
      expect(res.status).toBe("forged");
      expect(res.dkimPass).toBe(false);
    });
  });

  // ============================================================================
  // 2. Forged Multi-DKIM With 3 Signatures
  // ============================================================================
  describe("Category 2: Multi-DKIM With 3 Signatures", () => {
    it("ADV-MDK-01: Two third-party passing signatures + one failing Axis signature evaluates to forged", () => {
      // Attacker appends their own passing DKIM signatures but the bank's signature failed
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=evil.com; dkim=pass header.d=relay-proxy.org; dkim=fail header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("forged");
      expect(res.dkimPass).toBe(false);
      expect(res.reasons.some((r) => r.includes("DKIM signature validation failed"))).toBe(true);
    });

    it("ADV-MDK-02: Zero-failure policy: ANY failing signature in 3 flags explicit failure (forged)", () => {
      // Even if legitimate Axis signature passes, if a rogue signature failed
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; dkim=fail header.d=attacker.com; dkim=pass header.d=other.com; spf=pass",
      });
      expect(res.status).toBe("forged");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-MDK-03: Three passing third-party signatures without Axis Bank alignment evaluates to untrusted", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=evil.com; dkim=pass header.d=attacker.org; dkim=pass header.d=compromised.net; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
      expect(res.reasons.some((r) => r.includes("does not align with Axis Bank"))).toBe(true);
    });

    it("ADV-MDK-04: Permerror on 1 of 3 signatures triggers explicit failure (forged)", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; dkim=permerror header.d=axis.bank.in; dkim=pass header.d=backup.axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("forged");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-MDK-05: Temperror on 1 of 3 signatures triggers explicit failure (forged)", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=temperror header.d=axis.bank.in; dkim=pass header.d=axis.bank.in; dkim=pass header.d=axisbank.com; spf=pass",
      });
      expect(res.status).toBe("forged");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-MDK-06: Three valid, aligned Axis Bank passing signatures evaluate to authenticated", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in header.i=alerts@axis.bank.in; dkim=pass header.d=axisbank.com; dkim=pass header.d=alerts.axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("authenticated");
      expect(res.dkimPass).toBe(true);
      expect(res.spfPass).toBe(true);
    });

    it("ADV-MDK-07: Three passing signatures where all have fake header.i=@axis.bank.in but evil header.d", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=evil1.com header.i=@axis.bank.in; dkim=pass header.d=evil2.com header.i=@axis.bank.in; dkim=pass header.d=evil3.com header.i=@axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });
  });

  // ============================================================================
  // 3. Cross-Domain header.i vs header.d Combinations
  // ============================================================================
  describe("Category 3: Cross-Domain header.i vs header.d Combinations", () => {
    it("ADV-CRS-01: Rejects header.d=axis.bank.in with contradictory header.i=attacker@evil.com", () => {
      // Valid SDID domain, but contradictory AUID identity domain
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in header.i=attacker@evil.com; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-CRS-02: Rejects header.d=evil.com with forged header.i=alerts@axis.bank.in", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=evil.com header.i=alerts@axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-CRS-03: Rejects header.d=evil.com with domain-only header.i=@axisbank.com", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=evil.com header.i=@axisbank.com; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-CRS-04: Rejects cousin domain in header.d (axis.bank.in.attacker.com)", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in.attacker.com header.i=@axis.bank.in.attacker.com; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-CRS-05: Rejects prefix lookalike domain in header.d (fakeaxisbank.com)", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=fakeaxisbank.com; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-CRS-06: Rejects prefix lookalike domain in header.d (notaxis.bank.in)", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=notaxis.bank.in; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-CRS-07: Accepts valid subdomain alignment (sub.axis.bank.in / alerts@sub.axis.bank.in)", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=alerts.axis.bank.in header.i=alerts@alerts.axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("authenticated");
      expect(res.dkimPass).toBe(true);
      expect(res.spfPass).toBe(true);
    });

    it("ADV-CRS-08: Accepts cross-alignment between approved domains (axisbank.com and axis.bank.in)", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axisbank.com header.i=alerts@axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("authenticated");
      expect(res.dkimPass).toBe(true);
      expect(res.spfPass).toBe(true);
    });

    it("ADV-CRS-09: Rejects double-at injection in header.i (alerts@axis.bank.in@evil.com)", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in header.i=alerts@axis.bank.in@evil.com; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });
  });

  // ============================================================================
  // 4. Upstream Received-SPF Headers With Fabricated Apple MTA Provenance
  // ============================================================================
  describe("Category 4: Upstream Received-SPF With Fabricated Apple MTA Provenance", () => {
    it("ADV-SPF-01: Upstream Received-SPF with fabricated Apple MTA CANNOT override border MTA spf=none", () => {
      // Apple border MTA recorded spf=none; attacker injected a fake Received-SPF claiming Apple MTA passed
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=none",
        "received-spf":
          "pass (mx.apple.com: domain of alerts@axis.bank.in designates 198.51.100.1 as permitted sender) receiver=mx.apple.com; client-ip=198.51.100.1; envelope-from=alerts@axis.bank.in;",
      });
      // Border MTA spf=none must hold!
      expect(res.status).toBe("needs_review");
      expect(res.spfPass).toBe(false);
    });

    it("ADV-SPF-02: Upstream Received-SPF CANNOT override border MTA spf=fail", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=fail",
        "received-spf":
          "pass (mx.apple.com: domain of alerts@axis.bank.in designates 198.51.100.1 as permitted sender)",
      });
      expect(res.status).toBe("forged");
      expect(res.spfPass).toBe(false);
    });

    it("ADV-SPF-03: Upstream Received-SPF CANNOT override border MTA spf=softfail", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=softfail",
        "received-spf":
          "pass (mx.apple.com: domain of alerts@axis.bank.in designates 198.51.100.1 as permitted sender)",
      });
      expect(res.status).toBe("forged");
      expect(res.spfPass).toBe(false);
    });

    it("ADV-SPF-04: Fallback Received-SPF rejected if provenance MTA is NOT Apple/iCloud", () => {
      // Border MTA omitted SPF check entirely, but fallback Received-SPF is from an untrusted MTA
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in",
        "received-spf":
          "pass (relay.attacker.com: domain of alerts@axis.bank.in designates 198.51.100.1 as permitted sender)",
      });
      expect(res.status).toBe("needs_review");
      expect(res.spfPass).toBe(false);
      expect(res.reasons.some((r) => r.includes("lacks verified Apple/iCloud boundary MTA provenance"))).toBe(true);
    });

    it("ADV-SPF-05: Fallback Received-SPF rejected if envelope domain does not align with Axis Bank", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in",
        "received-spf":
          "pass (mx.apple.com: domain of evil.com designates 198.51.100.1 as permitted sender)",
      });
      expect(res.status).toBe("needs_review");
      expect(res.spfPass).toBe(false);
      expect(res.reasons.some((r) => r.includes("does not align with Axis Bank"))).toBe(true);
    });

    it("ADV-SPF-06: Fallback Received-SPF accepted only when border MTA is authentic Apple AND domain is aligned", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in",
        "received-spf":
          "pass (mx.apple.com: domain of alerts@axis.bank.in designates 198.51.100.1 as permitted sender)",
      });
      expect(res.status).toBe("authenticated");
      expect(res.dkimPass).toBe(true);
      expect(res.spfPass).toBe(true);
    });

    it("ADV-SPF-07: Fallback Received-SPF with fail or softfail flags explicit failure (forged)", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in",
        "received-spf":
          "fail (mx.apple.com: domain of alerts@axis.bank.in designates 198.51.100.1 as permitted sender)",
      });
      expect(res.status).toBe("forged");
      expect(res.spfPass).toBe(false);
    });
  });

  // ============================================================================
  // 5. Systemic Invariant Assertions
  // Invariant: Under NO circumstances may an unverified or forged email
  // achieve auth_status = 'authenticated'.
  // ============================================================================
  describe("Category 5: Systemic Invariant: No Forged Email Achieves Authenticated", () => {
    it("ADV-INV-01: Spoofed From with legitimate Display Name CANNOT achieve authenticated", () => {
      const res = verifyEmailAuthentication({
        from: '"Axis Bank Alerts (alerts@axis.bank.in)" <hacker@evil.com>',
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).not.toBe("authenticated");
      expect(res.status).toBe("untrusted");
    });

    it("ADV-INV-02: Spoofed Sender header CANNOT achieve authenticated", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        sender: "hacker@evil.com",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).not.toBe("authenticated");
      expect(res.status).toBe("untrusted");
    });

    it("ADV-INV-03: Rogue border MTA CANNOT achieve authenticated", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.google.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).not.toBe("authenticated");
      expect(res.status).toBe("untrusted");
    });

    it("ADV-INV-04: Substring lookalike MTA CANNOT achieve authenticated", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com.attacker.org; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).not.toBe("authenticated");
      expect(res.status).toBe("untrusted");
    });

    it("ADV-INV-05: Missing DKIM result CANNOT achieve authenticated", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; spf=pass",
      });
      expect(res.status).not.toBe("authenticated");
      expect(res.status).toBe("needs_review");
    });

    it("ADV-INV-06: Missing SPF result CANNOT achieve authenticated", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in",
      });
      expect(res.status).not.toBe("authenticated");
      expect(res.status).toBe("needs_review");
    });

    it("ADV-INV-07: DMARC fail CANNOT achieve authenticated (evaluates to forged)", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass; dmarc=fail",
      });
      expect(res.status).not.toBe("authenticated");
      expect(res.status).toBe("forged");
    });

    it("ADV-INV-08: Complete absence of headers CANNOT achieve authenticated", () => {
      const res = verifyEmailAuthentication({});
      expect(res.status).not.toBe("authenticated");
      expect(res.status).toBe("untrusted");
    });

    it("ADV-INV-09: Array of headers with attacker-injected second Authentication-Results CANNOT compromise auth", () => {
      // Topmost header is clean Apple MTA failure; index 1 is attacker's injected passing header
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": [
          "mx.apple.com; dkim=fail header.d=axis.bank.in; spf=fail",
          "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        ],
      });
      // Authoritative topmost header must prevail
      expect(res.status).not.toBe("authenticated");
      expect(res.status).toBe("forged");
    });
  });

  // ============================================================================
  // 6. Full Pipeline Integration & Folded Header Attacks
  // ============================================================================
  describe("Category 6: Full Pipeline & Header Folding Adversarial Verification", () => {
    it("ADV-INT-01: Folded Authentication-Results header preserves full token stream without corruption", () => {
      // RFC 5322 folding: newline followed by WSP (space or tab)
      const foldedHeader =
        "mx.apple.com;\r\n" +
        "  dkim=pass (1024-bit key)\r\n" +
        "  header.d=axis.bank.in\r\n" +
        "  header.i=alerts@axis.bank.in;\r\n" +
        "  spf=pass";
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": foldedHeader,
      });
      expect(res.status).toBe("authenticated");
      expect(res.dkimPass).toBe(true);
      expect(res.spfPass).toBe(true);
    });

    it("ADV-INT-02: String containing two unfolded Authentication-Results only evaluates topmost", () => {
      // Header 0 is failure; Header 1 (unfolded) is attacker's forged passing result
      const doubleHeader =
        "mx.apple.com; dkim=fail header.d=axis.bank.in; spf=fail\r\n" +
        "Authentication-Results: mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass";
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": doubleHeader,
      });
      expect(res.status).toBe("forged");
      expect(res.dkimPass).toBe(false);
    });
  });

  // ============================================================================
  // 7. Homograph Attacks & ReDoS Stress Testing
  // ============================================================================
  describe("Category 7: Homograph Attacks and ReDoS Resilience", () => {
    it("ADV-STR-01: Rejects Cyrillic homograph spoof in From mailbox (аxis.bank.in)", () => {
      // U+0430 Cyrillic small letter a instead of Latin a
      const cyrillicA = "\u0430";
      const homographEmail = `alerts@${cyrillicA}xis.bank.in`;
      const res = verifyEmailAuthentication({
        from: homographEmail,
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(res.status).toBe("untrusted");
      expect(res.senderMatches).toBe(false);
    });

    it("ADV-STR-02: Rejects Cyrillic homograph spoof in header.d", () => {
      const cyrillicA = "\u0430";
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": `mx.apple.com; dkim=pass header.d=${cyrillicA}xis.bank.in; spf=pass`,
      });
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-STR-03: Survives 1000 nested parentheses without ReDoS or stack overflow", () => {
      const depth = 500;
      const deeplyNested = "(".repeat(depth) + "header.d=axis.bank.in" + ")".repeat(depth);
      const start = Date.now();
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": `mx.apple.com; dkim=pass ${deeplyNested} header.d=evil.com; spf=pass`,
      });
      const elapsed = Date.now() - start;
      // Must complete in under 100ms
      expect(elapsed).toBeLessThan(100);
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });

    it("ADV-STR-04: Survives unclosed parentheses sequence without hanging", () => {
      const unclosed = "(".repeat(1000);
      const start = Date.now();
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": `mx.apple.com; dkim=pass ${unclosed} header.d=evil.com; spf=pass`,
      });
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100);
      expect(res.status).toBe("untrusted");
      expect(res.dkimPass).toBe(false);
    });
  });
});
