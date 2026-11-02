// @vitest-environment node
import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { dkimSign } from "mailauth";
import { verifyRawEmailAuthentication } from "@/lib/payments/email-auth";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const dnsRecord = `v=DKIM1; k=rsa; p=${publicKey
  .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s+/g, "")}`;

function rawMessage(body = "CSC payment credit reference CSC-ORD-ABC123DEF456") {
  return Buffer.from(
    [
      "From: Axis Bank Alerts <alerts@axis.bank.in>",
      "To: vikash752008@icloud.com",
      "Subject: INR 180.00 was credited to your A/c.",
      "Date: Mon, 02 Nov 2026 10:30:00 +0530",
      "Message-ID: <sanitized-test@axis.bank.in>",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
      "",
    ].join("\r\n")
  );
}

async function sign(message: Buffer, signingDomain = "axis.bank.in") {
  const result = await dkimSign(message, {
    strict: true,
    canonicalization: "relaxed/relaxed",
    headerList: ["from", "to", "subject", "date", "message-id", "mime-version", "content-type"],
    signatureData: [{ signingDomain, selector: "csc-test", privateKey }],
  });
  expect(result.errors).toEqual([]);
  return Buffer.concat([Buffer.from(result.signatures), message]);
}

const resolver = async () => [[dnsRecord]];

describe("raw Axis Bank DKIM verification", () => {
  it("authenticates an intact message signed by the explicitly approved domain", async () => {
    const result = await verifyRawEmailAuthentication(await sign(rawMessage()), {
      approvedSigningDomains: ["axis.bank.in"],
      resolver,
    });
    expect(result.status).toBe("authenticated");
    expect(result.dkimPass).toBe(true);
    expect(result.senderMatches).toBe(true);
    expect(result.spfPass).toBe(false);
  });

  it("classifies a body modified after signing as forged", async () => {
    const signed = await sign(rawMessage());
    const tampered = Buffer.from(signed.toString().replace("INR 180.00", "INR 980.00"));
    const result = await verifyRawEmailAuthentication(tampered, {
      approvedSigningDomains: ["axis.bank.in"],
      resolver,
    });
    expect(result.status).toBe("forged");
    expect(result.dkimPass).toBe(false);
  });

  it("does not trust forged Authentication-Results without a DKIM signature", async () => {
    const forged = Buffer.from(
      rawMessage().toString().replace(
        "To: vikash752008@icloud.com",
        "To: vikash752008@icloud.com\r\nAuthentication-Results: mx.icloud.com; dkim=pass header.d=axis.bank.in; spf=pass"
      )
    );
    const result = await verifyRawEmailAuthentication(forged, {
      approvedSigningDomains: ["axis.bank.in"],
      resolver,
    });
    expect(result.status).toBe("needs_review");
    expect(result.dkimPass).toBe(false);
  });

  it("rejects a valid signature from a domain outside the allowlist", async () => {
    const result = await verifyRawEmailAuthentication(await sign(rawMessage(), "example.com"), {
      approvedSigningDomains: ["axis.bank.in"],
      resolver,
    });
    expect(result.status).not.toBe("authenticated");
  });
});
