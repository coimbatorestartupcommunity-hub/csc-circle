import { createHash } from "node:crypto";
import { promises as dns } from "node:dns";
import { dkimVerify } from "mailauth/lib/dkim/verify";
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

type DnsResolver = (domain: string, rrtype: string) => Promise<string[][] | string[]>;

export interface RawEmailAuthOptions {
  approvedSigningDomains?: string[];
  resolver?: DnsResolver;
  dnsTimeoutMs?: number;
}

const EMAIL_AUTH_POLICY_VERSION = "csc-axis-dkim-v1";
const MAX_RAW_EMAIL_BYTES = 2 * 1024 * 1024;
const MAX_DKIM_SIGNATURES = 10;

function configuredSigningDomains(): string[] {
  return (process.env.CSC_PAYMENT_APPROVED_DKIM_DOMAINS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedDkimQuery(domain: string, approvedDomains: Set<string>): boolean {
  const normalized = domain.trim().toLowerCase().replace(/\.$/, "");
  return [...approvedDomains].some((approved) =>
    normalized.endsWith(`._domainkey.${approved}`)
  );
}

function createRestrictedResolver(
  approvedDomains: Set<string>,
  timeoutMs: number
): DnsResolver {
  return async (domain, rrtype) => {
    if (rrtype.toUpperCase() !== "TXT" || !isAllowedDkimQuery(domain, approvedDomains)) {
      const error = new Error("DKIM DNS query is outside the approved signing-domain allowlist");
      Object.assign(error, { code: "ENOTFOUND" });
      throw error;
    }

    return await Promise.race([
      dns.resolveTxt(domain),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          const error = new Error("DKIM DNS lookup timed out");
          Object.assign(error, { code: "ETIMEOUT" });
          reject(error);
        }, timeoutMs);
        timer.unref?.();
      }),
    ]);
  };
}

/**
 * Independently verifies DKIM over the untouched RFC 822 bytes. Carried
 * Authentication-Results/SPF headers are intentionally not trusted here: an
 * IMAP client does not have the SMTP peer IP, HELO, or envelope identity needed
 * to reproduce SPF, and those headers can be attacker supplied.
 */
