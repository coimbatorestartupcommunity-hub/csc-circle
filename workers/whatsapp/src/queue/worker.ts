import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WHATSAPP_QUEUE_NAME, type WhatsAppJobData } from "./queue.js";
import type { WhatsAppProvider } from "../services/whatsapp.js";
import { buildContactAcknowledgementMessage, formatForWhatsApp } from "../utils/message-template.js";
import { getRandomDelay, sleep } from "../utils/delay.js";
import { logger } from "../utils/logger.js";

export interface WhatsAppWorkerOptions {
  connection: Redis;
  supabase: SupabaseClient;
  provider: WhatsAppProvider;
  companyName: string;
  delayMinMs: number;
  delayMaxMs: number;
  concurrency?: number;
}

export class WhatsAppWorkerService {
  private readonly worker: Worker<WhatsAppJobData>;
  private readonly supabase: SupabaseClient;
  private readonly provider: WhatsAppProvider;
  private readonly companyName: string;
  private readonly delayMinMs: number;
  private readonly delayMaxMs: number;

  constructor(options: WhatsAppWorkerOptions) {
    this.supabase = options.supabase;
    this.provider = options.provider;
    this.companyName = options.companyName;
    this.delayMinMs = options.delayMinMs;
    this.delayMaxMs = options.delayMaxMs;

    this.worker = new Worker<WhatsAppJobData>(
      WHATSAPP_QUEUE_NAME,
      async (job: Job<WhatsAppJobData>) => {
        return this.processJob(job);
      },
      {
        connection: options.connection,
        concurrency: Math.max(1, options.concurrency || 1),
      }
    );

    this.worker.on("ready", () => {
      logger.info("BullMQ WhatsApp worker is ready and listening for jobs");
    });

    this.worker.on("completed", (job) => {
      logger.info("Job successfully completed", {
        jobId: job.id,
        outboxId: job.data.outboxId,
      });
    });

    this.worker.on("failed", (job, err) => {
      logger.error("Job processing failed", {
        jobId: job?.id,
        outboxId: job?.data.outboxId,
        error: err.message,
      });
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
    logger.info("BullMQ WhatsApp worker closed cleanly");
  }

  private async processJob(job: Job<WhatsAppJobData>): Promise<void> {
    const startTime = Date.now();
    const { outboxId, contactId, recipientPhone, recipientChatId, messagePayload } = job.data;

    logger.info("Processing WhatsApp dispatch job", {
      jobId: job.id,
      outboxId,
      contactId: contactId || undefined,
      chatId: recipientChatId,
    });

    let messageText = "";

    // 1. Check if contact record consent verification is needed
    if (contactId) {
      const { data: contact, error: contactErr } = await this.supabase
        .from("contact_submissions")
        .select("whatsapp_consent, name, inquiry")
        .eq("id", contactId)
        .maybeSingle();

      if (contact) {
        if (!contact.whatsapp_consent) {
          logger.warn("Skipping WhatsApp dispatch: contact consent is false", {
            outboxId,
            contactId,
          });
          await this.updateStatus(outboxId, "cancelled", undefined, "CONSENT_REVOKED", "Consent is false");
          return;
        }

        const name = (typeof messagePayload.name === "string" && messagePayload.name) || contact.name || "there";
        const inquiry = (typeof messagePayload.inquiry === "string" && messagePayload.inquiry) || contact.inquiry || null;

        messageText =
          (typeof messagePayload.text === "string" && messagePayload.text) ||
          buildContactAcknowledgementMessage({
            name,
            companyName: this.companyName,
            inquiry,
          });
      }
    }

    if (!messageText) {
      messageText = (typeof messagePayload.text === "string" && messagePayload.text) || "";
    }

    if (!messageText) {
      logger.error("Empty message text for outbox item", { outboxId });
      await this.updateStatus(outboxId, "failed", undefined, "EMPTY_MESSAGE", "No text provided");
      return;
    }

    // Ensure WhatsApp markdown formatting is strictly normalized (*bold*, no stray **)
    messageText = formatForWhatsApp(messageText);

    // Anti-duplicate suppression: verify if an identical message type was already delivered to this recipient
    try {
      const { data: alreadyDelivered } = await this.supabase
        .from("whatsapp_message_outbox")
        .select("id")
        .eq("recipient_phone", recipientPhone)
        .eq("message_type", job.data.messageType || "system_notification")
        .eq("status", "sent")
        .neq("id", outboxId)
        .limit(1);

      if (alreadyDelivered && alreadyDelivered.length > 0) {
        logger.warn("Skipping duplicate outbox dispatch to recipient", {
          outboxId,
          recipientPhone,
          messageType: job.data.messageType,
        });
        await this.updateStatus(
          outboxId,
          "cancelled",
          undefined,
          "DUPLICATE_SUPPRESSED",
          "Message already successfully delivered previously to this recipient"
        );
        return;
      }
    } catch (dedupErr) {
      logger.warn("Deduplication check error, continuing with dispatch", { error: dedupErr });
    }

    // 2. Dispatch Pacing Delay (8-12s non-blocking pacing for anti-spam safety)
    const pacingDelay = getRandomDelay(this.delayMinMs, this.delayMaxMs);
    logger.info(`Applying dispatch pacing delay of ${pacingDelay}ms`, { outboxId, pacingDelay });
    await sleep(pacingDelay);

    // 4. Send Message via WhatsApp Provider (OpenWA)
    const result = await this.provider.send({
      chatId: recipientChatId,
      phone: recipientPhone,
      text: messageText,
    });

    const durationMs = Date.now() - startTime;

    // 5. Update Outbox Record Status
    if (result.success) {
      logger.info("WhatsApp message accepted by gateway", {
        outboxId,
        contactId: contactId || undefined,
        chatId: recipientChatId,
        messageId: result.messageId,
        durationMs,
      });

      await this.updateStatus(outboxId, "accepted_by_gateway", result.messageId);
    } else {
      logger.error("WhatsApp gateway dispatch failed", {
        outboxId,
        contactId: contactId || undefined,
        chatId: recipientChatId,
        category: result.errorCategory,
        errorCode: result.errorCode,
        error: result.errorMessage,
        durationMs,
      });

      await this.updateStatus(
        outboxId,
        "failed",
        undefined,
        result.errorCode || "GATEWAY_ERROR",
        result.errorMessage || "Unknown gateway error"
      );

      // If error is transient, throw to trigger BullMQ exponential retry
      if (result.errorCategory === "transient") {
        throw new Error(`Transient gateway failure (${result.errorCode}): ${result.errorMessage}`);
      }
    }
  }

  private async updateStatus(
    outboxId: string,
    status: string,
    messageId?: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    const { error } = await this.supabase.rpc("update_whatsapp_outbox_status", {
      p_outbox_id: outboxId,
      p_status: status,
      p_openwa_message_id: messageId || null,
      p_error_code: errorCode || null,
      p_error_message: errorMessage || null,
    });

    if (error) {
      logger.error("Failed to update outbox status in Supabase", {
        outboxId,
        status,
        error: error.message,
      });
    }
  }
}
