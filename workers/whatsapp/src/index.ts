import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import { getWorkerEnv } from "./config/env.js";
import { createRedisConnection } from "./queue/redis.js";
import { createWhatsAppQueue } from "./queue/queue.js";
import { OutboxDispatcher } from "./queue/dispatcher.js";
import { WhatsAppWorkerService } from "./queue/worker.js";
import { OpenWaClient } from "./services/openwa.js";
import { OpenWaProvider } from "./services/whatsapp.js";
import { logger } from "./utils/logger.js";
import { processInboundWhatsAppMessage } from "./services/incoming-processor.js";
import { syncEntityToKnowledgeStore } from "./services/live-queries.js";
import { executePreEventReminderCycle } from "./services/event-reminders.js";
import { executePostEventFeedbackCycle } from "./services/feedback-pipeline.js";

async function main() {
  logger.info("Initializing CSC WhatsApp Background Worker, Live Intelligence & Outbox Dispatcher...");

  const env = getWorkerEnv();

  // 1. Supabase Client with Service Role Key
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2. Redis Connection for BullMQ
  const redis = createRedisConnection(env.REDIS_URL);

  // 3. OpenWA Client & Provider
  const openwaClient = new OpenWaClient({
    baseUrl: env.OPENWA_BASE_URL,
    sessionId: env.OPENWA_SESSION_ID,
    apiKey: env.OPENWA_API_KEY,
    timeoutMs: env.OPENWA_REQUEST_TIMEOUT_MS,
  });
  const whatsappProvider = new OpenWaProvider(openwaClient);

  // 4. Queue
  const queue = createWhatsAppQueue(redis);

  // 5. Outbound Worker Service
  const workerService = new WhatsAppWorkerService({
    connection: redis,
    supabase,
    provider: whatsappProvider,
    companyName: env.COMPANY_NAME,
    delayMinMs: env.MESSAGE_DELAY_MIN_MS,
    delayMaxMs: env.MESSAGE_DELAY_MAX_MS,
    concurrency: env.WORKER_CONCURRENCY,
  });

  // 6. Outbox Dispatcher
  const dispatcher = new OutboxDispatcher({
    supabase,
    queue,
    pollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS,
    batchSize: env.OUTBOX_BATCH_SIZE,
  });

  dispatcher.start().catch((err) => {
    logger.error("Outbox dispatcher fatal error", { error: err.message });
  });

  // 7. Periodic 5-Minute Membership Auto-Approval Runner (runs every 30s)
  const approvalInterval = setInterval(async () => {
    try {
      const { data, error } = await supabase.rpc("csc_process_due_membership_claims");
      if (error) {
        logger.error("Error executing csc_process_due_membership_claims RPC", { error });
      } else if (data && data > 0) {
        logger.info(`Automated 5-minute approval workflow executed: ${data} membership claims approved!`);
      }
    } catch (err) {
      logger.error("Exception in membership approval loop", { error: err });
    }
  }, 30000);

  // 8. Periodic Universal Change Outbox Processor (runs every 10s)
  const changeOutboxInterval = setInterval(async () => {
    try {
      const { data: changes, error } = await supabase.rpc("claim_agent_change_outbox_batch", {
        p_batch_size: 20,
      });

      if (error || !changes || changes.length === 0) return;

      for (const change of changes) {
        try {
          await syncEntityToKnowledgeStore(
            change.entity_type,
            change.entity_id,
            change.change_type,
            change.payload
          );

          await supabase.rpc("update_agent_change_outbox_status", {
            p_change_id: change.id,
            p_status: "processed",
            p_error_message: null,
          });
        } catch (itemErr) {
          logger.error("Failed processing change outbox item", { id: change.id, error: itemErr });
          await supabase.rpc("update_agent_change_outbox_status", {
            p_change_id: change.id,
            p_status: "failed",
            p_error_message: itemErr instanceof Error ? itemErr.message : String(itemErr),
          });
        }
      }
    } catch (err) {
      logger.error("Exception in change outbox processor loop", { error: err });
    }
  }, 10000);

  // 9. Periodic Event Reminders (24h/2h) and Post-Event Feedback (runs every 15 mins)
  const eventAutomationInterval = setInterval(async () => {
    try {
      await executePreEventReminderCycle();
      await executePostEventFeedbackCycle();
    } catch (err) {
      logger.error("Exception in event automation cycle", { error: err });
    }
  }, 15 * 60 * 1000);

  // 10. OpenWA Keep-Alive & Auto-Reconnect (every 30 seconds)
  let reconnectInProgress = false;
  const openwaKeepaliveInterval = setInterval(async () => {
    if (reconnectInProgress) return;
    try {
      const { ready, status } = await openwaClient.checkSessionReadiness();
      if (!ready) {
        reconnectInProgress = true;
        logger.warn(`OpenWA session not ready (status: ${status}). Attempting auto-reconnect...`);
        const result = await openwaClient.startSession();
        if (result.success) {
          logger.info("OpenWA auto-reconnect initiated. Waiting for session to become ready...");
          // Wait 15s then verify
          await new Promise((r) => setTimeout(r, 15000));
          const recheckRes = await openwaClient.checkSessionReadiness();
          if (recheckRes.ready) {
            logger.info("OpenWA session reconnected and ready ✓");
          } else {
            logger.warn(`OpenWA session still not ready after reconnect: ${recheckRes.status || recheckRes.error}`);
          }
        } else {
          logger.error("OpenWA auto-reconnect request failed", { error: result.error });
        }
        reconnectInProgress = false;
      }
    } catch (err) {
      reconnectInProgress = false;
      logger.error("Exception in OpenWA keep-alive loop", { error: err });
    }
  }, 30000);

  // 10. Lightweight Inbound Webhook HTTP Server for OpenWA messages
  const server = http.createServer(async (req, res) => {
    const url = req.url || "/";

    if (req.method === "GET" && (url === "/health" || url === "/")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));
      return;
    }

    if (req.method === "POST" && (url === "/webhook/whatsapp" || url === "/api/webhook/whatsapp")) {
      let bodyStr = "";
      req.on("data", (chunk) => {
        bodyStr += chunk;
      });

      req.on("end", async () => {
        try {
          const payload = JSON.parse(bodyStr);
          // OpenWA event format: { event: "onMessage", data: { from: "...", body: "...", id: "..." } }
          const msgData = payload.data || payload;

          // Ignore self-sent messages and revoked messages
          if (msgData.fromMe === true || msgData.type === "revoked") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ received: true, ignored: true }));
            return;
          }

          const senderFrom =
            msgData.from ||
            msgData.chatId ||
            (msgData.id && typeof msgData.id === "object" ? msgData.id.remote : undefined);

          if (senderFrom && (msgData.body || msgData.type === "ptt" || msgData.type === "audio")) {
            logger.info("Processing inbound WhatsApp webhook message", {
              from: senderFrom,
              type: msgData.type,
              bodySnippet: typeof msgData.body === "string" ? msgData.body.slice(0, 40) : "",
            });

            // Process message asynchronously
            processInboundWhatsAppMessage(
              {
                from: senderFrom,
                body: msgData.body || "",
                senderName: msgData.sender?.pushname || msgData.pushname,
                messageId: typeof msgData.id === "string" ? msgData.id : msgData.id?._serialized,
                type: msgData.type,
                mimetype: msgData.mimetype,
              },
              openwaClient,
              redis
            ).catch((e) => logger.error("Error processing inbound message", { error: e }));
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ received: true }));
        } catch (parseErr) {
          logger.error("Invalid webhook payload received", { error: parseErr });
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(env.WEBHOOK_PORT, "0.0.0.0", () => {
    logger.info(`Inbound WhatsApp Webhook HTTP Server listening on port ${env.WEBHOOK_PORT}`);
  });

  // Non-blocking OpenWA readiness check
  openwaClient
    .checkSessionReadiness()
    .then((res) => {
      if (res.ready) {
        logger.info(`OpenWA session '${env.OPENWA_SESSION_ID}' is connected and ready`);
      } else {
        logger.warn(
          `OpenWA session '${env.OPENWA_SESSION_ID}' status: ${res.error || res.status}. Waiting for connection.`
        );
      }
    })
    .catch(() => {
      logger.warn(`Could not reach OpenWA at ${env.OPENWA_BASE_URL}. Ensure container is active.`);
    });

  // 10. Graceful Shutdown Handlers
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    clearInterval(approvalInterval);
    clearInterval(changeOutboxInterval);
    clearInterval(eventAutomationInterval);
    clearInterval(openwaKeepaliveInterval);

    try {
      server.close();
      await dispatcher.stop();
      await workerService.close();
      await queue.close();
      await redis.quit();
      logger.info("Graceful shutdown completed successfully. Exiting.");
      process.exit(0);
    } catch (err) {
      logger.error("Error during graceful shutdown", {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Fatal startup error in WhatsApp worker", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
