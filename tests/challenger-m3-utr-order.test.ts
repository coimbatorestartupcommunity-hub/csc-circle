// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const, @typescript-eslint/no-unused-vars */
/**
 * ==============================================================================
 * Milestone M3 Adversarial Challenger Verification Suite
 * ==============================================================================
 * 
 * Independent Empirical Stress Testing for:
 * 1. Public UTR Claim Route (/api/payments/orders/[orderId]/claim-utr)
 *    - Pre-flight rejection (401) before any DB query
 *    - Invalid UTR format matrix rejection (422)
 *    - Valid 12-digit UTR submission with STRICT NON-SETTLING INVARIANT
 *    - Distributed rate limiter enforcement (429 on 6th request)
 *    - Replay idempotency & cross-order duplicate claim rejection (409)
 * 2. Order Creation Security (/api/payments/create-order)
 *    - Unpayable event states: draft, closed, past-deadline, past-start, free (400/409)
 *    - Order takeover defense: email A vs email B / unauthenticated visitor (409/403)
 *    - Guest email ownership pre-flight invariant (403)
 * 3. Scoped Capability Token Isolation (F13 & F16)
 *    - Scoped cookie cross-order access rejection (401/403)
 *    - Status endpoint cross-order access rejection (401/403)
 * 4. PGlite In-Memory PostgreSQL Invariant Verification
 *    - Atomic distributed rate limiting via csc_check_rate_limit
 *    - idx_active_orders_per_email partial unique constraint
 *    - Database non-settling invariant
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import {
  generateGuestCheckoutToken,
  hashGuestToken,
  signGuestVerificationCookie,
  hashGuestVerificationToken,
  GUEST_VERIFICATION_COOKIE_NAME,
} from "@/lib/payments/orders";

// ---------------------------------------------------------------------------
// Stateful Mock Environment for Route Handler Unit/Integration Testing
// ---------------------------------------------------------------------------

interface MockOrder {
  id: string;
  order_reference: string;
  event_id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  status: string;
  claimed_utr: string | null;
  guest_token_hash: string | null;
  amount_paise: number;
  paid_registration_id?: string | null;
  matched_at?: string | null;
  expires_at?: string | null;
  verification_started_at?: string | null;
  upi_uri: string;
}

interface MockEvent {
  id: string;
  title: string;
  status: string;
  registration_state: string;
  starts_at: string;
  registration_deadline?: string | null;
  admission: string;
  registration_mode: string;
  price_per_attendee: number;
  max_attendees_per_registration: number;
  capacity?: number | null;
}

interface MockGuestVerification {
  id: string;
  email: string;
  event_id: string | null;
  token_hash: string;
  verified_at: string;
  consumed_at: string | null;
  expires_at: string;
}

class MockDatabaseState {
  orders = new Map<string, MockOrder>();
  events = new Map<string, MockEvent>();
  guestVerifications = new Map<string, MockGuestVerification>();
  rateLimitHits = new Map<string, number>();
  paymentEvents: any[] = [];
  paidRegistrations: any[] = [];
  eventRegistrations: any[] = [];
  evidence: any[] = [];
  attributions: any[] = [];
  
  // Inspection Spies
  tableAccessLog: string[] = [];
  rpcCallLog: { name: string; args: any }[] = [];
  orderUpdateLog: any[] = [];

  reset() {
    this.orders.clear();
    this.events.clear();
    this.guestVerifications.clear();
    this.rateLimitHits.clear();
    this.paymentEvents = [];
    this.paidRegistrations = [];
    this.eventRegistrations = [];
    this.evidence = [];
    this.attributions = [];
    this.tableAccessLog = [];
    this.rpcCallLog = [];
    this.orderUpdateLog = [];
  }
}

const dbState = new MockDatabaseState();

// Active mock session user for createClient()
let mockSessionUser: { id: string; email?: string; email_confirmed_at?: string } | null = null;
let mockAdminRoles: { role: string }[] = [];

vi.mock("next/cache", () => ({
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: mockSessionUser },
        error: null,
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          data: table === "admin_roles" ? mockAdminRoles : [],
          error: null,
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    return {
      rpc: async (fn: string, args: any) => {
        dbState.rpcCallLog.push({ name: fn, args });

        if (fn === "csc_check_rate_limit") {
          const { p_key, p_limit, p_window_seconds } = args;
          const current = (dbState.rateLimitHits.get(p_key) ?? 0) + 1;
          dbState.rateLimitHits.set(p_key, current);

          const allowed = current <= p_limit;
          return {
            data: {
              allowed,
              remaining: Math.max(0, p_limit - current),
              reset_at: new Date(Date.now() + (p_window_seconds ?? 60) * 1000).toISOString(),
              retry_after: allowed ? 0 : (p_window_seconds ?? 60),
            },
            error: null,
          };
        }

        if (fn === "csc_fulfill_confirmed_payment") {
          return { data: { ok: true }, error: null };
        }

        return { data: null, error: null };
      },

      from: (table: string) => {
        dbState.tableAccessLog.push(table);

        return {
          select: (fields?: string, options?: any) => {
            let selectedTable = table;
            let filters: Array<{ col: string; op: string; val: any }> = [];

            const builder = {
              eq: (col: string, val: any) => {
                filters.push({ col, op: "eq", val });
                return builder;
              },
              neq: (col: string, val: any) => {
                filters.push({ col, op: "neq", val });
                return builder;
              },
              in: (col: string, vals: any[]) => {
                filters.push({ col, op: "in", val: vals });
                return builder;
              },
              is: (col: string, val: any) => {
                filters.push({ col, op: "is", val });
                return builder;
              },
              not: (col: string, opStr: string, val: any) => {
                filters.push({ col, op: "not", val });
                return builder;
              },
              limit: (n: number) => builder,
              _getMatches: () => {
                let rows: any[] = [];
                if (selectedTable === "event_payment_orders") {
                  rows = Array.from(dbState.orders.values());
                } else if (selectedTable === "events") {
                  rows = Array.from(dbState.events.values());
                } else if (selectedTable === "guest_email_verifications") {
                  rows = Array.from(dbState.guestVerifications.values());
                } else if (selectedTable === "paid_event_registrations") {
                  rows = dbState.paidRegistrations;
                } else if (selectedTable === "event_registrations") {
                  rows = dbState.eventRegistrations;
                } else if (selectedTable === "event_payment_evidence") {
                  rows = dbState.evidence;
                } else if (selectedTable === "event_payment_attributions") {
                  rows = dbState.attributions;
                }

                return rows.filter((r) => {
                  for (const f of filters) {
                    if (f.op === "eq" && (r as any)[f.col] !== f.val) return false;
                    if (f.op === "neq" && (r as any)[f.col] === f.val) return false;
                    if (f.op === "is" && f.val === null && (r as any)[f.col] !== null) return false;
                    if (f.op === "in" && Array.isArray(f.val) && !f.val.includes((r as any)[f.col])) return false;
                  }
                  return true;
                });
              },
              maybeSingle: async () => {
                const matches = builder._getMatches();
                return { data: matches[0] ? { ...matches[0] } : null, error: null };
              },
              single: async () => {
                const res = await builder.maybeSingle();
                if (!res.data) return { data: null, error: { message: "Row not found" } };
                return res;
              },
              then: async (resolve: any) => {
                if (options?.count === "exact") {
                  const matches = builder._getMatches();
                  return resolve({ count: matches.length, data: [], error: null });
                }
                const matches = builder._getMatches();
                return resolve({ data: matches.map((m) => ({ ...m })), error: null });
              },
            };

            return builder;
          },

          upsert: (recordOrRecords: any, _options?: any) => {
            const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];

            if (table === "event_payment_evidence") {
              for (const r of records) {
                const id = r.id || `evidence-${Date.now()}-${Math.random()}`;
                const existingIdx = dbState.evidence.findIndex((e) => e.utr === r.utr || e.id === id);
                const full = { ...r, id };
                if (existingIdx >= 0) dbState.evidence[existingIdx] = { ...dbState.evidence[existingIdx], ...full };
                else dbState.evidence.push(full);
              }
            } else if (table === "event_payment_attributions") {
              for (const r of records) {
                const existingIdx = dbState.attributions.findIndex((a) => a.order_id === r.order_id);
                if (existingIdx >= 0) dbState.attributions[existingIdx] = { ...dbState.attributions[existingIdx], ...r };
                else dbState.attributions.push({ ...r });
              }
            }

            const first = records[0] || {};
            return {
              select: () => ({
                maybeSingle: async () => ({
                  data: { ...first, id: first.id || `${table}-id-1` },
                  error: null,
                }),
              }),
            };
          },

          insert: (recordOrRecords: any) => {
            const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];

            if (table === "event_payment_events") {
              dbState.paymentEvents.push(...records);
            } else if (table === "event_payment_orders") {
              for (const r of records) {
                const id = r.id || `order-${Date.now()}-${Math.random()}`;
                const full = { ...r, id };
                dbState.orders.set(id, full);
              }
            } else if (table === "paid_event_registrations") {
              dbState.paidRegistrations.push(...records);
            } else if (table === "event_registrations") {
              dbState.eventRegistrations.push(...records);
            }

            return {
              select: () => ({
                single: async () => ({
                  data: { ...(records[0] || {}), id: records[0]?.id || "order-id-1" },
                  error: null,
                }),
              }),
            };
          },

          update: (updates: any) => {
            dbState.orderUpdateLog.push(updates);
            let filterId: string | null = null;
            let filterStatusIn: string[] | null = null;

            const updateBuilder = {
              eq: (col: string, val: any) => {
                if (col === "id") filterId = val;
                return updateBuilder;
              },
              is: (col: string, val: any) => updateBuilder,
              in: (col: string, vals: any[]) => {
                if (col === "status") filterStatusIn = vals;
                return updateBuilder;
              },
              select: () => updateBuilder,
              maybeSingle: async () => {
                if (table === "event_payment_orders" && filterId) {
                  const order = dbState.orders.get(filterId);
                  if (order) {
                    if (filterStatusIn && !filterStatusIn.includes(order.status)) {
                      return { data: null, error: null };
                    }
                    Object.assign(order, updates);
                    return { data: { id: order.id }, error: null };
                  }
                }
                if (table === "guest_email_verifications" && filterId) {
                  const gv = dbState.guestVerifications.get(filterId);
                  if (gv) {
                    Object.assign(gv, updates);
                    return { data: { id: gv.id }, error: null };
                  }
                }
                return { data: { id: filterId }, error: null };
              },
            };

            return updateBuilder;
          },
        };
      },
    };
  },
}));

// Import Next.js route handlers after vi.mock declarations
import { POST as startVerificationRoute } from "@/app/api/payments/orders/[orderId]/start-verification/route";
import { POST as claimUtrRoute } from "@/app/api/payments/orders/[orderId]/claim-utr/route";
import { POST as createOrderRoute } from "@/app/api/payments/create-order/route";
import { GET as orderStatusRoute } from "@/app/api/payments/orders/[orderId]/status/route";

describe("Milestone M3 Adversarial Challenger Verification Suite", () => {
  beforeEach(() => {
    dbState.reset();
    mockSessionUser = null;
    mockAdminRoles = [];
  });

  // ============================================================================
  // Task 1: Public UTR Claim Route Adversarial Stress Tests
  // ============================================================================
  describe("Task 1: Adversarial Stress Tests on /api/payments/orders/[orderId]/claim-utr", () => {
    const validOrderId = "11111111-1111-4111-8111-111111111111";

    it("1.1 Pre-flight auth check: unauthenticated request without guest capability token is rejected with 401 BEFORE any DB query", async () => {
      const req = new Request(`http://localhost:3000/api/payments/orders/${validOrderId}/claim-utr`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ utr: "630711223344" }),
      });

      const res = await claimUtrRoute(req, { params: Promise.resolve({ orderId: validOrderId }) });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Authentication or guest token required");

      // EMPIRICAL INVARIANT: event_payment_orders must NEVER be queried from DB when unauthenticated
      expect(dbState.tableAccessLog.includes("event_payment_orders")).toBe(false);
    });

    it("1.2 Pre-flight auth check: request with empty or garbage guest cookie is rejected with 401 without querying orders table", async () => {
      const req = new Request(`http://localhost:3000/api/payments/orders/${validOrderId}/claim-utr`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie: "other_cookie=value123; foo=bar",
        },
        body: JSON.stringify({ utr: "630711223344" }),
      });

      const res = await claimUtrRoute(req, { params: Promise.resolve({ orderId: validOrderId }) });

      expect(res.status).toBe(401);
      expect(dbState.tableAccessLog.includes("event_payment_orders")).toBe(false);
    });

    it("1.3 Invalid UTR format matrix: letters, symbols, 10 digits, 13 digits, and non-numeric inputs receive HTTP 422", async () => {
      const invalidUtrs = [
        "ABCDEFGHIJKL",        // Letters only
        "63071122334A",        // Alphanumeric mixed
        "12345!@#9012",        // Symbols and punctuation
        "1234567890",          // 10 digits (too short)
        "12345678901",         // 11 digits (too short)
        "1234567890123",       // 13 digits (too long)
        "123456789012345",     // 15 digits (too long)
        "",                    // Empty string
        "-12345678901",        // Negative symbol
        "12345.678901",        // Float decimal
      ];

      for (let i = 0; i < invalidUtrs.length; i++) {
        const invalidUtr = invalidUtrs[i];
        const req = new Request(`http://localhost:3000/api/payments/orders/${validOrderId}/claim-utr`, {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
            "x-forwarded-for": `198.51.100.${10 + i}`,
            cookie: `csc_guest_order_token_${validOrderId}=some-token`,
          },
          body: JSON.stringify({ utr: invalidUtr }),
        });

        const res = await claimUtrRoute(req, { params: Promise.resolve({ orderId: validOrderId }) });
        expect(res.status).toBe(422);
        const json = await res.json();
        expect(json.ok).toBe(false);
        expect(json.error).toMatch(/12-digit numeric reference/i);
      }
    });

    it("1.4 Strict Non-Settling Invariant: valid 12-digit UTR updates order to 'processing' and claimed_utr, BUT csc_fulfill_confirmed_payment is NOT called and no passes are issued", async () => {
      const validGuestToken = generateGuestCheckoutToken();
      const guestHash = hashGuestToken(validGuestToken);

      // Seed pending order
      dbState.orders.set(validOrderId, {
        id: validOrderId,
        order_reference: "CSC-ORD-NONSETTLE01",
        event_id: "event-1",
        user_id: null,
        email: "guest@example.com",
        full_name: "Guest Buyer",
        status: "pending",
        claimed_utr: null,
        guest_token_hash: guestHash,
        amount_paise: 50000,
        upi_uri: "upi://pay?pa=test@upi",
      });

      const validUtr = "630711998877";
      const req = new Request(`http://localhost:3000/api/payments/orders/${validOrderId}/claim-utr`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie: `csc_guest_order_token_${validOrderId}=${validGuestToken}`,
        },
        body: JSON.stringify({ utr: validUtr }),
      });

      const res = await claimUtrRoute(req, { params: Promise.resolve({ orderId: validOrderId }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.status).toBe("processing");
      expect(json.message).toContain("independently verified bank evidence");

      // Verify order record was updated to 'processing' with claimed_utr
      const updatedOrder = dbState.orders.get(validOrderId);
      expect(updatedOrder?.status).toBe("processing");
      expect(updatedOrder?.claimed_utr).toBe(validUtr);

      // STRICT NON-SETTLING INVARIANT ASSERTIONS:
      // 1. Settlement RPC csc_fulfill_confirmed_payment must NOT be called
      const fulfillmentCalls = dbState.rpcCallLog.filter((c) => c.name === "csc_fulfill_confirmed_payment");
      expect(fulfillmentCalls.length).toBe(0);

      // 2. No passes or paid registrations must be created
      expect(dbState.paidRegistrations.length).toBe(0);
      expect(dbState.eventRegistrations.length).toBe(0);

      // 3. Audit event utr_claimed must be recorded
      const auditEvents = dbState.paymentEvents.filter(
        (e) => e.order_id === validOrderId && e.event_type === "utr_claimed"
      );
      expect(auditEvents.length).toBe(1);
      expect(auditEvents[0].details.claimed_utr).toBe(validUtr);
      expect(auditEvents[0].details.claim_source).toBe("guest_capability_holder");
    });

    it("1.4b Auto-Confirm Enabled But No Genuine Bank Evidence: valid UTR claim stays 'processing' and never settles", async () => {
      const previousFlag = process.env.CSC_PAYMENT_AUTO_CONFIRM;
      process.env.CSC_PAYMENT_AUTO_CONFIRM = "true";
      try {
        const validGuestToken = generateGuestCheckoutToken();
        const guestHash = hashGuestToken(validGuestToken);

        dbState.orders.set(validOrderId, {
          id: validOrderId,
          order_reference: "CSC-ORD-FLAGON-NOEVID",
          event_id: "event-1",
          user_id: null,
          email: "guest@example.com",
          full_name: "Guest Buyer",
          status: "pending",
          claimed_utr: null,
          guest_token_hash: guestHash,
          amount_paise: 50000,
          upi_uri: "upi://pay?pa=test@upi",
        });

        const req = new Request(`http://localhost:3000/api/payments/orders/${validOrderId}/claim-utr`, {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
            cookie: `csc_guest_order_token_${validOrderId}=${validGuestToken}`,
          },
          body: JSON.stringify({ utr: "630711112233" }),
        });

        const res = await claimUtrRoute(req, { params: Promise.resolve({ orderId: validOrderId }) });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.status).toBe("processing");

        // No settlement RPC even with the flag enabled: UTR alone is not bank evidence
        const fulfillmentCalls = dbState.rpcCallLog.filter((c) => c.name === "csc_fulfill_confirmed_payment");
        expect(fulfillmentCalls.length).toBe(0);
        expect(dbState.paidRegistrations.length).toBe(0);
      } finally {
        if (previousFlag === undefined) delete process.env.CSC_PAYMENT_AUTO_CONFIRM;
        else process.env.CSC_PAYMENT_AUTO_CONFIRM = previousFlag;
      }
    });

    it("1.4c Auto-Confirm Enabled With Genuine Bank Evidence: uniquely matched credit settles exactly once", async () => {
      const previousFlag = process.env.CSC_PAYMENT_AUTO_CONFIRM;
      process.env.CSC_PAYMENT_AUTO_CONFIRM = "true";
      try {
        const validGuestToken = generateGuestCheckoutToken();
        const guestHash = hashGuestToken(validGuestToken);

        dbState.orders.set(validOrderId, {
          id: validOrderId,
          order_reference: "CSC-ORD-FLAGON-EVID",
          event_id: "event-1",
          user_id: null,
          email: "guest@example.com",
          full_name: "Guest Buyer",
          status: "pending",
          claimed_utr: null,
          guest_token_hash: guestHash,
          amount_paise: 50000,
          upi_uri: "upi://pay?pa=test@upi",
        });

        // Seed one genuine authenticated bank credit matching UTR + exact amount + account
        dbState.evidence.push({
          id: "evidence-genuine-1",
          utr: "630711445566",
          auth_status: "authenticated",
          amount_paise: 50000,
          receiving_account_suffix: undefined,
          transaction_time: new Date().toISOString(),
          reconciliation_state: "pending",
          matched_order_id: null,
        });

        const req = new Request(`http://localhost:3000/api/payments/orders/${validOrderId}/claim-utr`, {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
            cookie: `csc_guest_order_token_${validOrderId}=${validGuestToken}`,
          },
          body: JSON.stringify({ utr: "630711445566" }),
        });

        const res = await claimUtrRoute(req, { params: Promise.resolve({ orderId: validOrderId }) });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.status).toBe("verified");

        // Settlement RPC called exactly once against the genuine evidence id
        const fulfillmentCalls = dbState.rpcCallLog.filter((c) => c.name === "csc_fulfill_confirmed_payment");
        expect(fulfillmentCalls.length).toBe(1);
        expect(fulfillmentCalls[0].args.p_evidence_id).toBe("evidence-genuine-1");

        // Attribution recorded for the genuine bank credit
        expect(dbState.attributions.length).toBe(1);
        expect(dbState.attributions[0].order_id).toBe(validOrderId);
        expect(dbState.attributions[0].evidence_id).toBe("evidence-genuine-1");
      } finally {
        if (previousFlag === undefined) delete process.env.CSC_PAYMENT_AUTO_CONFIRM;
        else process.env.CSC_PAYMENT_AUTO_CONFIRM = previousFlag;
      }
    });

    it("1.5 Rate Limiter: 5 rapid UTR claims succeed, 6th is rejected with HTTP 429 and Retry-After header", async () => {
      const validGuestToken = generateGuestCheckoutToken();
      const guestHash = hashGuestToken(validGuestToken);

      dbState.orders.set(validOrderId, {
        id: validOrderId,
        order_reference: "CSC-ORD-RATELIMIT01",
        event_id: "event-1",
        user_id: null,
        email: "guest@example.com",
        full_name: "Guest Buyer",
        status: "pending",
        claimed_utr: null,
        guest_token_hash: guestHash,
        amount_paise: 50000,
        upi_uri: "upi://pay?pa=test@upi",
      });

      // Submit 5 claims rapidly from the same IP (198.51.100.99)
      const ip = "198.51.100.99";
      for (let i = 1; i <= 5; i++) {
        const req = new Request(`http://localhost:3000/api/payments/orders/${validOrderId}/claim-utr`, {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
            "x-forwarded-for": ip,
            cookie: `csc_guest_order_token_${validOrderId}=${validGuestToken}`,
          },
          body: JSON.stringify({ utr: `63071100000${i}` }),
        });

        const res = await claimUtrRoute(req, { params: Promise.resolve({ orderId: validOrderId }) });
        // The first 5 requests should NOT be rate limited (they may succeed or return 409 if already claimed, but NOT 429)
        expect(res.status).not.toBe(429);
      }

      // 6th claim from the same IP must be rejected with 429
      const req6 = new Request(`http://localhost:3000/api/payments/orders/${validOrderId}/claim-utr`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          "x-forwarded-for": ip,
          cookie: `csc_guest_order_token_${validOrderId}=${validGuestToken}`,
        },
        body: JSON.stringify({ utr: "630711000006" }),
      });

      const res6 = await claimUtrRoute(req6, { params: Promise.resolve({ orderId: validOrderId }) });
      expect(res6.status).toBe(429);
      expect(res6.headers.get("retry-after")).toBeDefined();
      const json6 = await res6.json();
      expect(json6.ok).toBe(false);
      expect(json6.error).toContain("Too many claim attempts");
    });

    it("1.6 Duplicate UTR claim rejection: claiming a UTR already claimed by another order returns 409 Conflict", async () => {
      const orderAId = "11111111-1111-4111-8111-111111111111";
      const orderBId = "22222222-2222-4222-8222-222222222222";
      const tokenB = generateGuestCheckoutToken();
      const utrShared = "630711555555";

      // Order A has already claimed the UTR
      dbState.orders.set(orderAId, {
        id: orderAId,
        order_reference: "CSC-ORD-ORDER-A",
        event_id: "event-1",
        user_id: null,
        email: "userA@test.com",
        full_name: "Buyer A",
        status: "processing",
        claimed_utr: utrShared,
        guest_token_hash: hashGuestToken("tokenA"),
        amount_paise: 50000,
        upi_uri: "upi://pay",
      });

      // Order B is pending
      dbState.orders.set(orderBId, {
        id: orderBId,
        order_reference: "CSC-ORD-ORDER-B",
        event_id: "event-1",
        user_id: null,
        email: "userB@test.com",
        full_name: "Buyer B",
        status: "pending",
        claimed_utr: null,
        guest_token_hash: hashGuestToken(tokenB),
        amount_paise: 50000,
        upi_uri: "upi://pay",
      });

      // Order B attempts to claim the same UTR
      const req = new Request(`http://localhost:3000/api/payments/orders/${orderBId}/claim-utr`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie: `csc_guest_order_token_${orderBId}=${tokenB}`,
        },
        body: JSON.stringify({ utr: utrShared }),
      });

      const res = await claimUtrRoute(req, { params: Promise.resolve({ orderId: orderBId }) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("already been submitted for another order");
    });
  });

  // ============================================================================
  // Task 2: Order Creation Adversarial Tests & Takeover Prevention
  // ============================================================================
  describe("Task 2: Adversarial Tests on /api/payments/create-order", () => {
    const validEventId = "33333333-3333-4333-8333-333333333333";

    function seedPublishedEvent(overrides: Partial<MockEvent> = {}): MockEvent {
      const evt: MockEvent = {
        id: validEventId,
        title: "CSC Annual Tech Conclave 2026",
        status: "published",
        registration_state: "open",
        starts_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days in future
        registration_deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
        admission: "paid",
        registration_mode: "external_form",
        price_per_attendee: 500.0,
        max_attendees_per_registration: 5,
        capacity: 100,
        ...overrides,
      };
      dbState.events.set(validEventId, evt);
      return evt;
    }

    function createValidGuestVerification(email: string, eventId: string) {
      const token = generateGuestCheckoutToken();
      const tokenHash = hashGuestVerificationToken(token);
      const id = "ver-rec-1";
      dbState.guestVerifications.set(id, {
        id,
        email: email.toLowerCase(),
        event_id: eventId,
        token_hash: tokenHash,
        verified_at: new Date().toISOString(),
        consumed_at: null,
        expires_at: new Date(Date.now() + 600000).toISOString(),
      });
      const cookieValue = signGuestVerificationCookie({ email, eventId, token });
      return { token, cookieValue };
    }

    it("2.1 Unpayable event state: draft event is rejected with HTTP 409", async () => {
      seedPublishedEvent({ status: "draft" });
      const { cookieValue } = createValidGuestVerification("test@example.com", validEventId);

      const req = new NextRequest("http://localhost:3000/api/payments/create-order", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie: `${GUEST_VERIFICATION_COOKIE_NAME}=${cookieValue}`,
        },
        body: JSON.stringify({
          eventId: validEventId,
          fullName: "John Doe",
          email: "test@example.com",
          whatsapp: "9876543210",
          organization: "Tech Startup",
          role: "Startup Founder / Co-Founder",
          attendeeCount: 1,
          consentPaymentTerms: true,
        }),
      });

      const res = await createOrderRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Registration is not open for this event");
    });

    it("2.2 Unpayable event state: closed registration state is rejected with HTTP 409", async () => {
      seedPublishedEvent({ registration_state: "closed" });
      const { cookieValue } = createValidGuestVerification("test@example.com", validEventId);

      const req = new NextRequest("http://localhost:3000/api/payments/create-order", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie: `${GUEST_VERIFICATION_COOKIE_NAME}=${cookieValue}`,
        },
        body: JSON.stringify({
          eventId: validEventId,
          fullName: "John Doe",
          email: "test@example.com",
          whatsapp: "9876543210",
          organization: "Tech Startup",
          role: "Startup Founder / Co-Founder",
          attendeeCount: 1,
          consentPaymentTerms: true,
        }),
      });

      const res = await createOrderRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Registration is not open for this event");
    });

    it("2.3 Unpayable event state: past registration deadline is rejected with HTTP 409", async () => {
      seedPublishedEvent({
        registration_deadline: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      });
      const { cookieValue } = createValidGuestVerification("test@example.com", validEventId);

      const req = new NextRequest("http://localhost:3000/api/payments/create-order", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie: `${GUEST_VERIFICATION_COOKIE_NAME}=${cookieValue}`,
        },
        body: JSON.stringify({
          eventId: validEventId,
          fullName: "John Doe",
          email: "test@example.com",
          whatsapp: "9876543210",
          organization: "Tech Startup",
          role: "Startup Founder / Co-Founder",
          attendeeCount: 1,
          consentPaymentTerms: true,
        }),
      });

      const res = await createOrderRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Registration is not open for this event");
    });

    it("2.4 Unpayable event state: past event starts_at is rejected with HTTP 409", async () => {
      seedPublishedEvent({
        starts_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      });
      const { cookieValue } = createValidGuestVerification("test@example.com", validEventId);

      const req = new NextRequest("http://localhost:3000/api/payments/create-order", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie: `${GUEST_VERIFICATION_COOKIE_NAME}=${cookieValue}`,
        },
        body: JSON.stringify({
          eventId: validEventId,
          fullName: "John Doe",
          email: "test@example.com",
          whatsapp: "9876543210",
          organization: "Tech Startup",
          role: "Startup Founder / Co-Founder",
          attendeeCount: 1,
          consentPaymentTerms: true,
        }),
      });

      const res = await createOrderRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Registration is not open for this event");
    });

    it("2.5 Unpayable event state: free admission event is rejected with HTTP 409 (paid checkout only)", async () => {
      seedPublishedEvent({ admission: "free" });
      const { cookieValue } = createValidGuestVerification("test@example.com", validEventId);

      const req = new NextRequest("http://localhost:3000/api/payments/create-order", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie: `${GUEST_VERIFICATION_COOKIE_NAME}=${cookieValue}`,
        },
        body: JSON.stringify({
          eventId: validEventId,
          fullName: "John Doe",
          email: "test@example.com",
          whatsapp: "9876543210",
          organization: "Tech Startup",
          role: "Startup Founder / Co-Founder",
          attendeeCount: 1,
          consentPaymentTerms: true,
        }),
      });

      const res = await createOrderRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Registration is not open for this event");
    });

    it("2.6 Order Takeover Defense: unauthenticated visitor cannot access or resume another user's active order (409 Conflict)", async () => {
      seedPublishedEvent();
      const legitToken = generateGuestCheckoutToken();
      const existingOrderId = "order-takeover-victim-01";

      // User A creates an active pending order with legitToken
      dbState.orders.set(existingOrderId, {
        id: existingOrderId,
        order_reference: "CSC-ORD-USER-A",
        event_id: validEventId,
        user_id: null,
        email: "usera@test.com",
        full_name: "Alice Owner",
        status: "pending",
        claimed_utr: null,
        guest_token_hash: hashGuestToken(legitToken),
        amount_paise: 50000,
        upi_uri: "upi://pay",
        expires_at: new Date(Date.now() + 1800000).toISOString(),
      });

      // Attacker B attempts to create/resume an order for usera@test.com WITHOUT possessing legitToken
      const { cookieValue: attackerVerification } = createValidGuestVerification("usera@test.com", validEventId);

      const req = new NextRequest("http://localhost:3000/api/payments/create-order", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie: `${GUEST_VERIFICATION_COOKIE_NAME}=${attackerVerification}`,
        },
        body: JSON.stringify({
          eventId: validEventId,
          fullName: "Bob Attacker",
          email: "usera@test.com", // Target victim's email
          whatsapp: "9876543210",
          organization: "Evil Corp",
          role: "Startup Founder / Co-Founder",
          attendeeCount: 1,
          consentPaymentTerms: true,
        }),
      });

      const res = await createOrderRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("A payment order is already in progress for this email address");
    });

    it("2.7 Order Takeover Defense: authenticated user B cannot create order under user A's email (403 Forbidden)", async () => {
      seedPublishedEvent();
      mockSessionUser = {
        id: "user-b-id",
        email: "userb@test.com",
        email_confirmed_at: new Date().toISOString(),
      };

      // User B attempts to checkout using victim's email (usera@test.com)
      const req = new NextRequest("http://localhost:3000/api/payments/create-order", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          eventId: validEventId,
          fullName: "User B Impersonator",
          email: "usera@test.com", // Mismatched email!
          whatsapp: "9876543210",
          organization: "Impersonator Org",
          role: "Startup Founder / Co-Founder",
          attendeeCount: 1,
          consentPaymentTerms: true,
        }),
      });

      const res = await createOrderRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Use the verified email address on your signed-in CSC account");
    });

    it("2.8 Guest email ownership invariant: guest request without verification cookie or token is rejected with 403", async () => {
      seedPublishedEvent();

      // Guest attempts to create order without completing pre-flight email verification
      const req = new NextRequest("http://localhost:3000/api/payments/create-order", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          eventId: validEventId,
          fullName: "Unverified Guest",
          email: "unverified@test.com",
          whatsapp: "9876543210",
          organization: "Anon",
          role: "Startup Founder / Co-Founder",
          attendeeCount: 1,
          consentPaymentTerms: true,
        }),
      });

      const res = await createOrderRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Verify your email before creating a guest payment order");
    });
  });

  // ============================================================================
  // Task 3: Capability Token Cross-Order Access Isolation (F13 & F16)
  // ============================================================================
  describe("Task 3: Capability Token Scoping & Cross-Order Access Isolation", () => {
    const order1Id = "44444444-4444-4444-8444-444444444444";
    const order2Id = "55555555-5555-4555-8555-555555555555";
    const token1 = generateGuestCheckoutToken();
    const token2 = generateGuestCheckoutToken();

    beforeEach(() => {
      // Seed Order 1
      dbState.orders.set(order1Id, {
        id: order1Id,
        order_reference: "CSC-ORD-ISOLATION-01",
        event_id: "event-1",
        user_id: null,
        email: "alice@test.com",
        full_name: "Alice Order 1",
        status: "pending",
        claimed_utr: null,
        guest_token_hash: hashGuestToken(token1),
        amount_paise: 50000,
        upi_uri: "upi://pay",
      });

      // Seed Order 2
      dbState.orders.set(order2Id, {
        id: order2Id,
        order_reference: "CSC-ORD-ISOLATION-02",
        event_id: "event-1",
        user_id: null,
        email: "bob@test.com",
        full_name: "Bob Order 2",
        status: "pending",
        claimed_utr: null,
        guest_token_hash: hashGuestToken(token2),
        amount_paise: 75000,
        upi_uri: "upi://pay",
      });
    });

    it("3.1 Cross-Order Claim Rejection: csc_guest_order_token_<order1> cannot claim UTR for order2 (401 Unauthorized)", async () => {
      // Attacker holds token1 for order1, attempts to claim UTR on order2 using order1's scoped cookie
      const req = new Request(`http://localhost:3000/api/payments/orders/${order2Id}/claim-utr`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie: `csc_guest_order_token_${order1Id}=${token1}`, // Scoped to order 1!
        },
        body: JSON.stringify({ utr: "630711123456" }),
      });

      const res = await claimUtrRoute(req, { params: Promise.resolve({ orderId: order2Id }) });

      // extractGuestToken rejects because scoped cookie does not match order2Id
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Authentication or guest token required");
    });

    it("3.2 Tampered Scoped Cookie Rejection: csc_guest_order_token_<order2>=<token1> is rejected with 403 Forbidden", async () => {
      // Attacker renames the cookie name to match order2, but passes token1 (wrong token value)
      const req = new Request(`http://localhost:3000/api/payments/orders/${order2Id}/claim-utr`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie: `csc_guest_order_token_${order2Id}=${token1}`, // Wrong token value!
        },
        body: JSON.stringify({ utr: "630711123456" }),
      });

      const res = await claimUtrRoute(req, { params: Promise.resolve({ orderId: order2Id }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Access denied to this payment order");
    });

    it("3.3 Status Endpoint Cross-Order Isolation: csc_guest_order_token_<order1> cannot read status of order2 (401 Unauthorized)", async () => {
      // Attacker presents cookie scoped to order1 when polling status for order2
      const req = new Request(`http://localhost:3000/api/payments/orders/${order2Id}/status`, {
        method: "GET",
        headers: {
          origin: "http://localhost:3000",
          cookie: `csc_guest_order_token_${order1Id}=${token1}`,
        },
      });

      const res = await orderStatusRoute(req, { params: Promise.resolve({ orderId: order2Id }) });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Authentication or guest token required");
    });

    it("3.4 Status Endpoint Cross-Order Isolation: csc_payment_guest=<token1> cannot read status of order2 (403 Forbidden)", async () => {
      // Attacker presents general guest cookie containing token1 when querying order2
      const req = new Request(`http://localhost:3000/api/payments/orders/${order2Id}/status`, {
        method: "GET",
        headers: {
          origin: "http://localhost:3000",
          cookie: `csc_payment_guest=${token1}`,
        },
      });

      const res = await orderStatusRoute(req, { params: Promise.resolve({ orderId: order2Id }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Access denied to this payment order");
    });

    it("3.5 Legitimate Access: valid token2 grants authorized status access to order2 (200 OK)", async () => {
      const req = new Request(`http://localhost:3000/api/payments/orders/${order2Id}/status`, {
        method: "GET",
        headers: {
          origin: "http://localhost:3000",
          cookie: `csc_payment_guest=${token2}`,
        },
      });

      const res = await orderStatusRoute(req, { params: Promise.resolve({ orderId: order2Id }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.orderId).toBe(order2Id);
      expect(json.status).toBe("pending");
      expect(json.amountRupees).toBe(750);
    });
  });

  // ============================================================================
  // Task 5: Server-Persisted Five-Minute Verification Window
  // ============================================================================
  describe("Task 5: Server-Persisted Verification Window (start-verification + status)", () => {
    const verifyOrderId = "66666666-6666-4666-8666-666666666666";

    function seedVerifiableOrder() {
      const token = generateGuestCheckoutToken();
      dbState.orders.set(verifyOrderId, {
        id: verifyOrderId,
        order_reference: "CSC-ORD-VERIFYWIN01",
        event_id: "event-1",
        user_id: null,
        email: "guest@example.com",
        full_name: "Guest Buyer",
        status: "pending",
        claimed_utr: null,
        guest_token_hash: hashGuestToken(token),
        amount_paise: 50000,
        verification_started_at: null,
        upi_uri: "upi://pay?pa=test@upi",
      });
      return token;
    }

    it("5.1 Start records a server timestamp once; a second start returns the identical instant", async () => {
      const token = seedVerifiableOrder();

      const first = new Request(`http://localhost:3000/api/payments/orders/${verifyOrderId}/start-verification`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: `csc_guest_order_token_${verifyOrderId}=${token}`,
        },
      });
      const res1 = await startVerificationRoute(first, { params: Promise.resolve({ orderId: verifyOrderId }) });
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.ok).toBe(true);
      expect(json1.persisted).toBe(true);
      expect(Date.parse(json1.verificationStartedAt)).not.toBeNaN();
      expect(Date.parse(json1.serverNow)).not.toBeNaN();

      const second = new Request(`http://localhost:3000/api/payments/orders/${verifyOrderId}/start-verification`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: `csc_guest_order_token_${verifyOrderId}=${token}`,
        },
      });
      const res2 = await startVerificationRoute(second, { params: Promise.resolve({ orderId: verifyOrderId }) });
      const json2 = await res2.json();
      expect(json2.ok).toBe(true);
      // Idempotent: the recorded start is never overwritten
      expect(json2.verificationStartedAt).toBe(json1.verificationStartedAt);
    });

    it("5.2 Start without any credential is rejected before any timestamp is written", async () => {
      seedVerifiableOrder();

      const req = new Request(`http://localhost:3000/api/payments/orders/${verifyOrderId}/start-verification`, {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
      });
      const res = await startVerificationRoute(req, { params: Promise.resolve({ orderId: verifyOrderId }) });
      expect(res.status).toBe(401);

      expect(dbState.orders.get(verifyOrderId)?.verification_started_at ?? null).toBe(null);
    });

    it("5.3 Status exposes the server-recorded window start and server time for countdown derivation", async () => {
      const token = seedVerifiableOrder();
      const startedAt = new Date().toISOString();
      dbState.orders.get(verifyOrderId)!.verification_started_at = startedAt;

      const req = new Request(`http://localhost:3000/api/payments/orders/${verifyOrderId}/status`, {
        method: "GET",
        headers: {
          origin: "http://localhost:3000",
          cookie: `csc_payment_guest=${token}`,
        },
      });
      const res = await orderStatusRoute(req, { params: Promise.resolve({ orderId: verifyOrderId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.verificationStartedAt).toBe(startedAt);
      expect(Date.parse(json.serverNow)).not.toBeNaN();
    });
  });

  // ============================================================================
  // Task 4: PostgreSQL In-Memory Engine (PGlite) Invariant Verification
  // ============================================================================
  describe("Task 4: PostgreSQL Invariants via PGlite Database Engine", () => {
    let pg: PGlite;

    beforeAll(async () => {
      pg = new PGlite();
      await pg.exec(`
        create role anon; create role authenticated; create role service_role bypassrls;
        create schema auth;
        create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', email_confirmed_at timestamptz, last_sign_in_at timestamptz);
        create table auth.sessions(id uuid primary key, user_id uuid not null, not_after timestamptz);
        create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
        create schema storage;
        create table storage.buckets(id text primary key, name text not null, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);
        create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null);
        create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
        alter table storage.objects enable row level security;
        grant usage on schema auth to anon,authenticated;
        grant execute on function auth.uid() to anon,authenticated;
        grant execute on function auth.jwt() to anon,authenticated;
        grant usage on schema storage to anon,authenticated;
        grant execute on function storage.foldername(text) to anon,authenticated;
      `);

      // Load all project migrations
      for (const file of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
        await pg.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
      }
    }, 30_000);

    afterAll(async () => {
      await pg?.close();
    });

    it("4.1 PostgreSQL csc_check_rate_limit: enforces strict limit of 5 requests per window and returns retry_after", async () => {
      const scope = "claim-utr";
      const key = "test-challenger-rate-limit-key";

      for (let i = 1; i <= 5; i++) {
        const queryRes = await pg.query<{ csc_check_rate_limit: { allowed: boolean; remaining: number; retry_after: number } }>(
          `select public.csc_check_rate_limit('${scope}', '${key}', 5, 900);`
        );
        const rl = queryRes.rows[0].csc_check_rate_limit;
        expect(rl.allowed).toBe(true);
        expect(rl.remaining).toBe(5 - i);
      }

      // 6th call must return allowed = false
      const queryRes6 = await pg.query<{ csc_check_rate_limit: { allowed: boolean; remaining: number; retry_after: number } }>(
        `select public.csc_check_rate_limit('${scope}', '${key}', 5, 900);`
      );
      const rl6 = queryRes6.rows[0].csc_check_rate_limit;
      expect(rl6.allowed).toBe(false);
      expect(rl6.remaining).toBe(0);
      expect(rl6.retry_after).toBeGreaterThan(0);
    });

    it("4.2 PostgreSQL idx_active_orders_per_email: partial unique index blocks concurrent active orders for same email/event", async () => {
      const eventId = "66666666-6666-4666-8666-666666666666";
      const email = "concurrent-buyer@test.com";

      // Seed event
      await pg.exec(`
        insert into public.events (
          id, slug, title, category, starts_at, ends_at, location,
          capacity, status, registration_state, admission, price_per_attendee
        ) values (
          '${eventId}', 'm3-challenger-event', 'M3 Challenger Event', 'networking',
          now() + interval '5 days', now() + interval '6 days', 'Coimbatore',
          100, 'published', 'open', 'paid', 250.00
        );
      `);

      // Insert first pending order
      await pg.exec(`
        insert into public.event_payment_orders (
          id, order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status
        ) values (
          gen_random_uuid(), 'CSC-ORD-CONCUR01', '${eventId}', 'Buyer 1', '${email}', '9876543210',
          'Org 1', 'Student', 1, 25000, 'upi://pay', 'pending'
        );
      `);

      // Attempt to insert second pending order for identical event and email -> must violate unique index
      let violationCaught = false;
      try {
        await pg.exec(`
          insert into public.event_payment_orders (
            id, order_reference, event_id, full_name, email, whatsapp, organization, role,
            attendee_count, amount_paise, upi_uri, status
          ) values (
            gen_random_uuid(), 'CSC-ORD-CONCUR02', '${eventId}', 'Buyer 2', '${email}', '9876543210',
            'Org 2', 'Student', 1, 25000, 'upi://pay', 'pending'
          );
        `);
      } catch (err: any) {
        violationCaught = true;
        expect(err.message).toMatch(/idx_active_orders_per_email|duplicate key value/i);
      }

      expect(violationCaught).toBe(true);
    });

    it("4.3 PostgreSQL Non-Settling Invariant: updating claimed_utr on order leaves event_registrations and paid_registrations strictly empty", async () => {
      const eventId = "77777777-7777-4777-8777-777777777777";
      const orderId = "88888888-8888-4888-8888-888888888888";
      const utr = "630711888999";

      await pg.exec(`
        insert into public.events (
          id, slug, title, category, starts_at, ends_at, location,
          capacity, status, registration_state, admission, price_per_attendee
        ) values (
          '${eventId}', 'm3-nonsettle-event', 'M3 Non-Settle Event', 'networking',
          now() + interval '5 days', now() + interval '6 days', 'Coimbatore',
          100, 'published', 'open', 'paid', 250.00
        );

        insert into public.event_payment_orders (
          id, order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status
        ) values (
          '${orderId}', 'CSC-ORD-SQLNONSETTLE', '${eventId}', 'Claimer Test', 'sqlclaimer@test.com', '9876543210',
          'Org', 'Student', 1, 25000, 'upi://pay', 'pending'
        );

        -- Simulate claim-utr update
        update public.event_payment_orders
        set claimed_utr = '${utr}', status = 'processing', updated_at = now()
        where id = '${orderId}';

        insert into public.event_payment_events (order_id, event_type, details)
        values ('${orderId}', 'utr_claimed', jsonb_build_object('claimed_utr', '${utr}'));
      `);

      // Verify order is processing
      const orderRes = await pg.query<{ status: string; claimed_utr: string }>(
        `select status, claimed_utr from public.event_payment_orders where id = '${orderId}';`
      );
      expect(orderRes.rows[0].status).toBe("processing");
      expect(orderRes.rows[0].claimed_utr).toBe(utr);

      // Verify no paid registration was created
      const paidRegs = await pg.query(
        `select * from public.paid_event_registrations where event_id = '${eventId}';`
      );
      expect(paidRegs.rows.length).toBe(0);

      // Verify no event registration passes were issued
      const passes = await pg.query(
        `select * from public.event_registrations where event_id = '${eventId}';`
      );
      expect(passes.rows.length).toBe(0);
    });
  });
});
