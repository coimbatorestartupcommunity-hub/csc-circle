import "server-only";

/**
 * viaSocket Flow Automation Service
 * Emits real-time event webhooks to https://flow.viasocket.com/
 * to orchestrate low-code / no-code automations (e.g. syncing with Google Sheets,
 * Slack alerts, Segmento CDP, and MSG91 multi-step sequences).
 */

export interface ViaSocketEventPayload {
  event:
    | "event_registered"
    | "member_onboarded"
    | "phone_otp_requested"
    | "payment_claimed"
    | "collaboration_proposed"
    | "consultation_requested";
  timestamp: string;
  environment: string;
  data: Record<string, unknown>;
}

export interface ViaSocketTriggerResult {
  success: boolean;
  triggered: boolean;
  message?: string;
  flowRunId?: string;
}

/**
 * Triggers a configured viaSocket Flow webhook.
 * Non-blocking by default with a short 5s network timeout to avoid slowing down user requests.
 */
export async function triggerViaSocketFlow(
  event: ViaSocketEventPayload["event"],
  data: Record<string, unknown>
): Promise<ViaSocketTriggerResult> {
  const webhookUrl = process.env.VIASOCKET_FLOW_WEBHOOK_URL;
  const secretToken = process.env.VIASOCKET_SECRET_TOKEN;

  // Gracefully skip if no viaSocket webhook URL has been configured yet
  if (!webhookUrl) {
    return {
      success: true,
      triggered: false,
      message: "VIASOCKET_FLOW_WEBHOOK_URL is not configured; skipped dispatch",
    };
  }

  const payload: ViaSocketEventPayload = {
    event,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    data,
  };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "CSC-Circle-viaSocket-Client/1.0",
  };

  if (secretToken) {
    headers["authorization"] = `Bearer ${secretToken}`;
    headers["x-viasocket-signature"] = secretToken;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        triggered: true,
        message: `viaSocket returned HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      triggered: true,
      flowRunId: responseData?.run_id || responseData?.id,
      message: "viaSocket flow triggered successfully",
    };
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Network error";
    console.warn(`[viaSocket] Failed to deliver event "${event}":`, errMessage);
    return {
      success: false,
      triggered: true,
      message: errMessage,
    };
  }
}
