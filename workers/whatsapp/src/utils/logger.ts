export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "[EMPTY]";
  const str = String(phone).trim();
  if (str.length <= 4) return "***";
  const start = str.slice(0, Math.min(6, str.length - 2));
  const end = str.slice(-2);
  return `${start}****${end}`;
}

export interface LogContext {
  outboxId?: string;
  contactId?: string;
  jobId?: string;
  phone?: string;
  chatId?: string;
  status?: string;
  gatewayMessageId?: string;
  openwaMessageId?: string;
  errorCode?: string;
  error?: string | unknown;
  durationMs?: number;
  [key: string]: unknown;
}

export const logger = {
  info(message: string, context: LogContext = {}) {
    const sanitized = sanitizeContext(context);
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: "INFO", message, ...sanitized }));
  },
  warn(message: string, context: LogContext = {}) {
    const sanitized = sanitizeContext(context);
    console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: "WARN", message, ...sanitized }));
  },
  error(message: string, context: LogContext = {}) {
    const sanitized = sanitizeContext(context);
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "ERROR", message, ...sanitized }));
  },
  debug(message: string, context: LogContext = {}) {
    if (process.env.DEBUG === "true" || process.env.NODE_ENV !== "production") {
      const sanitized = sanitizeContext(context);
      console.debug(JSON.stringify({ timestamp: new Date().toISOString(), level: "DEBUG", message, ...sanitized }));
    }
  },
};

function sanitizeContext(ctx: LogContext): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(ctx)) {
    if (key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token") || key.toLowerCase().includes("password")) {
      result[key] = "[REDACTED]";
    } else if (key === "phone" || key === "recipient_phone") {
      result[key] = maskPhone(String(value));
    } else if (key === "chatId" || key === "recipient_chat_id") {
      const parts = String(value).split("@");
      result[key] = `${maskPhone(parts[0])}@${parts[1] || "c.us"}`;
    } else if (value instanceof Error) {
      result[key] = { message: value.message, name: value.name };
    } else {
      result[key] = value;
    }
  }
  return result;
}
