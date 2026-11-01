import { ImapFlow } from "imapflow";
import { getImapConfig } from "./config";
import type { RawEmailInput } from "./axis-parser";

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
}

export interface FetchBankAlertsResult {
  messages: RawEmailInput[];
  highestUid: number;
}

/**
 * Fetches recent bank alerts from iCloud mailbox in read-only mode.
 * Bounded by limit (default 25) and tracks cursor UID.
 */
export async function fetchRecentBankAlerts(options: FetchBankAlertsOptions = {}): Promise<FetchBankAlertsResult> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 50);
  const lastUid = options.lastUid ?? 0;
  const rawEmails: RawEmailInput[] = [];
  let highestUid = lastUid;

  await connectWithFallback(async (client) => {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
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

      // Filter and limit
      uids = uids.filter((uid) => uid > lastUid).slice(-limit);

      if (uids.length === 0) return;

      for (const msg of await client.fetchAll(uids, { envelope: true, bodyStructure: true, source: true }, { uid: true })) {
        if (msg.uid > highestUid) highestUid = msg.uid;

        const envelope = msg.envelope;
        const fromAddress = envelope?.from?.[0]?.address || "";
        const subject = envelope?.subject || "";
        const messageId = envelope?.messageId || `<uid-${msg.uid}@icloud>`;
        const date = envelope?.date;

        // Parse raw source or headers
        const sourceStr = msg.source ? msg.source.toString("utf-8") : "";

        // Extract basic headers and body from raw source
        const headerEnd = sourceStr.indexOf("\r\n\r\n");
        const headersRaw = headerEnd !== -1 ? sourceStr.slice(0, headerEnd) : "";
        const bodyRaw = headerEnd !== -1 ? sourceStr.slice(headerEnd + 4) : sourceStr;

        const headers: Record<string, string> = {};
        const headerLines = headersRaw.split(/\r?\n(?=[^\s])/);
        for (const line of headerLines) {
          const colonIdx = line.indexOf(":");
          if (colonIdx > 0) {
            const name = line.slice(0, colonIdx).trim().toLowerCase();
            const val = line.slice(colonIdx + 1).replace(/\r?\n\s+/g, " ").trim();
            headers[name] = val;
          }
        }

        rawEmails.push({
          messageId,
          subject,
          from: fromAddress || headers["from"] || "",
          headers,
          text: bodyRaw,
          html: bodyRaw.includes("<html") || bodyRaw.includes("<body") ? bodyRaw : undefined,
          date,
        });
      }
    } finally {
      lock.release();
    }
  });

  return {
    messages: rawEmails,
    highestUid,
  };
}
