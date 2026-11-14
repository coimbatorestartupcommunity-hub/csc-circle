// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import {
  createGuestEmailVerification,
  verifyGuestEmailToken,
  validateGuestEmailVerification,
} from "@/lib/payments/guest-email-verification";

describe("Guest Email 1-Click Verification Token Flow", () => {
  it("generates a magic token and verification URL, verifies correctly, and validates downstream order creation", async () => {
    process.env.CSC_GUEST_EMAIL_VERIFICATION_SECRET = "test-secret-at-least-32-chars-long-1234567890";

    const storage = new Map<string, any>();
    const notifications: any[] = [];

    const mockAdmin: any = {
      from: (table: string) => ({
        insert: async (row: any) => {
          if (table === "guest_email_verifications") {
            storage.set(row.id, { ...row, attempts: 0 });
          } else if (table === "notifications") {
            notifications.push(row);
          }
          return { error: null };
        },
        select: () => ({
          eq: (col: string, val: any) => ({
            maybeSingle: async () => {
              const record = storage.get(val);
              return { data: record || null, error: null };
            },
            single: async () => {
              const record = storage.get(val);
              return { data: record || null, error: null };
            },
          }),
        }),
        update: (updates: any) => ({
          eq: (col1: string, val1: any) => ({
            eq: (col2: string, val2: any) => {
              const record = storage.get(val1);
              if (record) Object.assign(record, updates);
              return Promise.resolve({ error: null });
            },
            select: () => ({
              maybeSingle: async () => {
                const record = storage.get(val1);
                if (record) Object.assign(record, updates);
                return { data: record || null, error: null };
              },
            }),
          }),
        }),
      }),
    };

    const eventId = "948bfc48-c627-4b06-a665-5c2cd8226505";
    const email = "founder@example.com";
    const slug = "csc-joint-online-meeting";

    // 1. Create verification
    const created = await createGuestEmailVerification(mockAdmin, email, eventId, slug);
    expect(created.id).toBeDefined();
    expect(created.verificationUrl).toContain(`/events/verify-email?id=${created.id}`);
    expect(created.magicToken).toBeDefined();

    // Notification was queued with magicToken and verificationUrl
    expect(notifications.length).toBe(1);
    expect(notifications[0].payload.verificationUrl).toContain(created.magicToken);
    expect(notifications[0].payload.verificationCode).toMatch(/^\d{6}$/);

    // 2. Verify with wrong token -> fails
    const invalidResult = await verifyGuestEmailToken(mockAdmin, created.id, "invalid-token-1234567890");
    expect(invalidResult).toBeNull();

    // 3. Verify with authentic magic token -> succeeds
    const verified = await verifyGuestEmailToken(mockAdmin, created.id, created.magicToken);
    expect(verified).not.toBeNull();
    expect(verified?.email).toBe(email);
    expect(verified?.eventSlug).toBe(slug);

    // 4. Downstream order creation validation succeeds
    const orderValid = await validateGuestEmailVerification(
      mockAdmin,
      created.id,
      email,
      eventId,
      created.magicToken
    );
    expect(orderValid).toBe(true);
  });
});
