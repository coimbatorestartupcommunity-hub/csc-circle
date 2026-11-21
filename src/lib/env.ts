import { z } from "zod";

/**
 * Centralized Environment Schema & Validation.
 * Adheres to Concept 09 ("Service Discovery & Config Hygiene") of 10 Things Every Vibe Coder Should Know:
 * - Validates essential environment configurations at boot.
 * - Prevents runtime surprises and missing-credential failures deep inside transactions.
 */

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "Supabase publishable key is required"),
});

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  CSC_KV_REST_API_URL: z.string().url().optional(),
  CSC_KV_REST_API_TOKEN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  ADMIN_INVITE_SECRET: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let validatedEnv: (ClientEnv & ServerEnv) | null = null;

export function validateEnv(): { valid: boolean; errors?: Record<string, string[]> } {
  const isServer = typeof window === "undefined";
  const rawEnv = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key",
    NODE_ENV: process.env.NODE_ENV || "development",
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CSC_KV_REST_API_URL: process.env.CSC_KV_REST_API_URL,
    CSC_KV_REST_API_TOKEN: process.env.CSC_KV_REST_API_TOKEN,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    ADMIN_INVITE_SECRET: process.env.ADMIN_INVITE_SECRET,
  };

  const clientResult = clientEnvSchema.safeParse(rawEnv);
  if (!clientResult.success) {
    return { valid: false, errors: clientResult.error.flatten().fieldErrors };
  }

  if (isServer) {
    const serverResult = serverEnvSchema.safeParse(rawEnv);
    if (!serverResult.success) {
      return { valid: false, errors: serverResult.error.flatten().fieldErrors };
    }
    validatedEnv = { ...clientResult.data, ...serverResult.data };
  } else {
    validatedEnv = {
      ...clientResult.data,
      NODE_ENV: "development",
    } as ClientEnv & ServerEnv;
  }

  return { valid: true };
}

export function getEnv(): ClientEnv & Partial<ServerEnv> {
  if (!validatedEnv) {
    validateEnv();
  }
  return validatedEnv ?? {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key",
    NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
  };
}