export async function verifyRawEmailAuthentication(
  rawMessage: string | Buffer | Uint8Array,
  options: RawEmailAuthOptions = {}
): Promise<EmailAuthResult> {
  const raw = Buffer.isBuffer(rawMessage)
    ? rawMessage
    : Buffer.from(rawMessage);
  const reasons: string[] = [];
  const approvedDomains = new Set(
    (options.approvedSigningDomains ?? configuredSigningDomains())
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean)
  );

  if (raw.byteLength === 0 || raw.byteLength > MAX_RAW_EMAIL_BYTES) {
    return {
      status: "untrusted",
      reasons: ["Raw message is empty or exceeds the verification size limit"],
      dkimPass: false,
      spfPass: false,
      senderMatches: false,
      details: { policyVersion: EMAIL_AUTH_POLICY_VERSION, rawBytes: raw.byteLength },
    };
  }

  const signatureCount = (raw.toString("latin1").match(/^DKIM-Signature:/gim) ?? []).length;
  if (signatureCount === 0) {
    return {
      status: "needs_review",
      reasons: ["Message has no DKIM signature"],
      dkimPass: false,
      spfPass: false,
      senderMatches: false,
      details: { policyVersion: EMAIL_AUTH_POLICY_VERSION, signatureCount },
    };
  }
  if (signatureCount > MAX_DKIM_SIGNATURES) {
    return {
      status: "untrusted",
      reasons: ["Message exceeds the DKIM signature count limit"],
      dkimPass: false,
      spfPass: false,
      senderMatches: false,
      details: { policyVersion: EMAIL_AUTH_POLICY_VERSION, signatureCount },
    };
  }

  if (approvedDomains.size === 0) {
    return {
      status: "needs_review",
      reasons: ["No approved Axis Bank DKIM signing domain is configured"],
      dkimPass: false,
      spfPass: false,
      senderMatches: false,
      details: { policyVersion: EMAIL_AUTH_POLICY_VERSION, signatureCount },
    };
  }

  try {
    const verification = await dkimVerify(raw, {
      strict: true,
      rejectRsaSha1: true,
      minBitLength: 2048,
      resolver:
        options.resolver ??
        createRestrictedResolver(approvedDomains, options.dnsTimeoutMs ?? 3_000),
    });

    const expectedSender = UPI_CONFIG.BANK_ALERT_SENDER.toLowerCase();
    const normalizedFrom = verification.headerFrom.map((value) => value.toLowerCase());
    const senderMatches =
      verification.fromFields === 1 &&
      verification.fromSyntax === "valid" &&
      normalizedFrom.length === 1 &&
      normalizedFrom[0] === expectedSender;

    if (!senderMatches) {
      return {
        status: "untrusted",
        reasons: ["RFC 5322 From identity does not exactly match the approved Axis Bank sender"],
        dkimPass: false,
        spfPass: false,
        senderMatches: false,
        details: {
          policyVersion: EMAIL_AUTH_POLICY_VERSION,
          fromFields: verification.fromFields,
          fromSyntax: verification.fromSyntax,
          headerFrom: normalizedFrom,
        },
      };
    }

    const relevant = verification.results.filter((result) =>
      approvedDomains.has((result.signingDomain ?? "").toLowerCase())
    );
    const failedRelevant = relevant.filter((result) =>
      ["fail", "permerror", "policy"].includes(result.status.result)
    );
    if (failedRelevant.length > 0) {
      return {
        status: "forged",
        reasons: ["An approved-domain DKIM signature failed cryptographic verification"],
        dkimPass: false,
        spfPass: false,
        senderMatches: true,
        details: {
          policyVersion: EMAIL_AUTH_POLICY_VERSION,
          signatures: failedRelevant.map((result) => ({
            domain: result.signingDomain,
            selector: result.selector,
            result: result.status.result,
          })),
        },
      };
    }

    const passing = relevant.filter(
      (result) =>
        result.status.result === "pass" &&
        Boolean(result.status.aligned) &&
        !result.status.testing &&
        !result.canonBodyLengthLimited &&
        (result.status.underSized ?? 0) === 0 &&
        result.signatureTimeValid !== false
    );

    if (passing.length === 0) {
      const unrelatedPass = verification.results.some(
        (result) => result.status.result === "pass" && !relevant.includes(result)
      );
      reasons.push(
        unrelatedPass
          ? "DKIM passed only for an unapproved signing domain"
          : "No approved, aligned, full-body DKIM signature passed"
      );
      return {
        status: unrelatedPass ? "untrusted" : "needs_review",
        reasons,
        dkimPass: false,
        spfPass: false,
        senderMatches: true,
        details: {
          policyVersion: EMAIL_AUTH_POLICY_VERSION,
          signatures: verification.results.map((result) => ({
            domain: result.signingDomain,
            selector: result.selector,
            result: result.status.result,
            aligned: result.status.aligned,
            testing: result.status.testing,
            fullBody: !result.canonBodyLengthLimited,
          })),
        },
      };
    }

    const accepted = passing[0];
    return {
      status: "authenticated",
      reasons: [],
      dkimPass: true,
      spfPass: false,
      senderMatches: true,
      dmarcPass: true,
      details: {
        policyVersion: EMAIL_AUTH_POLICY_VERSION,
        verifiedAt: new Date().toISOString(),
        signingDomain: accepted.signingDomain,
        selector: accepted.selector,
        keyRecordHash: accepted.rr
          ? createHash("sha256").update(accepted.rr).digest("hex")
          : null,
        algorithm: accepted.algo,
        canonicalization: accepted.format,
        signatureTimeValid: accepted.signatureTimeValid,
        note: "SPF was not independently evaluated from IMAP evidence",
      },
    };
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : "DKIM verification failed");
    return {
      status: "needs_review",
      reasons,
      dkimPass: false,
      spfPass: false,
      senderMatches: false,
      details: { policyVersion: EMAIL_AUTH_POLICY_VERSION },
    };
  }
}

