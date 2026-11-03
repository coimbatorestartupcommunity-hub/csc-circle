import { ImapFlow } from "imapflow";
import { getImapConfig } from "./config";
import { parseMimeEmail, type RawEmailInput } from "./axis-parser";
import { verifyRawEmailAuthentication } from "./email-auth";

export interface ImapHealthCheckResult {
  ok: boolean;
  message: string;
  host: string;
  port: number;
  username: string;
  mailboxSelected?: string;
  totalMessages?: number;
  uidNext?: number;
  uidValidity?: number;
  backlogEstimate?: number;
  error?: string;
}

export interface CheckImapConnectionOptions {
  lastUid?: number;
  uidValidity?: number;
}

/**
 * Creates an ImapFlow client configured for iCloud IMAP.
 */
function createClient(username: string, password: string, host: string, port: number) {
  return new ImapFlow({
    host,
    port,
    secure: true,
    auth: {
      user: username,
      pass: password,
    },
    logger: false,
    tls: {
      rejectUnauthorized: true,
    },
    emitLogs: false,
  });
}

/**
 * Attempts connection with full username, falling back to local-part if authentication fails.
 */
async function connectWithFallback(onClient: (client: ImapFlow) => Promise<void>) {
  const config = getImapConfig();
  if (!config.isConfigured) {
    throw new Error("iCloud IMAP credentials are not configured in environment (ICLOUD_IMAP_APP_PASSWORD required)");
  }

  // Attempt 1: Full username
  let client = createClient(config.username, config.password, config.host, config.port);
  try {
    await client.connect();
    try {
      await onClient(client);
    } finally {
      await client.logout().catch(() => {});
    }
    return;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const isAuthError = /authentication|login|credential/i.test(errorMsg);

    // If username had @icloud.com and auth failed, try username-only
    if (isAuthError && config.username.includes("@")) {
      const localPart = config.username.split("@")[0];
      client = createClient(localPart, config.password, config.host, config.port);
      try {
        await client.connect();
        try {
          await onClient(client);
        } finally {
          await client.logout().catch(() => {});
        }
        return;
      } catch (fallbackErr: unknown) {
        throw fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
      }
    }
    throw err instanceof Error ? err : new Error(errorMsg);
  }
}

/**
 * Health check operation for administrators and background monitors.
 * Verifies DNS resolution, TLS handshake, authentication, mailbox selection,
 * checks UIDVALIDITY alignment, and computes pending bank alert backlog estimate.
 */
export async function checkImapConnection(options: CheckImapConnectionOptions = {}): Promise<ImapHealthCheckResult> {
  const config = getImapConfig();
  if (!config.isConfigured) {
    return {
      ok: false,
      message: "iCloud IMAP password not configured. Set ICLOUD_IMAP_APP_PASSWORD in environment.",
      host: config.host,
      port: config.port,
      username: config.username,
      error: "MISSING_CREDENTIALS",
    };
  }

  let mailboxSelected = "INBOX";
  let totalMessages = 0;
  let uidValidity = 0;
  let uidNext = 0;
  let backlogEstimate = 0;

  try {
    await connectWithFallback(async (client) => {
      const lock = await client.getMailboxLock("INBOX", { readOnly: true });
      try {
        mailboxSelected = client.mailbox ? client.mailbox.path : "INBOX";
        totalMessages = typeof client.mailbox === "object" && client.mailbox ? client.mailbox.exists : 0;
        const rawValidity = client.mailbox ? client.mailbox.uidValidity : 0;
        uidValidity = typeof rawValidity === "bigint" ? Number(rawValidity) : Number(rawValidity ?? 0);
        uidNext = client.mailbox ? client.mailbox.uidNext : 0;

        // Estimate pending bank alert backlog
        if (options.lastUid !== undefined && totalMessages > 0) {
          const lastUid = options.lastUid;
          const searchCriteria: Record<string, unknown> = {
            from: "alerts@axis.bank.in",
            ...(lastUid > 0 ? { uid: `${lastUid + 1}:*` } : {}),
          };
          try {
            const found = await client.search(searchCriteria, { uid: true });
            if (Array.isArray(found)) {
              backlogEstimate = found.filter((uid) => typeof uid === "number" && uid > lastUid).length;
            }
          } catch {
            // Fallback: estimate from uidNext
            if (uidNext > 0 && lastUid > 0) {
              backlogEstimate = Math.max(0, uidNext - 1 - lastUid);
            }
          }
        }
      } finally {
        lock.release();
      }
    });

    return {
      ok: true,
      message: "Successfully connected to iCloud IMAP over TLS and selected INBOX in read-only mode.",
      host: config.host,
      port: config.port,
      username: config.username,
      mailboxSelected,
      totalMessages,
      uidNext,
      uidValidity,
      backlogEstimate,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: "IMAP health check failed.",
      host: config.host,
      port: config.port,
      username: config.username,
      error: errorMsg,
    };
  }
}

