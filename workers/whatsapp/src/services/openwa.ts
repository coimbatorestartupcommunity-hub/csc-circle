import { logger } from "../utils/logger.js";

export interface OpenWaSessionStartResult {
  success: boolean;
  status?: string;
  error?: string;
}

export interface OpenWaSendTextResult {
  success: boolean;
  messageId?: string;
  errorCategory?: "permanent" | "transient";
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface OpenWaClientOptions {
  baseUrl: string;
  sessionId: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class OpenWaClient {
  private readonly baseUrl: string;
  private readonly sessionId: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: OpenWaClientOptions) {
    // Normalize baseUrl: strip trailing slashes and any trailing /api so we compose clean paths
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
   * Attempts to start/reconnect the OpenWA session via the REST API.
   */
  async startSession(): Promise<OpenWaSessionStartResult> {
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
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (res.ok) {
        logger.info("OpenWA session start/reconnect request succeeded", { status: String(body?.status ?? "") });
        return { success: true, status: (body?.status != null ? String(body.status) : "starting") as string };
      }
      return { success: false, error: `HTTP ${res.status}` };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return { success: false, error: isTimeout ? "Reconnect request timed out" : (err instanceof Error ? err.message : String(err)) };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Checks whether the configured OpenWA session is active and ready.
   */
  async checkSessionReadiness(): Promise<{ ready: boolean; status?: string; error?: string }> {
    const url = `${this.baseUrl}/api/sessions/${this.sessionId}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (this.apiKey) {
        headers["X-API-Key"] = this.apiKey;
      }

      const res = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        return { ready: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }

      const body = (await res.json()) as { status?: string; state?: string };
      const status = body?.status || body?.state || "unknown";
      const ready = status.toLowerCase() === "connected" || status.toLowerCase() === "ready";
      return { ready, status };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return {
        ready: false,
        error: isTimeout ? `Session readiness check timed out after ${this.timeoutMs}ms` : (err instanceof Error ? err.message : String(err)),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Dispatches a text message to a specific WhatsApp chatId via the OpenWA REST API.
   * Endpoint: POST {baseUrl}/api/sessions/{sessionId}/messages/send-text
   */
  async sendTextMessage(chatId: string, text: string): Promise<OpenWaSendTextResult> {
    const url = `${this.baseUrl}/api/sessions/${this.sessionId}/messages/send-text`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ chatId, text }),
        signal: controller.signal,
      });

      const statusCode = res.status;

      let body: Record<string, unknown> = {};
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        // Body was empty or non-JSON
      }

      // Success codes: 200 OK, 201 Created, 202 Accepted
      if (res.ok) {
        const messageId =
          (typeof body.id === "string" && body.id) ||
          (typeof body.messageId === "string" && body.messageId) ||
          (typeof body.response === "string" && body.response) ||
          "openwa-ack";

        return {
          success: true,
          messageId,
          rawResponse: body,
        };
      }

      // Categorize failures
      const errorMsg =
        (typeof body.message === "string" && body.message) ||
        (typeof body.error === "string" && body.error) ||
        res.statusText ||
        `HTTP ${statusCode}`;

      if (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 422) {
        // Permanent failure: invalid params, unauthenticated, unauthorized, or session doesn't exist
        return {
          success: false,
          errorCategory: "permanent",
          errorCode: `OPENWA_${statusCode}`,
          errorMessage: errorMsg,
          rawResponse: body,
        };
      }

      // Transient failure: 408 timeout, 429 rate limit, 500, 502, 503, 504 gateway issue
      return {
        success: false,
        errorCategory: "transient",
        errorCode: `OPENWA_${statusCode}`,
        errorMessage: errorMsg,
        rawResponse: body,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return {
        success: false,
        errorCategory: "transient",
        errorCode: isTimeout ? "GATEWAY_TIMEOUT" : "NETWORK_ERROR",
        errorMessage: isTimeout ? `Request timed out after ${this.timeoutMs}ms` : (err instanceof Error ? err.message : String(err)),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
