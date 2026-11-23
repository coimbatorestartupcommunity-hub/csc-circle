import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const workerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  SUPABASE_URL: z.string().url().default("http://127.0.0.1:54321"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required for the worker"),
  OPENWA_BASE_URL: z.string().url().default("http://127.0.0.1:2785"),
  OPENWA_SESSION_ID: z.string().min(1).default("csc-circle"),
  OPENWA_API_KEY: z.string().optional().default(""),
  COMPANY_NAME: z.string().default("Coimbatore Startup Community"),
  MESSAGE_DELAY_MIN_MS: z.coerce.number().int().min(500).default(2000),
  MESSAGE_DELAY_MAX_MS: z.coerce.number().int().min(500).default(5000),
  OPENWA_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(15000),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(1),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(3000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  GROK_API_KEY: z.string().optional().default(""),
  GROQ_API_KEY: z.string().optional().default(""),
  GROK_MODEL: z.string().default("llama-3.3-70b-versatile"),
  WEBHOOK_PORT: z.coerce.number().int().default(3030),
  GITHUB_WEBHOOK_SECRET: z.string().optional().default(""),
  VERCEL_WEBHOOK_SECRET: z.string().optional().default(""),
  OPENWA_WEBHOOK_SECRET: z.string().optional().default(""),
  MODAL_AI_ENDPOINT: z.string().default("https://createwithvikash--ep-muse-spark-open-816b-a42b-server.us-west.modal.direct"),
  MODAL_PROXY_TOKEN: z.string().optional().default(""),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

let cachedEnv: WorkerEnv | null = null;

export function getWorkerEnv(): WorkerEnv {
  if (cachedEnv) return cachedEnv;

  const raw = {
    NODE_ENV: process.env.NODE_ENV || "development",
    REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    SUPABASE_URL:
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "http://127.0.0.1:54321",
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      "dev-service-role-key",
    OPENWA_BASE_URL: process.env.OPENWA_BASE_URL || "http://127.0.0.1:2785",
    OPENWA_SESSION_ID: process.env.OPENWA_SESSION_ID || "csc-circle",
    OPENWA_API_KEY: process.env.OPENWA_API_KEY || "",
    COMPANY_NAME: process.env.COMPANY_NAME || "Coimbatore Startup Community",
    MESSAGE_DELAY_MIN_MS: process.env.MESSAGE_DELAY_MIN_MS || "2000",
    MESSAGE_DELAY_MAX_MS: process.env.MESSAGE_DELAY_MAX_MS || "5000",
    OPENWA_REQUEST_TIMEOUT_MS: process.env.OPENWA_REQUEST_TIMEOUT_MS || "15000",
    WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY || "1",
    OUTBOX_POLL_INTERVAL_MS: process.env.OUTBOX_POLL_INTERVAL_MS || "3000",
    OUTBOX_BATCH_SIZE: process.env.OUTBOX_BATCH_SIZE || "10",
    GROK_API_KEY: process.env.GROK_API_KEY || "",
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    GROK_MODEL: process.env.GROK_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    WEBHOOK_PORT: process.env.WEBHOOK_PORT || "3030",
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || "",
    VERCEL_WEBHOOK_SECRET: process.env.VERCEL_WEBHOOK_SECRET || "",
    OPENWA_WEBHOOK_SECRET: process.env.OPENWA_WEBHOOK_SECRET || "",
    MODAL_AI_ENDPOINT:
      process.env.MODAL_AI_ENDPOINT ||
      "https://createwithvikash--ep-muse-spark-open-816b-a42b-server.us-west.modal.direct",
    MODAL_PROXY_TOKEN: process.env.MODAL_PROXY_TOKEN || "",
  };

  const parsed = workerEnvSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[Worker Config Error] Invalid environment configuration:", parsed.error.format());
    throw new Error("Worker configuration validation failed");
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
