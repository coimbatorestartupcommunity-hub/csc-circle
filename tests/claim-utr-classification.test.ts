import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

vi.mock("@/lib/rate-limit", () => ({
  distributedRateLimit: async () => ({ allowed: true, retryAfter: 0 }),
  clientIp: () => "127.0.0.1",
}));

vi.mock("@/lib/notifications/schedule", () => ({
  scheduleNotificationDelivery: () => {},
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "member-1" } }, error: null }) },
    from: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
  }),
}));

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const UTR = "123456789012";
const ORDER_REF = "CSC-ORD-TEST1234";

const state = vi.hoisted(() => ({
  evidenceRows: [] as unknown[],
  updates: [] as Array<{ table: string; values: unknown }>,
  inserts: [] as Array<{ table: string; row: unknown }>,
  rpcCalls: [] as Array<{ fn: string }>,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async (fn: string) => {
      state.rpcCalls.push({ fn });
      return { data: null, error: null };
    },
    from: (table: string) => ({
      select: (fields?: string) => {
        const filters: Array<{ op: string; args: unknown[] }> = [];
        const chain: Record<string, unknown> = {};
        for (const method of ["eq", "neq", "is", "in", "order", "limit", "select"]) {
          chain[method] = (...args: unknown[]) => {
            filters.push({ op: method, args });
            return chain;
          };
        }
        chain.maybeSingle = async () => {
          if (table === "event_payment_orders") {
            const claimedUtrFilter = filters.find(
              (f) => f.op === "eq" && f.args[0] === "claimed_utr"
            );
            if (claimedUtrFilter) return { data: null, error: null };
            if (typeof fields === "string" && fields.includes("event:events")) {
              return {
                data: {
                  id: ORDER_ID,
                  order_reference: ORDER_REF,
                  status: "processing",
                  amount_paise: 100,
                  expected_account_suffix: "1995",
                  full_name: "Test Member",
                  attendee_count: 1,
                  event: { title: "Test Event" },
                },
                error: null,
              };
            }
            return {
              data: {
                id: ORDER_ID,
                order_reference: ORDER_REF,
                status: "pending",
                claimed_utr: null,
                user_id: "member-1",
                guest_token_hash: null,
              },
              error: null,
            };
          }
          return { data: null, error: null };
        };
        chain.then = (resolve: (value: unknown) => unknown) => {
          if (table === "event_payment_evidence") {
            return Promise.resolve({ data: state.evidenceRows, error: null }).then(resolve);
          }
          return Promise.resolve({ data: [], error: null }).then(resolve);
        };
        return chain;
      },
      update: (values: unknown) => {
        state.updates.push({ table, values });
        const chain: Record<string, unknown> = {};
        for (const method of ["eq", "is", "in", "select"]) {
          chain[method] = () => chain;
        }
        chain.maybeSingle = async () => ({ data: { id: ORDER_ID }, error: null });
        return chain;
      },
      insert: (row: unknown) => {
        state.inserts.push({ table, row });
        return Promise.resolve({ data: null, error: null });
      },
    }),
  }),
}));

import { POST } from "@/app/api/payments/orders/[orderId]/claim-utr/route";

function claimRequest() {
  const body = JSON.stringify({ utr: UTR });
  return new Request(`https://example.test/api/payments/orders/${ORDER_ID}`, {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": String(body.length) },
    body,
  });
}

function genuineEvidenceRow() {
  return {
    id: "ev-genuine-1",
    amount_paise: 100,
    receiving_account_suffix: "1995",
    transaction_time: new Date().toISOString(),
    transaction_info_raw: `UPI/P2A/${UTR}/TESTER/HDFC/UPI ${ORDER_REF}`,
    reconciliation_state: "unmatched",
    matched_order_id: null,
  };
}

describe("claim-utr evidence classification with auto-confirm OFF", () => {
  const savedFlag = process.env.CSC_PAYMENT_AUTO_CONFIRM;

  beforeEach(() => {
    delete process.env.CSC_PAYMENT_AUTO_CONFIRM;
    state.evidenceRows = [];
    state.updates = [];
    state.inserts = [];
    state.rpcCalls = [];
  });

  afterEach(() => {
    if (savedFlag === undefined) delete process.env.CSC_PAYMENT_AUTO_CONFIRM;
    else process.env.CSC_PAYMENT_AUTO_CONFIRM = savedFlag;
  });

  it("links exactly-one genuine match for review without settling", async () => {
    state.evidenceRows = [genuineEvidenceRow()];

    const res = await POST(claimRequest(), { params: Promise.resolve({ orderId: ORDER_ID }) });
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.status).toBe("processing");
    expect(json.status).not.toBe("verified");
    // Claim update + review-link update, both without settlement.
    const linkUpdate = state.updates.find(
      (u) =>
        u.table === "event_payment_orders" &&
        (u.values as Record<string, unknown>).matched_evidence_id === "ev-genuine-1"
    );
    expect(linkUpdate).toBeDefined();
    const linkedEvent = state.inserts.find(
      (i) =>
        i.table === "event_payment_events" &&
        (i.row as Record<string, unknown>).event_type === "utr_claim_evidence_linked"
    );
    expect(linkedEvent).toBeDefined();
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("records candidate counts when no evidence matches", async () => {
    state.evidenceRows = [];

    const res = await POST(claimRequest(), { params: Promise.resolve({ orderId: ORDER_ID }) });
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.status).toBe("processing");
    const unmatchedEvent = state.inserts.find(
      (i) =>
        i.table === "event_payment_events" &&
        (i.row as Record<string, unknown>).event_type === "utr_claim_unmatched_evidence"
    );
    expect(unmatchedEvent).toBeDefined();
    expect(
      (unmatchedEvent!.row as { details: Record<string, unknown> }).details
    ).toMatchObject({ candidate_evidence_count: 0, amount_account_match_count: 0 });
    const linkUpdate = state.updates.find(
      (u) => (u.values as Record<string, unknown>).matched_evidence_id !== undefined
    );
    expect(linkUpdate).toBeUndefined();
    expect(state.rpcCalls).toHaveLength(0);
  });
});