export const AXIS_DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*(?:axis\.bank\.in|axisbank\.com)$/i;

export interface DkimSignatureRecord {
  result: "pass" | "fail" | "softfail" | "neutral" | "temperror" | "permerror" | "none";
  domain: string | null;
  identity: string | null;
  isDomainAligned: boolean;
  isIdentityAligned: boolean;
  isAligned: boolean;
}

/**
 * Validates whether an email address or domain name is strictly aligned with Axis Bank.
 */
export function isAxisDomainAligned(domainOrEmail: string | null | undefined): boolean {
  if (!domainOrEmail || typeof domainOrEmail !== "string") return false;
  const cleaned = domainOrEmail.trim().toLowerCase().replace(/^<|>$/g, "");
  const atIdx = cleaned.lastIndexOf("@");
  const domain = atIdx !== -1 ? cleaned.slice(atIdx + 1) : cleaned;
  return AXIS_DOMAIN_PATTERN.test(domain);
}

/**
 * Extracts and normalizes pure RFC 5322 addr-spec from a header string.
 * Strips RFC 5322 comments, isolates display-name from angle-addr,
 * and rejects multi-mailbox injection attacks.
 */
export function extractMailboxAddress(headerValue: string): string | null {
  if (!headerValue || typeof headerValue !== "string") return null;

  // Reject headers with multiple unquoted comma-separated mailboxes
  let inQuote = false;
  let commaCount = 0;
  for (let i = 0; i < headerValue.length; i++) {
    if (headerValue[i] === '"' && (i === 0 || headerValue[i - 1] !== "\\")) {
      inQuote = !inQuote;
    } else if (headerValue[i] === "," && !inQuote) {
      commaCount++;
    }
  }
  if (commaCount > 0) return null;

  // Ensure no multiple angle-bracket pairs
  const angleMatches = [...headerValue.matchAll(/<([^>]+)>/g)];
  if (angleMatches.length > 1) return null;

  // Strip parenthesized comments: (comment)
  let cleaned = headerValue;
  while (/\([^()]*\)/.test(cleaned)) {
    cleaned = cleaned.replace(/\([^()]*\)/g, " ");
  }
  cleaned = cleaned.trim();

  // Extract candidate inside angle brackets or fallback to cleaned string
  const candidate = (angleMatches.length === 1 ? angleMatches[0][1] : cleaned).trim().toLowerCase();

  // Strict RFC 5322 addr-spec format validation
  const valid = candidate.match(
    /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@([a-z0-9.-]+\.[a-z]{2,})$/i
  );
  return valid ? valid[0].toLowerCase() : null;
}

/**
 * Validates the cryptographic and infrastructure provenance of incoming bank alert emails.
 * Provider-independent layer enforcing RFC 5322 sender identity, RFC 8601 Apple/iCloud
 * boundary MTA isolation, and cryptographic DKIM/domain alignment.
 */
