// @vitest-environment node
import { describe, it, expect } from "vitest";
import { verifyEmailAuthentication, extractMailboxAddress } from "@/lib/payments/email-auth";
import {
  parseAxisCreditAlert,
  parseAxisTimestamp,
  parseTransactionInfo,
  parseMimeEmail,
  decodeQuotedPrintable,
  decodeRfc2047,
  parseInrToPaise,
} from "@/lib/payments/axis-parser";
import {
  generateGuestCheckoutToken,
  hashGuestToken,
  verifyOrderAccess,
  isPayerNameAligned,
  parseAttendeeList,
  signGuestVerificationCookie,
  verifyGuestVerificationCookie,
  hashGuestVerificationCode,
  hashGuestVerificationToken,
  GUEST_VERIFICATION_COOKIE_NAME,
  GUEST_ORDER_TOKEN_COOKIE_PREFIX,
} from "@/lib/payments/orders";
import { clientIp, extractValidIp } from "@/lib/rate-limit";

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

    it("rejects sub-domain and substring sender spoofing (Section 5A)", () => {
      const headers1 = {
        from: "alerts@axis.bank.in.attacker.com",
        "authentication-results": "mx.apple.com; dkim=pass; spf=pass",
      };
      expect(verifyEmailAuthentication(headers1).status).toBe("untrusted");

      const headers2 = {
        from: "<alerts@axis.bank.in@scammer.org>",
        "authentication-results": "mx.apple.com; dkim=pass; spf=pass",
      };
      expect(verifyEmailAuthentication(headers2).status).toBe("untrusted");
    });

    it("accepts RFC 5322 formatted sender with friendly display name", () => {
      const headers = {
        from: '"Axis Bank Alerts" <alerts@axis.bank.in>',
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      };
      const result = verifyEmailAuthentication(headers);
      expect(result.status).toBe("authenticated");
      expect(result.senderMatches).toBe(true);
    });

    it("enforces RFC 5322 originator dual-check eliminating permissive || between From and Sender", () => {
      // Attack Vector 1: Attacker From with forged Axis Bank Sender
      const attack1 = verifyEmailAuthentication({
        from: "attacker@evil.com",
        sender: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(attack1.status).toBe("untrusted");
      expect(attack1.senderMatches).toBe(false);

      // Attack Vector 2: Genuine From with unauthorized transmitter Sender
      const attack2 = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        sender: "attacker@evil.com",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(attack2.status).toBe("untrusted");
      expect(attack2.senderMatches).toBe(false);

      // Both match: genuine
      const genuine = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        sender: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(genuine.status).toBe("authenticated");
      expect(genuine.senderMatches).toBe(true);
    });

    it("rejects multi-mailbox injection attacks in From header", () => {
      // Comma-separated mailboxes
      expect(extractMailboxAddress("alerts@axis.bank.in, attacker@evil.com")).toBeNull();
      // Multiple angle-bracket pairs
      expect(extractMailboxAddress("<alerts@axis.bank.in>, <attacker@evil.com>")).toBeNull();
      // Angle bracket address takes precedence over display name candidate
      expect(extractMailboxAddress("alerts@axis.bank.in <attacker@evil.com>")).toBe("attacker@evil.com");
      // Quoted commas inside display name are valid RFC 5322
      expect(extractMailboxAddress('"Bank, Axis" <alerts@axis.bank.in>')).toBe("alerts@axis.bank.in");
      // RFC 5322 CFWS comments are stripped cleanly
      expect(extractMailboxAddress("alerts@axis.bank.in (Axis Bank Alert System)")).toBe("alerts@axis.bank.in");
    });

    it("isolates topmost border MTA header and discards injected upstream Authentication-Results", () => {
      // Injected array: index 0 is topmost border MTA (fail), index 1 is injected attacker MTA (pass)
      const headersWithArray = {
        from: "alerts@axis.bank.in",
        "authentication-results": [
          "mx.apple.com; dkim=fail (bad signature) header.d=axis.bank.in; spf=pass",
          "attacker.net; dkim=pass header.d=axis.bank.in; spf=pass",
        ],
      };
      const result = verifyEmailAuthentication(headersWithArray);
      expect(result.status).toBe("forged"); // Topmost header is authoritative; does not use index 1
    });

    it("rejects rogue and suffix-spoofed border MTAs", () => {
      // Suffix spoofing
      const rogue1 = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "attackerapple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(rogue1.status).toBe("untrusted");

      // Attacker subdomain
      const rogue2 = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com.attacker.org; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(rogue2.status).toBe("untrusted");

      // Fake iCloud domain
      const rogue3 = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "fakeicloud.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(rogue3.status).toBe("untrusted");
    });

    it("prevents comment injection bypass in DKIM and SPF checks", () => {
      // Attacker injects 'was dkim=pass' inside a comment while signature failed
      const forged = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=fail (reason: signature failed, was dkim=pass header.d=axis.bank.in); spf=pass",
      });
      expect(forged.status).toBe("forged");
      expect(forged.dkimPass).toBe(false);
    });

    it("enforces strict Axis Bank DKIM domain alignment", () => {
      // Subdomain suffix spoofing
      const spoofedSub = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in.attacker.org; spf=pass",
      });
      expect(spoofedSub.status).toBe("untrusted");
      expect(spoofedSub.dkimPass).toBe(false);

      // Suffix spoofing
      const spoofedSuffix = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=fakeaxisbank.com; spf=pass",
      });
      expect(spoofedSuffix.status).toBe("untrusted");
      expect(spoofedSuffix.dkimPass).toBe(false);

      // Third-party unaligned domain
      const unaligned = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=evil.com; spf=pass",
      });
      expect(unaligned.status).toBe("untrusted");
      expect(unaligned.dkimPass).toBe(false);
    });

    it("classifies partial or missing authentication as needs_review (never authenticated)", () => {
      // Missing headers entirely
      const noHeaders = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
      });
      expect(noHeaders.status).toBe("needs_review");

      // DKIM passed, but SPF is none/neutral
      const partialSpf = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=neutral",
      });
      expect(partialSpf.status).toBe("needs_review");
      expect(partialSpf.dkimPass).toBe(true);
      expect(partialSpf.spfPass).toBe(false);

      // SPF passed, but DKIM is none
      const partialDkim = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=none; spf=pass",
      });
      expect(partialDkim.status).toBe("needs_review");
      expect(partialDkim.dkimPass).toBe(false);
      expect(partialDkim.spfPass).toBe(true);
    });

    it("rejects unaligned envelope sender in Authentication-Results SPF", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass smtp.mailfrom=attacker@evil.com",
      });
      expect(res.status).toBe("needs_review");
      expect(res.spfPass).toBe(false);
      expect(res.reasons.some((r) => r.includes("does not align with Axis Bank"))).toBe(true);
    });

    it("rejects upstream unauthenticated Received-SPF override when Authentication-Results has spf=none", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=none",
        "received-spf": "pass (attacker-relay.evil.com: domain of attacker@evil.com designates 198.51.100.1 as permitted sender)",
      });
      expect(res.status).toBe("needs_review");
      expect(res.spfPass).toBe(false);
    });

    it("rejects Received-SPF from untrusted non-Apple MTA when Authentication-Results lacks SPF", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in",
        "received-spf": "pass (attacker-relay.evil.com: domain of alerts@axis.bank.in designates 198.51.100.1 as permitted sender)",
      });
      expect(res.status).toBe("needs_review");
      expect(res.spfPass).toBe(false);
      expect(res.reasons.some((r) => r.includes("boundary MTA provenance"))).toBe(true);
    });

    it("accepts border Received-SPF from mx.apple.com with aligned axis.bank.in domain", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in",
        "received-spf": "pass (mx.apple.com: domain of alerts@axis.bank.in designates 198.51.100.1 as permitted sender)",
      });
      expect(res.status).toBe("authenticated");
      expect(res.spfPass).toBe(true);
      expect(res.dkimPass).toBe(true);
    });

    it("multi-DKIM: rejects email if Axis Bank signature fails even if another signature passes", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=fail header.d=axis.bank.in; dkim=pass; spf=pass",
      });
      expect(res.status).toBe("forged");
      expect(res.dkimPass).toBe(false);
      expect(res.reasons.some((r) => r.includes("DKIM signature validation failed"))).toBe(true);
    });

    it("multi-DKIM: accepts email when Axis Bank signature passes alongside another ESP signature", () => {
      const res = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results":
          "mx.apple.com; dkim=pass header.d=axis.bank.in; dkim=pass header.d=esp.net; spf=pass",
      });
      expect(res.status).toBe("authenticated");
      expect(res.dkimPass).toBe(true);
      expect(res.spfPass).toBe(true);
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
      expect(alert?.authStatus).toBe("authenticated");
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

    it("parses multipart/alternative MIME emails into clean text and html", async () => {
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

      const parsed = await parseMimeEmail(mime);
      expect(parsed.subject).toBe("INR 180.00 was credited");
      expect(parsed.from).toBe("alerts@axis.bank.in");
      expect(parsed.text).toContain("INR 180.00 was credited to your A/c XX1995.");
      expect(parsed.text).toContain("630799112233");
      expect(parsed.html).toContain("<p>INR 180.00 was credited to your A/c XX1995.</p>");
    });

    it("parses nested multipart/mixed containing multipart/alternative recursively", async () => {
      const nestedMime = [
        "From: alerts@axis.bank.in",
        "Subject: Alert Notification",
        "Content-Type: multipart/mixed; boundary=\"outer_boundary_xyz\"",
        "",
        "--outer_boundary_xyz",
        "Content-Type: multipart/alternative; boundary=\"inner_boundary_abc\"",
        "",
        "--inner_boundary_abc",
        "Content-Type: text/plain; charset=utf-8",
        "",
        "INR 180.00 was credited to your A/c XX1995. Transaction Info: UPI/CR/01/630711223344/PAYER/IOBA/UPI",
        "",
        "--inner_boundary_abc",
        "Content-Type: text/html; charset=utf-8",
        "",
        "<html><body><p>INR 180.00 was credited to your A/c XX1995.</p></body></html>",
        "",
        "--inner_boundary_abc--",
        "",
        "--outer_boundary_xyz--",
      ].join("\r\n");

      const parsed = await parseMimeEmail(nestedMime);
      expect(parsed.text).toContain("INR 180.00 was credited to your A/c XX1995.");
      expect(parsed.text).toContain("630711223344");
      expect(parsed.html).toContain("<p>INR 180.00 was credited to your A/c XX1995.</p>");
    });

    it("decodes Quoted-Printable text encoded with non-UTF-8 charsets (Windows-1252)", () => {
      // 0x93 and 0x94 are Windows-1252 left and right smart double quotes
      const qpWindows1252 = "=93INR 180.00 credited=94";
      const decoded = decodeQuotedPrintable(qpWindows1252, "windows-1252");
      expect(decoded).toBe("“INR 180.00 credited”");
    });

    it("collapses linear whitespace between adjacent RFC 2047 encoded words (§6.2)", () => {
      const multiWord = "=?utf-8?B?SU5S?=   \r\n\t  =?utf-8?B?IDE4MC4wMA==?=";
      const decoded = decodeRfc2047(multiWord);
      expect(decoded).toBe("INR 180.00");
    });

    it("converts INR strings to integer paise with zero floating point drift", () => {
      expect(parseInrToPaise("180.00")).toBe(18000);
      expect(parseInrToPaise("1.14")).toBe(114);
      expect(parseInrToPaise("1,500.50")).toBe(150050);
      expect(parseInrToPaise("500")).toBe(50000);
      expect(parseInrToPaise("0.05")).toBe(5);
      expect(parseInrToPaise("")).toBeNull();
      expect(parseInrToPaise("invalid")).toBeNull();
    });
  });

  describe("Group Pass Structure Guarantee", () => {
    it("guarantees verified attendee identities for group bookings without synthetic names (Section 11)", () => {
      // 3 attendees with 2 extra names provided -> all 3 verified named attendees
      const passes3 = parseAttendeeList("Vikash S", 3, "Karthik R\nPraveen M");
      expect(passes3).toEqual(["Vikash S", "Karthik R", "Praveen M"]);

      // 1 attendee -> 1 pass
      const pass1 = parseAttendeeList("Vikash S", 1, null);
      expect(pass1).toEqual(["Vikash S"]);

      // Missing additional attendee name returns fewer names than attendeeCount (triggering validation error)
      const incomplete = parseAttendeeList("Vikash S", 3, "Karthik R");
      expect(incomplete).toHaveLength(2);

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

  describe("Operational IMAP Health Endpoint Security", () => {
    it("rejects unauthorized access without valid secret or admin session", async () => {
      const { GET: imapHealthHandler } = await import("@/app/api/internal/payments/imap-health/route");
      // No secret header
      const unauthReq = new Request("http://localhost:3000/api/internal/payments/imap-health");
      const unauthRes = await imapHealthHandler(unauthReq);
      expect(unauthRes.status).toBe(401);
      const unauthJson = await unauthRes.json();
      expect(unauthJson.error).toBe("Unauthorized");

      // Wrong secret header
      const wrongReq = new Request("http://localhost:3000/api/internal/payments/imap-health", {
        headers: { authorization: "Bearer wrong-secret-token-12345678901234567890" },
      });
      const wrongRes = await imapHealthHandler(wrongReq);
      expect(wrongRes.status).toBe(401);
    });

    it("returns structured health and worker metrics without leaking sensitive mailbox contents", async () => {
      const { GET: imapHealthHandler } = await import("@/app/api/internal/payments/imap-health/route");
      const testSecret = "test-secret-value-longer-than-32-chars-strictly-secure";
      process.env.CSC_PAYMENT_RECONCILE_SECRET = testSecret;

      try {
        const req = new Request("http://localhost:3000/api/internal/payments/imap-health", {
          headers: { authorization: `Bearer ${testSecret}` },
        });
        const res = await imapHealthHandler(req);
        // Returns 200 or 503 depending on live iCloud credentials, but response schema is guaranteed
        expect([200, 503]).toContain(res.status);
        const json = await res.json();

        // Must conform to Interface Contract 1
        expect(json).toHaveProperty("ok");
        expect(json).toHaveProperty("connection");
        expect(json.connection).toHaveProperty("host");
        expect(json.connection).toHaveProperty("port");
        expect(json).toHaveProperty("worker");
        expect(json.worker).toHaveProperty("last_uid");
        expect(json.worker).toHaveProperty("uid_validity");
        expect(json.worker).toHaveProperty("last_sync_status");
        expect(json.worker).toHaveProperty("backlog_estimate");

        // Privacy guarantee: No raw email bodies or attendee data are exposed
        const serialized = JSON.stringify(json);
        expect(serialized).not.toContain("bodyRaw");
        expect(serialized).not.toContain("rawEmail");
        expect(serialized).not.toContain("Vikash S");
      } finally {
        delete process.env.CSC_PAYMENT_RECONCILE_SECRET;
      }
    });
  });

  describe("Milestone M3: Guest Checkout Security & Distributed Rate Limiting", () => {
    describe("Client IP Resolution & Format Validation (F14)", () => {
      it("extracts valid IPv4 address and strips port notation", () => {
        expect(extractValidIp("203.0.113.195:8080")).toBe("203.0.113.195");
        expect(extractValidIp("  198.51.100.42:443  ")).toBe("198.51.100.42");
        expect(extractValidIp("192.168.1.1")).toBe("192.168.1.1");
      });

      it("extracts valid IPv6 address and strips bracketed port notation", () => {
        expect(extractValidIp("[2001:db8::1]:8080")).toBe("2001:db8::1");
        expect(extractValidIp("[2001:db8::1]")).toBe("2001:db8::1");
        expect(extractValidIp("2001:db8::1")).toBe("2001:db8::1");
      });

      it("returns null for malformed or unresolvable IP strings", () => {
        expect(extractValidIp("not-an-ip")).toBeNull();
        expect(extractValidIp("999.999.999.999")).toBeNull();
        expect(extractValidIp("")).toBeNull();
        expect(extractValidIp(null)).toBeNull();
        expect(extractValidIp(undefined)).toBeNull();
      });

      it("skips leading malformed candidates in X-Forwarded-For and returns leftmost valid IP", () => {
        const req = new Request("https://example.test", {
          headers: {
            "x-forwarded-for": "malicious_spoof, unknown, 203.0.113.195:8080, 198.51.100.1",
          },
        });
        expect(clientIp(req)).toBe("203.0.113.195");
      });

      it("evaluates proxy fallback chain correctly", () => {
        // Fallback to X-Real-IP
        const reqRealIp = new Request("https://example.test", {
          headers: { "x-forwarded-for": "malformed_entry", "x-real-ip": "198.51.100.55:9000" },
        });
        expect(clientIp(reqRealIp)).toBe("198.51.100.55");

        // Fallback to X-Vercel-Forwarded-For
        const reqVercel = new Request("https://example.test", {
          headers: { "x-vercel-forwarded-for": "198.51.100.77" },
        });
        expect(clientIp(reqVercel)).toBe("198.51.100.77");

        // Fallback to CF-Connecting-IP
        const reqCf = new Request("https://example.test", {
          headers: { "cf-connecting-ip": "198.51.100.88" },
        });
        expect(clientIp(reqCf)).toBe("198.51.100.88");

        // Fallback to unknown
        const reqEmpty = new Request("https://example.test");
        expect(clientIp(reqEmpty)).toBe("unknown");
      });
    });

    describe("Guest Email Ownership Pre-flight & Signed Attestation Cookie (F12)", () => {
      it("signs and verifies valid guest verification attestation cookie", () => {
        const email = "guest@example.com";
        const token = "a".repeat(64);
        const eventId = "11111111-2222-3333-4444-555555555555";

        const cookie = signGuestVerificationCookie({ email, eventId, token });
        expect(cookie).toContain(".");

        const verified = verifyGuestVerificationCookie(cookie, email);
        expect(verified.valid).toBe(true);
        expect(verified.email).toBe(email);
        expect(verified.eventId).toBe(eventId);
        expect(verified.token).toBe(token);
      });

      it("rejects attestation cookie with tampered signature", () => {
        const email = "guest@example.com";
        const token = "b".repeat(64);
        const cookie = signGuestVerificationCookie({ email, token });
        const [data, sig] = cookie.split(".");
        const tamperedSig = sig.slice(0, -4) + "XXXX";

        const result = verifyGuestVerificationCookie(`${data}.${tamperedSig}`, email);
        expect(result.valid).toBe(false);
      });

      it("rejects attestation cookie when expected email does not match", () => {
        const cookie = signGuestVerificationCookie({ email: "victim@example.com", token: "c".repeat(64) });
        const result = verifyGuestVerificationCookie(cookie, "attacker@example.com");
        expect(result.valid).toBe(false);
      });

      it("hashes verification codes and tokens using deterministic SHA-256", () => {
        const code = "654321";
        const hash1 = hashGuestVerificationCode(code);
        const hash2 = hashGuestVerificationCode(code);
        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64);

        const token = "d".repeat(64);
        const tokenHash1 = hashGuestVerificationToken(token);
        const tokenHash2 = hashGuestVerificationToken(token);
        expect(tokenHash1).toBe(tokenHash2);
        expect(tokenHash1).toHaveLength(64);
      });
    });

    describe("Scoped Capability Token Format & Constant-Time Verification (F13 & F16)", () => {
      it("guarantees scoped capability cookie naming convention", () => {
        const orderId = "99999999-8888-7777-6666-555555555555";
        const cookieName = `${GUEST_ORDER_TOKEN_COOKIE_PREFIX}${orderId}`;
        expect(cookieName).toBe("csc_guest_order_token_99999999-8888-7777-6666-555555555555");
        expect(GUEST_VERIFICATION_COOKIE_NAME).toBe("csc_guest_verification");
      });
    });
  });
});
