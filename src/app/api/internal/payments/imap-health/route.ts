import { timingSafeEqual } from "node:crypto";
import { checkImapConnection } from "@/lib/payments/imap-client";
import { getAdminContext } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";


function verifySecret(request: Request): boolean {
  const secret = process.env.CSC_PAYMENT_RECONCILE_SECRET || process.env.RECONCILIATION_CRON_SECRET;
  if (!secret || secret.length < 32) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  const expectedBearer = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(authHeader);

  if (expectedBearer.length === supplied.length && timingSafeEqual(expectedBearer, supplied)) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  // Allow authorized admin OR secret-authenticated caller
  let isAuthorized = verifySecret(request);
  if (!isAuthorized) {
    try {
      const ctx = await getAdminContext();
      if (ctx.mode === "live" && ctx.permissions.has("payments.verify")) {
        isAuthorized = true;
      }
    } catch {
      // not admin session
    }
  }

  if (!isAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Query database payment_worker_state
  let workerState = {
    last_uid: 0,
    uid_validity: 0,
    last_sync_status: "idle",
    last_sync_started_at: null as string | null,
    last_sync_completed_at: null as string | null,
    last_sync_message_count: 0,
    last_sync_matched_count: 0,
    last_error: null as string | null,
    mailbox_name: "INBOX",
  };

  try {
    const sb = createAdminClient();
    const { data } = await sb
      .from("payment_worker_state")
      .select("last_uid, uid_validity, last_sync_status, last_sync_started_at, last_sync_completed_at, last_sync_message_count, last_sync_matched_count, last_error, mailbox_name")
      .eq("id", "primary")
      .maybeSingle();

    if (data) {
      workerState = {
        last_uid: Number(data.last_uid ?? 0),
        uid_validity: Number(data.uid_validity ?? 0),
        last_sync_status: data.last_sync_status,
        last_sync_started_at: data.last_sync_started_at,
        last_sync_completed_at: data.last_sync_completed_at,
        last_sync_message_count: data.last_sync_message_count,
        last_sync_matched_count: data.last_sync_matched_count,
        last_error: data.last_error,
        mailbox_name: data.mailbox_name,
      };
    }
  } catch {
    // Graceful fallback if database is offline or in local preview
  }

  // 2. Perform live IMAP check with worker state context
  const imapResult = await checkImapConnection({
    lastUid: workerState.last_uid,
    uidValidity: workerState.uid_validity,
  });

  const uidValidityAligned =
    workerState.uid_validity > 0 && imapResult.uidValidity !== undefined
      ? workerState.uid_validity === imapResult.uidValidity
      : true;

  const responseBody = {
    ok: imapResult.ok,
    connection: {
      host: imapResult.host,
      port: imapResult.port,
      authenticated: imapResult.ok,
    },
    mailbox: {
      name: imapResult.mailboxSelected || workerState.mailbox_name,
      total_messages: imapResult.totalMessages ?? 0,
    },
    worker: {
      last_uid: workerState.last_uid,
      uid_validity: workerState.uid_validity,
      uid_validity_aligned: uidValidityAligned,
      last_sync_status: workerState.last_sync_status,
      last_sync_started_at: workerState.last_sync_started_at,
      last_sync_completed_at: workerState.last_sync_completed_at,
      last_sync_message_count: workerState.last_sync_message_count,
      last_sync_matched_count: workerState.last_sync_matched_count,
      last_error: workerState.last_error,
      backlog_estimate: imapResult.backlogEstimate ?? 0,
    },
    message: imapResult.message,
    ...(imapResult.error ? { error: imapResult.error } : {}),
  };

  return Response.json(responseBody, {
    status: imapResult.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