export function verifyEmailAuthentication(
  headers: Record<string, string | string[] | undefined>
): EmailAuthResult {
  const getHeader = (key: string): string | string[] | undefined => {
    return headers[key.toLowerCase()] ?? headers[key];
  };

  const fromRaw = getHeader("from");
  const senderRaw = getHeader("sender");
  const authResultsRaw = getHeader("authentication-results");
  const receivedSpfRaw = getHeader("received-spf");

  const from = Array.isArray(fromRaw) ? fromRaw[0] || "" : typeof fromRaw === "string" ? fromRaw : "";
  const sender = Array.isArray(senderRaw) ? senderRaw[0] || "" : typeof senderRaw === "string" ? senderRaw : "";

  const reasons: string[] = [];
  const expectedSender = UPI_CONFIG.BANK_ALERT_SENDER.toLowerCase();

  // -------------------------------------------------------------------------
  // 1. Strict RFC 5322 Mailbox Identity Verification
  // -------------------------------------------------------------------------
  const parsedFrom = extractMailboxAddress(from);
  const parsedSender = sender && sender.trim() ? extractMailboxAddress(sender) : null;

  // Both From and Sender must be verified. Permissive || is strictly eliminated.
  const fromMatches = parsedFrom === expectedSender;
  const senderMatches = fromMatches && (sender && sender.trim() ? parsedSender === expectedSender : true);

  if (!senderMatches) {
    reasons.push(
      `Parsed sender mailbox (${parsedFrom || from}) does not strictly match approved Axis Bank address (${expectedSender})`
    );
    return {
      status: "untrusted",
      reasons,
      dkimPass: false,
      spfPass: false,
      senderMatches: false,
      details: { from, sender, parsedFrom, parsedSender },
    };
  }

  // -------------------------------------------------------------------------
  // 2. RFC 8601 Receiving-Mail Boundary MTA Isolation
  // -------------------------------------------------------------------------
  // Topmost Authentication-Results header is strictly authoritative (index 0)
  const topmostAuthResults = Array.isArray(authResultsRaw)
    ? authResultsRaw[0] || ""
    : typeof authResultsRaw === "string"
      ? authResultsRaw.split(/\r?\n(?=[^\s])/)[0]
      : "";

  let authservId = "";
  let isAppleOrIcloud = false;
  let dkimPass = false;
  let spfPass = false;
  let dmarcPass: boolean | undefined = undefined;
  let hasExplicitFailure = false;
  let mtaSpfEvaluated = false;
  const dkimSignatures: DkimSignatureRecord[] = [];
  let passingAlignedSignatures: DkimSignatureRecord[] = [];

  if (topmostAuthResults) {
    // Strip comments (including nested)
    let stripped = topmostAuthResults;
    while (/\([^()]*\)/.test(stripped)) {
      stripped = stripped.replace(/\([^()]*\)/g, " ");
    }
    stripped = stripped.trim();

    const semiIdx = stripped.indexOf(";");

    if (semiIdx !== -1) {
      const mtaToken = stripped.slice(0, semiIdx).trim().split(/\s+/)[0].toLowerCase();
      authservId = mtaToken;

      // Hostname boundary check: strictly *.apple.com or *.icloud.com
      isAppleOrIcloud = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*(?:apple\.com|icloud\.com)$/i.test(
        mtaToken
      );

      if (!isAppleOrIcloud) {
        reasons.push(
          `Authentication-Results MTA (${authservId}) does not originate from trusted Apple/iCloud boundary infrastructure`
        );
        return {
          status: "untrusted",
          reasons,
          dkimPass: false,
          spfPass: false,
          senderMatches: true,
          details: { from, sender, authservId, authResultsSnippet: topmostAuthResults.slice(0, 300) },
        };
      }

      // -----------------------------------------------------------------------
      // 3. Parameterized DKIM, SPF, and DMARC Token Parsing (RFC 8601)
      // -----------------------------------------------------------------------
      const DKIM_RESULT_REGEX =
        /\bdkim\s*=\s*(pass|fail|softfail|neutral|temperror|permerror|none)\b/i;
      const HEADER_D_REGEX =
        /\bheader\.d\s*=\s*(?:"([^"]+)"|([a-zA-Z0-9.-]+))/i;
      const HEADER_I_REGEX =
        /\bheader\.i\s*=\s*(?:"([^"]+)"|<?([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~@.-]+)>?)/i;
      const SPF_RESULT_REGEX =
        /\bspf\s*=\s*(pass|fail|softfail|neutral|temperror|permerror|none)\b/i;
      const SPF_MAILFROM_REGEX =
        /\bsmtp\.(?:mailfrom|mfrom)\s*=\s*(?:"([^"]+)"|<?([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~@.-]+)>?)/i;
      const SPF_HELO_REGEX =
        /\bsmtp\.helo\s*=\s*(?:"([^"]+)"|([a-zA-Z0-9.-]+))/i;
      const DMARC_RESULT_REGEX =
        /\bdmarc\s*=\s*(pass|fail|temperror|permerror|none)\b/i;

      // Tokenize ONLY from stripped string (rawClause fallback completely eliminated)
      const clauses = stripped
        .slice(semiIdx + 1)
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean);

      for (const clause of clauses) {
        // --- A. DKIM Clause Processing ---
        const dkimMatch = clause.match(DKIM_RESULT_REGEX);
        if (dkimMatch) {
          const result = dkimMatch[1].toLowerCase() as DkimSignatureRecord["result"];

          // Extract ONLY from stripped clause
          const dMatch = clause.match(HEADER_D_REGEX);
          const domain = dMatch ? (dMatch[1] || dMatch[2]).toLowerCase() : null;

          const iMatch = clause.match(HEADER_I_REGEX);
          const identity = iMatch ? (iMatch[1] || iMatch[2]).toLowerCase() : null;

          // Strict Axis Bank SDID Domain Alignment (header.d)
          const isDomainAligned = Boolean(domain && AXIS_DOMAIN_PATTERN.test(domain));

          // Optional AUID Alignment (header.i must not contradict Axis Bank if present)
          let isIdentityAligned = true;
          if (identity) {
            const atIdx = identity.lastIndexOf("@");
            const idDomain = atIdx !== -1 ? identity.slice(atIdx + 1) : identity;
            isIdentityAligned = AXIS_DOMAIN_PATTERN.test(idDomain);
          }

          // Both must align; header.i CANNOT substitute for header.d
          const isAligned = isDomainAligned && isIdentityAligned;

          dkimSignatures.push({
            result,
            domain,
            identity,
            isDomainAligned,
            isIdentityAligned,
            isAligned,
          });
        }

        // --- B. SPF Clause Processing ---
        const spfMatch = clause.match(SPF_RESULT_REGEX);
        if (spfMatch) {
          mtaSpfEvaluated = true;
          const res = spfMatch[1].toLowerCase();
          if (res === "pass") {
            const mfMatch = clause.match(SPF_MAILFROM_REGEX);
            const heloMatch = clause.match(SPF_HELO_REGEX);
            const mailFrom = mfMatch ? (mfMatch[1] || mfMatch[2]).toLowerCase() : null;
            const helo = heloMatch ? (heloMatch[1] || heloMatch[2]).toLowerCase() : null;
            const spfIdentity = mailFrom || helo;

            if (!spfIdentity || isAxisDomainAligned(spfIdentity)) {
              spfPass = true;
            } else {
              reasons.push(
                `SPF passed but envelope sender (${spfIdentity}) does not align with Axis Bank`
              );
              spfPass = false;
            }
          } else if (res === "fail" || res === "softfail") {
            hasExplicitFailure = true;
            reasons.push(`SPF check failed or soft-failed (${res})`);
          }
        }

        // --- C. DMARC Clause Processing ---
        const dmarcMatch = clause.match(DMARC_RESULT_REGEX);
        if (dmarcMatch) {
          const res = dmarcMatch[1].toLowerCase();
          if (res === "pass") {
            dmarcPass = true;
          } else if (res === "fail") {
            dmarcPass = false;
            hasExplicitFailure = true;
            reasons.push("DMARC alignment check failed");
          }
        }
      }

      // -----------------------------------------------------------------------
      // Multi-DKIM Signature Record Isolation & Evaluation
      // -----------------------------------------------------------------------
      const failingSignatures = dkimSignatures.filter(
        (s) => s.result === "fail" || s.result === "permerror" || s.result === "temperror"
      );

      // If ANY DKIM signature fails, flag explicit failure (forged/tampered)
      if (failingSignatures.length > 0) {
        hasExplicitFailure = true;
        reasons.push(
          `DKIM signature validation failed (${failingSignatures
            .map((s) => `${s.domain || "unknown"}:${s.result}`)
            .join(", ")})`
        );
      }

      passingAlignedSignatures = dkimSignatures.filter(
        (s) => s.result === "pass" && s.isAligned
      );

      const passingUnalignedSignatures = dkimSignatures.filter(
        (s) => s.result === "pass" && !s.isAligned
      );

      if (passingAlignedSignatures.length > 0 && failingSignatures.length === 0) {
        dkimPass = true;
      } else if (
        failingSignatures.length === 0 &&
        passingAlignedSignatures.length === 0 &&
        passingUnalignedSignatures.length > 0
      ) {
        // Only unaligned/third-party signatures passed (e.g. evil.com)
        const unalignedDomains = passingUnalignedSignatures
          .map((s) => s.domain || s.identity || "unaligned")
          .join(", ");
        reasons.push(`DKIM passed but domain does not align with Axis Bank (${unalignedDomains})`);
        return {
          status: "untrusted",
          reasons,
          dkimPass: false,
          spfPass: false,
          senderMatches: true,
          details: {
            from,
            sender,
            authservId,
            dkimDomain: passingUnalignedSignatures[0]?.domain || null,
            dkimSignatures,
            authResultsSnippet: topmostAuthResults.slice(0, 300),
          },
        };
      }
    } else {
      reasons.push("Authentication-Results header missing RFC 8601 delimiter");
    }
  } else {
    reasons.push("No conclusive authentication results header found");
  }

  // -------------------------------------------------------------------------
  // 4. Secondary Received-SPF Header Fallback (Verified Border MTA Only)
  // -------------------------------------------------------------------------
  // Fallback is permitted ONLY if border MTA did NOT evaluate SPF.
  // Topmost Authentication-Results is authoritative. Under NO circumstances may
  // Received-SPF override an authoritative SPF result from the boundary MTA.
  if (!mtaSpfEvaluated && !spfPass && receivedSpfRaw) {
    const rawRSpf = Array.isArray(receivedSpfRaw) ? receivedSpfRaw[0] : receivedSpfRaw;
    if (typeof rawRSpf === "string") {
      const cleanedRSpf = rawRSpf.trim();

      // Verify border MTA provenance: must originate from Apple/iCloud infrastructure
      const mtaMatch =
        cleanedRSpf.match(/\(\s*([a-zA-Z0-9.-]+)\s*:/) ||
        cleanedRSpf.match(/\breceiver\s*=\s*([a-zA-Z0-9.-]+)/i);

      const rSpfMta = mtaMatch ? mtaMatch[1].toLowerCase() : null;
      const isBorderMta =
        rSpfMta !== null &&
        /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*(?:apple\.com|icloud\.com)$/i.test(rSpfMta);

      // Extract domain identity from Received-SPF
      const domainMatch =
        cleanedRSpf.match(/\bdomain of\s+<?([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~@.-]+)>?/i) ||
        cleanedRSpf.match(/\benvelope-from\s*=\s*"?<?([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~@.-]+)>?"?/i) ||
        cleanedRSpf.match(/\bidentity\s*=\s*mailfrom;?\s+domain\s*=\s*([a-zA-Z0-9.-]+)/i);

      const rSpfIdentity = domainMatch ? domainMatch[1] : null;

      if (isBorderMta) {
        if (/^\s*pass\b/i.test(cleanedRSpf)) {
          if (rSpfIdentity) {
            if (isAxisDomainAligned(rSpfIdentity)) {
              spfPass = true;
            } else {
              reasons.push(
                `Received-SPF passed but domain does not align with Axis Bank (${rSpfIdentity})`
              );
            }
          } else {
            spfPass = true;
          }
        } else if (/^\s*(?:fail|softfail)\b/i.test(cleanedRSpf)) {
          hasExplicitFailure = true;
          reasons.push("Received-SPF check failed or soft-failed");
        }
      } else {
        reasons.push(
          `Received-SPF header lacks verified Apple/iCloud boundary MTA provenance (${rSpfMta || "unknown"})`
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. Deterministic State Machine Classification
  // -------------------------------------------------------------------------
  let status: EmailAuthStatus = "needs_review";

  if (hasExplicitFailure) {
    status = "forged";
  } else if (dkimPass && spfPass && isAppleOrIcloud) {
    status = "authenticated";
  } else if (dkimPass || spfPass) {
    status = "needs_review";
    reasons.push("Only partial authentication (either DKIM or SPF passed, not both)");
  } else {
    status = "needs_review";
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
      authservId,
      dkimDomain: passingAlignedSignatures[0]?.domain || dkimSignatures[0]?.domain || null,
      dkimSignatures,
      authResultsSnippet: topmostAuthResults.slice(0, 300),
    },
  };
}
