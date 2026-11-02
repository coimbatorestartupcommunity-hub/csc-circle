// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { clientIp, extractValidIp } from "@/lib/rate-limit";
import {
  signGuestVerificationCookie,
  verifyGuestVerificationCookie,
  getGuestVerificationSecret,
  GUEST_VERIFICATION_COOKIE_NAME,
} from "@/lib/payments/orders";

// Stateful in-memory database mock for Supabase Admin & Server Clients
interface VerificationRecord {
  id: string;
  email: string;
  event_id: string | null;
  code_hash: string;
  expires_at: string;
  attempts: number;
  metadata?: any;
  created_at: string;
  verified_at: string | null;
  consumed_at: string | null;
  token_hash: string | null;
}

const mockState = {
  rateLimits: new Map<string, { count: number; windowStart: number; expiresAt: number }>(),
  verifications: [] as VerificationRecord[],
  events: [] as any[],
  orders: [] as any[],
  reset() {
    this.rateLimits.clear();
    this.verifications = [];
    this.events = [];
    this.orders = [];
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async (fnName: string, args: any) => {
      if (fnName === "csc_check_rate_limit") {
        const compositeKey = `${args.p_scope || "default"}:${args.p_key}`;
        const now = Date.now();
        const windowMs = (args.p_window_seconds || 60) * 1000;
        const entry = mockState.rateLimits.get(compositeKey);
        let count = 1;
        let expiresAt = now + windowMs;

        if (entry && entry.expiresAt > now) {
          count = entry.count + 1;
          expiresAt = entry.expiresAt;
        }

        mockState.rateLimits.set(compositeKey, {
          count,
          windowStart: entry?.windowStart ?? now,
          expiresAt,
        });

        const allowed = count <= args.p_limit;
        const remaining = Math.max(0, args.p_limit - count);
        const retry_after = allowed ? 0 : Math.max(1, Math.ceil((expiresAt - now) / 1000));

        return {
          data: {
            allowed,
            remaining,
            reset_at: new Date(expiresAt).toISOString(),
            retry_after,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    },
    from: (tableName: string) => {
      if (tableName === "guest_email_verifications") {
        const createQueryBuilder = (initialFilters: ((item: VerificationRecord) => boolean)[] = []) => {
          const filters = [...initialFilters];
          let limitCount: number | null = null;
          let sortOrder: { column: string; ascending: boolean } | null = null;

          const builder: any = {
            eq: (col: string, val: any) => {
              filters.push((item: any) => item[col] === val);
              return builder;
            },
            is: (col: string, val: any) => {
              filters.push((item: any) => item[col] === val);
              return builder;
            },
            order: (column: string, opts?: { ascending: boolean }) => {
              sortOrder = { column, ascending: opts?.ascending ?? true };
              return builder;
            },
            limit: (n: number) => {
              limitCount = n;
              return builder;
            },
            select: () => builder,
            maybeSingle: async () => {
              const matched = mockState.verifications.filter((v) => filters.every((f) => f(v)));
              return { data: matched[0] ?? null, error: null };
            },
            then: (resolve: any) => {
              let matched = mockState.verifications.filter((v) => filters.every((f) => f(v)));
              if (sortOrder) {
                const col = sortOrder.column;
                const asc = sortOrder.ascending;
                matched = [...matched].sort((a: any, b: any) => {
                  if (a[col] < b[col]) return asc ? -1 : 1;
                  if (a[col] > b[col]) return asc ? 1 : -1;
                  return 0;
                });
              }
              if (limitCount !== null) {
                matched = matched.slice(0, limitCount);
              }
              return Promise.resolve({ data: matched, error: null }).then(resolve);
            },
          };
          return builder;
        };

        return {
          select: () => createQueryBuilder(),
          insert: async (records: any) => {
            const arr = Array.isArray(records) ? records : [records];
            for (const r of arr) {
              mockState.verifications.push({
                ...r,
                created_at: r.created_at || new Date().toISOString(),
                verified_at: r.verified_at || null,
                consumed_at: r.consumed_at || null,
                token_hash: r.token_hash || null,
              });
            }
            return { data: records, error: null };
          },
          update: (fields: Record<string, any>) => {
            const updateFilters: ((item: VerificationRecord) => boolean)[] = [];
            const updateBuilder: any = {
              eq: (col: string, val: any) => {
                updateFilters.push((item: any) => item[col] === val);
                return updateBuilder;
              },
              is: (col: string, val: any) => {
                updateFilters.push((item: any) => item[col] === val);
                return updateBuilder;
              },
              select: () => ({
                maybeSingle: async () => {
                  const target = mockState.verifications.find((v) =>
                    updateFilters.every((f) => f(v))
                  );
                  if (target) {
                    Object.assign(target, fields);
                    return { data: { id: target.id, event_id: target.event_id }, error: null };
                  }
                  return { data: null, error: null };
                },
              }),
              then: (resolve: any) => {
                const targets = mockState.verifications.filter((v) =>
                  updateFilters.every((f) => f(v))
                );
                for (const target of targets) {
                  Object.assign(target, fields);
                }
                return Promise.resolve({ data: targets, error: null }).then(resolve);
              },
            };
            return updateBuilder;
          },
          delete: () => {
            const delFilters: ((item: VerificationRecord) => boolean)[] = [];
            const delBuilder: any = {
              eq: (col: string, val: any) => {
                delFilters.push((item: any) => item[col] === val);
                return delBuilder;
              },
              is: (col: string, val: any) => {
                delFilters.push((item: any) => item[col] === val);
                return delBuilder;
              },
              then: (resolve: any) => {
                mockState.verifications = mockState.verifications.filter(
                  (v) => !delFilters.every((f) => f(v))
                );
                return Promise.resolve({ data: null, error: null }).then(resolve);
              },
            };
            return delBuilder;
          },
        };
      }

      if (tableName === "events") {
        return {
          select: () => ({
            eq: (_col: string, val: any) => ({
              maybeSingle: async () => {
                const found = mockState.events.find((e) => e.id === val);
                return { data: found ?? null, error: null };
              },
            }),
          }),
        };
      }

      if (tableName === "event_payment_orders") {
        return {
          insert: async (records: any) => {
            mockState.orders.push(records);
            return { data: records, error: null };
          },
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    },
  }),
}));

// Import routes after mocking Supabase
import { POST as confirmGuestEmailRoute } from "@/app/api/payments/confirm-guest-email/route";
import { POST as createOrderRoute } from "@/app/api/payments/create-order/route";

describe("Milestone M3 Empirical Adversarial Challenge Suite", () => {
  beforeEach(() => {
    mockState.reset();
  });

  // ============================================================================
  // TASK 1: Adversarial Stress Tests Against Client IP Extraction (clientIp)
  // ============================================================================
  describe("Task 1: Client IP Extraction Adversarial Stress Testing", () => {
    it("T1-1: extracts valid IP when injected with garbage prefix in X-Forwarded-For", () => {
      const req = new Request("https://csc.example/api/test", {
        headers: {
          "x-forwarded-for": "malicious_prefix, 203.0.113.195",
        },
      });
      expect(clientIp(req)).toBe("203.0.113.195");
    });

    it("T1-2: extracts valid IP when multiple garbage and injection payloads precede it", () => {
      const payloads = [
        "attack_prefix_1, attack_prefix_2, 203.0.113.195",
        "'; DROP TABLE users; --, 203.0.113.195",
        "<script>alert('xss')</script>, 203.0.113.195",
        "\" OR 1=1 --, 203.0.113.195:8080",
        "  garbage_with_whitespace  , 203.0.113.195",
      ];

      for (const payload of payloads) {
        const req = new Request("https://csc.example/api/test", {
          headers: { "x-forwarded-for": payload },
        });
        expect(clientIp(req)).toBe("203.0.113.195");
      }
    });

    it("T1-3: ignores invalid IP strings and picks the first valid candidate", () => {
      const req = new Request("https://csc.example/api/test", {
        headers: {
          "x-forwarded-for": "999.999.999.999, 10.0.0.1",
        },
      });
      expect(clientIp(req)).toBe("10.0.0.1");
    });

    it("T1-4: rejects out-of-range octets and invalid formats, picking leftmost valid IP", () => {
      const tests = [
        { header: "256.0.0.1, 10.0.0.1", expected: "10.0.0.1" },
        { header: "1.2.3.4.5, 172.16.0.1", expected: "172.16.0.1" },
        { header: "0x7f.0.0.1, 192.168.1.1", expected: "192.168.1.1" },
        { header: "-1.0.0.1, 10.10.10.10", expected: "10.10.10.10" },
        { header: "not-an-ip.com, 10.0.0.1", expected: "10.0.0.1" },
      ];

      for (const { header, expected } of tests) {
        const req = new Request("https://csc.example/api/test", {
          headers: { "x-forwarded-for": header },
        });
        expect(clientIp(req)).toBe(expected);
      }
    });

    it("T1-5: extracts valid bracketed IPv6 with ports", () => {
      const req = new Request("https://csc.example/api/test", {
        headers: {
          "x-forwarded-for": "[2001:db8::1]:8080",
        },
      });
      expect(clientIp(req)).toBe("2001:db8::1");
    });

    it("T1-6: handles various IPv6 bracketed, unbracketed, and port combinations", () => {
      expect(extractValidIp("[2001:db8::1]:8080")).toBe("2001:db8::1");
      expect(extractValidIp("[2001:db8::1]")).toBe("2001:db8::1");
      expect(extractValidIp("2001:db8::1")).toBe("2001:db8::1");
      expect(extractValidIp("[::1]:3000")).toBe("::1");
      expect(extractValidIp("[fe80::1]:443")).toBe("fe80::1");
      expect(
        extractValidIp("[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8443")
      ).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");

      // Malformed bracketed IPv6 should be rejected
      expect(extractValidIp("[2001:db8:::1]:8080")).toBeNull();
      expect(extractValidIp("[invalid_hex]:8080")).toBeNull();
    });

    it("T1-7: extracts valid IPv4 with ports", () => {
      const req = new Request("https://csc.example/api/test", {
        headers: {
          "x-forwarded-for": "198.51.100.42:3000",
        },
      });
      expect(clientIp(req)).toBe("198.51.100.42");
    });

    it("T1-8: handles various IPv4 port formats", () => {
      expect(extractValidIp("198.51.100.42:3000")).toBe("198.51.100.42");
      expect(extractValidIp("203.0.113.195:8080")).toBe("203.0.113.195");
      expect(extractValidIp("127.0.0.1:80")).toBe("127.0.0.1");
      expect(extractValidIp("10.0.0.1:65535")).toBe("10.0.0.1");

      // Valid plain IP
      expect(extractValidIp("198.51.100.42")).toBe("198.51.100.42");
    });

    it("T1-9: falls back safely to 'unknown' on empty headers, whitespace headers, or missing headers", () => {
      // Empty headers object
      const reqMissing = new Request("https://csc.example/api/test");
      expect(clientIp(reqMissing)).toBe("unknown");

      // Empty string
      const reqEmpty = new Request("https://csc.example/api/test", {
        headers: { "x-forwarded-for": "" },
      });
      expect(clientIp(reqEmpty)).toBe("unknown");

      // Pure whitespace
      const reqWhitespace = new Request("https://csc.example/api/test", {
        headers: { "x-forwarded-for": "    " },
      });
      expect(clientIp(reqWhitespace)).toBe("unknown");

      // Only commas and spaces
      const reqCommas = new Request("https://csc.example/api/test", {
        headers: { "x-forwarded-for": ", ,   , " },
      });
      expect(clientIp(reqCommas)).toBe("unknown");

      // Only invalid garbage across all headers
      const reqAllGarbage = new Request("https://csc.example/api/test", {
        headers: {
          "x-forwarded-for": "malformed_1, malformed_2",
          "x-real-ip": "not_an_ip",
          "x-vercel-forwarded-for": "999.999.999.999",
          "cf-connecting-ip": "attacker.proxy",
        },
      });
      expect(clientIp(reqAllGarbage)).toBe("unknown");
    });

    it("T1-10: enforces trusted proxy header precedence chain", () => {
      // 1. X-Forwarded-For takes precedence over X-Real-IP
      const req1 = new Request("https://csc.example/api/test", {
        headers: {
          "x-forwarded-for": "203.0.113.10",
          "x-real-ip": "203.0.113.20",
        },
      });
      expect(clientIp(req1)).toBe("203.0.113.10");

      // 2. Fallback to X-Real-IP when X-Forwarded-For is all garbage
      const req2 = new Request("https://csc.example/api/test", {
        headers: {
          "x-forwarded-for": "junk_1, junk_2",
          "x-real-ip": "203.0.113.20:8080",
        },
      });
      expect(clientIp(req2)).toBe("203.0.113.20");

      // 3. Fallback to X-Vercel-Forwarded-For when X-Forwarded-For and X-Real-IP are missing/invalid
      const req3 = new Request("https://csc.example/api/test", {
        headers: {
          "x-real-ip": "invalid",
          "x-vercel-forwarded-for": "junk, 203.0.113.30",
        },
      });
      expect(clientIp(req3)).toBe("203.0.113.30");

      // 4. Fallback to CF-Connecting-IP
      const req4 = new Request("https://csc.example/api/test", {
        headers: {
          "cf-connecting-ip": "[2001:db8::99]:443",
        },
      });
      expect(clientIp(req4)).toBe("2001:db8::99");
    });
  });

  // ============================================================================
  // TASK 2: Adversarial Stress Tests Against confirm-guest-email
  // ============================================================================
  describe("Task 2: Guest Verification & OTP Brute-Force Lockout Defense", () => {
    const testEmail = "guest.adversary@example.com";
    const testEventId = "11111111-2222-4333-8444-555555555555";
    const correctOtp = "654321";
    const verificationId = "99999999-0000-4000-8000-111111111111";

    function seedVerificationRecord(overrides: Partial<VerificationRecord> = {}) {
      const codeHash = createHash("sha256").update(correctOtp).digest("hex");
      const record: VerificationRecord = {
        id: verificationId,
        email: testEmail,
        event_id: testEventId,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        attempts: 0,
        metadata: { policy_version: "csc-guest-email-v1" },
        created_at: new Date().toISOString(),
        verified_at: null,
        consumed_at: null,
        token_hash: null,
        ...overrides,
      };
      mockState.verifications.push(record);
      return record;
    }

    function buildConfirmRequest(
      body: any,
      ip = "203.0.113.1",
      origin = "https://csc.example"
    ) {
      return new Request("https://csc.example/api/payments/confirm-guest-email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin,
          "x-forwarded-for": ip,
        },
        body: JSON.stringify(body),
      });
    }

    it("T2-1: rejects first 5 incorrect OTP attempts with HTTP 400 and increments attempts counter", async () => {
      seedVerificationRecord({ attempts: 0 });

      for (let attempt = 1; attempt <= 5; attempt++) {
        // Attacker distributes attempts across distinct IPs to bypass simple IP rate limiting
        const ip = `203.0.113.${attempt}`;
        const wrongCode = `00000${attempt}`;

        const req = buildConfirmRequest(
          { email: testEmail, code: wrongCode, eventId: testEventId, verificationId },
          ip
        );
        const res = await confirmGuestEmailRoute(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.ok).toBe(false);
        expect(data.error).toBe("Invalid verification code.");

        // Verify DB attempts counter was incremented
        const stored = mockState.verifications.find((v) => v.id === verificationId);
        expect(stored?.attempts).toBe(attempt);
        expect(stored?.verified_at).toBeNull();
      }
    });

    it("T2-2: triggers lockout on 6th attempt with HTTP 400 even if correct OTP is provided", async () => {
      // Seed record with exactly 5 failed attempts (lockout threshold reached)
      seedVerificationRecord({ attempts: 5 });

      // Attacker attempts the 6th try with the GENUINE CORRECT OTP from a new IP
      const req = buildConfirmRequest(
        { email: testEmail, code: correctOtp, eventId: testEventId, verificationId },
        "203.0.113.99"
      );
      const res = await confirmGuestEmailRoute(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe("Maximum verification attempts exceeded. Please request a new code.");

      // Verify the record remained strictly UNVERIFIED and no token was generated
      const stored = mockState.verifications.find((v) => v.id === verificationId);
      expect(stored?.verified_at).toBeNull();
      expect(stored?.token_hash).toBeNull();

      // Verify no verification cookie was set
      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toBeNull();
    });

    it("T2-3: full adversarial sequence: 5 wrong attempts from rotating proxies -> 6th attempt with correct OTP blocked", async () => {
      seedVerificationRecord({ attempts: 0 });

      // 5 wrong attempts from rotating IPs (adversary attempting brute force)
      for (let i = 1; i <= 5; i++) {
        const ip = `198.51.100.${i}`;
        const res = await confirmGuestEmailRoute(
          buildConfirmRequest(
            { email: testEmail, code: `11111${i}`, eventId: testEventId },
            ip
          )
        );
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("Invalid verification code.");
      }

      // Check DB record: attempts must now be 5
      const recordAfter5 = mockState.verifications.find((v) => v.id === verificationId);
      expect(recordAfter5?.attempts).toBe(5);
      expect(recordAfter5?.verified_at).toBeNull();

      // 6th attempt: attacker supplies CORRECT code from another proxy IP
      const res6 = await confirmGuestEmailRoute(
        buildConfirmRequest(
          { email: testEmail, code: correctOtp, eventId: testEventId },
          "198.51.100.99"
        )
      );
      expect(res6.status).toBe(400);
      const json6 = await res6.json();
      expect(json6.ok).toBe(false);
      expect(json6.error).toBe("Maximum verification attempts exceeded. Please request a new code.");

      // Record remains unverified
      expect(recordAfter5?.verified_at).toBeNull();
      expect(recordAfter5?.token_hash).toBeNull();
    });

    it("T2-4: enforces single-IP distributed rate limiting at 5 requests per window (HTTP 429)", async () => {
      seedVerificationRecord({ attempts: 0 });
      const singleIp = "192.0.2.77";

      // Attempts 1 through 5 from the same IP
      for (let i = 1; i <= 5; i++) {
        const res = await confirmGuestEmailRoute(
          buildConfirmRequest(
            { email: testEmail, code: `00000${i}`, eventId: testEventId },
            singleIp
          )
        );
        expect(res.status).toBe(400); // 400 Bad Request (invalid code)
      }

      // 6th attempt from the exact same IP triggers rate limiting (HTTP 429) before DB lookup
      const res6 = await confirmGuestEmailRoute(
        buildConfirmRequest(
          { email: testEmail, code: correctOtp, eventId: testEventId },
          singleIp
        )
      );
      expect(res6.status).toBe(429);
      const json6 = await res6.json();
      expect(json6.ok).toBe(false);
      expect(json6.error).toContain("Too many verification attempts");
      expect(res6.headers.get("retry-after")).toBeTruthy();
    });

    it("T2-5: rejects expired OTPs even if code is correct", async () => {
      // Seed record expired 30 seconds ago
      seedVerificationRecord({
        attempts: 0,
        expires_at: new Date(Date.now() - 30_000).toISOString(),
      });

      const req = buildConfirmRequest(
        { email: testEmail, code: correctOtp, eventId: testEventId },
        "203.0.113.1"
      );
      const res = await confirmGuestEmailRoute(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe("Verification code has expired. Please request a new code.");

      const stored = mockState.verifications.find((v) => v.id === verificationId);
      expect(stored?.verified_at).toBeNull();
    });

    it("T2-6: successfully verifies valid OTP on first attempt and sets HttpOnly cookie", async () => {
      seedVerificationRecord({ attempts: 0 });

      const req = buildConfirmRequest(
        { email: testEmail, code: correctOtp, eventId: testEventId },
        "203.0.113.1"
      );
      const res = await confirmGuestEmailRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.verified).toBe(true);
      expect(data.email).toBe(testEmail);
      expect(data.token).toHaveLength(64); // 32-byte hex

      // Check DB record was updated
      const stored = mockState.verifications.find((v) => v.id === verificationId);
      expect(stored?.verified_at).toBeTruthy();
      expect(stored?.token_hash).toBe(
        createHash("sha256").update(data.token).digest("hex")
      );

      // Check Set-Cookie header contains csc_guest_verification
      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader).toContain(GUEST_VERIFICATION_COOKIE_NAME);
      expect(cookieHeader).toContain("HttpOnly");
      expect(cookieHeader?.toLowerCase()).toContain("samesite=lax");
    });

    it("T2-7: prevents replay / re-verification of already verified code", async () => {
      // Seed already verified record
      seedVerificationRecord({
        attempts: 1,
        verified_at: new Date().toISOString(),
        token_hash: createHash("sha256").update("existing-token").digest("hex"),
      });

      const req = buildConfirmRequest(
        { email: testEmail, code: correctOtp, eventId: testEventId },
        "203.0.113.1"
      );
      const res = await confirmGuestEmailRoute(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe("No pending verification found for this email.");
    });

    it("T2-8: rejects malformed request bodies, bad origins, and non-numeric codes", async () => {
      // 1. Cross-origin request
      const crossOriginReq = buildConfirmRequest(
        { email: testEmail, code: correctOtp },
        "203.0.113.1",
        "https://evil-attacker.net"
      );
      const resOrigin = await confirmGuestEmailRoute(crossOriginReq);
      expect(resOrigin.status).toBe(403);

      // 2. Non-numeric code
      const alphaReq = buildConfirmRequest(
        { email: testEmail, code: "abcdef" },
        "203.0.113.1"
      );
      const resAlpha = await confirmGuestEmailRoute(alphaReq);
      expect(resAlpha.status).toBe(422);

      // 3. Short code (5 digits)
      const shortReq = buildConfirmRequest(
        { email: testEmail, code: "12345" },
        "203.0.113.1"
      );
      const resShort = await confirmGuestEmailRoute(shortReq);
      expect(resShort.status).toBe(422);

      // 4. Long code (7 digits)
      const longReq = buildConfirmRequest(
        { email: testEmail, code: "1234567" },
        "203.0.113.1"
      );
      const resLong = await confirmGuestEmailRoute(longReq);
      expect(resLong.status).toBe(422);
    });
  });

  // ============================================================================
  // TASK 3: Forged HMAC Cookie Rejection in csc_guest_verification & create-order
  // ============================================================================
  describe("Task 3: Forged HMAC Attestation Cookie Rejection", () => {
    const validEmail = "verified.guest@example.com";
    const validToken = randomBytes(32).toString("hex");
    const validEventId = "22222222-3333-4444-8555-666666666666";

    it("T3-1: verifyGuestVerificationCookie accepts authentic HMAC cookie", () => {
      const cookie = signGuestVerificationCookie({
        email: validEmail,
        eventId: validEventId,
        token: validToken,
      });

      const result = verifyGuestVerificationCookie(cookie, validEmail);
      expect(result.valid).toBe(true);
      expect(result.email).toBe(validEmail);
      expect(result.eventId).toBe(validEventId);
      expect(result.token).toBe(validToken);
    });

    it("T3-2: rejects forged HMAC with modified signature bytes", () => {
      const cookie = signGuestVerificationCookie({
        email: validEmail,
        eventId: validEventId,
        token: validToken,
      });

      const [data, sig] = cookie.split(".");
      const forgedSig = sig.slice(0, -6) + "XXXXXX";
      const forgedCookie = `${data}.${forgedSig}`;

      const result = verifyGuestVerificationCookie(forgedCookie, validEmail);
      expect(result.valid).toBe(false);
    });

    it("T3-3: rejects HMAC cookie signed with an attacker's arbitrary key", () => {
      const attackerSecret = "attacker-unauthorized-secret-key-32-chars!!";
      const payload = JSON.stringify({
        email: validEmail,
        eventId: validEventId,
        token: validToken,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 15 * 60_000,
      });
      const dataBase64 = Buffer.from(payload).toString("base64url");
      const attackerSignature = createHmac("sha256", attackerSecret)
        .update(dataBase64)
        .digest("base64url");
      const forgedCookie = `${dataBase64}.${attackerSignature}`;

      const result = verifyGuestVerificationCookie(forgedCookie, validEmail);
      expect(result.valid).toBe(false);
    });

    it("T3-4: rejects cookie when attacker tampers with payload data without updating signature", () => {
      const cookie = signGuestVerificationCookie({
        email: validEmail,
        eventId: validEventId,
        token: validToken,
      });

      const [, sig] = cookie.split(".");
      // Attacker changes the email to victim's email inside the payload
      const tamperedPayload = JSON.stringify({
        email: "victim@example.com",
        eventId: validEventId,
        token: validToken,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 15 * 60_000,
      });
      const tamperedData = Buffer.from(tamperedPayload).toString("base64url");
      const tamperedCookie = `${tamperedData}.${sig}`;

      const result = verifyGuestVerificationCookie(tamperedCookie, "victim@example.com");
      expect(result.valid).toBe(false);
    });

    it("T3-5: rejects expired attestation cookie even with valid signature", () => {
      const secret = getGuestVerificationSecret();

      const expiredPayload = JSON.stringify({
        email: validEmail,
        eventId: validEventId,
        token: validToken,
        issuedAt: Date.now() - 30 * 60_000,
        expiresAt: Date.now() - 15 * 60_000, // expired 15 minutes ago
      });
      const dataBase64 = Buffer.from(expiredPayload).toString("base64url");
      const signature = createHmac("sha256", secret).update(dataBase64).digest("base64url");
      const expiredCookie = `${dataBase64}.${signature}`;

      const result = verifyGuestVerificationCookie(expiredCookie, validEmail);
      expect(result.valid).toBe(false);
    });

    it("T3-6: rejects attestation cookie when expected email does not match verified email", () => {
      const cookie = signGuestVerificationCookie({
        email: "alice@example.com",
        token: validToken,
      });

      const result = verifyGuestVerificationCookie(cookie, "bob@example.com");
      expect(result.valid).toBe(false);
    });

    it("T3-7: rejects structural garbage, missing signatures, and malformed base64", () => {
      expect(verifyGuestVerificationCookie("not-a-valid-cookie").valid).toBe(false);
      expect(verifyGuestVerificationCookie("a.b.c.d").valid).toBe(false);
      expect(verifyGuestVerificationCookie("singlepartcookie").valid).toBe(false);
      expect(verifyGuestVerificationCookie("!!!invalid-base64!!!.sig").valid).toBe(false);
      expect(verifyGuestVerificationCookie("").valid).toBe(false);
      expect(verifyGuestVerificationCookie(null).valid).toBe(false);
      expect(verifyGuestVerificationCookie(undefined).valid).toBe(false);
    });

    it("T3-8: create-order route rejects guest checkout with forged csc_guest_verification cookie (HTTP 403)", async () => {
      // Seed published event in mock state
      mockState.events.push({
        id: validEventId,
        slug: "adversarial-test-event",
        title: "Security Test Event",
        status: "published",
        registration_state: "open",
        admission: "paid",
        capacity: 100,
        price_per_attendee: 180,
        starts_at: new Date(Date.now() + 2 * 86400_000).toISOString(),
        registration_deadline: new Date(Date.now() + 86400_000).toISOString(),
      });

      // Craft forged cookie with invalid signature
      const validCookie = signGuestVerificationCookie({
        email: validEmail,
        eventId: validEventId,
        token: validToken,
      });
      const [data, sig] = validCookie.split(".");
      const forgedCookie = `${data}.${sig.slice(0, -6)}ZZZZZZ`;

      const req = new NextRequest("https://csc.example/api/payments/create-order", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://csc.example",
          cookie: `${GUEST_VERIFICATION_COOKIE_NAME}=${forgedCookie}`,
          "x-forwarded-for": "203.0.113.5",
        },
        body: JSON.stringify({
          eventId: validEventId,
          fullName: "Attacker User",
          email: validEmail,
          whatsapp: "9876543210",
          organization: "Evil Corp",
          role: "Startup Founder / Co-Founder",
          attendeeCount: 1,
          consentPaymentTerms: true,
        }),
      });

      const res = await createOrderRoute(req as any);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Verify your email before creating a guest payment order");
    });
  });
});
