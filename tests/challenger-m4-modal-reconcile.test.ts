// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Mock rate-limit
const mockRateLimit = vi.hoisted(() => ({
  distributedRateLimit: vi.fn(),
  clientIp: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  distributedRateLimit: mockRateLimit.distributedRateLimit,
  clientIp: mockRateLimit.clientIp,
}));

// Mock admin gate
const mockAdminGate = vi.hoisted(() => ({
  getAdminContext: vi.fn(),
  can: vi.fn((ctx: any, perm: string) => ctx?.permissions?.has(perm) ?? false),
}));
vi.mock("@/lib/admin/gate", () => ({
  getAdminContext: mockAdminGate.getAdminContext,
  can: mockAdminGate.can,
}));

// Mock notification delivery & email
const mockPassEmail = vi.hoisted(() => ({
  ensureEventPassEmail: vi.fn(),
}));
vi.mock("@/lib/admin/event-pass-email", () => ({
  ensureEventPassEmail: mockPassEmail.ensureEventPassEmail,
}));

const mockNotificationSchedule = vi.hoisted(() => ({
  scheduleNotificationDelivery: vi.fn(),
}));
vi.mock("@/lib/notifications/schedule", () => ({
  scheduleNotificationDelivery: mockNotificationSchedule.scheduleNotificationDelivery,
}));

// Mock Supabase admin client for manual-reconcile API route
interface MockOrder {
  id: string;
  status: string;
  amount_paise: number;
  currency: string;
  expected_account_suffix: string;
  order_reference: string;
  event_id: string;
}

interface MockEvidence {
  id: string;
  bank: string;
  direction: "CREDIT" | "DEBIT";
  currency: string;
  amount_paise: number;
  receiving_account_suffix: string;
  utr: string;
  auth_status: string;
  reconciliation_state: string;
  matched_order_id?: string | null;
}

const mockOrdersDb = new Map<string, MockOrder>();
const mockEvidenceDb = new Map<string, MockEvidence>();
const mockAttributionsDb = new Map<string, any>();
let mockAuditLogsDb: any[] = [];
let mockRpcCalls: any[] = [];
let mockRpcFailure: string | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      let filterCol: string | null = null;
      let filterVal: any = null;

      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          filterCol = col;
          filterVal = val;
          return builder;
        },
        maybeSingle: async () => {
          if (table === "event_payment_orders") {
            const found = filterCol === "id" ? mockOrdersDb.get(filterVal) : null;
            return { data: found ? { ...found } : null, error: null };
          }
          if (table === "event_payment_evidence") {
            const found = filterCol === "id" ? mockEvidenceDb.get(filterVal) : null;
            return { data: found ? { ...found } : null, error: null };
          }
          return { data: null, error: null };
        },
        upsert: async (record: any, _opts?: any) => {
          if (table === "event_payment_attributions") {
            mockAttributionsDb.set(record.order_id, record);
            return { error: null };
          }
          return { error: null };
        },
        insert: async (entry: any) => {
          if (table === "audit_logs") {
            mockAuditLogsDb.push(entry);
            return { error: null };
          }
          return { error: null };
        },
      };
      return builder;
    },
    rpc: async (fnName: string, args: any) => {
      mockRpcCalls.push({ fnName, args });
      if (mockRpcFailure) {
        return { data: null, error: { message: mockRpcFailure } };
      }
      return {
        data: {
          ok: true,
          primary_pass_id: "pass-uuid-9999",
          order_id: args.p_order_id,
          registration_id: "reg-uuid-1111",
        },
        error: null,
      };
    },
  }),
}));

// Import implementations under test
import { PaymentModal, type PaymentOrderDetails } from "@/components/payments/payment-modal";
import { POST as manualReconcileRoute } from "@/app/api/admin/payments/manual-reconcile/route";