export interface FetchBankAlertsOptions {
  /** Maximum total messages to fetch across chunks. Defaults to 100. */
  limit?: number;
  /** Chunk size for individual IMAP fetch operations. Defaults to 25. */
  chunkSize?: number;
  /** Explicit override for maximum total messages to drain. */
  maxMessages?: number;
  /** Last processed UID cursor. */
  lastUid?: number;
  /** Expected UIDVALIDITY from previous runs. */
  expectedUidValidity?: number | bigint;
  /** Soft time budget in milliseconds before returning partial batch (default: 20000ms). */
  timeLimitMs?: number;
}

export interface FetchBankAlertsResult {
  messages: RawEmailInput[];
  highestUid: number;
  uidValidity: number;
  mailboxName: string;
  hasMore?: boolean;
}

/**
 * Fetches recent bank alerts from iCloud mailbox in read-only mode.
 * - Always filters by sender alerts@axis.bank.in to prevent non-bank email pollution.
 * - Conforms to RFC 3501 UIDVALIDITY: resets cursor to 0 on validity change.
 * - Drains backlogs exceeding 25 and 100+ messages using chunked pagination.
 * - Respects time budget to ensure safe database commit and lease release.
 */
export async function fetchRecentBankAlerts(options: FetchBankAlertsOptions = {}): Promise<FetchBankAlertsResult> {
  // Backward compatibility with reconciler passing limit: 25
  const chunkSize = Math.max(
    1,
    Math.min(options.chunkSize ?? (options.limit && options.limit <= 25 ? options.limit : 25), 50)
  );
  const maxMessages = Math.max(1, options.maxMessages ?? (options.limit && options.limit > 25 ? options.limit : 100));
  const timeLimitMs = options.timeLimitMs ?? 20_000;
  const startTime = Date.now();

  let lastUid = options.lastUid ?? 0;
  let highestUid = lastUid;
  let uidValidity = 0;
  let mailboxName = "INBOX";
  const rawEmails: RawEmailInput[] = [];
  let hasMore = false;

  await connectWithFallback(async (client) => {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      if (!client.mailbox) return;

      mailboxName = client.mailbox.path || "INBOX";
      const rawValidity = client.mailbox.uidValidity;
      uidValidity = typeof rawValidity === "bigint" ? Number(rawValidity) : Number(rawValidity ?? 0);

      // RFC 3501 §2.3.1.1: If UIDVALIDITY has changed on the server,
      // all existing UIDs are invalid and the client MUST discard all stored UIDs.
      if (
        options.expectedUidValidity &&
        Number(options.expectedUidValidity) > 0 &&
        Number(options.expectedUidValidity) !== uidValidity
      ) {
        lastUid = 0;
        highestUid = 0;
      }

      if (client.mailbox.exists === 0) {
        return;
      }

      // IMAP Search Criteria:
      // ALWAYS include from: "alerts@axis.bank.in" alongside UID range when lastUid > 0.
      const searchCriteria: Record<string, unknown> = {
        from: "alerts@axis.bank.in",
        ...(lastUid > 0 ? { uid: `${lastUid + 1}:*` } : {}),
      };

      let uids: number[] = [];
      try {
        const found = await client.search(searchCriteria, { uid: true });
        uids = Array.isArray(found) ? (found as number[]) : [];
      } catch {
        // Fallback: search by sender only, then strictly filter by UID locally
        try {
          const fallback = await client.search({ from: "alerts@axis.bank.in" }, { uid: true });
          uids = Array.isArray(fallback) ? (fallback as number[]) : [];
        } catch {
          uids = [];
        }
      }

      // Filter out any UIDs <= lastUid and sort ascending (oldest unhandled first)
      const sortedUids = uids
        .filter((uid) => typeof uid === "number" && uid > lastUid)
        .sort((a, b) => a - b);

      if (sortedUids.length === 0) {
        return;
      }

      if (sortedUids.length > maxMessages) {
        hasMore = true;
      }

      const uidsToProcess = sortedUids.slice(0, maxMessages);

      // Chunked draining loop: fetch messages in batches of chunkSize (default 25)
      for (let i = 0; i < uidsToProcess.length; i += chunkSize) {
        // Time budget check: leave sufficient headroom for database transaction & lease release
        if (Date.now() - startTime >= timeLimitMs && rawEmails.length > 0) {
          hasMore = true;
          break;
        }

        const chunk = uidsToProcess.slice(i, i + chunkSize);
        if (chunk.length === 0) break;

        const messages = await client.fetchAll(
          chunk,
          { envelope: true, bodyStructure: true, source: true },
          { uid: true }
        );

        for (const msg of messages) {
          if (msg.uid > highestUid) {
            highestUid = msg.uid;
          }

          let emailInput: RawEmailInput;
          if (msg.source) {
            emailInput = await parseMimeEmail(msg.source);
            emailInput.cryptographicAuth = await verifyRawEmailAuthentication(msg.source);
            emailInput.imapUid = msg.uid;
            emailInput.imapUidValidity = uidValidity;
            emailInput.imapMailbox = mailboxName;
            if (msg.envelope?.messageId) emailInput.messageId = msg.envelope.messageId;
            if (msg.envelope?.date) emailInput.date = msg.envelope.date;
            if (msg.envelope?.subject && !emailInput.subject) emailInput.subject = msg.envelope.subject;
            if (msg.envelope?.from?.[0]?.address && !emailInput.from) emailInput.from = msg.envelope.from[0].address;
          } else {
            emailInput = {
              messageId: msg.envelope?.messageId || `<uid-${msg.uid}@icloud>`,
              subject: msg.envelope?.subject || "",
              from: msg.envelope?.from?.[0]?.address || "",
              headers: {},
              date: msg.envelope?.date,
              imapUid: msg.uid,
              imapUidValidity: uidValidity,
              imapMailbox: mailboxName,
            };
          }
          rawEmails.push(emailInput);
        }
      }
    } finally {
      lock.release();
    }
  });

  return {
    messages: rawEmails,
    highestUid,
    uidValidity,
    mailboxName,
    hasMore,
  };
}

