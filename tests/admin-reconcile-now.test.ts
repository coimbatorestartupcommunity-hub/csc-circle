/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockRateLimit = vi.hoisted(() => ({
  distributedRateLimit: vi.fn(),
  clientIp: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/rate-limit", () => ({
  distributedRateLimit: mockRateLimit.distributedRateLimit,
  clientIp: mockRateLimit.clientIp,
}));

const mockAdminGate = vi.hoisted(() => ({
  getAdminContext: vi.fn(),
  can: vi.fn((ctx: any, perm: string) => ctx?.permissions?.has(perm) ?? false),
}));
vi.mock("@/lib/admin/gate", () => ({
  getAdminContext: mockAdminGate.getAdminContext,
  can: mockAdminGate.can,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
}));

const mockReconciler = vi.hoisted(() => ({
  reconcilePayments: vi.fn(),
}));
vi.mock("@/lib/payments/reconciler", () => ({
  reconcilePayments: mockReconciler.reconcilePayments,
}));

import { POST as reconcileNowRoute } from "@/app/api/admin/payments/reconcile-now/route";

function adminCtx(permissions: string[] = ["payments.verify"]) {
  return {
    mode: "live",
    userId: "admin-1",
    roles: ["finance_reviewer"],
    permissions: new Set(permissions),
  };
}

describe("POST /api/admin/payments/reconcile-now", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.distributedRateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 });
    mockAdminGate.getAdminContext.mockResolvedValue(adminCtx());
  });

  it("rejects unauthenticated callers before touching the worker", async () => {
    mockAdminGate.getAdminContext.mockResolvedValue({ mode: "preview", userId: null, roles: [], permissions: new Set() });
    const res = await reconcileNowRoute(new Request("http://localhost/api/admin/payments/reconcile-now", { method: "POST" }));
    expect(res.status).toBe(403);
    expect(mockReconciler.reconcilePayments).not.toHaveBeenCalled();
  });

  it("rejects admins without payments.verify permission", async () => {
    mockAdminGate.getAdminContext.mockResolvedValue(adminCtx([]));
    const res = await reconcileNowRoute(new Request("http://localhost/api/admin/payments/reconcile-now", { method: "POST" }));
    expect(res.status).toBe(403);
    expect(mockReconciler.reconcilePayments).not.toHaveBeenCalled();
  });

  it("runs the leased worker for authorized admins and returns its summary", async () => {
    mockReconciler.reconcilePayments.mockResolvedValue({ ok: true, processed: 3, matched: 1 });
    const res = await reconcileNowRoute(new Request("http://localhost/api/admin/payments/reconcile-now", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(mockReconciler.reconcilePayments).toHaveBeenCalledTimes(1);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it("propagates worker failure without claiming success", async () => {
    mockReconciler.reconcilePayments.mockResolvedValue({ ok: false, error: "imap down" });
    const res = await reconcileNowRoute(new Request("http://localhost/api/admin/payments/reconcile-now", { method: "POST" }));
    expect(res.status).toBe(207);
    expect(await res.json()).toMatchObject({ ok: false });
  });

  it("rate-limits repeated runs per admin", async () => {
    mockRateLimit.distributedRateLimit.mockResolvedValue({ allowed: false, retryAfter: 60 });
    const res = await reconcileNowRoute(new Request("http://localhost/api/admin/payments/reconcile-now", { method: "POST" }));
    expect(res.status).toBe(429);
    expect(mockReconciler.reconcilePayments).not.toHaveBeenCalled();
  });
});
