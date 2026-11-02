import { describe, it, expect } from "vitest";
import { parseAxisCreditAlert, parseAxisTimestamp, parseTransactionInfo } from "@/lib/payments/axis-parser";
import { verifyEmailAuthentication } from "@/lib/payments/email-auth";

describe("Axis Bank alert parsing and authentication", () => {
  it("parses IST timestamp accurately into ISO UTC", () => {
    const iso = parseAxisTimestamp("02-11-26, 00:14:02 IST");
    expect(iso).toBe("2026-11-01T18:44:02.000Z");
  });

  it("extracts 12-digit UTR, payer name, and source bank from slash-delimited info", () => {
    const parsed = parseTransactionInfo("UPI/P2A/630722119955/VIKASH S/IOBA/UPI");
    expect(parsed.utr).toBe("630722119955");
    expect(parsed.payerName).toBe("VIKASH S");
    expect(parsed.sourceBank).toBe("IOBA");
    expect(parsed.channel).toBe("UPI");
  });

  it("authenticates valid Axis Bank email headers", () => {
    const auth = verifyEmailAuthentication({
      from: "Axis Bank Alerts <alerts@axis.bank.in>",
      "authentication-results": "mx.icloud.com; dkim=pass header.d=axis.bank.in header.i=@axis.bank.in; spf=pass (smtp.mailfrom=alerts@axis.bank.in)",
    });
    expect(auth.status).toBe("authenticated");
    expect(auth.dkimPass).toBe(true);
    expect(auth.spfPass).toBe(true);
    expect(auth.senderMatches).toBe(true);
  });

  it("rejects forged or spoofed sender addresses", () => {
    const auth = verifyEmailAuthentication({
      from: "Attacker <evil@example.com>",
      "authentication-results": "mx.icloud.com; dkim=pass (header.i=@example.com); spf=pass",
    });
    expect(auth.status).toBe("untrusted");
    expect(auth.senderMatches).toBe(false);
  });

  it("flags failed DKIM or SPF as forged", () => {
    const auth = verifyEmailAuthentication({
      from: "alerts@axis.bank.in",
      "authentication-results": "mx.icloud.com; dkim=fail (header.i=@axis.bank.in); spf=fail",
    });
    expect(auth.status).toBe("forged");
  });

  it("successfully parses genuine Axis Bank credit alert fixture (from screenshot)", () => {
    const fixtureHtml = `
      <html>
        <body>
          <div style="font-family: Arial, sans-serif;">
            <h2>Dear Customer,</h2>
            <p>INR 1.00 was credited to your A/c.</p>
            <table>
              <tr><td>Amount Credited:</td><td><strong>INR 1.00</strong></td></tr>
              <tr><td>Account Number:</td><td><strong>XX1995</strong></td></tr>
              <tr><td>Date & Time:</td><td>02-11-26, 00:14:02 IST</td></tr>
              <tr><td>Transaction Info:</td><td>UPI/P2A/630722119955/VIKASH S/IOBA/UPI</td></tr>
            </table>
          </div>
        </body>
      </html>
    `;

    const alert = parseAxisCreditAlert({
      messageId: "<axis-alert-test-001@axis.bank.in>",
      subject: "INR 1.00 was credited to your A/c.",
      from: "Axis Bank Alerts <alerts@axis.bank.in>",
      headers: {
        from: "Axis Bank Alerts <alerts@axis.bank.in>",
        "authentication-results": "mx.icloud.com; dkim=pass header.d=axis.bank.in header.i=@axis.bank.in; spf=pass (smtp.mailfrom=alerts@axis.bank.in)",
      },
      html: fixtureHtml,
    });

    expect(alert).not.toBeNull();
    expect(alert?.bank).toBe("AXIS_BANK");
    expect(alert?.direction).toBe("CREDIT");
    expect(alert?.amountPaise).toBe(100);
    expect(alert?.receivingAccountSuffix).toBe("1995");
    expect(alert?.utr).toBe("630722119955");
    expect(alert?.payerName).toBe("VIKASH S");
    expect(alert?.sourceBank).toBe("IOBA");
    expect(alert?.transactionTime).toBe("2026-11-01T18:44:02.000Z");
    expect(alert?.isEligibleForAutoReconcile).toBe(true);
    expect(alert?.auth.status).toBe("authenticated");
  });

  it("correctly converts ₹180.00 ticket price to 18000 paise", () => {
    const fixtureText = `
      INR 180.00 was credited to your A/c.
      Amount Credited: INR 180.00
      Account Number: XX1995
      Date & Time: 02-11-26, 10:30:00 IST
      Transaction Info: UPI/P2A/630799887766/KISHORE/HDFC/UPI
    `;

    const alert = parseAxisCreditAlert({
      messageId: "<axis-180-test@axis.bank.in>",
      subject: "INR 180.00 was credited to your A/c.",
      from: "alerts@axis.bank.in",
      headers: {
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.icloud.com; dkim=pass header.d=axis.bank.in; spf=pass",
      },
      text: fixtureText,
    });

    expect(alert).not.toBeNull();
    expect(alert?.amountPaise).toBe(18000);
    expect(alert?.receivingAccountSuffix).toBe("1995");
    expect(alert?.utr).toBe("630799887766");
    expect(alert?.isEligibleForAutoReconcile).toBe(true);
  });

  it("ignores debit alerts", () => {
    const fixtureText = `
      INR 500.00 was debited from your A/c.
      Account Number: XX1995
      Transaction Info: UPI/P2A/630700000000/MERCHANT/UPI
    `;

    const alert = parseAxisCreditAlert({
      messageId: "<debit-alert@axis.bank.in>",
      subject: "INR 500.00 was debited from your A/c.",
      from: "alerts@axis.bank.in",
      headers: { from: "alerts@axis.bank.in" },
      text: fixtureText,
    });

    expect(alert).toBeNull();
  });

  it("parses three-letter month abbreviations and 12-hour AM/PM formats accurately", () => {
    // DD-Mon-YY
    expect(parseAxisTimestamp("02-Nov-26, 00:14:02 IST")).toBe("2026-11-01T18:44:02.000Z");
    // DD-Mon-YYYY
    expect(parseAxisTimestamp("02-Nov-2026 00:14:02 IST")).toBe("2026-11-01T18:44:02.000Z");
    // 12-hour AM
    expect(parseAxisTimestamp("02-11-26 10:30:00 AM IST")).toBe("2026-11-02T05:00:00.000Z");
    // 12-hour PM
    expect(parseAxisTimestamp("02-11-26 10:30:00 PM IST")).toBe("2026-11-02T17:00:00.000Z");
  });

  it("extracts 12-digit UTR at index 3 without corrupting payerName", () => {
    // Index 3 with numeric channel/batch sub-code: UPI/CR/01/<UTR>/<PAYER>/<BANK>/UPI
    const parsed1 = parseTransactionInfo("UPI/CR/01/630722119955/VIKASH S/IOBA/UPI");
    expect(parsed1.utr).toBe("630722119955");
    expect(parsed1.payerName).toBe("VIKASH S");
    expect(parsed1.sourceBank).toBe("IOBA");
    expect(parsed1.channel).toBe("UPI");

    // Index 3 with order reference: UPI/CR/CSC-ORD-ABC123DEF456/<UTR>/<PAYER>/<BANK>
    const parsed2 = parseTransactionInfo("UPI/CR/CSC-ORD-ABC123DEF456/630722119955/VIKASH S/IOBA");
    expect(parsed2.utr).toBe("630722119955");
    expect(parsed2.payerName).toBe("VIKASH S");
    expect(parsed2.sourceBank).toBe("IOBA");
    expect(parsed2.orderReference).toBe("CSC-ORD-ABC123DEF456");
  });

  it("converts amounts with ₹ sign and integer paise avoiding IEEE 754 drift", () => {
    const fixtureText = `
      Dear Customer,
      ₹ 180.00 was credited to your A/c XX1995 on 02-Nov-2026.
      Amount Credited: ₹ 180.00
      Transaction Info: UPI/CR/01/630799887766/VIKASH S/IOBA/UPI
    `;

    const alert = parseAxisCreditAlert({
      messageId: "<axis-rupee-test@axis.bank.in>",
      subject: "₹ 180.00 was credited to your A/c.",
      from: "alerts@axis.bank.in",
      headers: {
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.icloud.com; dkim=pass header.d=axis.bank.in; spf=pass",
      },
      text: fixtureText,
    });

    expect(alert).not.toBeNull();
    expect(alert?.amountPaise).toBe(18000);
    expect(alert?.utr).toBe("630799887766");
    expect(alert?.payerName).toBe("VIKASH S");
    expect(alert?.isEligibleForAutoReconcile).toBe(false);
  });

  it("extracts receiving account suffix with strict word boundaries", () => {
    // Matches 4-digit suffix
    const fixture1 = "credited to your A/c XX1995. Amount: INR 180.00. Transaction Info: UPI/P2A/630722119955/PAYER/UPI";
    const alert1 = parseAxisCreditAlert({
      messageId: "<acc-1@axis.bank.in>",
      subject: "INR 180.00 was credited",
      from: "alerts@axis.bank.in",
      headers: {
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.icloud.com; dkim=pass header.d=axis.bank.in; spf=pass",
      },
      text: fixture1,
    });
    expect(alert1?.receivingAccountSuffix).toBe("1995");

    // Matches 'ending in 1995'
    const fixture2 = "credited to Account ending in 1995. Amount: INR 180.00. Transaction Info: UPI/P2A/630722119955/PAYER/UPI";
    const alert2 = parseAxisCreditAlert({
      messageId: "<acc-2@axis.bank.in>",
      subject: "INR 180.00 was credited",
      from: "alerts@axis.bank.in",
      headers: {
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.icloud.com; dkim=pass header.d=axis.bank.in; spf=pass",
      },
      text: fixture2,
    });
    expect(alert2?.receivingAccountSuffix).toBe("1995");
  });

  it("disallows auto-reconcile for mismatched receiving account suffix", () => {
    const fixtureText = `
      INR 180.00 was credited to your A/c.
      Amount Credited: INR 180.00
      Account Number: XX4444
      Date & Time: 02-11-26, 10:30:00 IST
      Transaction Info: UPI/P2A/630799887766/JOHN/HDFC/UPI
    `;

    const alert = parseAxisCreditAlert({
      messageId: "<wrong-account@axis.bank.in>",
      subject: "INR 180.00 was credited to your A/c.",
      from: "alerts@axis.bank.in",
      headers: {
        from: "alerts@axis.bank.in",
        "authentication-results": "mx.icloud.com; dkim=pass header.d=axis.bank.in; spf=pass",
      },
      text: fixtureText,
    });

    expect(alert).not.toBeNull();
    expect(alert?.receivingAccountSuffix).toBe("4444");
    expect(alert?.isEligibleForAutoReconcile).toBe(false);
    expect(alert?.rejectionReason).toContain("does not match expected CSC account");
  });
});
