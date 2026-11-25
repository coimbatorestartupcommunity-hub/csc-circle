// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase admin
const mockProfileMaybeSingle = vi.fn().mockResolvedValue({
  data: { email: "founder@csc.test", full_name: "Concurrent Founder" },
  error: null,
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          maybeSingle: mockProfileMaybeSingle,
        })),
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              neq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: "test-outbox-id" }, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
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

// Mock MSG91
vi.mock("@/lib/services/msg91", () => ({
  getMsg91Config: vi.fn(() => ({ authKey: "test-key" })),
  sendMsg91Otp: vi.fn().mockResolvedValue({ success: true }),
  verifyMsg91Otp: vi.fn().mockResolvedValue({ success: false }),
}));

// Mock Redis
vi.mock("@/lib/redis/config", () => ({
  isRedisEnabled: () => false,
}));
vi.mock("@/lib/redis/client", () => ({
  getRedisClient: () => null,
  withRedisTimeout: vi.fn(),
}));

// Mock maintenance config
vi.mock("@/lib/services/system-settings", () => ({
  getWhatsAppLockConfig: vi.fn().mockResolvedValue({ locked: false, unlockEpochMs: 0 }),
}));
vi.mock("@/lib/whatsapp/maintenance-config", () => ({
  WHATSAPP_MAINTENANCE_LOCK: {
    isLocked: () => false,
    getNotice: () => "",
  },
}));

import { POST as sendOtpHandler } from "@/app/api/auth/phone/send-otp/route";
import { verifyPhoneOtpCode } from "@/lib/auth/phone-auth";

describe("High-Concurrency OTP Dispatch & Verification Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "handles 30 concurrent users requesting OTP from 30 different IP addresses with zero IP restrictions",
    async () => {
      const concurrentCount = 30;

      const requests = Array.from({ length: concurrentCount }, (_, i) => {
        // 30 distinct phone numbers & 30 distinct IP addresses
        const phoneNum = `98420${String(10000 + i).padStart(5, "0")}`;
        const distinctIp = `157.48.${(i + 1) % 250}.${(i * 7 + 10) % 250}`;
        const req = new Request("https://csc.logicintelligencetechnologies.in/api/auth/phone/send-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": distinctIp,
          },
          body: JSON.stringify({
            phone: phoneNum,
            channel: "both",
          }),
        });
        return sendOtpHandler(req);
      });

      const responses = await Promise.all(requests);

      // Verify all 30 requests succeeded with HTTP 200 OK
      for (let i = 0; i < concurrentCount; i++) {
        const res = responses[i];
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.ok).toBe(true);
        expect(data.phone).toMatch(/^9198420\d{5}$/);
      }

      // Verify WhatsApp was dispatched 30 times
      expect(mockEnqueueWhatsApp).toHaveBeenCalledTimes(30);

      // Verify Email was mirrored 30 times
      expect(mockSendSecurityCodeEmail).toHaveBeenCalledTimes(30);
    },
    15000
  );

  it(
    "verifies 30 concurrent users verifying their OTP codes simultaneously",
    async () => {
      const concurrentCount = 30;

      // Direct test with sendPhoneOtp and verifyPhoneOtpCode
      const { sendPhoneOtp } = await import("@/lib/auth/phone-auth");

      const otpJobs = Array.from({ length: concurrentCount }, async (_, i) => {
        const phone = `97890${String(20000 + i).padStart(5, "0")}`;
        await sendPhoneOtp({ phone, channel: "whatsapp" });
        const lastWaCall = mockEnqueueWhatsApp.mock.calls.find(c => c[0].recipientPhone === `91${phone}`);
        const code = lastWaCall[0].templateVariables[0];
        return { phone, code };
      });

      const generated = await Promise.all(otpJobs);
      expect(generated.length).toBe(30);

      // Now verify all 30 concurrently
      const verifyJobs = generated.map(({ phone, code }) => verifyPhoneOtpCode(phone, code));
      const verifyResults = await Promise.all(verifyJobs);

      expect(verifyResults.every(r => r === true)).toBe(true);
    },
    15000
  );
});
