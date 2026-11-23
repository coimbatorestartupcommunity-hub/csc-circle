import { OpenWaClient, type OpenWaSendTextResult } from "./openwa.js";

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

export class OpenWaProvider implements WhatsAppProvider {
  public readonly name = "openwa";
  private client: OpenWaClient;

  constructor(client: OpenWaClient) {
    this.client = client;
  }

  async checkHealth(): Promise<{ ready: boolean; status?: string; error?: string }> {
    return this.client.checkSessionReadiness();
  }

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    const res: OpenWaSendTextResult = await this.client.sendTextMessage(params.chatId, params.text);
    return {
      success: res.success,
      messageId: res.messageId,
      errorCategory: res.errorCategory,
      errorCode: res.errorCode,
      errorMessage: res.errorMessage,
    };
  }
}
