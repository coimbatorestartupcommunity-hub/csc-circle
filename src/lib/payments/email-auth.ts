import { UPI_CONFIG } from "./config";

export type EmailAuthStatus = "authenticated" | "needs_review" | "untrusted" | "forged";

export interface EmailAuthResult {
  status: EmailAuthStatus;
  reasons: string[];
  dkimPass: boolean;
  spfPass: boolean;
  senderMatches: boolean;
  dmarcPass?: boolean;
  details: Record<string, unknown>;
}

/**
 * Extracts and normalizes the pure RFC 5322 addr-spec from a header string.
 * Example: 'Axis Bank Alerts <alerts@axis.bank.in>' -> 'alerts@axis.bank.in'
 */
export function extractMailboxAddress(headerValue: string): string | null {
  if (!headerValue) return null;
  const angleMatch = headerValue.match(/<([^>]+)>/);
  const candidate = (angleMatch ? angleMatch[1] : headerValue).trim().toLowerCase();
  const valid = candidate.match(/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@([a-z0-9.-]+\.[a-z]{2,})$/i);
  return valid ? valid[0].toLowerCase() : null;
}

/**
 * Validates the cryptographic and infrastructure provenance of incoming bank alert emails.
 * Provider-independent layer suitable for Apple iCloud Mail headers.
 */
export function verifyEmailAuthentication(headers: Record<string, string | string[] | undefined>): EmailAuthResult {
  const getHeader = (key: string): string => {
    const val = headers[key.toLowerCase()] ?? headers[key];
    if (Array.isArray(val)) return val.join("\n");
    return typeof val === "string" ? val : "";
  };

  const from = getHeader("from");
  const sender = getHeader("sender");
  const authResults = getHeader("authentication-results").toLowerCase();
  const receivedSpf = getHeader("received-spf").toLowerCase();

  const reasons: string[] = [];
  const expectedSender = UPI_CONFIG.BANK_ALERT_SENDER.toLowerCase();

  // 1. Strict RFC 5322 Mailbox Address Verification (no substring matches)
  const parsedFrom = extractMailboxAddress(from);
  const parsedSender = extractMailboxAddress(sender);

  const senderMatches = parsedFrom === expectedSender || (parsedSender !== null && parsedSender === expectedSender);
  if (!senderMatches) {
    reasons.push(`Parsed sender mailbox (${parsedFrom || from}) does not strictly match approved Axis Bank address (${expectedSender})`);
    return {
      status: "untrusted",
      reasons,
      dkimPass: false,
      spfPass: false,
      senderMatches: false,
      details: { from, sender, parsedFrom, parsedSender },
    };
  }

  // 2. Verify Authentication-Results MTA provenance (reject foreign / attacker MTAs)
  const mtaMatch = authResults.match(/(?:^|\n)\s*([a-z0-9_.-]+\.[a-z]{2,})\s*;/i);
  if (mtaMatch) {
    const authservId = mtaMatch[1].toLowerCase();
    const isAppleOrIcloud = authservId.endsWith("apple.com") || authservId.endsWith("icloud.com");
    if (!isAppleOrIcloud) {
      reasons.push(`Authentication-Results MTA (${authservId}) does not originate from trusted Apple/iCloud infrastructure`);
      return {
        status: "untrusted",
        reasons,
        dkimPass: false,
        spfPass: false,
        senderMatches: true,
        details: { from, sender, authResultsSnippet: authResults.slice(0, 300) },
      };
    }
  }

  // 3. Check for explicit spoofing or failure in Authentication-Results
  let dkimPass = false;
  let spfPass = false;
  let dmarcPass: boolean | undefined = undefined;

  if (authResults) {
    // Check DKIM
    if (authResults.includes("dkim=pass")) {
      // Confirm domain alignment with Axis Bank
      if (
        authResults.includes("header.i=@axis.bank.in") ||
        authResults.includes("header.i=alerts@axis.bank.in") ||
        authResults.includes("header.d=axis.bank.in") ||
        authResults.includes("header.d=axisbank.com")
      ) {
        dkimPass = true;
      } else {
        reasons.push("DKIM passed but domain does not align with Axis Bank");
      }
    } else if (authResults.includes("dkim=fail") || authResults.includes("dkim=temperror")) {
      reasons.push("DKIM signature validation failed");
    }

    // Check SPF
    if (authResults.includes("spf=pass")) {
      spfPass = true;
    } else if (authResults.includes("spf=fail") || authResults.includes("spf=softfail")) {
      reasons.push("SPF check failed or soft-failed");
    }

    // Check DMARC
    if (authResults.includes("dmarc=pass")) {
      dmarcPass = true;
    } else if (authResults.includes("dmarc=fail")) {
      dmarcPass = false;
      reasons.push("DMARC alignment check failed");
    }
  }

  // Secondary check on Received-SPF header if not in Authentication-Results
  if (!spfPass && receivedSpf) {
    if (receivedSpf.startsWith("pass") || receivedSpf.includes("pass")) {
      spfPass = true;
    }
  }

  // Classify outcome
  let status: EmailAuthStatus = "needs_review";

  if (reasons.some((r) => r.includes("failed"))) {
    status = "forged";
  } else if (dkimPass && spfPass) {
    status = "authenticated";
  } else if (dkimPass || spfPass) {
    status = "needs_review";
    reasons.push("Only partial authentication (either DKIM or SPF passed, not both)");
  } else {
    status = "needs_review";
    reasons.push("No conclusive authentication results header found");
  }

  return {
    status,
    reasons,
    dkimPass,
    spfPass,
    dmarcPass,
    senderMatches,
    details: {
      from,
      sender,
      authResultsSnippet: authResults.slice(0, 300),
    },
  };
}
