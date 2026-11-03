import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RawEmailInput } from "@/lib/payments/axis-parser";

const mockFetchMessagesById = vi.hoisted(() => vi.fn());

vi.mock("@/lib/payments/imap-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/payments/imap-client")>();
  return { ...original, fetchMessagesById: mockFetchMessagesById };
});

import {
  reverifyStrandedEvidence,
  STRANDED_ALLOWLIST_REASON,
} from "@/lib/payments/reconciler";

const UTR = "630703905612";
const MESSAGE_ID = "<catchup-1@axis.bank.in>";

function strandedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ev-stranded-1",
    utr: UTR,
    message_id: MESSAGE_ID,
    auth_details: { reasons: [STRANDED_ALLOWLIST_REASON] },
    ...overrides,
  };
}

function bankEmail(overrides: Partial<RawEmailInput> = {}): RawEmailInput {
  return {
    messageId: MESSAGE_ID,
    subject: "INR 1.00 was credited to your A/c",
    from: "alerts@axis.bank.in",
    headers: {},
    text: [
      "Amount Credited: INR 1.00",
      "Account Number: XX1995",
      "Date & Time: 03-11-26, 13:03:03 IST",
      "Transaction Info: UPI/P2A/630703905612/TESTER/HDFC/UPI",
    ].join("\n"),
    cryptographicAuth: {
      status: "authenticated",
      reasons: [],
      dkimPass: true,
      spfPass: true,
      senderMatches: true,
      details: {},
    },
    ...overrides,
  };
}

function fakeAdmin(rows: unknown[]) {
  const updates: Array<{ id: string; values: unknown }> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "limit"]) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: rows, error: null }).then(resolve);
  return {
    updates,
    client: {
      from: (table: string) => {
        if (table !== "event_payment_evidence") {
          throw new Error(`unexpected table ${table}`);
        }
        return {
          select: () => builder,
          update: (values: unknown) => ({
            eq: (_col: string, id: string) => {
              updates.push({ id, values });
              return Promise.resolve({ error: null });
            },
          }),
        };
      },
    },
  };
}

describe("reverifyStrandedEvidence", () => {
  const savedAllowlist = process.env.CSC_PAYMENT_APPROVED_DKIM_DOMAINS;

  beforeEach(() => {
    mockFetchMessagesById.mockReset();
    process.env.CSC_PAYMENT_APPROVED_DKIM_DOMAINS = "axis.bank.in";
  });

  afterEach(() => {
    if (savedAllowlist === undefined) delete process.env.CSC_PAYMENT_APPROVED_DKIM_DOMAINS;
    else process.env.CSC_PAYMENT_APPROVED_DKIM_DOMAINS = savedAllowlist;
  });

  it("promotes a stranded needs_review row to authenticated/unmatched after re-fetch", async () => {
    mockFetchMessagesById.mockResolvedValue({ messages: [bankEmail()], errors: [] });
    const admin = fakeAdmin([strandedRow()]);

    const result = await reverifyStrandedEvidence(admin.client as never);

    expect(result.reverified).toBe(1);
    expect(admin.updates).toHaveLength(1);
    expect(admin.updates[0]).toMatchObject({
      id: "ev-stranded-1",
      values: { auth_status: "authenticated", reconciliation_state: "unmatched" },
    });
  });

  it("does nothing when no DKIM allowlist is configured", async () => {
    delete process.env.CSC_PAYMENT_APPROVED_DKIM_DOMAINS;
    const admin = fakeAdmin([strandedRow()]);

    const result = await reverifyStrandedEvidence(admin.client as never);

    expect(result).toEqual({ reverified: 0, errors: [] });
    expect(mockFetchMessagesById).not.toHaveBeenCalled();
    expect(admin.updates).toHaveLength(0);
  });

  it("leaves rows stranded for other reasons untouched", async () => {
    mockFetchMessagesById.mockResolvedValue({ messages: [], errors: [] });
    const admin = fakeAdmin([
      strandedRow({ id: "ev-other", auth_details: { reasons: ["Message has no DKIM signature"] } }),
    ]);

    const result = await reverifyStrandedEvidence(admin.client as never);

    expect(result.reverified).toBe(0);
    expect(mockFetchMessagesById).not.toHaveBeenCalled();
    expect(admin.updates).toHaveLength(0);
  });

  it("leaves the row untouched when the re-fetched message parses to a different UTR", async () => {
    mockFetchMessagesById.mockResolvedValue({
      messages: [
        bankEmail({
          text: [
            "Amount Credited: INR 1.00",
            "Account Number: XX1995",
            "Date & Time: 03-11-26, 13:03:03 IST",
            "Transaction Info: UPI/P2A/999999999999/OTHER/HDFC/UPI",
          ].join("\n"),
        }),
      ],
      errors: [],
    });
    const admin = fakeAdmin([strandedRow()]);

    const result = await reverifyStrandedEvidence(admin.client as never);

    expect(result.reverified).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(admin.updates).toHaveLength(0);
  });
});
