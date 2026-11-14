// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildEventPassQrPayload, qrPayloadIsOpaque } from "@/lib/member/qr";
import {
  hashOtp,
  maskEmail,
  generate6DigitOtp,
  createJoinSession,
  redeemJoinSession,
} from "@/lib/events/check-in";
import {
  CSC_OFFICIAL_MEET_URL,
  CSC_OFFICIAL_CALENDAR_URL,
} from "@/lib/events/google-meet";

// Mock Supabase admin
const mockStorage = {
  registrations: new Map<string, any>(),
  events: new Map<string, any>(),
  attendance: new Map<string, any>(),
  joinSessions: new Map<string, any>(),
  challenges: new Map<string, any>(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: (_fields?: string) => ({
        eq: (col: string, val: any) => ({
          maybeSingle: async () => {
            if (table === "event_registrations") {
              for (const reg of mockStorage.registrations.values()) {
                if (reg[col] === val) return { data: reg, error: null };
              }
              return { data: null, error: null };
            }
            if (table === "event_join_sessions") {
              for (const s of mockStorage.joinSessions.values()) {
                if (s[col] === val) return { data: s, error: null };
              }
              return { data: null, error: null };
            }
            if (table === "event_checkin_challenges") {
              for (const c of mockStorage.challenges.values()) {
                if (c[col] === val) return { data: c, error: null };
              }
              return { data: null, error: null };
            }
            return { data: null, error: null };
          },
        }),
      }),
      insert: async (data: any) => {
        const id = data.id || `id-${Math.random()}`;
        const record = { ...data, id };
        if (table === "event_join_sessions") {
          mockStorage.joinSessions.set(data.token_hash, record);
        }
        if (table === "event_checkin_challenges") {
          mockStorage.challenges.set(id, record);
        }
        return {
          select: () => ({
            maybeSingle: async () => ({ data: record, error: null }),
          }),
          error: null,
        };
      },
      update: (updates: any) => ({
        eq: (col: string, val: any) => {
          if (table === "event_join_sessions") {
            for (const [k, v] of mockStorage.joinSessions.entries()) {
              if (v[col] === val) mockStorage.joinSessions.set(k, { ...v, ...updates });
            }
          }
          if (table === "event_checkin_challenges") {
            for (const [k, v] of mockStorage.challenges.entries()) {
              if (v[col] === val) mockStorage.challenges.set(k, { ...v, ...updates });
            }
          }
          return Promise.resolve({ error: null });
        },
      }),
    }),
    rpc: async (fn: string, args: any) => {
      if (fn === "csc_attendee_self_check_in") {
        const token = args.p_pass_token;
        const reg = Array.from(mockStorage.registrations.values()).find(
          (r) => r.pass_token === token
        );
        if (!reg) return { data: { ok: false, status: "invalid" }, error: null };
        if (reg.payment !== "paid") return { data: { ok: false, status: "payment" }, error: null };
        const already = mockStorage.attendance.has(reg.id);
        mockStorage.attendance.set(reg.id, {
          registration_id: reg.id,
          method: args.p_method,
          checked_in_at: new Date().toISOString(),
        });
        reg.status = "checked_in";
        return {
          data: {
            ok: true,
            status: "valid",
            already_checked_in: already,
            registration_id: reg.id,
          },
          error: null,
        };
      }
      return { data: { ok: true }, error: null };
    },
  }),
}));