describe("Milestone M4 Challenger: UI Modal State Machine & Admin Manual Reconciliation", () => {
  const dummyOrder: PaymentOrderDetails = {
    id: "11111111-2222-3333-4444-555555555555",
    orderReference: "CSC-ORD-CHAL-001",
    amountPaise: 49900,
    totalRupees: 499,
    payeeName: "CSC Circle Foundation",
    payeeVpa: "csccircle@axisbank",
    upiUri: "upi://pay?pa=csccircle@axisbank&pn=CSC+Circle&am=499.00&cu=INR&tr=CSC-ORD-CHAL-001",
    status: "processing",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };

  const dummyDeepLinks = {
    standardUpi: "upi://pay?pa=csccircle@axisbank&pn=CSC+Circle&am=499.00&cu=INR",
    gpay: "gpay://upi/pay?pa=csccircle@axisbank&pn=CSC+Circle&am=499.00&cu=INR",
    phonepe: "phonepe://pay?pa=csccircle@axisbank&pn=CSC+Circle&am=499.00&cu=INR",
    paytm: "paytmmp://pay?pa=csccircle@axisbank&pn=CSC+Circle&am=499.00&cu=INR",
    bhim: "bhim://pay?pa=csccircle@axisbank&pn=CSC+Circle&am=499.00&cu=INR",
    androidIntent: "intent://pay?pa=csccircle@axisbank#Intent;scheme=upi;end;",
  };

  const renderModal = (props: Partial<React.ComponentProps<typeof PaymentModal>> = {}) =>
    render(
      React.createElement(PaymentModal, {
        isOpen: true,
        onClose: vi.fn(),
        order: dummyOrder,
        deepLinks: dummyDeepLinks,
        eventTitle: "AI Summit 2026",
        attendeeName: "Jane Doe",
        ...props,
      })
    );

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllTimers();
    mockOrdersDb.clear();
    mockEvidenceDb.clear();
    mockAttributionsDb.clear();
    mockAuditLogsDb = [];
    mockRpcCalls = [];
    mockRpcFailure = null;
  });

  // ============================================================================
  // Task 1: 6-State UI Modal State Machine Transitions & Polling Engine Resilience
  // ============================================================================
  describe("Task 1: 6-State UI Modal State Machine & Polling Engine Resilience (F19)", () => {
    describe("1.1 Authoritative Initial State Derivation", () => {
      it("derives confirmed state when order status is 'verified'", () => {
        renderModal({ order: { ...dummyOrder, status: "verified" } });
        expect(screen.getByText("Payment Successful!")).toBeInTheDocument();
        expect(screen.getByText("Your CSC Circle Event Registration Is Confirmed")).toBeInTheDocument();
      });

      it("derives confirmed state when order status is 'reconciled'", () => {
        renderModal({ order: { ...dummyOrder, status: "reconciled" } });
        expect(screen.getByText("Payment Successful!")).toBeInTheDocument();
      });

      it("derives failed state when order status is 'expired'", () => {
        renderModal({ order: { ...dummyOrder, status: "expired" } });
        expect(screen.getByText("Checkout Session Expired")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Start New Checkout/i })).toBeInTheDocument();
      });

      it("derives failed state when order status is 'failed' or 'cancelled'", () => {
        const { unmount } = renderModal({ order: { ...dummyOrder, status: "failed" } });
        expect(screen.getByText("Payment Verification Failed")).toBeInTheDocument();
        unmount();

        renderModal({ order: { ...dummyOrder, status: "cancelled" } });
        expect(screen.getByText("Payment Verification Failed")).toBeInTheDocument();
      });

      it("derives pending_review state when order status is 'needs_review'", () => {
        renderModal({ order: { ...dummyOrder, status: "needs_review" } });
        expect(screen.getByText("Payment Confirmation Pending")).toBeInTheDocument();
        expect(
          screen.getByText(/avoid paying again while we continue reconciling/i)
        ).toBeInTheDocument();
      });

      it("derives verifying state when order status is 'processing'", () => {
        renderModal({ order: { ...dummyOrder, status: "processing" } });
        expect(screen.getByText("Verifying Your Payment")).toBeInTheDocument();
        expect(screen.getByText(/Awaiting Axis Bank credit evidence/i)).toBeInTheDocument();
      });

      it("derives awaiting_payment state when order status is 'pending'", () => {
        renderModal({ order: { ...dummyOrder, status: "pending" } });
        expect(screen.getByText("Complete Your UPI Payment")).toBeInTheDocument();
        expect(screen.getByText("I Have Paid — Enter UTR")).toBeInTheDocument();
      });

      it("renders creating state when initialState is 'creating' without an order", () => {
        renderModal({ order: null, deepLinks: null, initialState: "creating" });
        expect(screen.getByText("Initializing Checkout Session…")).toBeInTheDocument();
      });
    });

    describe("1.2 Polling Termination on Terminal States", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("immediately aborts polling when backend returns 'verified' without subsequent HTTP calls", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            status: "verified",
            passHref: "/member/passes/pass-xyz",
            registrationReference: "CSC-REG-VERIFIED-1",
          }),
        });
        vi.stubGlobal("fetch", fetchMock);

        renderModal({ order: { ...dummyOrder, status: "processing" } });

        // Initial poll scheduled at 1500ms for verifying state
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Registration Confirmed")).toBeInTheDocument();

        // Advance timers by 60 seconds and ensure no further fetch requests occur
        await act(async () => {
          await vi.advanceTimersByTimeAsync(60000);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        vi.unstubAllGlobals();
      });

      it("immediately aborts polling when backend returns 'reconciled'", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            status: "reconciled",
            passHref: "/member/passes/pass-reconciled",
            registrationReference: "CSC-REG-REC-1",
          }),
        });
        vi.stubGlobal("fetch", fetchMock);

        renderModal({ order: { ...dummyOrder, status: "processing" } });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Registration Confirmed")).toBeInTheDocument();

        // Advance timers further
        await act(async () => {
          await vi.advanceTimersByTimeAsync(30000);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        vi.unstubAllGlobals();
      });

      it("immediately aborts polling when backend returns 'failed'", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ status: "failed" }),
        });
        vi.stubGlobal("fetch", fetchMock);

        renderModal({ order: { ...dummyOrder, status: "processing" } });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Checkout Unavailable")).toBeInTheDocument();

        // Advance timers by 60 seconds
        await act(async () => {
          await vi.advanceTimersByTimeAsync(60000);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        vi.unstubAllGlobals();
      });

      it("immediately aborts polling when backend returns 'expired'", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ status: "expired" }),
        });
        vi.stubGlobal("fetch", fetchMock);

        renderModal({ order: { ...dummyOrder, status: "processing" } });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Checkout Unavailable")).toBeInTheDocument();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(60000);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        vi.unstubAllGlobals();
      });

      it("immediately aborts polling when backend returns 'cancelled'", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ status: "cancelled" }),
        });
        vi.stubGlobal("fetch", fetchMock);

        renderModal({ order: { ...dummyOrder, status: "processing" } });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Checkout Unavailable")).toBeInTheDocument();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(60000);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        vi.unstubAllGlobals();
      });
    });

    describe("1.3 HTTP 429 Retry-After Backpressure Handling", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("pauses polling for the designated Retry-After interval (30s) before re-querying", async () => {
        const headers = new Headers();
        headers.set("Retry-After", "30");

        const fetchMock = vi
          .fn()
          // 1st request -> 429 with Retry-After: 30
          .mockResolvedValueOnce({
            ok: false,
            status: 429,
            headers,
          })
          // 2nd request -> 200 verified
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({ status: "verified", passHref: "/member/passes/pass-429" }),
          });

        vi.stubGlobal("fetch", fetchMock);

        renderModal({ order: { ...dummyOrder, status: "processing" } });

        // 1st trigger at 1500ms
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // Advance to 15s: Retry-After is 30s, so NO new request should have been fired
        await act(async () => {
          await vi.advanceTimersByTimeAsync(15000);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // Advance to 29s total from 429: still no second request
        await act(async () => {
          await vi.advanceTimersByTimeAsync(14000);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // Advance past 30s (e.g. +1100ms): 2nd request MUST fire now
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1500);
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(screen.getByText("Registration Confirmed")).toBeInTheDocument();

        vi.unstubAllGlobals();
      });

      it("falls back to 5000ms delay when 429 lacks Retry-After header or contains invalid value", async () => {
        const headersWithoutRetry = new Headers();

        const fetchMock = vi
          .fn()
          .mockResolvedValueOnce({
            ok: false,
            status: 429,
            headers: headersWithoutRetry,
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({ status: "verified", passHref: "/member/passes/p1" }),
          });

        vi.stubGlobal("fetch", fetchMock);

        renderModal({ order: { ...dummyOrder, status: "processing" } });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // At 3000ms, not fired yet (default is 5000ms)
        await act(async () => {
          await vi.advanceTimersByTimeAsync(3000);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // At 5500ms, fallback fires
        await act(async () => {
          await vi.advanceTimersByTimeAsync(2500);
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);

        vi.unstubAllGlobals();
      });
    });

    describe("1.4 Zero-Trust Defense: Fake / Non-Settled States Cannot Issue Passes", () => {
      it("guarantees pass download and calendar CTAs are NEVER rendered in pending state", () => {
        renderModal({
          order: { ...dummyOrder, status: "pending" },
          eventDates: { startsAt: "2026-11-20T10:00:00Z", location: "Coimbatore" },
        });

        expect(screen.queryByText(/View and Download Event Pass/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Go to Member Passes/i)).not.toBeInTheDocument();
        expect(screen.queryByText("Google Cal")).not.toBeInTheDocument();
        expect(screen.queryByText("Download .ics")).not.toBeInTheDocument();
      });

      it("guarantees pass download and calendar CTAs are NEVER rendered in verifying state", () => {
        renderModal({
          order: { ...dummyOrder, status: "processing" },
          eventDates: { startsAt: "2026-11-20T10:00:00Z" },
        });

        expect(screen.queryByText(/View and Download Event Pass/i)).not.toBeInTheDocument();
        expect(screen.queryByText("Google Cal")).not.toBeInTheDocument();
      });

      it("guarantees pending_review explicitly blocks pass access and warns the payment remains pending and unconfirmed", () => {
        renderModal({
          order: { ...dummyOrder, status: "needs_review" },
          eventDates: { startsAt: "2026-11-20T10:00:00Z" },
        });

        expect(screen.queryByText(/View and Download Event Pass/i)).not.toBeInTheDocument();
        expect(screen.queryByText("Google Cal")).not.toBeInTheDocument();
        expect(screen.queryByText("Payment Successful!")).not.toBeInTheDocument();
        expect(
          screen.getByText(/avoid paying again while we continue reconciling/i)
        ).toBeInTheDocument();
      });

      it("rejects unauthorized status spoofing (e.g. 'fake_confirmed') and treats it as awaiting/unconfirmed", () => {
        renderModal({ order: { ...dummyOrder, status: "fake_confirmed" } });

        expect(screen.queryByText("Payment Successful!")).not.toBeInTheDocument();
        expect(screen.queryByText(/View and Download Event Pass/i)).not.toBeInTheDocument();
        expect(screen.getByText("Complete Your UPI Payment")).toBeInTheDocument();
      });

      it("renders verified pass link and calendar CTAs ONLY when status is authoritative 'verified'", () => {
        renderModal({
          order: { ...dummyOrder, status: "verified" },
          eventDates: { startsAt: "2026-11-20T10:00:00Z", location: "Coimbatore" },
        });

        expect(screen.getByText("Payment Successful!")).toBeInTheDocument();
        expect(screen.getByText("Google Cal")).toBeInTheDocument();
        expect(screen.getByText("Download .ics")).toBeInTheDocument();
        expect(screen.getByText(/Go to Member Passes/i)).toBeInTheDocument();
      });
    });

    describe("1.5 Interaction & Accessibility Security Invariants", () => {
      it("prevents dismissal via Escape key while actively in 'verifying' state", () => {
        const onCloseMock = vi.fn();
        renderModal({
          onClose: onCloseMock,
          order: { ...dummyOrder, status: "processing" },
        });

        fireEvent.keyDown(document, { key: "Escape" });
        expect(onCloseMock).not.toHaveBeenCalled();
      });

      it("permits dismissal via Escape key when in 'awaiting_payment' state", () => {
        const onCloseMock = vi.fn();
        renderModal({
          onClose: onCloseMock,
          order: { ...dummyOrder, status: "pending" },
        });

        fireEvent.keyDown(document, { key: "Escape" });
        expect(onCloseMock).toHaveBeenCalledOnce();
      });

      it("keeps the order pending with a verification-delay notice when the five-minute window expires", async () => {
        vi.useFakeTimers();
        const timerKey = `csc_verify_timer_${dummyOrder.id}`;
        try {
          // Verification window started 6 minutes ago: countdown is at 00:00
          window.sessionStorage.setItem(timerKey, String(Date.now() - 6 * 60 * 1000));

          renderModal({ order: { ...dummyOrder, status: "pending" } });

          expect(screen.getByText("Complete Your UPI Payment")).toBeInTheDocument();

          await act(async () => {
            await vi.advanceTimersByTimeAsync(1500);
          });

          // Expired verification windows must NOT mark a genuine transfer failed
          expect(screen.getByText("Payment Verification Is Taking Longer")).toBeInTheDocument();
          expect(screen.queryByText("Payment Successful!")).not.toBeInTheDocument();
          expect(screen.queryByText("Checkout Unavailable")).not.toBeInTheDocument();
        } finally {
          window.sessionStorage.removeItem(timerKey);
          vi.useRealTimers();
        }
      });
    });
  });

  // ============================================================================
  // Task 6: Official CSC branding and unique four-app button grid
  // ============================================================================
  describe("Task 6: Official branding and unique app-button grid", () => {
    it("renders the official CSC Circle logo in the checkout header, never a text placeholder", () => {
      renderModal({ order: { ...dummyOrder, status: "pending" } });
      const logo = screen.getByAltText("Coimbatore Startup Community logo");
      expect(logo).toBeInTheDocument();
      expect(logo.getAttribute("src") || "").toContain("csc-logo.png");
      expect(screen.queryByText("CAC")).not.toBeInTheDocument();
    });

    it("renders exactly four unique app buttons in Google Pay, PhonePe, BHIM, Paytm order", () => {
      renderModal({ order: { ...dummyOrder, status: "pending" } });
      const labels = ["Pay with Google Pay", "Pay with PhonePe", "Pay with BHIM", "Pay with Paytm"];
      const buttons = labels.map((name) => screen.getByRole("button", { name }));
      expect(buttons.length).toBe(4);
      // No duplicate Google entries and a single Paytm
      expect(screen.queryAllByRole("button", { name: /Google Pay/ }).length).toBe(1);
      expect(screen.queryAllByRole("button", { name: /Paytm/ }).length).toBe(1);
      expect(screen.queryByRole("button", { name: "GPay" })).not.toBeInTheDocument();
      // DOM order matches the required visual order
      const positions = buttons.map((b) =>
        [...b.parentElement!.children].indexOf(b)
      );
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    });

    it("renders the BHIM icon asset in the third position without stretching", () => {
      renderModal({ order: { ...dummyOrder, status: "pending" } });
      const bhim = screen.getByRole("button", { name: "Pay with BHIM" });
      const img = bhim.querySelector("img");
      expect(img?.getAttribute("src") || "").toContain("bhim-icon.png");
      expect(img?.className || "").toContain("object-contain");
    });

    it("renders the official supplied Google Pay artwork in the first position", () => {
      renderModal({ order: { ...dummyOrder, status: "pending" } });
      const gpay = screen.getByRole("button", { name: "Pay with Google Pay" });
      const img = gpay.querySelector("img");
      // The supplied Google Pay PNG, never the mislabeled Paytm SVG
      expect(img?.getAttribute("src") || "").toContain("gpay-icon.png");
      expect(img?.getAttribute("src") || "").not.toContain("gpay-logo.svg");
    });

    it("renders the official logo on the confirmed success state", () => {
      renderModal({ order: { ...dummyOrder, status: "verified" } });
      expect(screen.getByText("Payment Successful!")).toBeInTheDocument();
      expect(screen.getAllByAltText("Coimbatore Startup Community logo").length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // Task 2: Admin Manual Reconciliation RBAC & Guarded Controls (/api/admin/payments/manual-reconcile)
  // ============================================================================
  describe("Task 2: Admin Manual Reconciliation Security & Guarded Controls (F20)", () => {
    const validOrderId = "aaaaaaaa-1111-4111-8111-111111111111";
    const validEvidenceId = "bbbbbbbb-2222-4222-8222-222222222222";
    const validAdminUserId = "admin-user-3333-4333-8333-333333333333";

    beforeEach(() => {
      // Default: Authorized Super Admin session
      mockAdminGate.getAdminContext.mockResolvedValue({
        mode: "live",
        userId: validAdminUserId,
        roles: ["super_admin"],
        permissions: new Set(["payments.verify", "registrations.approve"]),
        displayName: "Super Admin",
      });

      mockRateLimit.distributedRateLimit.mockResolvedValue({ allowed: true, retry_after: 0 });
      mockRateLimit.clientIp.mockReturnValue("127.0.0.1");

      // Seed valid matching order and evidence in mock database
      mockOrdersDb.set(validOrderId, {
        id: validOrderId,
        status: "needs_review",
        amount_paise: 50000,
        currency: "INR",
        expected_account_suffix: "1995",
        order_reference: "CSC-ORD-REC-001",
        event_id: "event-uuid-1",
      });

      mockEvidenceDb.set(validEvidenceId, {
        id: validEvidenceId,
        bank: "AXIS_BANK",
        direction: "CREDIT",
        currency: "INR",
        amount_paise: 50000,
        receiving_account_suffix: "1995",
        utr: "630722119955",
        auth_status: "authenticated",
        reconciliation_state: "unmatched",
        matched_order_id: null,
      });
    });

    const createJsonRequest = (body: any, options: { origin?: string } = {}) => {
      const url = "https://csccircle.com/api/admin/payments/manual-reconcile";
      const origin = options.origin ?? "https://csccircle.com";
      const jsonText = JSON.stringify(body);
      return new Request(url, {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          "content-length": Buffer.byteLength(jsonText).toString(),
        },
        body: jsonText,
      });
    };

    describe("2.1 RBAC & Caller Authorization Guard", () => {
      it("rejects unauthenticated caller when admin mode is 'closed' with HTTP 403", async () => {
        mockAdminGate.getAdminContext.mockResolvedValue({
          mode: "closed",
          userId: null,
          roles: [],
          permissions: new Set(),
          displayName: "",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Manual settlement authorized by reviewer",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toMatch(/Administrator session required/i);
      });

      it("rejects dev preview caller without real live admin session with HTTP 403", async () => {
        mockAdminGate.getAdminContext.mockResolvedValue({
          mode: "preview",
          userId: null,
          roles: ["super_admin"],
          permissions: new Set(["payments.verify"]),
          displayName: "Demo Super Admin",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Dev preview override attempt",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toMatch(/Administrator session required/i);
      });

      it("rejects standard member without admin permissions with HTTP 403", async () => {
        mockAdminGate.getAdminContext.mockResolvedValue({
          mode: "forbidden",
          userId: "member-user-1",
          roles: [],
          permissions: new Set(["profile.read"]),
          displayName: "Standard Member",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Attempted member settlement override",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toMatch(/Administrator session required/i);
      });

      it("rejects admin with insufficient permissions (e.g. content_editor without payments.verify) with HTTP 403", async () => {
        mockAdminGate.getAdminContext.mockResolvedValue({
          mode: "live",
          userId: "editor-user-1",
          roles: ["content_editor"],
          permissions: new Set(["content.publish"]),
          displayName: "Content Editor",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Content editor attempting reconciliation",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toMatch(/Permission denied/i);
      });

      it("allows authorized finance_reviewer with payments.verify authority", async () => {
        mockAdminGate.getAdminContext.mockResolvedValue({
          mode: "live",
          userId: "fin-reviewer-1",
          roles: ["finance_reviewer"],
          permissions: new Set(["payments.verify"]),
          displayName: "Finance Reviewer",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Verified against Axis Bank corporate portal credit log",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
      });

      it("allows authorized event_manager with registrations.approve authority", async () => {
        mockAdminGate.getAdminContext.mockResolvedValue({
          mode: "live",
          userId: "event-mgr-1",
          roles: ["event_manager"],
          permissions: new Set(["registrations.approve"]),
          displayName: "Event Manager",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Attendee provided physical counterfoil and counter-checked",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
      });
    });

    describe("2.2 Payload Validation & CSRF Protection", () => {
      it("rejects cross-origin CSRF attack (mismatched Origin header) with HTTP 422", async () => {
        const req = createJsonRequest(
          {
            orderId: validOrderId,
            evidenceId: validEvidenceId,
            notes: "CSRF forged settlement payload",
          },
          { origin: "https://evil-attacker-site.com" }
        );

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(422);
      });

      it("rejects non-UUID orderId with HTTP 422", async () => {
        const req = createJsonRequest({
          orderId: "invalid-not-a-uuid",
          evidenceId: validEvidenceId,
          notes: "Manual review verification rationale",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(422);
        const data = await res.json();
        expect(data.error).toMatch(/Valid order ID is required/i);
      });

      it("rejects non-UUID evidenceId with HTTP 422", async () => {
        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: "not-a-uuid-evidence",
          notes: "Manual review verification rationale",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(422);
        const data = await res.json();
        expect(data.error).toMatch(/Valid bank evidence ID is required/i);
      });

      it("rejects audit notes shorter than 5 characters with HTTP 422", async () => {
        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "ok",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(422);
        const data = await res.json();
        expect(data.error).toMatch(/at least 5 characters/i);
      });

      it("rejects audit notes exceeding 1000 characters with HTTP 422", async () => {
        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "A".repeat(1001),
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(422);
        const data = await res.json();
        expect(data.error).toMatch(/cannot exceed 1000 characters/i);
      });
    });

    describe("2.3 Order State & Idempotency Invariants", () => {
      it("returns HTTP 404 when target order does not exist", async () => {
        const nonExistentOrderId = "99999999-9999-4999-8999-999999999999";
        const req = createJsonRequest({
          orderId: nonExistentOrderId,
          evidenceId: validEvidenceId,
          notes: "Checking non existent order",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.error).toMatch(/Payment order could not be located/i);
      });

      it("idempotently handles consecutive reconciliation on already verified/reconciled order", async () => {
        mockOrdersDb.set(validOrderId, {
          ...mockOrdersDb.get(validOrderId)!,
          status: "reconciled",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Repeated reconciliation attempt on settled order",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.message).toMatch(/Order is already reconciled/i);
        // Fulfillment RPC must NOT be called again
        expect(mockRpcCalls).toHaveLength(0);
      });

      it("rejects reconciliation when order is in un-reconcilable state (e.g. cancelled) with HTTP 409", async () => {
        mockOrdersDb.set(validOrderId, {
          ...mockOrdersDb.get(validOrderId)!,
          status: "cancelled",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Attempting to reconcile cancelled order",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.error).toMatch(/Cannot manually reconcile order currently in cancelled state/i);
      });
    });

    describe("2.4 Bank Evidence Invariants & Cryptographic Defense", () => {
      it("returns HTTP 404 when bank evidence does not exist", async () => {
        const nonExistentEvId = "88888888-8888-4888-8888-888888888888";
        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: nonExistentEvId,
          notes: "Reconciling against missing bank record",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.error).toMatch(/Bank payment evidence could not be located/i);
      });

      it("rejects bank evidence when direction is DEBIT with HTTP 422", async () => {
        mockEvidenceDb.set(validEvidenceId, {
          ...mockEvidenceDb.get(validEvidenceId)!,
          direction: "DEBIT",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Reconciling debit alert against credit order",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(422);
        const data = await res.json();
        expect(data.error).toMatch(/Evidence direction is not CREDIT/i);
      });

      it("rejects exact amount mismatch between evidence and order with HTTP 422", async () => {
        mockEvidenceDb.set(validEvidenceId, {
          ...mockEvidenceDb.get(validEvidenceId)!,
          amount_paise: 20000, // ₹200 vs order ₹500
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Reconciling partial payment",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(422);
        const data = await res.json();
        expect(data.error).toMatch(/Amount mismatch/i);
      });

      it("rejects receiving account suffix mismatch (e.g. XX8888 vs expected XX1995) with HTTP 422", async () => {
        mockEvidenceDb.set(validEvidenceId, {
          ...mockEvidenceDb.get(validEvidenceId)!,
          receiving_account_suffix: "8888",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Credit sent to wrong bank account",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(422);
        const data = await res.json();
        expect(data.error).toMatch(/Account mismatch/i);
      });

      it("CRITICAL DEFENSE: rejects evidence with auth_status = 'untrusted' with HTTP 422 even with admin override", async () => {
        mockEvidenceDb.set(validEvidenceId, {
          ...mockEvidenceDb.get(validEvidenceId)!,
          auth_status: "untrusted",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Admin override attempt on untrusted bank email",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(422);
        const data = await res.json();
        expect(data.error).toMatch(/evidence authentication failed with status 'untrusted'/i);
        expect(data.error).toMatch(/Untrusted evidence cannot be settled/i);
        // RPC must NOT be called
        expect(mockRpcCalls).toHaveLength(0);
      });

      it("CRITICAL DEFENSE: rejects evidence with auth_status = 'forged' with HTTP 422 even with admin override", async () => {
        mockEvidenceDb.set(validEvidenceId, {
          ...mockEvidenceDb.get(validEvidenceId)!,
          auth_status: "forged",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Admin override attempt on forged bank email",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(422);
        const data = await res.json();
        expect(data.error).toMatch(/evidence authentication failed with status 'forged'/i);
        expect(data.error).toMatch(/Untrusted evidence cannot be settled/i);
        expect(mockRpcCalls).toHaveLength(0);
      });

      it("rejects double-spend attempt when evidence is already attributed to another order with HTTP 409", async () => {
        mockEvidenceDb.set(validEvidenceId, {
          ...mockEvidenceDb.get(validEvidenceId)!,
          matched_order_id: "other-order-uuid-9999",
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Attempting to claim already attributed evidence",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.error).toMatch(/evidence has already been attributed to another order/i);
        expect(mockRpcCalls).toHaveLength(0);
      });
    });

    describe("2.5 Successful Atomic Settlement & Audit Trail", () => {
      it("authorizes settlement under 'admin_manual', invokes atomic fulfillment RPC, and writes audit log", async () => {
        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Authorized by Senior Finance Reviewer after checking Axis NetBanking Statement",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);

        // 1. Verify atomic RPC call
        expect(mockRpcCalls).toHaveLength(1);
        expect(mockRpcCalls[0].fnName).toBe("csc_fulfill_confirmed_payment");
        expect(mockRpcCalls[0].args).toEqual({
          p_order_id: validOrderId,
          p_evidence_id: validEvidenceId,
          p_matched_by: "admin_manual",
          p_notes: "Authorized by Senior Finance Reviewer after checking Axis NetBanking Statement",
          p_user_id: validAdminUserId,
        });

        // 2. Verify attribution upsert
        expect(mockAttributionsDb.has(validOrderId)).toBe(true);
        const attr = mockAttributionsDb.get(validOrderId);
        expect(attr.evidence_id).toBe(validEvidenceId);
        expect(attr.attribution_method).toBe("admin_bank_record_review");
        expect(attr.verification_source).toBe("admin_manual_settlement");
        expect(attr.eligible_for_settlement).toBe(true);
        expect(attr.verified_by).toBe(validAdminUserId);

        // 3. Verify event pass email dispatch
        expect(mockPassEmail.ensureEventPassEmail).toHaveBeenCalledWith(
          expect.anything(),
          "pass-uuid-9999"
        );

        // 4. Verify immutable audit log
        expect(mockAuditLogsDb).toHaveLength(1);
        expect(mockAuditLogsDb[0].action).toBe("payment.manual_reconciliation.verified");
        expect(mockAuditLogsDb[0].target_id).toBe(validOrderId);
        expect(mockAuditLogsDb[0].actor_id).toBe(validAdminUserId);

        // 5. Verify notification delivery schedule
        expect(mockNotificationSchedule.scheduleNotificationDelivery).toHaveBeenCalledOnce();
      });

      it("handles atomic RPC fulfillment failure gracefully with HTTP 409", async () => {
        mockRpcFailure = "Deadlock detected or ticket inventory exhausted";

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Verification attempt during peak contention",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.error).toMatch(/Deadlock detected or ticket inventory exhausted/i);
      });
    });

    describe("2.6 Distributed Rate Limiting Guard", () => {
      it("returns HTTP 429 when distributed rate limit threshold is exceeded", async () => {
        mockRateLimit.distributedRateLimit.mockResolvedValueOnce({
          allowed: false,
          retry_after: 45,
        });

        const req = createJsonRequest({
          orderId: validOrderId,
          evidenceId: validEvidenceId,
          notes: "Flooding manual reconciliation endpoint",
        });

        const res = await manualReconcileRoute(req);
        expect(res.status).toBe(429);
        const data = await res.json();
        expect(data.error).toMatch(/Too many manual reconciliation requests/i);
      });
    });
  });
});
