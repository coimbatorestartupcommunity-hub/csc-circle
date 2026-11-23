import type { SupabaseClient } from "@supabase/supabase-js";
import type { Queue } from "bullmq";
import type { WhatsAppJobData } from "./queue.js";
import { logger } from "../utils/logger.js";
import { sleep } from "../utils/delay.js";

export interface OutboxDispatcherOptions {
  supabase: SupabaseClient;
  queue: Queue<WhatsAppJobData>;
  pollIntervalMs: number;
  batchSize: number;
}

export class OutboxDispatcher {
  private readonly supabase: SupabaseClient;
  private readonly queue: Queue<WhatsAppJobData>;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private isRunning = false;
  private stopRequested = false;

  constructor(options: OutboxDispatcherOptions) {
    this.supabase = options.supabase;
    this.queue = options.queue;
    this.pollIntervalMs = Math.max(500, options.pollIntervalMs);
    this.batchSize = Math.max(1, Math.min(options.batchSize, 50));
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.stopRequested = false;
    logger.info("Outbox dispatcher started", {
      pollIntervalMs: this.pollIntervalMs,
      batchSize: this.batchSize,
    });

    while (!this.stopRequested) {
      try {
        const count = await this.dispatchBatch();
        if (count === 0 && !this.stopRequested) {
          await sleep(this.pollIntervalMs);
        }
      } catch (err) {
        logger.error("Outbox dispatcher poll error", {
          error: err instanceof Error ? err.message : String(err),
        });
        if (!this.stopRequested) {
          await sleep(Math.max(this.pollIntervalMs, 5000));
        }
      }
    }

    this.isRunning = false;
    logger.info("Outbox dispatcher stopped cleanly");
  }

  async stop(): Promise<void> {
    this.stopRequested = true;
  }

  async dispatchBatch(): Promise<number> {
    // Call atomic RPC function that uses FOR UPDATE SKIP LOCKED
    const { data, error } = await this.supabase.rpc("claim_whatsapp_outbox_batch", {
      p_batch_size: this.batchSize,
      p_lock_duration_seconds: 300,
    });

    if (error) {
      logger.error("Failed to claim outbox batch from Supabase", {
        errorCode: error.code,
        error: error.message,
      });
      return 0;
    }

    const rows = (data as Array<{
      id: string;
      contact_id: string;
      recipient_phone: string;
      recipient_chat_id: string;
      message_type: string;
      message_payload: Record<string, unknown>;
      attempts: number;
      max_attempts: number;
      idempotency_key: string;
    }>) || [];

    if (rows.length === 0) {
      return 0;
    }

    logger.info(`Claimed ${rows.length} pending outbox items for BullMQ enqueuing`);

    for (const row of rows) {
      try {
        const jobData: WhatsAppJobData = {
          outboxId: row.id,
          contactId: row.contact_id,
          recipientPhone: row.recipient_phone,
          recipientChatId: row.recipient_chat_id,
          messageType: row.message_type,
          messagePayload: row.message_payload || {},
          attempts: row.attempts,
          maxAttempts: row.max_attempts,
          idempotencyKey: row.idempotency_key,
        };

        // Enqueue with deterministic job ID: row.id
        await this.queue.add("send-whatsapp", jobData, {
          jobId: row.id,
          attempts: 3,
        });

        logger.info("Outbox item enqueued to BullMQ", {
          outboxId: row.id,
          contactId: row.contact_id,
          chatId: row.recipient_chat_id,
          attempts: row.attempts,
        });
      } catch (enqueueErr) {
        logger.error("Failed to enqueue outbox job to BullMQ", {
          outboxId: row.id,
          error: enqueueErr instanceof Error ? enqueueErr.message : String(enqueueErr),
        });
      }
    }

    return rows.length;
  }
}
