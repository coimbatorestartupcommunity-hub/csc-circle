import { WhatsAppCloudClient, type WhatsAppSendTextResult } from "./whatsapp-client.js";

export interface SendMessageParams {
  chatId: string;
  phone: string;
  text: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  errorCategory?: "permanent" | "transient";
  errorCode?: string;
  errorMessage?: string;
}

export interface WhatsAppProvider {
  name: string;
  checkHealth(): Promise<{ ready: boolean; status?: string; error?: string }>;
  send(params: SendMessageParams): Promise<SendMessageResult>;
}

export class Msg91WhatsAppProvider implements WhatsAppProvider {
  public readonly name = "msg91_cloud";
  private authKey: string;
  private integratedNumber: string;

  constructor(authKey: string, integratedNumber = "917550067712") {
    this.authKey = authKey;
    this.integratedNumber = integratedNumber;
  }

  async checkHealth(): Promise<{ ready: boolean; status?: string; error?: string }> {
    return { ready: true, status: "READY" };
  }

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    const cleanRecipient = (params.phone || params.chatId.split("@")[0] || "").replace(/\D/g, "");
    const formattedRecipient = cleanRecipient.length === 10 ? `91${cleanRecipient}` : cleanRecipient;

    const payload = {
      integrated_number: this.integratedNumber,
      recipient_number: formattedRecipient,
      content_type: "text",
      text: params.text,
    };

    const queryParams = new URLSearchParams(payload);
    const url = `https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/?${queryParams.toString()}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          authkey: this.authKey,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        hasError?: boolean;
        message?: string;
        data?: { message_uuid?: string };
      };

      if (!res.ok || data.status === "fail" || data.hasError) {
        return {
          success: false,
          errorMessage: data.message || "MSG91 dispatch failed",
        };
      }

      return {
        success: true,
        messageId: data.data?.message_uuid || "msg91_sent",
      };
    } catch (err) {
      return {
        success: false,
        errorMessage: err instanceof Error ? err.message : "MSG91 network failure",
      };
    }
  }
}

export class WhatsAppCloudProvider implements WhatsAppProvider {
  public readonly name = "whatsapp_cloud";
  private client: WhatsAppCloudClient;

  constructor(client: WhatsAppCloudClient) {
    this.client = client;
  }

  async checkHealth(): Promise<{ ready: boolean; status?: string; error?: string }> {
    return this.client.checkSessionReadiness();
  }

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    const res: WhatsAppSendTextResult = await this.client.sendTextMessage(params.chatId, params.text);
    return {
      success: res.success,
      messageId: res.messageId,
      errorCategory: res.errorCategory,
      errorCode: res.errorCode,
      errorMessage: res.errorMessage,
    };
  }
}
