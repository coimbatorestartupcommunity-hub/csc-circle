// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  parseMimeEmail,
  parseAxisCreditAlert,
  parseTransactionInfo,
  parseInrToPaise,
  parseAxisTimestamp,
  extractReceivingAccountSuffix,
  decodeQuotedPrintable,
  decodeRfc2047,
  stripHtml,
} from "@/lib/payments/axis-parser";
import { verifyEmailAuthentication } from "@/lib/payments/email-auth";

describe("Milestone M1 Iteration 2 Deep Empirical Stress & Adversarial Suite", () => {
  describe("1. Deep Nested Multiparts Stress", () => {
    const boundaryMixed = "boundary_mixed_12345";
    const boundaryRelated = "boundary_related_67890";
    const boundaryAlt = "boundary_alt_abcde";

    const buildNestedEmail = (options?: {
      attachmentFirst?: boolean;
      multipleAttachments?: boolean;
      charset?: string;
      bodyText?: string;
      bodyHtml?: string;
    }) => {
      const charset = options?.charset || "utf-8";
      const bodyText =
        options?.bodyText ||
        "INR 180.00 was credited to your A/c XX1995 on 02-11-26, 00:14:02 IST.\nTransaction Info: UPI/CR/01/630722119955/DEEP NEST/IOBA/UPI";
      const bodyHtml =
        options?.bodyHtml ||
        "<html><body><p>INR 180.00 was credited to your A/c XX1995.</p><p>Transaction Info: UPI/CR/01/630722119955/DEEP NEST/IOBA/UPI</p></body></html>";

      const altPart = [
        `--${boundaryAlt}`,
        `Content-Type: text/plain; charset=${charset}`,
        "Content-Transfer-Encoding: 8bit",
        "",
        bodyText,
        `--${boundaryAlt}`,
        `Content-Type: text/html; charset=${charset}`,
        "Content-Transfer-Encoding: 8bit",
        "",
        bodyHtml,
        `--${boundaryAlt}--`,
      ].join("\r\n");

      const relatedPart = [
        `--${boundaryRelated}`,
        `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
        "",
        altPart,
        "",
        `--${boundaryRelated}`,
        "Content-Type: image/png; name=\"logo.png\"",
        "Content-Transfer-Encoding: base64",
        "Content-ID: <logo@axis.bank.in>",
        "",
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        `--${boundaryRelated}--`,
      ].join("\r\n");

      const attachmentPart = [
        `--${boundaryMixed}`,
        "Content-Type: application/pdf; name=\"receipt.pdf\"",
        "Content-Disposition: attachment; filename=\"receipt.pdf\"",
        "Content-Transfer-Encoding: base64",
        "",
        "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIg",
      ].join("\r\n");

      const nestedBody = options?.attachmentFirst
        ? [
            "This is a multi-part message in MIME format (preamble).",
            attachmentPart,
            "",
            `--${boundaryMixed}`,
            `Content-Type: multipart/related; boundary="${boundaryRelated}"`,
            "",
            relatedPart,
            "",
            `--${boundaryMixed}--`,
            "This is epilogue text after the closing boundary.",
          ].join("\r\n")
        : [
            "This is a multi-part message in MIME format (preamble).",
            `--${boundaryMixed}`,
            `Content-Type: multipart/related; boundary="${boundaryRelated}"`,
            "",
            relatedPart,
            "",
            attachmentPart,
            "",
            `--${boundaryMixed}--`,
            "This is epilogue text after the closing boundary.",
          ].join("\r\n");

      return [
        "From: Axis Bank Alerts <alerts@axis.bank.in>",
        "To: user@example.com",
        "Subject: INR 180.00 was credited to your A/c.",
        "Message-ID: <deep-nest-001@axis.bank.in>",
        "Date: Sun, 02 Nov 2026 00:14:02 +0530",
        "Authentication-Results: mx.apple.com; dkim=pass header.d=axis.bank.in header.i=@axis.bank.in; spf=pass (smtp.mailfrom=alerts@axis.bank.in)",
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`,
        "",
        nestedBody,
      ].join("\r\n");
    };

    it("1.1 parses standard deep nested multiparts both with await (postal-mime) and sync fallback", async () => {
      const raw = buildNestedEmail();

      // Test async PostalMime execution
      const asyncEmail = await parseMimeEmail(raw);
      expect(asyncEmail.text).toContain("INR 180.00 was credited to your A/c XX1995");
      expect(asyncEmail.html).toContain("<p>INR 180.00 was credited to your A/c XX1995.</p>");
      expect(asyncEmail.from).toContain("alerts@axis.bank.in");
      expect(asyncEmail.subject).toBe("INR 180.00 was credited to your A/c.");
      expect(asyncEmail.attachments?.length).toBeGreaterThanOrEqual(1);

      const alertFromAsync = parseAxisCreditAlert(asyncEmail);
      expect(alertFromAsync).not.toBeNull();
      expect(alertFromAsync?.amountPaise).toBe(18000);
      expect(alertFromAsync?.utr).toBe("630722119955");
      expect(alertFromAsync?.payerName).toBe("DEEP NEST");
      expect(alertFromAsync?.isEligibleForAutoReconcile).toBe(true);

      // Test sync non-awaited execution
      const syncEmail = parseMimeEmail(raw);
      expect(syncEmail.text).toContain("INR 180.00 was credited to your A/c XX1995");
      expect(syncEmail.html).toContain("<p>INR 180.00 was credited to your A/c XX1995.</p>");
      const alertFromSync = parseAxisCreditAlert(syncEmail);
      expect(alertFromSync).not.toBeNull();
      expect(alertFromSync?.amountPaise).toBe(18000);
      expect(alertFromSync?.utr).toBe("630722119955");
      expect(alertFromSync?.payerName).toBe("DEEP NEST");
    });

    it("1.2 handles attachment-first inverted multipart order without losing message body", async () => {
      const raw = buildNestedEmail({ attachmentFirst: true });

      // Async
      const asyncEmail = await parseMimeEmail(raw);
      expect(asyncEmail.text).toContain("INR 180.00 was credited");
      expect(asyncEmail.attachments?.length).toBeGreaterThanOrEqual(1);
      const alert1 = parseAxisCreditAlert(asyncEmail);
      expect(alert1?.amountPaise).toBe(18000);
      expect(alert1?.utr).toBe("630722119955");

      // Sync
      const syncEmail = parseMimeEmail(raw);
      expect(syncEmail.text).toContain("INR 180.00 was credited");
      const alert2 = parseAxisCreditAlert(syncEmail);
      expect(alert2?.amountPaise).toBe(18000);
      expect(alert2?.utr).toBe("630722119955");
    });

    it("1.3 handles HTML-only nested message generating clean text for alert parsing", async () => {
      const raw = [
        "From: alerts@axis.bank.in",
        "Subject: INR 180.00 was credited to your A/c.",
        "Authentication-Results: mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        "Content-Type: multipart/mixed; boundary=\"mix_bound\"",
        "",
        "--mix_bound",
        "Content-Type: text/html; charset=utf-8",
        "",
        "<html><body><div>Amount Credited: INR 180.00</div><div>Account Number: XX1995</div><div>Transaction Info: UPI/P2A/630711223344/HTML ONLY/HDFC/UPI</div></body></html>",
        "--mix_bound--",
      ].join("\r\n");

      const asyncEmail = await parseMimeEmail(raw);
      expect(asyncEmail.html).toContain("Amount Credited: INR 180.00");
      expect(asyncEmail.text).toContain("Amount Credited: INR 180.00");

      const alert = parseAxisCreditAlert(asyncEmail);
      expect(alert).not.toBeNull();
      expect(alert?.amountPaise).toBe(18000);
      expect(alert?.utr).toBe("630711223344");
      expect(alert?.payerName).toBe("HTML ONLY");
    });
  });

  describe("2. Multiple Charsets Stress (Windows-1252, ISO-8859-1, UTF-8)", () => {
    it("2.1 handles Windows-1252 Quoted-Printable body and RFC 2047 headers", async () => {
      // 0x96 is en-dash '–', 0x93 is '“', 0x94 is '”'
      const raw = [
        "From: =?Windows-1252?Q?Axis_Bank_=96_Alerts?= <alerts@axis.bank.in>",
        "Subject: =?Windows-1252?Q?INR_180.00_was_credited_=96_A/c_XX1995?=",
        "Authentication-Results: mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        "Content-Type: text/plain; charset=windows-1252",
        "Content-Transfer-Encoding: quoted-printable",
        "",
        "Dear Customer,",
        "INR 180.00 was credited =96 your A/c XX1995.",
        "Amount Credited: INR 180.00",
        "Transaction Info: UPI/P2A/630722119955/MR =93VIKASH=94/IOBA/UPI",
      ].join("\r\n");

      const email = await parseMimeEmail(raw);
      expect(email.from).toContain("alerts@axis.bank.in");
      expect(email.headers["subject"]).toContain("INR 180.00 was credited – A/c XX1995");
      expect(email.subject).toContain("INR 180.00 was credited");
      expect(email.text).toContain("INR 180.00 was credited");

      const alert = parseAxisCreditAlert(email);
      expect(alert).not.toBeNull();
      expect(alert?.amountPaise).toBe(18000);
      expect(alert?.utr).toBe("630722119955");
      expect(alert?.payerName).toContain("VIKASH");
    });

    it("2.2 handles ISO-8859-1 Quoted-Printable and Base64 bodies", async () => {
      // Latin-1: Caf\xE9 (0xE9), Pe\xF1a (0xF1)
      const qpBody = [
        "From: alerts@axis.bank.in",
        "Subject: =?ISO-8859-1?Q?Caf=E9_Payment_INR_180.00_credited?=",
        "Authentication-Results: mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        "Content-Type: text/plain; charset=iso-8859-1",
        "Content-Transfer-Encoding: quoted-printable",
        "",
        "Amount Credited: INR 180.00",
        "Account Number: XX1995",
        "Transaction Info: UPI/P2A/630722119955/CAF=C9 PE=D1A/IOBA/UPI",
      ].join("\r\n");

      const email = await parseMimeEmail(qpBody);
      expect(email.subject).toContain("Café Payment INR 180.00 credited");

      const alert = parseAxisCreditAlert(email);
      expect(alert).not.toBeNull();
      expect(alert?.amountPaise).toBe(18000);
      expect(alert?.utr).toBe("630722119955");
    });

    it("2.3 handles multi-byte UTF-8 split across soft line breaks", () => {
      // Rupee sign ₹ in UTF-8 is 0xE2 0x82 0xB9
      // Soft line break right in between bytes: =E2=\r\n=82=B9
      const qpSplit = "Amount: =E2=\r\n=82=B9 180.00 credited";
      const decoded = decodeQuotedPrintable(qpSplit, "utf-8");
      expect(decoded).toBe("Amount: ₹ 180.00 credited");

      // Soft line break between amount digits: 1=\r\n80.00
      const qpSplitNum = "INR 1=\r\n80.00 credited";
      expect(decodeQuotedPrintable(qpSplitNum, "utf-8")).toBe("INR 180.00 credited");
    });
  });

  describe("3. Indian Rupee Sign ₹ Variations Stress", () => {
    it("3.1 extracts amount with all currency prefix variations in subject", () => {
      const subjectPrefixes = [
        ["₹ 180.00 was credited to your A/c.", 18000],
        ["₹180.00 was credited to your A/c.", 18000],
        ["INR 180.00 was credited to your A/c.", 18000],
        ["INR180.00 was credited to your A/c.", 18000],
        ["Rs. 180.00 was credited to your A/c.", 18000],
        ["Rs.180.00 was credited to your A/c.", 18000],
        ["Rs 180.00 was credited to your A/c.", 18000],
        ["Rs180.00 was credited to your A/c.", 18000],
        ["&#8377; 180.00 was credited to your A/c.", 18000],
      ];

      for (const [subj, expectedPaise] of subjectPrefixes) {
        const alert = parseAxisCreditAlert({
          subject: subj as string,
          from: "alerts@axis.bank.in",
          headers: {
            from: "alerts@axis.bank.in",
            "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
          },
          text: "Account Number: XX1995\nTransaction Info: UPI/P2A/630722119955/PAYER/IOBA/UPI",
        });
        expect(alert).not.toBeNull();
        expect(alert?.amountPaise).toBe(expectedPaise);
      }
    });

    it("3.2 extracts amount with all currency prefix variations in body", () => {
      const bodyPhrasings = [
        ["Amount Credited: ₹ 180.00", 18000],
        ["Amount Credited: ₹180.00", 18000],
        ["Amount Credited: INR 180.00", 18000],
        ["Amount Credited: Rs. 180.00", 18000],
        ["Amount Credited: Rs 180.00", 18000],
        ["Amount Credited: &#8377; 180.00", 18000],
        ["₹ 180.00 was credited to your A/c XX1995", 18000],
        ["INR 180.00 was credited to your A/c XX1995", 18000],
        ["Rs. 180.00 was credited to your A/c XX1995", 18000],
        ["credited with INR 180.00", 18000],
        ["credited with ₹ 180.00", 18000],
        ["credited by INR 180.00", 18000],
        ["credited by ₹ 180.00", 18000],
      ];

      for (const [phrase, expectedPaise] of bodyPhrasings) {
        const alert = parseAxisCreditAlert({
          subject: "Transaction Notification",
          from: "alerts@axis.bank.in",
          headers: {
            from: "alerts@axis.bank.in",
            "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
          },
          text: `Dear Customer,\n${phrase}\nAccount Number: XX1995\nTransaction Info: UPI/P2A/630722119955/PAYER/IOBA/UPI`,
        });
        expect(alert).not.toBeNull();
        expect(alert?.amountPaise).toBe(expectedPaise);
      }
    });
  });

  describe("4. UTR Slash Index 2 vs Index 3 with Varying Memo Structures", () => {
    it("4.1 accurately parses index 2 (UPI/P2A, UPI/P2P, UPI/P2M)", () => {
      const m1 = parseTransactionInfo("UPI/P2A/630722119955/SURESH K/HDFC/UPI");
      expect(m1.utr).toBe("630722119955");
      expect(m1.payerName).toBe("SURESH K");
      expect(m1.sourceBank).toBe("HDFC");
      expect(m1.channel).toBe("UPI");

      const m2 = parseTransactionInfo("UPI/P2P/630722119955/RAMESH/ICICI");
      expect(m2.utr).toBe("630722119955");
      expect(m2.payerName).toBe("RAMESH");
      expect(m2.sourceBank).toBe("ICICI");

      const m3 = parseTransactionInfo("UPI/P2M/630722119955/MERCHANT PAY/SBI/UPI");
      expect(m3.utr).toBe("630722119955");
      expect(m3.payerName).toBe("MERCHANT PAY");
      expect(m3.sourceBank).toBe("SBI");
    });

    it("4.2 accurately parses index 3 (UPI/CR/01, UPI/CR/subcode, UPI/CR/CSC-ORD-*)", () => {
      // Numeric batch
      const m1 = parseTransactionInfo("UPI/CR/01/630722119955/ANAND M/AXIS/UPI");
      expect(m1.utr).toBe("630722119955");
      expect(m1.payerName).toBe("ANAND M");
      expect(m1.sourceBank).toBe("AXIS");
      expect(m1.orderReference).toBeUndefined();

      // Order Reference at index 2
      const m2 = parseTransactionInfo("UPI/CR/CSC-ORD-X987Y/630722119955/ANAND M/AXIS/UPI");
      expect(m2.utr).toBe("630722119955");
      expect(m2.payerName).toBe("ANAND M");
      expect(m2.sourceBank).toBe("AXIS");
      expect(m2.orderReference).toBe("CSC-ORD-X987Y");

      // Custom alpha subcode
      const m3 = parseTransactionInfo("UPI/CR/TXN/630722119955/PRIYA R/KOTAK/UPI");
      expect(m3.utr).toBe("630722119955");
      expect(m3.payerName).toBe("PRIYA R");
      expect(m3.sourceBank).toBe("KOTAK");
    });

    it("4.3 handles complex index 4 with both subcode and order reference", () => {
      const m = parseTransactionInfo("UPI/CR/01/CSC-ORD-ABC789/630722119955/DEEPAK S/CANARA/UPI");
      expect(m.utr).toBe("630722119955");
      expect(m.payerName).toBe("DEEPAK S");
      expect(m.sourceBank).toBe("CANARA");
      expect(m.orderReference).toBe("CSC-ORD-ABC789");
    });

    it("4.4 handles missing sourceBank without setting keyword as bank", () => {
      // UPI/P2A/<UTR>/<PAYER>/UPI -> "UPI" is keyword, NOT sourceBank!
      const m = parseTransactionInfo("UPI/P2A/630722119955/NO BANK/UPI");
      expect(m.utr).toBe("630722119955");
      expect(m.payerName).toBe("NO BANK");
      expect(m.sourceBank).toBe(""); // Must NOT be "UPI"
    });

    it("4.5 extracts UTR when embedded inside multiline content without 'Transaction Info:' label", () => {
      const content = `
        Dear Member,
        Your account XX1995 has been credited by INR 180.00.
        Reference: UPI/P2A/630722119955/TEST PAYER/HDFC/UPI
      `;
      const alert = parseAxisCreditAlert({
        subject: "INR 180.00 credited",
        from: "alerts@axis.bank.in",
        headers: {
          from: "alerts@axis.bank.in",
          "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        },
        text: content,
      });
      expect(alert).not.toBeNull();
      expect(alert?.utr).toBe("630722119955");
      expect(alert?.payerName).toBe("TEST PAYER");
    });
  });

  describe("5. Non-await Callers and Synchronous Fallback Behavior", () => {
    it("5.1 verifies Promise & Sync object duality: synchronous properties accessible immediately", () => {
      const raw = [
        "From: alerts@axis.bank.in",
        "Subject: Sync test",
        "Content-Type: text/plain",
        "",
        "Sync text content",
      ].join("\r\n");

      // Call parseMimeEmail WITHOUT await
      const res = parseMimeEmail(raw);

      // Verify synchronous properties exist immediately
      expect(res.subject).toBe("Sync test");
      expect(res.from).toBe("alerts@axis.bank.in");
      expect(res.text).toBe("Sync text content");
      expect(res.headers["subject"]).toBe("Sync test");

      // Verify it is also a thenable / Promise
      expect(typeof res.then).toBe("function");
    });

    it("5.2 verifies awaiting the returned object resolves to postal-mime ParsedMimeResult", async () => {
      const raw = [
        "From: alerts@axis.bank.in",
        "Subject: Async test",
        "Content-Type: text/plain",
        "",
        "Async text content",
      ].join("\r\n");

      const res = await parseMimeEmail(raw);
      expect(res.subject).toBe("Async test");
      expect(res.from).toBe("alerts@axis.bank.in");
      expect(res.text).toBe("Async text content");
      expect(res.headers["subject"]).toBe("Async test");
    });

    it("5.3 verifies both sync and async results pass parseAxisCreditAlert identically", async () => {
      const raw = [
        "From: alerts@axis.bank.in",
        "Subject: INR 180.00 was credited to your A/c.",
        "Authentication-Results: mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        "Content-Type: text/plain",
        "",
        "INR 180.00 was credited to your A/c XX1995.",
        "Transaction Info: UPI/P2A/630722119955/SYNC ASYNC/HDFC/UPI",
      ].join("\r\n");

      const syncObj = parseMimeEmail(raw);
      const syncAlert = parseAxisCreditAlert(syncObj);

      const asyncObj = await parseMimeEmail(raw);
      const asyncAlert = parseAxisCreditAlert(asyncObj);

      expect(syncAlert).not.toBeNull();
      expect(asyncAlert).not.toBeNull();
      expect(syncAlert?.amountPaise).toBe(asyncAlert?.amountPaise);
      expect(syncAlert?.utr).toBe(asyncAlert?.utr);
      expect(syncAlert?.payerName).toBe(asyncAlert?.payerName);
      expect(syncAlert?.sourceBank).toBe(asyncAlert?.sourceBank);
      expect(syncAlert?.receivingAccountSuffix).toBe(asyncAlert?.receivingAccountSuffix);
      expect(syncAlert?.isEligibleForAutoReconcile).toBe(asyncAlert?.isEligibleForAutoReconcile);
    });
  });

  describe("6. Malformed Inputs & Boundary Abuse Edge Cases", () => {
    it("6.1 handles empty string and whitespace-only MIME inputs gracefully without throwing", async () => {
      const syncEmpty = parseMimeEmail("");
      expect(syncEmpty.text).toBe("");
      expect(syncEmpty.attachments).toHaveLength(0);

      const asyncEmpty = await parseMimeEmail("");
      expect(asyncEmpty.text).toBe("");
      expect(asyncEmpty.attachments).toHaveLength(0);

      expect(parseAxisCreditAlert(syncEmpty)).toBeNull();
      expect(parseAxisCreditAlert(asyncEmpty)).toBeNull();
    });

    it("6.2 handles missing or unclosed MIME boundaries gracefully", async () => {
      // Missing boundary definition
      const noBound = [
        "From: alerts@axis.bank.in",
        "Content-Type: multipart/alternative",
        "",
        "Some raw body without boundary",
      ].join("\r\n");

      const res1 = await parseMimeEmail(noBound);
      expect(res1).toBeDefined();

      // Unclosed boundary (missing closing --)
      const unclosed = [
        "From: alerts@axis.bank.in",
        "Content-Type: multipart/alternative; boundary=\"test_bound\"",
        "",
        "--test_bound",
        "Content-Type: text/plain",
        "",
        "INR 180.00 was credited to your A/c XX1995. UPI/P2A/630722119955/USER/IOBA/UPI",
      ].join("\r\n");

      const res2 = await parseMimeEmail(unclosed);
      expect(res2.text).toContain("INR 180.00 was credited");
    });

    it("6.3 handles folded headers with deep RFC 2822 continuation lines", async () => {
      const folded = [
        "From: alerts@axis.bank.in",
        "Subject: INR 180.00",
        " was credited",
        " to your A/c.",
        "Authentication-Results: mx.apple.com;",
        " dkim=pass header.d=axis.bank.in header.i=@axis.bank.in;",
        " spf=pass (smtp.mailfrom=alerts@axis.bank.in)",
        "Content-Type: text/plain",
        "",
        "Amount Credited: INR 180.00",
        "Account Number: XX1995",
        "Transaction Info: UPI/P2A/630722119955/FOLDED USER/IOBA/UPI",
      ].join("\r\n");

      const email = await parseMimeEmail(folded);
      expect(email.subject).toBe("INR 180.00 was credited to your A/c.");

      const alert = parseAxisCreditAlert(email);
      expect(alert).not.toBeNull();
      expect(alert?.amountPaise).toBe(18000);
      expect(alert?.auth.status).toBe("authenticated");
    });

    it("6.4 rejects debit alerts even if content contains word 'credit'", () => {
      const debitAlert = {
        subject: "INR 500.00 was debited from your A/c.",
        from: "alerts@axis.bank.in",
        headers: {
          from: "alerts@axis.bank.in",
          "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        },
        text: "Your A/c XX1995 was debited for INR 500.00. For credit cards contact support. UPI/P2A/630722119955/DEBIT/IOBA/UPI",
      };

      const alert = parseAxisCreditAlert(debitAlert);
      expect(alert).toBeNull();
    });

    it("6.5 ensures phone numbers or dates do not get mistaken for UTR", () => {
      const textWithPhone = `
        Dear Customer,
        INR 180.00 was credited to your A/c XX1995 on 02-11-2026.
        Amount Credited: INR 180.00
        Call our helpline at 987654321012 for support.
        Transaction Info: UPI/CR/01/630722119955/PHONE TEST/IOBA/UPI
      `;

      const alert = parseAxisCreditAlert({
        subject: "INR 180.00 was credited to your A/c.",
        from: "alerts@axis.bank.in",
        headers: {
          from: "alerts@axis.bank.in",
          "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        },
        text: textWithPhone,
      });

      expect(alert).not.toBeNull();
      // Must be the UTR from Transaction Info (630722119955), NOT the helpline number (987654321012)
      expect(alert?.utr).toBe("630722119955");
    });
  });
});
