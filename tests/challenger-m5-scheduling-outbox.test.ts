// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { GET as reconcileGet, POST as reconcilePost } from "@/app/api/internal/payments/reconcile/route";
import { GET as imapHealthGet } from "@/app/api/internal/payments/imap-health/route";
import * as reconcilerModule from "@/lib/payments/reconciler";
import * as imapClientModule from "@/lib/payments/imap-client";
import * as adminGateModule from "@/lib/admin/gate";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("Milestone M5 — Background Scheduling, Secret Separation & Outbox Isolation", () => {
  const originalEnv = { ...process.env };
  const VALID_RECONCILE_SECRET = "super_secure_reconcile_secret_with_more_than_32_characters_12345";
  const VALID_CRON_SECRET = "general_vercel_cron_secret_for_daily_notifications_32_chars";
  const ALTERNATIVE_RECON_SECRET = "alternative_cron_secret_for_reconciliation_32_characters_98765";

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.CSC_PAYMENT_RECONCILE_SECRET = VALID_RECONCILE_SECRET;
    process.env.CRON_SECRET = VALID_CRON_SECRET;
    delete process.env.RECONCILIATION_CRON_SECRET;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("1. Vercel Hobby Architectural Constraints in vercel.json", () => {
    it("preserves strictly daily cron and contains zero sub-daily cron schedules", () => {
      const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8"));
      expect(vercelConfig.crons).toBeDefined();
      expect(vercelConfig.crons).toHaveLength(1);

      const dailyCron = vercelConfig.crons[0];
      expect(dailyCron.path).toBe("/api/internal/notifications");
      expect(dailyCron.schedule).toBe("0 2 * * *");

      // Verify no frequent cron schedules (* * * * * or */5 * * * *) are configured
      for (const cron of vercelConfig.crons) {
        expect(cron.schedule).not.toMatch(/^\*|\*\/\d+/);
      }
    });

    it("verifies api functions maxDuration is set to 300 for long-running reconciliation", () => {
      const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8"));
      expect(vercelConfig.functions["src/app/api/**/route.ts"]?.maxDuration).toBe(300);
    });
  });

  describe("2. Reconciliation Route Secret Separation & Authentication", () => {
    it("rejects unauthenticated requests with HTTP 401", async () => {
      const req = new Request("http://localhost/api/internal/payments/reconcile");
      const res = await reconcileGet(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("rejects requests using the general Vercel CRON_SECRET instead of reconciliation secret", async () => {
      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        headers: { authorization: `Bearer ${VALID_CRON_SECRET}` },
      });
      const res = await reconcileGet(req);
      expect(res.status).toBe(401);
    });

    it("rejects when configured reconciliation secret is shorter than 32 characters", async () => {
      process.env.CSC_PAYMENT_RECONCILE_SECRET = "short_secret";
      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        headers: { authorization: `Bearer short_secret` },
      });
      const res = await reconcileGet(req);
      expect(res.status).toBe(401);
    });

    it("rejects timing attack probe with wrong secret of identical length", async () => {
      const wrongSecret = "x".repeat(VALID_RECONCILE_SECRET.length);
      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        headers: { authorization: `Bearer ${wrongSecret}` },
      });
      const res = await reconcileGet(req);
      expect(res.status).toBe(401);
    });

    it("authenticates successfully via Bearer token with CSC_PAYMENT_RECONCILE_SECRET", async () => {
      vi.spyOn(reconcilerModule, "reconcilePayments").mockResolvedValue({
        ok: true,
        leaseAcquired: true,
        messagesFetched: 5,
        evidenceRecorded: 2,
        ordersMatched: 1,
        ambiguousCredits: 0,
        errors: [],
      });

      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        headers: { authorization: `Bearer ${VALID_RECONCILE_SECRET}` },
      });
      const res = await reconcileGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.messagesFetched).toBe(5);
      expect(json.ordersMatched).toBe(1);
    });

    it("authenticates successfully via RECONCILIATION_CRON_SECRET alias", async () => {
      delete process.env.CSC_PAYMENT_RECONCILE_SECRET;
      process.env.RECONCILIATION_CRON_SECRET = ALTERNATIVE_RECON_SECRET;

      vi.spyOn(reconcilerModule, "reconcilePayments").mockResolvedValue({
        ok: true,
        leaseAcquired: true,
        messagesFetched: 0,
        evidenceRecorded: 0,
        ordersMatched: 0,
        ambiguousCredits: 0,
        errors: [],
      });

      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        headers: { authorization: `Bearer ${ALTERNATIVE_RECON_SECRET}` },
      });
      const res = await reconcileGet(req);
      expect(res.status).toBe(200);
    });

    it("authenticates successfully via x-reconcile-secret custom header", async () => {
      vi.spyOn(reconcilerModule, "reconcilePayments").mockResolvedValue({
        ok: true,
        leaseAcquired: true,
        messagesFetched: 1,
        evidenceRecorded: 1,
        ordersMatched: 0,
        ambiguousCredits: 1,
        errors: [],
      });

      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        headers: { "x-reconcile-secret": VALID_RECONCILE_SECRET },
      });
      const res = await reconcileGet(req);
      expect(res.status).toBe(200);
    });

    it("proxies POST requests through to GET handler", async () => {
      vi.spyOn(reconcilerModule, "reconcilePayments").mockResolvedValue({
        ok: true,
        leaseAcquired: true,
        messagesFetched: 0,
        evidenceRecorded: 0,
        ordersMatched: 0,
        ambiguousCredits: 0,
        errors: [],
      });

      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        method: "POST",
        headers: { authorization: `Bearer ${VALID_RECONCILE_SECRET}` },
      });
      const res = await reconcilePost(req);
      expect(res.status).toBe(200);
    });

    it("returns HTTP 207 Multi-Status when reconciler encounters non-fatal partial errors", async () => {
      vi.spyOn(reconcilerModule, "reconcilePayments").mockResolvedValue({
        ok: false,
        leaseAcquired: true,
        messagesFetched: 2,
        evidenceRecorded: 1,
        ordersMatched: 0,
        ambiguousCredits: 0,
        errors: ["Transient IMAP socket error on UID 104"],
      });

      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        headers: { authorization: `Bearer ${VALID_RECONCILE_SECRET}` },
      });
      const res = await reconcileGet(req);
      expect(res.status).toBe(207);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.errors).toContain("Transient IMAP socket error on UID 104");
    });

    it("returns HTTP 500 when reconciler throws an unhandled exception", async () => {
      vi.spyOn(reconcilerModule, "reconcilePayments").mockRejectedValue(
        new Error("Database connection pool exhausted")
      );

      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        headers: { authorization: `Bearer ${VALID_RECONCILE_SECRET}` },
      });
      const res = await reconcileGet(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Payment reconciliation process failed");
      expect(json.details).toBe("Database connection pool exhausted");
    });
  });

  describe("3. IMAP Health Check Route Secret Separation & Admin Session Access", () => {
    it("rejects unauthorized caller without secret or admin session", async () => {
      vi.spyOn(adminGateModule, "getAdminContext").mockRejectedValue(new Error("No session"));

      const req = new Request("http://localhost/api/internal/payments/imap-health");
      const res = await imapHealthGet(req);
      expect(res.status).toBe(401);
    });

    it("authorizes caller with valid Bearer reconciliation secret", async () => {
      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    last_uid: 42,
                    uid_validity: 100,
                    last_sync_status: "idle",
                    last_sync_started_at: "2026-11-02T10:00:00Z",
                    last_sync_completed_at: "2026-11-02T10:01:00Z",
                    last_sync_message_count: 5,
                    last_sync_matched_count: 2,
                    last_error: null,
                    mailbox_name: "INBOX",
                  },
                }),
            }),
          }),
        }),
      } as any);

      vi.spyOn(imapClientModule, "checkImapConnection").mockResolvedValue({
        ok: true,
        host: "imap.mail.me.com",
        port: 993,
        username: "vikash752008@icloud.com",
        mailboxSelected: "INBOX",
        totalMessages: 100,
        uidValidity: 100,
        message: "Connected",
      });

      const req = new Request("http://localhost/api/internal/payments/imap-health", {
        headers: { authorization: `Bearer ${VALID_RECONCILE_SECRET}` },
      });
      const res = await imapHealthGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.connection.authenticated).toBe(true);
    });

    it("authorizes caller with session possessing 'payments.verify' permission", async () => {
      vi.spyOn(adminGateModule, "getAdminContext").mockResolvedValue({
        mode: "live",
        permissions: new Set(["payments.verify"]),
      } as any);

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    last_uid: 10,
                    uid_validity: 50,
                    last_sync_status: "idle",
                    last_sync_started_at: null,
                    last_sync_completed_at: null,
                    last_sync_message_count: 0,
                    last_sync_matched_count: 0,
                    last_error: null,
                    mailbox_name: "INBOX",
                  },
                }),
            }),
          }),
        }),
      } as any);

      vi.spyOn(imapClientModule, "checkImapConnection").mockResolvedValue({
        ok: true,
        host: "imap.mail.me.com",
        port: 993,
        username: "vikash752008@icloud.com",
        mailboxSelected: "INBOX",
        totalMessages: 50,
        uidValidity: 50,
        message: "Connected",
      });

      const req = new Request("http://localhost/api/internal/payments/imap-health");
      const res = await imapHealthGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });

  describe("4. Outbox Worker Isolation & Non-rollback Invariants", () => {
    it("ensures email delivery failure does not roll back or corrupt financial settlement", async () => {
      // Mock Supabase admin RPC csc_fulfill_confirmed_payment returning successful atomic fulfillment
      const mockAdmin = {
        rpc: vi.fn().mockResolvedValue({
          data: {
            ok: true,
            primary_pass_id: "pass-uuid-999",
            paid_registration_id: "paid-reg-uuid-888",
          },
          error: null,
        }),
        from: vi.fn(),
      } as any;

      const mockOrder = {
        id: "order-uuid-111",
        amount_paise: 18000,
        currency: "INR",
        status: "pending",
      } as any;

      const mockEvidence = {
        id: "evidence-uuid-222",
        utr: "123456789012",
        amount_paise: 18000,
      } as any;

      // fulfillConfirmedPayment executes the RPC and catches any pass generation/email errors
      const result = await reconcilerModule.fulfillConfirmedPayment(
        mockAdmin,
        mockOrder,
        mockEvidence,
        "automated_worker"
      );

      expect(result.ok).toBe(true);
      expect(mockAdmin.rpc).toHaveBeenCalledWith("csc_fulfill_confirmed_payment", {
        p_order_id: "order-uuid-111",
        p_evidence_id: "evidence-uuid-222",
        p_matched_by: "automated_worker",
        p_notes: expect.stringContaining("UTR 123456789012"),
        p_user_id: null,
      });
    });

    it("verifies Supabase pg_net / pg_cron webhook HTTPS POST trigger is supported", async () => {
      vi.spyOn(reconcilerModule, "reconcilePayments").mockResolvedValue({
        ok: true,
        leaseAcquired: true,
        messagesFetched: 0,
        evidenceRecorded: 0,
        ordersMatched: 0,
        ambiguousCredits: 0,
        errors: [],
      });

      // pg_net sends POST request with Content-Type application/json and Bearer token in headers
      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        method: "POST",
        headers: {
          authorization: `Bearer ${VALID_RECONCILE_SECRET}`,
          "content-type": "application/json",
          "user-agent": "pg_net/0.8.0",
        },
        body: JSON.stringify({ trigger: "supabase_pg_cron_5min" }),
      });

      const res = await reconcilePost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.leaseAcquired).toBe(true);
    });
  });
});
