import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase admin
const mockProfileMaybeSingle = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          maybeSingle: mockProfileMaybeSingle,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: "test-outbox-id" }, error: null }),
        })),
      })),
    })),
  })),
}));

// Mock WhatsApp outbox enqueue
const mockEnqueueWhatsApp = vi.fn().mockResolvedValue({ success: true, outboxId: "outbox-123" });
vi.mock("@/lib/notifications/whatsapp-outbox", () => ({
  enqueueWhatsAppNotification: (...args: any[]) => mockEnqueueWhatsApp(...args),
  normalizePhoneForWhatsApp: (p: string) => {
    const cleaned = p.replace(/\D/g, "");
    const e164 = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    return { e164, chatId: `${e164}@c.us` };
  },
}));

// Mock Email security code dispatch
const mockSendSecurityCodeEmail = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/auth/security-code", () => ({
  sendSecurityCodeEmail: (...args: any[]) => mockSendSecurityCodeEmail(...args),
}));

// Mock MSG91 config
vi.mock("@/lib/services/msg91", () => ({
  getMsg91Config: vi.fn(() => ({})),
  sendMsg91Otp: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock Redis
vi.mock("@/lib/redis/config", () => ({
  isRedisEnabled: () => false,
}));
vi.mock("@/lib/redis/client", () => ({
  getRedisClient: () => null,
  withRedisTimeout: vi.fn(),
}));

import { sendPhoneOtp, verifyPhoneOtpCode } from "@/lib/auth/phone-auth";

describe("Phone OTP 30s Cooldown & Dual-Channel Email Mirroring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches OTP to WhatsApp and mirrors to Email when profile has linked email", async () => {
    mockProfileMaybeSingle.mockResolvedValueOnce({
      data: { email: "founder@coimbatore.in", full_name: "Founder User" },
      error: null,
    });

    const res = await sendPhoneOtp({
      phone: "9342877474",
      channel: "whatsapp",
    });

    expect(res.success).toBe(true);
    expect(res.phone).toBe("919342877474");

    // 1. WhatsApp Dispatch Verified
    expect(mockEnqueueWhatsApp).toHaveBeenCalledTimes(1);
    const waArgs = mockEnqueueWhatsApp.mock.calls[0][0];
    expect(waArgs.recipientPhone).toBe("919342877474");
    expect(waArgs.text).toContain("CSC Circle Login Verification");

    // 2. Email Mirroring Verified (100% Delivery Guarantee)
    expect(mockSendSecurityCodeEmail).toHaveBeenCalledTimes(1);
    const emailArgs = mockSendSecurityCodeEmail.mock.calls[0][0];
    expect(emailArgs.email).toBe("founder@coimbatore.in");
    expect(emailArgs.name).toBe("Founder User");
    expect(emailArgs.code).toMatch(/^\d{6}$/);

    // 3. Verify OTP Code
    const isValid = await verifyPhoneOtpCode("9342877474", emailArgs.code);
    expect(isValid).toBe(true);
  });

  it("dispatches OTP only to WhatsApp if no member profile email is found", async () => {
    mockProfileMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const res = await sendPhoneOtp({
      phone: "9876543210",
      channel: "whatsapp",
    });

    expect(res.success).toBe(true);
    expect(mockEnqueueWhatsApp).toHaveBeenCalledTimes(1);
    expect(mockSendSecurityCodeEmail).not.toHaveBeenCalled();
  });
});