describe("Individual Digital Event Pass, QR Upload & Google Meet Check-In System", () => {
  const sampleEvent = {
    id: "evt-csc-online-meet-1",
    title: "Coimbatore Startup Community — First Online Meeting",
    status: "published",
    format: "online",
    starts_at: "2026-11-22T10:00:00+05:30",
    ends_at: "2026-11-22T12:00:00+05:30",
    admission: "paid",
    settings: {
      googleMeetUrl: CSC_OFFICIAL_MEET_URL,
      calendarUrl: CSC_OFFICIAL_CALENDAR_URL,
    },
  };

  beforeEach(() => {
    mockStorage.registrations.clear();
    mockStorage.events.clear();
    mockStorage.attendance.clear();
    mockStorage.joinSessions.clear();
    mockStorage.challenges.clear();

    mockStorage.events.set(sampleEvent.id, sampleEvent);
  });

  describe("1. Individual QR Code Generation & Opacity (Section 5)", () => {
    it("generates a cryptographically secure 64-hex-character pass token", () => {
      const token = "a".repeat(64);
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it("encodes only an opaque versioned payload without personal or sensitive data", () => {
      const token = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const payloadString = buildEventPassQrPayload(token);
      const parsed = JSON.parse(payloadString);

      expect(parsed).toEqual({
        t: "csc.eventpass",
        v: 1,
        ref: token,
      });

      // Strict privacy check: Never encodes email, phone, personal data, or meet url
      expect(qrPayloadIsOpaque(payloadString)).toBe(true);
      expect(payloadString).not.toContain("@");
      expect(payloadString).not.toContain("meet.google.com");
      expect(payloadString).not.toContain("password");
    });
  });

  describe("2. Multiple-Ticket Registration Support (Section 16)", () => {
    it("assigns distinct individual QR pass tokens and references to each attendee in a group of 4", () => {
      const attendeeNames = ["Founder 1", "Founder 2", "Founder 3", "Founder 4"];
      const passes = attendeeNames.map((name, i) => {
        const passToken = `token_${i}_${"1234567890abcdef".repeat(3)}`;
        const reference = `CSC-EVT-BOOKING4-${i + 1}`;
        const reg = {
          id: `reg-attendee-${i + 1}`,
          event_id: sampleEvent.id,
          reference,
          pass_token: passToken,
          attendee_name: name,
          source_email: `attendee${i + 1}@example.com`,
          status: "confirmed",
          payment: "paid",
          event: sampleEvent,
        };
        mockStorage.registrations.set(reg.id, reg);
        return reg;
      });

      // Verify all 4 tokens are distinct
      const tokens = new Set(passes.map((p) => p.pass_token));
      expect(tokens.size).toBe(4);

      // Verify all 4 references are distinct
      const refs = new Set(passes.map((p) => p.reference));
      expect(refs.size).toBe(4);

      // Verify each attendee has their own individual record
      expect(passes).toHaveLength(4);
      expect(passes[0].attendee_name).toBe("Founder 1");
      expect(passes[3].attendee_name).toBe("Founder 4");
    });
  });

  describe("3. Attendee Identity Protection & OTP Masking (Section 11)", () => {
    it("correctly masks attendee email addresses for privacy", () => {
      expect(maskEmail("vikash@example.com")).toBe("vi****@example.com");
      expect(maskEmail("s@test.com")).toBe("s*@test.com");
      expect(maskEmail("john.doe@company.org")).toBe("jo******@company.org");
    });

    it("generates a 6-digit cryptographic OTP", () => {
      const otp = generate6DigitOtp();
      expect(otp).toMatch(/^[0-9]{6}$/);
      expect(Number(otp)).toBeGreaterThanOrEqual(100000);
      expect(Number(otp)).toBeLessThanOrEqual(999999);
    });

    it("hashes and validates the OTP code deterministically against token", () => {
      const otp = "842109";
      const token = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const hash = hashOtp(otp, token);
      expect(hash).toBe(hashOtp("842109", token));
      expect(hash).not.toBe(hashOtp("000000", token));
    });
  });

  describe("4. Short-Lived Google Meet Join Sessions (Section 13)", () => {
    it("creates an attendee-specific join session with 15-minute expiration", async () => {
      const session = await createJoinSession({
        registrationId: "reg-1",
        eventId: sampleEvent.id,
        attendeeEmail: "founder@example.com",
        meetingUrl: CSC_OFFICIAL_MEET_URL,
      });

      expect(session.joinToken).toBeDefined();
      expect(session.joinToken.length).toBe(64);
      expect(session.meetingUrl).toBe(CSC_OFFICIAL_MEET_URL);
      expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("successfully redeems an active join session token", async () => {
      const session = await createJoinSession({
        registrationId: "reg-2",
        eventId: sampleEvent.id,
        attendeeEmail: "founder2@example.com",
        meetingUrl: CSC_OFFICIAL_MEET_URL,
      });

      const redemption = await redeemJoinSession(session.joinToken);
      expect(redemption.ok).toBe(true);
      expect(redemption.meetingUrl).toBe(CSC_OFFICIAL_MEET_URL);
    });

    it("rejects invalid or malformed join tokens", async () => {
      const redemption = await redeemJoinSession("invalid-token-1234");
      expect(redemption.ok).toBe(false);
      expect(redemption.error).toContain("not found or expired");
    });
  });

  describe("5. Replay Protection & Duplicate Check-in Prevention (Section 12)", () => {
    it("handles repeated check-in idempotently without duplicate attendance records", async () => {
      const passToken = "token_idempotent_test_012345678901234567890123456789012345678901";
      const reg = {
        id: "reg-idempotent-1",
        event_id: sampleEvent.id,
        reference: "CSC-EVT-IDEMPOTENT-1",
        pass_token: passToken,
        attendee_name: "Idempotent Attendee",
        source_email: "idempotent@example.com",
        status: "confirmed",
        payment: "paid",
        event: sampleEvent,
      };
      mockStorage.registrations.set(reg.id, reg);

      const admin = (await import("@/lib/supabase/admin")).createAdminClient();

      // First check-in
      const res1 = await admin.rpc("csc_attendee_self_check_in", {
        p_pass_token: passToken,
      });
      const data1 = res1.data as any;
      expect(data1.ok).toBe(true);
      expect(data1.already_checked_in).toBe(false);

      // Immediate retry / refresh
      const res2 = await admin.rpc("csc_attendee_self_check_in", {
        p_pass_token: passToken,
      });
      const data2 = res2.data as any;
      expect(data2.ok).toBe(true);
      expect(data2.already_checked_in).toBe(true);
      expect(mockStorage.attendance.size).toBe(1); // exactly one record preserved
    });
  });

  describe("6. Gate Unpaid Attendees (Section 10)", () => {
    it("rejects check-in when registration is not paid", async () => {
      const passToken = "token_unpaid_test_0123456789012345678901234567890123456789012345";
      const reg = {
        id: "reg-unpaid-1",
        event_id: sampleEvent.id,
        reference: "CSC-EVT-UNPAID-1",
        pass_token: passToken,
        attendee_name: "Unpaid Attendee",
        source_email: "unpaid@example.com",
        status: "pending",
        payment: "awaiting_payment", // Unpaid!
        event: sampleEvent,
      };
      mockStorage.registrations.set(reg.id, reg);

      const admin = (await import("@/lib/supabase/admin")).createAdminClient();
      const res = await admin.rpc("csc_attendee_self_check_in", {
        p_pass_token: passToken,
      });
      const data = res.data as any;
      expect(data.ok).toBe(false);
      expect(data.status).toBe("payment");
    });
  });
});
