import { logger } from "../utils/logger.js";

export interface WhatsAppSessionStartResult {
  success: boolean;
  status?: string;
  error?: string;
}

export interface WhatsAppSendTextResult {
  success: boolean;
  messageId?: string;
  errorCategory?: "permanent" | "transient";
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface WhatsAppClientOptions {
  baseUrl: string;
  sessionId: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface WhatsAppMessenger {
  sendTextMessage(chatId: string, text: string): Promise<WhatsAppSendTextResult>;
}

export class WhatsAppCloudClient implements WhatsAppMessenger {
  private readonly baseUrl: string;
  private readonly sessionId: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: WhatsAppClientOptions) {
    let base = options.baseUrl.trim().replace(/\/+$/, "");
    if (base.endsWith("/api")) {
      base = base.substring(0, base.length - 4);
    }
    this.baseUrl = base;
    this.sessionId = encodeURIComponent(options.sessionId.trim());
    this.apiKey = options.apiKey?.trim() || "";
    this.timeoutMs = options.timeoutMs || 15000;
  }

  /**
   * Attempts to start/reconnect the WhatsApp session via the Cloud REST API.
   */
  async startSession(): Promise<WhatsAppSessionStartResult> {
    const url = `${this.baseUrl}/api/sessions/${this.sessionId}/start`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (this.apiKey) {
        headers["x-api-key"] = this.apiKey;
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        logger.info("WhatsApp Cloud session start/reconnect request succeeded", {
          status: res.status,
          response: data,
        });
        return { success: true, status: "STARTING" };
      }

      return {
        success: false,
        status: "FAILED",
        error: (data as { message?: string })?.message || `HTTP ${res.status}`,
      };
    } catch (err) {
      clearTimeout(timer);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to initiate session start",
      };
    }
  }

  /**
   * Checks whether the configured WhatsApp session is active and ready.
   */
  async checkSessionReadiness(): Promise<{ ready: boolean; status?: string; error?: string }> {
    const url = `${this.baseUrl}/api/sessions/${this.sessionId}/status`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (this.apiKey) {
        headers["x-api-key"] = this.apiKey;
      }

      const res = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        state?: string;
        error?: string;
      };

      if (!res.ok) {
        return {
          ready: false,
          status: `HTTP_${res.status}`,
          error: data.error || `HTTP request failed with status ${res.status}`,
        };
      }

      const status = data.status || data.state || "";
      const isReady =
        status === "CONNECTED" ||
        status === "WORKING" ||
        status === "READY" ||
        status === "inChat";

      return { ready: isReady, status };
    } catch (err) {
      clearTimeout(timer);
      return {
        ready: false,
        error: err instanceof Error ? err.message : "Network error contacting WhatsApp gateway",
      };
    }
  }

  /**
   * Dispatches an outbound text message to a WhatsApp chat identifier.
   */
  async sendTextMessage(chatId: string, text: string): Promise<WhatsAppSendTextResult> {
    const url = `${this.baseUrl}/api/sessions/${this.sessionId}/messages/send-text`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (this.apiKey) {
        headers["x-api-key"] = this.apiKey;
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          chatId,
          text,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (res.ok) {
        const messageId =
          (typeof data.messageId === "string" && data.messageId) ||
          (typeof data.id === "string" && data.id) ||
          (typeof (data.response as Record<string, unknown>)?.id === "string" &&
            (data.response as Record<string, unknown>).id) ||
          "wa-ack";

        return {
          success: true,
          messageId: String(messageId),
          rawResponse: data,
        };
      }

      const statusCode = res.status;
      const isTransient = statusCode === 408 || statusCode === 429 || statusCode >= 500;
      const errorMessage =
        (typeof data.message === "string" && data.message) ||
        (typeof data.error === "string" && data.error) ||
        `HTTP Error ${statusCode}`;

      return {
        success: false,
        errorCategory: isTransient ? "transient" : "permanent",
        errorCode: `WHATSAPP_${statusCode}`,
        errorMessage,
        rawResponse: data,
      };
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === "AbortError";

      return {
        success: false,
        errorCategory: "transient",
        errorCode: isAbort ? "GATEWAY_TIMEOUT" : "NETWORK_ERROR",
        errorMessage: isAbort
          ? `Request timed out after ${this.timeoutMs}ms`
          : err instanceof Error
            ? err.message
            : "Unknown network error",
      };
    }
  }
}
