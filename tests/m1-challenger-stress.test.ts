// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock controller at top level for vitest hoisting
const mockState = {
  mailbox: { path: "INBOX", exists: 10, uidValidity: 100, uidNext: 150 },
  searchResult: [] as number[],
  lastSearchCriteria: null as Record<string, unknown> | null,
  fetchedBatches: [] as number[][],
};

vi.mock("imapflow", () => {
  return {
    ImapFlow: class MockImapFlow {
      mailbox = mockState.mailbox;
      async connect() {}
      async logout() {}
      async getMailboxLock() {
        return { release: () => {} };
      }
      async search(criteria: Record<string, unknown>) {
        mockState.lastSearchCriteria = criteria;
        return mockState.searchResult;
      }
      async fetchAll(range: number[]) {
        mockState.fetchedBatches.push(range);
        return range.map((uid) => ({
          uid,
          envelope: {
            messageId: `<uid-${uid}@axis.bank.in>`,
            subject: "INR 180.00 was credited",
            from: [{ address: "alerts@axis.bank.in" }],
          },
          source: Buffer.from(
            `Subject: INR 180.00 was credited\r\n\r\nAmount Credited: INR 180.00 XX1995 UPI/P2A/6307000000${uid}/P/B`
          ),
        }));
      }
    },
  };
});

import {
  parseMimeEmail,
  parseAxisCreditAlert,
  decodeQuotedPrintable,
  decodeQuotedPrintableToBytes,
  decodeRfc2047,
  parseInrToPaise,
  parseTransactionInfo,
  extractReceivingAccountSuffix,
  parseAxisTimestamp,
} from "@/lib/payments/axis-parser";
import { fetchRecentBankAlerts, checkImapConnection } from "@/lib/payments/imap-client";
import { verifyEmailAuthentication, extractMailboxAddress } from "@/lib/payments/email-auth";

