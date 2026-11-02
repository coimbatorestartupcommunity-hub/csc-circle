import { ImapFlow } from "imapflow";
import { getImapConfig } from "./config";
import { parseMimeEmail, type RawEmailInput } from "./axis-parser";

export interface ImapHealthCheckResult {
  ok: boolean;
  message: string;
  host: string;
  port: number;
  username: string;
  mailboxSelected?: string;
  totalMessages?: number;
  error?: string;
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
 * Health check operation for administrators.
 * Verifies DNS resolution, TLS handshake, authentication, mailbox selection and safe logout.
 */
export async function checkImapConnection(): Promise<ImapHealthCheckResult> {
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

  try {
    await connectWithFallback(async (client) => {
      const lock = await client.getMailboxLock("INBOX", { readOnly: true });
      try {
        mailboxSelected = client.mailbox ? client.mailbox.path : "INBOX";
        totalMessages = typeof client.mailbox === "object" && client.mailbox ? client.mailbox.exists : 0;
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
  limit?: number;
  lastUid?: number;
  expectedUidValidity?: number | bigint;
}

export interface FetchBankAlertsResult {
  messages: RawEmailInput[];
  highestUid: number;
  uidValidity: number;
  mailboxName: string;
}

/**
 * Fetches recent bank alerts from iCloud mailbox in read-only mode.
 * Bounded by limit (default 25) and tracks cursor UID and UIDVALIDITY.
 */
export async function fetchRecentBankAlerts(options: FetchBankAlertsOptions = {}): Promise<FetchBankAlertsResult> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 50);
  let lastUid = options.lastUid ?? 0;
  const rawEmails: RawEmailInput[] = [];
  let highestUid = lastUid;
  let uidValidity = 0;
  let mailboxName = "INBOX";

  await connectWithFallback(async (client) => {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      if (client.mailbox) {
        mailboxName = client.mailbox.path || "INBOX";
        const rawValidity = client.mailbox.uidValidity;
        uidValidity = typeof rawValidity === "bigint" ? Number(rawValidity) : Number(rawValidity ?? 0);

        // If UIDVALIDITY has changed on the server, existing UIDs are invalid (RFC 3501)
        if (options.expectedUidValidity && Number(options.expectedUidValidity) > 0 && Number(options.expectedUidValidity) !== uidValidity) {
          lastUid = 0;
          highestUid = 0;
        }
      }

      // Search for messages from Axis Bank alerts or matching subject
      // In IMAP: search criteria
      // If we have a lastUid, we search UID > lastUid; otherwise recent messages
      const searchCriteria: Record<string, unknown> = lastUid > 0
        ? { uid: `${lastUid + 1}:*` }
        : { from: "alerts@axis.bank.in" };

      let uids: number[] = [];
      try {
        const found = await client.search(searchCriteria, { uid: true });
        uids = Array.isArray(found) ? (found as number[]) : [];
      } catch {
        // Fallback to searching all and slicing
        const all = await client.search({ all: true }, { uid: true });
        uids = Array.isArray(all) ? (all as number[]) : [];
      }

      // Sort ascending to prevent message loss during backlogs (process oldest unhandled first)
      uids = uids
        .filter((uid) => uid > lastUid)
        .sort((a, b) => a - b)
        .slice(0, limit);

      if (uids.length === 0) return;

      for (const msg of await client.fetchAll(uids, { envelope: true, bodyStructure: true, source: true }, { uid: true })) {
        if (msg.uid > highestUid) highestUid = msg.uid;

        // Parse RFC 5322 MIME source if available
        let emailInput: RawEmailInput;
        if (msg.source) {
          emailInput = parseMimeEmail(msg.source);
          // Preserve server envelope properties if present
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
          };
        }

        rawEmails.push(emailInput);
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
  };
}