export interface FetchMessagesByIdResult {
  messages: RawEmailInput[];
  errors: string[];
}

/**
 * Targeted re-fetch of specific messages by RFC 822 Message-ID.
 * Used to re-verify stranded `needs_review` evidence after configuration
 * changes (for example a DKIM allowlist added after the original import).
 * Read-only: it never advances the UID cursor.
 */
export async function fetchMessagesById(
  messageIds: string[],
  options: { timeLimitMs?: number; maxMessages?: number } = {}
): Promise<FetchMessagesByIdResult> {
  const ids = [...new Set(messageIds.filter(Boolean))].slice(0, Math.max(1, options.maxMessages ?? 20));
  const timeLimitMs = options.timeLimitMs ?? 20_000;
  const startTime = Date.now();
  const messages: RawEmailInput[] = [];
  const errors: string[] = [];
  if (ids.length === 0) return { messages, errors };

  await connectWithFallback(async (client) => {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      if (!client.mailbox) return;
      const mailboxName = client.mailbox.path || "INBOX";
      const rawValidity = client.mailbox.uidValidity;
      const uidValidity = typeof rawValidity === "bigint" ? Number(rawValidity) : Number(rawValidity ?? 0);

      for (const id of ids) {
        if (Date.now() - startTime >= timeLimitMs && messages.length > 0) break;
        try {
          const found = await client.search({ header: { "message-id": id } }, { uid: true });
          const uids = (Array.isArray(found) ? found : []).filter(
            (uid): uid is number => typeof uid === "number"
          );
          if (uids.length === 0) {
            errors.push(`Message not found in mailbox: ${id}`);
            continue;
          }
          const fetched = await client.fetchAll(
            uids.slice(0, 3),
            { envelope: true, bodyStructure: true, source: true },
            { uid: true }
          );
          for (const msg of fetched) {
            if (!msg.source) continue;
            const emailInput = await parseMimeEmail(msg.source);
            emailInput.cryptographicAuth = await verifyRawEmailAuthentication(msg.source);
            emailInput.imapUid = msg.uid;
            emailInput.imapUidValidity = uidValidity;
            emailInput.imapMailbox = mailboxName;
            if (msg.envelope?.messageId) emailInput.messageId = msg.envelope.messageId;
            if (msg.envelope?.date) emailInput.date = msg.envelope.date;
            if (msg.envelope?.subject && !emailInput.subject) emailInput.subject = msg.envelope.subject;
            if (msg.envelope?.from?.[0]?.address && !emailInput.from) {
              emailInput.from = msg.envelope.from[0].address;
            }
            messages.push(emailInput);
          }
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
    } finally {
      lock.release();
    }
  });

  return { messages, errors };
}