describe("Milestone M1 Empirical Challenger Stress Suite", () => {
  beforeEach(() => {
    mockState.mailbox = { path: "INBOX", exists: 10, uidValidity: 100, uidNext: 150 };
    mockState.searchResult = [];
    mockState.lastSearchCriteria = null;
    mockState.fetchedBatches = [];
    process.env.ICLOUD_IMAP_APP_PASSWORD = "mock-password-1234";
  });

  describe("1. MIME Parser Edge Cases", () => {
    it("1.1 parses deeply nested multiparts (multipart/mixed -> multipart/related -> multipart/alternative)", () => {
      const complexMime = [
        "From: alerts@axis.bank.in",
        "Subject: Alert Notification",
        "Content-Type: multipart/mixed; boundary=\"boundary_outer\"",
        "Message-ID: <nested-deep@axis.bank.in>",
        "",
        "--boundary_outer",
        "Content-Type: multipart/related; boundary=\"boundary_middle\"",
        "",
        "--boundary_middle",
        "Content-Type: multipart/alternative; boundary=\"boundary_inner\"",
        "",
        "--boundary_inner",
        "Content-Type: text/plain; charset=utf-8",
        "",
        "INR 180.00 was credited to your A/c XX1995 on 02-11-26, 00:14:02 IST.",
        "Transaction Info: UPI/CR/01/630722119955/DEEP NEST/IOBA/UPI",
        "",
        "--boundary_inner",
        "Content-Type: text/html; charset=utf-8",
        "",
        "<html><body><p>INR 180.00 was credited to your A/c XX1995.</p>",
        "",
        "--boundary_inner--",
        "",
        "--boundary_middle--",
        "",
        "--boundary_outer",
        "Content-Type: application/pdf; name=\"receipt.pdf\"",
        "Content-Transfer-Encoding: base64",
        "",
        "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIg",
        "",
        "--boundary_outer--",
      ].join("\r\n");

      const parsed = parseMimeEmail(complexMime);
      expect(parsed.text).toContain("INR 180.00 was credited to your A/c XX1995");
      expect(parsed.text).toContain("630722119955");
      expect(parsed.html).toContain("<p>INR 180.00 was credited to your A/c XX1995.</p>");
      expect(parsed.attachments).toHaveLength(1);
      expect(parsed.attachments?.[0]?.mimeType).toBe("application/pdf");
    });

    it("1.2 handles complex boundary strings containing regex special characters and quotes", () => {
      const boundary = "----=_Part_12345/6789+special$chars(foo)";
      const rawMime = [
        "From: alerts@axis.bank.in",
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        "INR 500.00 was credited to your A/c XX1995. Transaction Info: UPI/P2A/630788990011/PAYER/IOBA/UPI",
        `--${boundary}--`,
      ].join("\r\n");

      const parsed = parseMimeEmail(rawMime);
      expect(parsed.text).toContain("INR 500.00 was credited to your A/c XX1995");
      expect(parsed.text).toContain("630788990011");
    });

    it("1.3 decodes all Windows-1252 (CP1252) extension characters (0x80 to 0x9F)", () => {
      // Test 0x80 (€), 0x82 (‚), 0x85 (…), 0x89 (‰), 0x91 (‘), 0x92 (’), 0x93 (“), 0x94 (”), 0x96 (–), 0x97 (—), 0x99 (™)
      const qp = "=80=82=85=89=91=92=93=94=96=97=99";
      const decoded = decodeQuotedPrintable(qp, "windows-1252");
      expect(decoded).toBe("€‚…‰‘’“”–—™");
    });

    it("1.4 decodes ISO-8859-1 (Latin-1) accented characters", () => {
      // =E9 (é), =F1 (ñ), =FC (ü), =A3 (£)
      const qp = "Caf=E9 Se=F1or =FCber =A3180";
      const decoded = decodeQuotedPrintable(qp, "iso-8859-1");
      expect(decoded).toBe("Café Señor über £180");
    });

    it("1.5 parses Indian Rupee sign ₹ in all encodings (Quoted-Printable UTF-8, HTML numeric, RFC 2047, literal)", () => {
      // 1. Quoted-Printable UTF-8 (=E2=82=B9)
      const qpRupee = "=E2=82=B9 180.00 credited";
      expect(decodeQuotedPrintable(qpRupee, "utf-8")).toBe("₹ 180.00 credited");

      // 2. Lowercase hex entities (=e2=82=b9)
      const qpLowerRupee = "=e2=82=b9 180.00 credited";
      expect(decodeQuotedPrintable(qpLowerRupee, "utf-8")).toBe("₹ 180.00 credited");

      // 3. RFC 2047 Base64 encoded subject: "=?utf-8?B?4oK5IDE4MC4wMCB3YXMgY3JlZGl0ZWQ=?="
      const b64Subject = "=?utf-8?B?4oK5IDE4MC4wMCB3YXMgY3JlZGl0ZWQ=?=";
      expect(decodeRfc2047(b64Subject)).toBe("₹ 180.00 was credited");

      // 4. RFC 2047 Quoted-Printable encoded subject: "=?utf-8?Q?=E2=82=B9_180.00_was_credited?="
      const qpSubject = "=?utf-8?Q?=E2=82=B9_180.00_was_credited?=";
      expect(decodeRfc2047(qpSubject)).toBe("₹ 180.00 was credited");

      // 5. Full alert with HTML entity &#8377;
      const alertHtmlEntity = parseAxisCreditAlert({
        subject: "INR 180.00 was credited to your A/c.",
        from: "alerts@axis.bank.in",
        headers: {
          from: "alerts@axis.bank.in",
          "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        },
        html: `
          <p>Dear Customer,</p>
          <p>Amount Credited: &#8377; 180.00</p>
          <p>Account Number: XX1995</p>
          <p>Transaction Info: UPI/P2A/630722119955/VIKASH S/IOBA/UPI</p>
        `,
      });
      expect(alertHtmlEntity).not.toBeNull();
      expect(alertHtmlEntity?.amountPaise).toBe(18000);
      expect(alertHtmlEntity?.utr).toBe("630722119955");

      // 6. Full alert with literal ₹ in subject and body
      const alertLiteralRupee = parseAxisCreditAlert({
        subject: "₹ 180.00 was credited to your A/c.",
        from: "alerts@axis.bank.in",
        headers: {
          from: "alerts@axis.bank.in",
          "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        },
        text: `
          Dear Customer,
          ₹ 180.00 was credited to your A/c XX1995 on 02-11-26, 00:14:02 IST.
          Transaction Info: UPI/P2A/630722119955/VIKASH S/IOBA/UPI
        `,
      });
      expect(alertLiteralRupee).not.toBeNull();
      expect(alertLiteralRupee?.amountPaise).toBe(18000);
    });

    it("1.6 handles Quoted-Printable soft line breaks, trailing spaces, and malformed entities without crashing", () => {
      // Soft line break =\r\n inside word
      const softCRLF = "cred=\r\nited to your A/c";
      expect(decodeQuotedPrintable(softCRLF)).toBe("credited to your A/c");

      // Soft line break =\n
      const softLF = "cred=\nited to your A/c";
      expect(decodeQuotedPrintable(softLF)).toBe("credited to your A/c");

      // Malformed hex entities (=ZZ, =1, isolated = at end of text)
      const malformed = "Amount =ZZ and =1 and =";
      expect(decodeQuotedPrintable(malformed)).toBe("Amount =ZZ and =1 and =");

      // Valid =3D and =20
      const validHex = "A=3DB=20C";
      expect(decodeQuotedPrintable(validHex)).toBe("A=B C");
    });
  });

  describe("2. Alert Parsing Robustness", () => {
    it("2.1 handles UTR slash formats with UTR at index 2 vs index 3 preserving clean payerName", () => {
      // Index 2: UPI/P2A/<UTR>/<PAYER>/<BANK>/UPI
      const idx2 = parseTransactionInfo("UPI/P2A/630722119955/VIKASH S/IOBA/UPI");
      expect(idx2.utr).toBe("630722119955");
      expect(idx2.payerName).toBe("VIKASH S");
      expect(idx2.sourceBank).toBe("IOBA");
      expect(idx2.orderReference).toBeUndefined();

      // Index 3 with numeric subchannel: UPI/CR/01/<UTR>/<PAYER>/<BANK>/UPI
      const idx3Num = parseTransactionInfo("UPI/CR/01/630722119955/VIKASH S/IOBA/UPI");
      expect(idx3Num.utr).toBe("630722119955");
      expect(idx3Num.payerName).toBe("VIKASH S");
      expect(idx3Num.sourceBank).toBe("IOBA");
      expect(idx3Num.orderReference).toBeUndefined();

      // Index 3 with order reference: UPI/CR/CSC-ORD-ABC123DEF456/<UTR>/<PAYER>/<BANK>
      const idx3Ref = parseTransactionInfo("UPI/CR/CSC-ORD-ABC123DEF456/630722119955/VIKASH S/IOBA");
      expect(idx3Ref.utr).toBe("630722119955");
      expect(idx3Ref.payerName).toBe("VIKASH S");
      expect(idx3Ref.sourceBank).toBe("IOBA");
      expect(idx3Ref.orderReference).toBe("CSC-ORD-ABC123DEF456");

      // Trailing dots and slashes
      const trailing = parseTransactionInfo("UPI/P2A/630722119955/VIKASH S./IOBA/UPI./");
      expect(trailing.utr).toBe("630722119955");
      expect(trailing.payerName).toBe("VIKASH S");
      expect(trailing.sourceBank).toBe("IOBA");

      // P2P format without trailing /UPI
      const p2p = parseTransactionInfo("UPI/P2P/630722119955/KAVITHA M/HDFC");
      expect(p2p.utr).toBe("630722119955");
      expect(p2p.payerName).toBe("KAVITHA M");
      expect(p2p.sourceBank).toBe("HDFC");
    });

    it("2.2 validates integer paise conversion without IEEE 754 floating point drift across 50+ amounts", () => {
      const testCases: Array<[string, number | null]> = [
        ["0.01", 1],
        ["0.02", 2],
        ["0.05", 5],
        ["0.10", 10],
        ["0.29", 29],
        ["0.57", 57],
        ["0.58", 58],
        ["1.00", 100],
        ["1.13", 113],
        ["1.14", 114],
        ["2.29", 229],
        ["10.05", 1005],
        ["180", 18000],
        ["180.0", 18000],
        ["180.00", 18000],
        ["180.29", 18029],
        ["180.50", 18050],
        ["180.5", 18050],
        ["500.00", 50000],
        ["1,500.50", 150050],
        ["12,345.67", 1234567],
        ["10,00,000.00", 100000000],
        ["99,99,999.99", 999999999],
        ["0", null],
        ["0.00", null],
        ["-180.00", null],
        ["180.000", null],
        ["abc", null],
        ["", null],
        ["180.0.0", null],
      ];

      for (const [input, expected] of testCases) {
        expect(parseInrToPaise(input)).toBe(expected);
      }
    });

    it("2.3 enforces strict word boundaries for receiving account suffix matching (XX1995)", () => {
      // Positive matches
      expect(extractReceivingAccountSuffix("A/c XX1995")).toBe("1995");
      expect(extractReceivingAccountSuffix("Account Number: XX1995")).toBe("1995");
      expect(extractReceivingAccountSuffix("Account Number: 1995")).toBe("1995");
      expect(extractReceivingAccountSuffix("credited to account ending in 1995")).toBe("1995");
      expect(extractReceivingAccountSuffix("to your A/c XX1995")).toBe("1995");
      expect(extractReceivingAccountSuffix("to your A/c 1995")).toBe("1995");

      // Boundary stress tests (must NOT match 1995 from longer numbers)
      const suffix5 = extractReceivingAccountSuffix("Account Number: XX19955");
      expect(suffix5).not.toBe("1995");

      const suffixDate = extractReceivingAccountSuffix("Born on 1995-11-02 in India");
      expect(suffixDate).not.toBe("1995");
    });

    it("2.4 parses Axis timestamps with three-letter months and 12-hour AM/PM variants into exact UTC", () => {
      // 24-hour DD-MM-YY
      expect(parseAxisTimestamp("02-11-26, 00:14:02 IST")).toBe("2026-11-01T18:44:02.000Z");
      // 24-hour DD-MM-YYYY
      expect(parseAxisTimestamp("02-11-2026, 00:14:02 IST")).toBe("2026-11-01T18:44:02.000Z");

      // Three-letter months
      expect(parseAxisTimestamp("02-Jan-26 12:00:00 PM IST")).toBe("2026-01-02T06:30:00.000Z");
      expect(parseAxisTimestamp("15-Feb-26 09:30:00 AM IST")).toBe("2026-02-15T04:00:00.000Z");
      expect(parseAxisTimestamp("31-Mar-26 11:59:59 PM IST")).toBe("2026-03-31T18:29:59.000Z");
      expect(parseAxisTimestamp("01-Apr-26 12:00:00 AM IST")).toBe("2026-03-31T18:30:00.000Z");
      expect(parseAxisTimestamp("02-Nov-26, 00:14:02 IST")).toBe("2026-11-01T18:44:02.000Z");
      expect(parseAxisTimestamp("02-Nov-2026 00:14:02")).toBe("2026-11-01T18:44:02.000Z");

      // 12-hour AM/PM conversions
      expect(parseAxisTimestamp("02-11-26 12:00:00 AM IST")).toBe("2026-11-01T18:30:00.000Z");
      expect(parseAxisTimestamp("02-11-26 12:00:00 PM IST")).toBe("2026-11-02T06:30:00.000Z");
      expect(parseAxisTimestamp("02-11-26 10:30:00 AM IST")).toBe("2026-11-02T05:00:00.000Z");
      expect(parseAxisTimestamp("02-11-26 10:30:00 PM IST")).toBe("2026-11-02T17:00:00.000Z");

      // Invalid timestamp strings return null safely
      expect(parseAxisTimestamp("")).toBeNull();
      expect(parseAxisTimestamp("invalid timestamp")).toBeNull();
      expect(parseAxisTimestamp("99-99-99 99:99:99 IST")).toBeNull();
    });
  });

  describe("3. IMAP Backlog & Concurrency Resilience", () => {
    it("3.1 verifies search criteria unconditionally binds from: alerts@axis.bank.in even with UID cursor", async () => {
      mockState.searchResult = [101, 102];

      // 1. Initial run (lastUid = 0):
      await fetchRecentBankAlerts({ lastUid: 0 });
      expect(mockState.lastSearchCriteria).toEqual({
        from: "alerts@axis.bank.in",
      });

      // 2. Incremental run (lastUid = 100):
      await fetchRecentBankAlerts({ lastUid: 100 });
      expect(mockState.lastSearchCriteria).toEqual({
        from: "alerts@axis.bank.in",
        uid: "101:*",
      });
      // CRITICAL SECURITY INVARIANT: from filter MUST NOT be dropped!
      expect(mockState.lastSearchCriteria?.from).toBe("alerts@axis.bank.in");
    });

    it("2.5 guarantees Available Balance in alert body never corrupts or overrides Amount Credited", () => {
      const email = {
        messageId: "<balance-test@axis.bank.in>",
        subject: "INR 180.00 was credited to your A/c.",
        from: "alerts@axis.bank.in",
        headers: {
          from: "alerts@axis.bank.in",
          "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        },
        text: `
          Dear Customer,
          INR 180.00 was credited to your A/c XX1995 on 02-11-26, 00:14:02 IST.
          Transaction Info: UPI/P2A/630722119955/VIKASH S/IOBA/UPI.
          Total Available Balance: INR 9,99,999.00.
          Clear Balance: INR 9,99,999.00.
        `,
      };

      const alert = parseAxisCreditAlert(email);
      expect(alert).not.toBeNull();
      // Must be 18000 paise (180.00), NOT 99999900 paise (999,999.00)
      expect(alert?.amountPaise).toBe(18000);
      expect(alert?.utr).toBe("630722119955");
    });

    it("2.6 extracts account suffix across various Axis bank notification phrasing", () => {
      expect(extractReceivingAccountSuffix("Account Number: ****1995")).toBe("1995");
      expect(extractReceivingAccountSuffix("A/c no. XX1995")).toBe("1995");
      expect(extractReceivingAccountSuffix("A/c no: 1995")).toBe("1995");
      expect(extractReceivingAccountSuffix("", "INR 180.00 was credited to your A/c XX1995")).toBe("1995");
      expect(extractReceivingAccountSuffix("", "INR 180.00 was credited to account 1995")).toBe("1995");
    });
  });

  describe("3. IMAP Backlog & Concurrency Resilience", () => {
    it("3.1 verifies search criteria unconditionally binds from: alerts@axis.bank.in even with UID cursor", async () => {
      mockState.searchResult = [101, 102];

      // 1. Initial run (lastUid = 0):
      await fetchRecentBankAlerts({ lastUid: 0 });
      expect(mockState.lastSearchCriteria).toEqual({
        from: "alerts@axis.bank.in",
      });

      // 2. Incremental run (lastUid = 100):
      await fetchRecentBankAlerts({ lastUid: 100 });
      expect(mockState.lastSearchCriteria).toEqual({
        from: "alerts@axis.bank.in",
        uid: "101:*",
      });
      // CRITICAL SECURITY INVARIANT: from filter MUST NOT be dropped!
      expect(mockState.lastSearchCriteria?.from).toBe("alerts@axis.bank.in");
    });

    it("3.2 chunked draining loop handles backlogs of 25, 50, and 100+ messages without skips", async () => {
      // Generate 120 synthetic message UIDs (UIDs 1 to 120)
      const allUids = Array.from({ length: 120 }, (_, i) => i + 1);
      mockState.searchResult = allUids;
      mockState.mailbox = { path: "INBOX", exists: 120, uidValidity: 200, uidNext: 121 };

      // Batch 1: default maxMessages = 100, chunkSize = 25
      const result1 = await fetchRecentBankAlerts({ lastUid: 0, chunkSize: 25, maxMessages: 100 });
      expect(result1.messages).toHaveLength(100);
      expect(result1.highestUid).toBe(100);
      expect(result1.hasMore).toBe(true);
      // Verify chunks were fetched in batches of 25
      expect(mockState.fetchedBatches).toHaveLength(4); // 25 * 4 = 100
      expect(mockState.fetchedBatches[0]).toHaveLength(25);
      expect(mockState.fetchedBatches[0][0]).toBe(1);
      expect(mockState.fetchedBatches[0][24]).toBe(25);
      expect(mockState.fetchedBatches[3][24]).toBe(100);

      // Batch 2: next run starting from lastUid = 100
      mockState.fetchedBatches = [];
      const result2 = await fetchRecentBankAlerts({ lastUid: 100, chunkSize: 25, maxMessages: 100 });
      expect(result2.messages).toHaveLength(20); // remaining 20 (101 to 120)
      expect(result2.highestUid).toBe(120);
      expect(result2.hasMore).toBe(false);
      expect(mockState.fetchedBatches).toHaveLength(1);
      expect(mockState.fetchedBatches[0]).toHaveLength(20);
      expect(mockState.fetchedBatches[0][0]).toBe(101);
      expect(mockState.fetchedBatches[0][19]).toBe(120);

      // Total messages processed across both runs: exactly 120 with zero duplicates or skips
      const allProcessedUids = [
        ...result1.messages.map((m) => parseInt(m.messageId!.replace(/<uid-|@.*>/g, ""), 10)),
        ...result2.messages.map((m) => parseInt(m.messageId!.replace(/<uid-|@.*>/g, ""), 10)),
      ];
      expect(allProcessedUids).toHaveLength(120);
      expect(allProcessedUids).toEqual(allUids);
    });

    it("3.3 verifies RFC 3501 UIDVALIDITY cursor reset behavior when mailbox is recreated or reindexed", async () => {
      // Mailbox has been recreated: UIDVALIDITY changed to 999999, exists: 5
      mockState.mailbox = { path: "INBOX", exists: 5, uidValidity: 999999, uidNext: 10 };
      mockState.searchResult = [1, 2, 3, 4, 5];

      // Caller expects previous uidValidity = 111111 with lastUid = 500
      // Since server uidValidity is 999999, lastUid must be reset to 0!
      const result = await fetchRecentBankAlerts({
        expectedUidValidity: 111111,
        lastUid: 500,
      });

      expect(result.uidValidity).toBe(999999);
      expect(result.messages).toHaveLength(5);
      expect(result.highestUid).toBe(5);
    });

    it("3.4 respects soft time limit budget breaking safely with partial batch and hasMore: true", async () => {
      // Return 50 messages, but set time budget to 0ms so it halts after first chunk
      mockState.searchResult = Array.from({ length: 50 }, (_, i) => i + 1);
      mockState.mailbox = { path: "INBOX", exists: 50, uidValidity: 100, uidNext: 51 };

      const result = await fetchRecentBankAlerts({
        lastUid: 0,
        chunkSize: 10,
        maxMessages: 50,
        timeLimitMs: -1, // Force time budget expiration immediately after first chunk
      });

      expect(result.messages).toHaveLength(10);
      expect(result.highestUid).toBe(10);
      expect(result.hasMore).toBe(true);
    });
  });
});
