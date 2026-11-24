import "server-only";

/**
 * MSG91 Cloud Communication Service
 * Handles TRAI/DLT-compliant SMS, Multi-Channel SendOTP (WhatsApp -> SMS fallback),
 * and Official Meta WhatsApp Business API messages.
 */

const MSG91_BASE_URL = "https://control.msg91.com/api/v5";

export interface Msg91Config {
  authKey: string;
  senderId?: string;
  otpTemplateId?: string;
  integratedWhatsAppNumber?: string;
}

export function getMsg91Config(): Msg91Config {
  return {
    authKey: process.env.MSG91_AUTH_KEY || "593367AEcZQeKeoF5c6b05eb92P1",
    senderId: process.env.MSG91_SENDER_ID,
    otpTemplateId: process.env.MSG91_OTP_TEMPLATE_ID,
    integratedWhatsAppNumber: process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER,
  };
}

export function isMsg91Configured(): boolean {
  const { authKey } = getMsg91Config();
  return Boolean(authKey && authKey.length > 10);
}

/**
 * Normalize phone number to international format without leading +
 * Example: "+91 98765 43210" -> "919876543210"
 */
export function formatPhoneForMsg91(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // If 10-digit Indian number without country code, prefix 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export interface SendOtpOptions {
  phone: string;
  templateId?: string;
  otp?: string;
  otpLength?: number;
  otpExpiryMinutes?: number;
  extraVariables?: Record<string, string>;
}

export interface Msg91ApiResponse {
  success: boolean;
  message?: string;
  type?: string;
  code?: string | number;
  raw?: unknown;
}

/**
 * Send an OTP via MSG91 SendOTP API (Supports multi-channel fallback)
 */
export async function sendMsg91Otp({
  phone,
  templateId,
  otp,
  otpLength = 6,
  otpExpiryMinutes = 10,
  extraVariables = {},
}: SendOtpOptions): Promise<Msg91ApiResponse> {
  const { authKey, otpTemplateId } = getMsg91Config();
  if (!authKey) {
    return { success: false, message: "MSG91_AUTH_KEY is not configured" };
  }

  const activeTemplateId = templateId || otpTemplateId;
  const formattedMobile = formatPhoneForMsg91(phone);

  const queryParams = new URLSearchParams({
    mobile: formattedMobile,
    otp_length: otpLength.toString(),
    otp_expiry: otpExpiryMinutes.toString(),
  });

  if (activeTemplateId) {
    queryParams.set("template_id", activeTemplateId);
  }
  if (otp) {
    queryParams.set("otp", otp);
  }

  const url = `${MSG91_BASE_URL}/otp?${queryParams.toString()}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authkey: authKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(extraVariables),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.type === "error") {
      return {
        success: false,
        message: data.message || `MSG91 OTP request failed with status ${res.status}`,
        code: data.code || res.status,
        raw: data,
      };
    }

    return {
      success: true,
      message: data.message || "OTP sent successfully via MSG91",
      type: data.type || "success",
      raw: data,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Network failure connecting to MSG91: ${errMessage}`,
    };
  }
}

/**
 * Verify an OTP entered by the user with MSG91
 */
export async function verifyMsg91Otp({
  phone,
  otp,
}: {
  phone: string;
  otp: string;
}): Promise<Msg91ApiResponse> {
  const { authKey } = getMsg91Config();
  if (!authKey) {
    return { success: false, message: "MSG91_AUTH_KEY is not configured" };
  }

  const formattedMobile = formatPhoneForMsg91(phone);
  const queryParams = new URLSearchParams({
    mobile: formattedMobile,
    otp: otp.trim(),
  });

  const url = `${MSG91_BASE_URL}/otp/verify?${queryParams.toString()}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authkey: authKey,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.type === "error") {
      return {
        success: false,
        message: data.message || "Invalid or expired OTP",
        code: data.code || res.status,
        raw: data,
      };
    }

    return {
      success: true,
      message: data.message || "OTP verified successfully",
      type: data.type || "success",
      raw: data,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Failed to verify OTP with MSG91: ${errMessage}`,
    };
  }
}

/**
 * Retry or Fallback OTP (Resend as voice call or retry SMS)
 */
export async function retryMsg91Otp({
  phone,
  retryType = "voice",
}: {
  phone: string;
  retryType?: "voice" | "text";
}): Promise<Msg91ApiResponse> {
  const { authKey } = getMsg91Config();
  if (!authKey) {
    return { success: false, message: "MSG91_AUTH_KEY is not configured" };
  }

  const formattedMobile = formatPhoneForMsg91(phone);
  const queryParams = new URLSearchParams({
    mobile: formattedMobile,
    retrytype: retryType,
  });

  const url = `${MSG91_BASE_URL}/otp/retry?${queryParams.toString()}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { authkey: authKey },
    });

    const data = await res.json().catch(() => ({}));
    return {
      success: res.ok && data.type !== "error",
      message: data.message || (res.ok ? "Retry initiated" : "Retry failed"),
      raw: data,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Retry failed",
    };
  }
}

export interface WhatsAppTemplateParameter {
  type: "text" | "image" | "document" | "video";
  text?: string;
  image?: { link: string };
  document?: { link: string; filename?: string };
}

export interface SendWhatsAppTemplateOptions {
  recipientPhone: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: string[];
  headerParameter?: WhatsAppTemplateParameter;
  integratedNumber?: string;
}

/**
 * Send an Official Meta WhatsApp Business Template Message via MSG91
 */
export async function sendMsg91WhatsAppTemplate({
  recipientPhone,
  templateName,
  languageCode = "en",
  bodyParameters = [],
  headerParameter,
  integratedNumber,
}: SendWhatsAppTemplateOptions): Promise<Msg91ApiResponse> {
  const { authKey, integratedWhatsAppNumber } = getMsg91Config();
  const activeNumber = integratedNumber || integratedWhatsAppNumber;

  if (!authKey) {
    return { success: false, message: "MSG91_AUTH_KEY is not configured" };
  }
  if (!activeNumber) {
    return {
      success: false,
      message: "MSG91_WHATSAPP_INTEGRATED_NUMBER is required for WhatsApp messaging",
    };
  }

  const formattedRecipient = formatPhoneForMsg91(recipientPhone);
  const formattedSender = formatPhoneForMsg91(activeNumber);

  const components: Array<Record<string, unknown>> = [];

  if (headerParameter) {
    components.push({
      type: "header",
      parameters: [headerParameter],
    });
  }

  if (bodyParameters.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParameters.map((val) => ({
        type: "text",
        text: val,
      })),
    });
  }

  const payload = {
    integrated_number: formattedSender,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
      to_and_components: [
        {
          phone_number: formattedRecipient,
        },
      ],
    },
  };

  const url = `${MSG91_BASE_URL}/whatsapp/whatsapp-outbound-message/bulk`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authkey: authKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.status === "fail" || data.type === "error") {
      return {
        success: false,
        message: data.message || data.errors || "WhatsApp message failed to dispatch",
        code: data.code || res.status,
        raw: data,
      };
    }

    return {
      success: true,
      message: "WhatsApp template message queued successfully",
      raw: data,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "WhatsApp dispatch error",
    };
  }
}
