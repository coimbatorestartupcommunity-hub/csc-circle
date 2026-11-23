import { Queue } from "bullmq";
import type { Redis } from "ioredis";

export interface WhatsAppJobData {
  outboxId: string;
  contactId: string | null;
  recipientPhone: string;
  recipientChatId: string;
  messageType: string;
  messagePayload: {
    name?: string;
    phone?: string;
    chatId?: string;
    inquiry?: string | null;
    submittedAt?: string;
    text?: string;
    [key: string]: unknown;
  };
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string;
}

export const WHATSAPP_QUEUE_NAME = "whatsapp-messages";

export function createWhatsAppQueue(connection: Redis): Queue<WhatsAppJobData> {
  return new Queue<WhatsAppJobData>(WHATSAPP_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        age: 86400, // keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 604800, // keep failed jobs for 7 days
        count: 5000,
      },
    },
  });
}
