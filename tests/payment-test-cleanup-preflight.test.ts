import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

const mockState = vi.hoisted(() => ({
  event: {
    id: "evt-1",
    slug: "csc-upi-payment-system-test",
    status: "published",
    settings: { is_test_event: true, test_run_id: "run-1" },
  },
  orders: [] as Array<{
    id: string;
    status: string;
    claimed_utr: string | null;
    matched_evidence_id: string | null;
  }>,
  evidenceCount: 0,
  attrCount: 0,
  regsCount: 0,
  deleted: [] as string[],
  updates: [] as Array<{ table: string; values: unknown }>,
  chainCalls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  audits: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/supabase/admin", () => {
  function builder(table: string, value: unknown) {
    const b: Record<string, unknown> = {};
    for (const m of [
      "select",
      "eq",
      "neq",
      "in",
      "is",
      "order",
      "limit",
      "match",
      "not",
      "filter",
      "maybeSingle",
      "single",
      "delete",
      "update",
      "insert",
    ]) {
      b[m] = (...args: unknown[]) => {
        mockState.chainCalls.push({ table, method: m, args });
        return b;
      };
    }
    b.then = (res: (v: unknown) => unknown) => Promise.resolve(value).then(res);
    return b;
  }

  return {
    createAdminClient: () => ({
      from: (table: string) => ({
        select: () => {
          if (table === "events") {
            return builder(table, { data: mockState.event, error: null });
          }
          if (table === "event_payment_orders") {
            return builder(table, { data: mockState.orders, error: null });
          }
          if (table === "event_payment_evidence") {
            return builder(table, { data: [], count: mockState.evidenceCount, error: null });
          }
          if (table === "event_payment_attributions") {
            return builder(table, { data: [], count: mockState.attrCount, error: null });
          }
          if (table === "paid_event_registrations") {
            return builder(table, { data: [], count: mockState.regsCount, error: null });
          }
          return builder(table, { data: [], error: null });
        },
        delete: () => {
          mockState.deleted.push(table);
          return builder(table, { data: [], count: 1, error: null });
        },
        update: (values: unknown) => {
          mockState.updates.push({ table, values });
          return builder(table, { data: null, error: null });
        },
        insert: (row: Record<string, unknown>) => {
          if (table === "audit_logs") mockState.audits.push(row);
          return builder(table, { data: null, error: null });
        },
      }),
    }),
  };
});

import { cleanupPaymentTestEvent } from "@/lib/testing/payment-test-manager";

function resetScenario(over: Partial<typeof mockState> = {}) {
  mockState.orders = [];
  mockState.evidenceCount = 0;
  mockState.attrCount = 0;
  mockState.regsCount = 0;
  mockState.deleted = [];
  mockState.updates = [];
  mockState.chainCalls = [];
  mockState.audits = [];
  Object.assign(mockState, over);
}

describe("cleanupPaymentTestEvent financial preflight", () => {
  beforeEach(() => resetScenario());

  it("purges when every order is safe-terminal with no claims, evidence, or attributions", async () => {
    resetScenario({
      orders: [
        { id: "o1", status: "expired", claimed_utr: null, matched_evidence_id: null },
        { id: "o2", status: "cancelled", claimed_utr: null, matched_evidence_id: null },
      ],
    });

    // No force flag: purge must be earned by the preflight, not requested.
    const receipt = await cleanupPaymentTestEvent({ eventId: "evt-1" });

    expect(receipt.mode).toBe("synthetic_purged");
    expect(receipt.eligibility?.eligible).toBe(true);
    expect(receipt.eligibility?.blockers).toEqual([]);
    expect(mockState.deleted).toContain("event_payment_orders");
    expect(mockState.deleted).toContain("events");
  });

  it("archives despite forceStagingPurge when a pending order has a claimed UTR", async () => {
    resetScenario({
      orders: [
        { id: "o-claimed", status: "pending", claimed_utr: "219603774862", matched_evidence_id: null },
      ],
    });

    const receipt = await cleanupPaymentTestEvent({ eventId: "evt-1", forceStagingPurge: true });

    expect(receipt.mode).toBe("production_archived");
    expect(receipt.eligibility?.eligible).toBe(false);
    expect(receipt.eligibility?.blockers.join(" ")).toMatch(/active, claimed, or evidence-linked/);
    // Nothing was deleted; the claimed order was NOT cancelled.
    expect(mockState.deleted).toEqual([]);
    const orderUpdates = mockState.updates.filter((u) => u.table === "event_payment_orders");
    expect(orderUpdates).toEqual([]);
    // The forced-purge request is recorded in the audit trail.
    expect(mockState.audits[0]?.after).toMatchObject({ forceRequested: true });
  });

  it("archives when expired orders still have linked bank evidence", async () => {
    resetScenario({
      orders: [{ id: "o1", status: "expired", claimed_utr: null, matched_evidence_id: null }],
      evidenceCount: 1,
    });

    const receipt = await cleanupPaymentTestEvent({ eventId: "evt-1", forceStagingPurge: true });

    expect(receipt.mode).toBe("production_archived");
    expect(receipt.eligibility?.blockers.join(" ")).toMatch(/bank evidence/);
    expect(mockState.deleted).toEqual([]);
  });

  it("cancels only provably safe pending orders and leaves processing orders open", async () => {
    resetScenario({
      orders: [
        { id: "o-safe", status: "pending", claimed_utr: null, matched_evidence_id: null },
        { id: "o-busy", status: "processing", claimed_utr: null, matched_evidence_id: null },
      ],
    });

    const receipt = await cleanupPaymentTestEvent({ eventId: "evt-1" });

    expect(receipt.mode).toBe("production_archived");
    const inCalls = mockState.chainCalls.filter(
      (c) => c.table === "event_payment_orders" && c.method === "in"
    );
    expect(inCalls).toHaveLength(1);
    expect(inCalls[0].args[1]).toEqual(["o-safe"]);
  });
});
