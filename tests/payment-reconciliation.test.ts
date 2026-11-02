// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- lightweight Supabase query-chain doubles */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ensureEventPassEmail } from "@/lib/admin/event-pass-email";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
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

  // Load all migrations in sequence
  for (const file of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
}, 30_000);

afterAll(async () => {
  await db?.close();
});

let testSeq = 1;
function getNextId() {
  testSeq++;
  const hex = testSeq.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

async function createTestEvent(slugPrefix = "m2-recon-evt") {
  const eventId = getNextId();
  const slug = `${slugPrefix}-${Date.now()}-${testSeq}`;
  await db.exec(`
    insert into public.events (
      id, slug, title, category, starts_at, ends_at, location,
      capacity, status, registration_state, admission, price_per_attendee
    ) values (
      '${eventId}', '${slug}', 'M2 Reconciliation Event', 'networking',
      now() + interval '1 day', now() + interval '2 days', 'Coimbatore',
      100, 'published', 'open', 'paid', 180.00
    );
  `);
  return { eventId, slug };
}

async function authorizeAttribution(
  orderId: string,
  evidenceId: string,
  orderReference: string,
  method: "bank_order_reference" | "admin_bank_record_review" = "bank_order_reference"
) {
  await db.exec(`
    insert into public.event_payment_attributions(
      order_id, evidence_id, attribution_method, bank_order_reference,
      verification_source, policy_version, supporting_evidence, eligible_for_settlement
    ) values (
      '${orderId}', '${evidenceId}', '${method}',
      ${method === "bank_order_reference" ? `'${orderReference}'` : "null"},
      'pglite-regression-test', 'test-v1', '{"fixture":true}'::jsonb, true
    );
  `);
}

describe("Payment Worker Concurrency & Database Reconciliation", () => {
  describe("Lease Management & Database Schema Constraints", () => {
    it("acquires lease exclusively and blocks concurrent workers until released", async () => {
      // Worker A acquires lease
      const resA = await db.query<{ csc_acquire_payment_worker_lease: boolean }>(
        "select public.csc_acquire_payment_worker_lease('worker-a', 60);"
      );
      expect(resA.rows[0].csc_acquire_payment_worker_lease).toBe(true);

      // Worker B attempts to acquire while Worker A holds active lease -> must be denied
      const resB = await db.query<{ csc_acquire_payment_worker_lease: boolean }>(
        "select public.csc_acquire_payment_worker_lease('worker-b', 60);"
      );
      expect(resB.rows[0].csc_acquire_payment_worker_lease).toBe(false);

      // Worker A releases lease
      const releaseA = await db.query<{ csc_release_payment_worker_lease: boolean }>(
        "select public.csc_release_payment_worker_lease('worker-a', 'success', 5, 2, 105, null);"
      );
      expect(releaseA.rows[0].csc_release_payment_worker_lease).toBe(true);

      // Worker B can now acquire the lease
      const resB2 = await db.query<{ csc_acquire_payment_worker_lease: boolean }>(
        "select public.csc_acquire_payment_worker_lease('worker-b', 60);"
      );
      expect(resB2.rows[0].csc_acquire_payment_worker_lease).toBe(true);

      // Worker B cleanup
      await db.query("select public.csc_release_payment_worker_lease('worker-b', 'idle', 0, 0, null, null);");
    });

    it("enforces unique UTR constraint on event_payment_evidence", async () => {
      await db.exec(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '630711223344', now(), 'UPI/P2A/630711223344/PAYER/IOBA/UPI',
          'alerts@axis.bank.in', '<msg-001@axis.bank.in>', 'INR 180.00 was credited to your A/c.'
        );
      `);

      // Duplicate UTR insert must fail
      await expect(
        db.exec(`
          insert into public.event_payment_evidence(
            bank, direction, currency, amount_paise, receiving_account_suffix,
            utr, transaction_time, transaction_info_raw, sender_email, message_id, subject
          ) values (
            'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
            '630711223344', now(), 'UPI/P2A/630711223344/ANOTHER/IOBA/UPI',
            'alerts@axis.bank.in', '<msg-002@axis.bank.in>', 'INR 180.00 was credited to your A/c.'
          );
        `)
      ).rejects.toThrow();
    });

    it("enforces strict format on order_reference", async () => {
      const { eventId } = await createTestEvent("fmt-check");

      // Valid reference succeeds
      await db.exec(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri
        ) values (
          'CSC-ORD-ABC123DEF456', '${eventId}', 'Test Attendee',
          'test@example.com', '9876543210', 'Test Org', 'Student',
          1, 18000, 'upi://pay?pa=9342877474@ptyes&pn=S%20VIKASH&am=180.00'
        );
      `);

      // Invalid reference regex fails
      await expect(
        db.exec(`
          insert into public.event_payment_orders(
            order_reference, event_id, full_name, email, whatsapp, organization, role,
            attendee_count, amount_paise, upi_uri
          ) values (
            'INVALID-REF', '${eventId}', 'Bad Attendee',
            'bad@example.com', '9876543210', 'Test Org', 'Student',
            1, 18000, 'upi://pay'
          );
        `)
      ).rejects.toThrow();
    });

    it("defaults auth_status to 'needs_review' on newly inserted evidence rows", async () => {
      const utr = `DEF_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await db.exec(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/DEFTEST/IOBA/UPI',
          'alerts@axis.bank.in', '<msg-${utr}@axis.bank.in>', 'Credit Alert'
        );
      `);

      const res = await db.query<{ auth_status: string }>(
        `select auth_status from public.event_payment_evidence where utr = '${utr}';`
      );
      expect(res.rows[0].auth_status).toBe("needs_review");
    });

    it("enforces partial unique index idx_active_orders_per_email on active orders", async () => {
      const { eventId } = await createTestEvent("partial-idx");
      const email = "racing-checkout@example.com";

      // First active order (pending)
      await db.exec(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status
        ) values (
          'CSC-ORD-ACTIVE001', '${eventId}', 'Active Checkout User',
          '${email}', '9876543210', 'Org', 'Student',
          1, 18000, 'upi://pay', 'pending'
        );
      `);

      // Concurrent second active order with same email for same event must fail
      await expect(
        db.exec(`
          insert into public.event_payment_orders(
            order_reference, event_id, full_name, email, whatsapp, organization, role,
            attendee_count, amount_paise, upi_uri, status
          ) values (
            'CSC-ORD-ACTIVE002', '${eventId}', 'Active Checkout User',
            '${email}', '9876543210', 'Org', 'Student',
            1, 18000, 'upi://pay', 'pending'
          );
        `)
      ).rejects.toThrow(/duplicate key value violates unique constraint "idx_active_orders_per_email"/i);
    });

    it("enforces atomic distributed rate limiting via csc_check_rate_limit", async () => {
      const key = `ip-rate-test-${Date.now()}`;
      // Limit: 2 calls allowed per 60 seconds
      const res1 = await db.query<{ csc_check_rate_limit: { allowed: boolean; remaining: number } }>(
        `select public.csc_check_rate_limit('${key}', 2, 60);`
      );
      expect(res1.rows[0].csc_check_rate_limit.allowed).toBe(true);
      expect(res1.rows[0].csc_check_rate_limit.remaining).toBe(1);

      const res2 = await db.query<{ csc_check_rate_limit: { allowed: boolean; remaining: number } }>(
        `select public.csc_check_rate_limit('${key}', 2, 60);`
      );
      expect(res2.rows[0].csc_check_rate_limit.allowed).toBe(true);
      expect(res2.rows[0].csc_check_rate_limit.remaining).toBe(0);

      const res3 = await db.query<{ csc_check_rate_limit: { allowed: boolean; remaining: number } }>(
        `select public.csc_check_rate_limit('${key}', 2, 60);`
      );
      expect(res3.rows[0].csc_check_rate_limit.allowed).toBe(false);
      expect(res3.rows[0].csc_check_rate_limit.remaining).toBe(0);
    });
  });

  describe("Validated Attribution Enforcement in csc_fulfill_confirmed_payment", () => {
    it("rejects user_utr_claim when payment evidence has auth_status = 'needs_review'", async () => {
      const { eventId } = await createTestEvent("attr-claim-rev");
      const orderRef = "CSC-ORD-CLMREV01";
      const utr = `UTR_CLMREV_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, claimed_utr, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Claim Review User', 'claim@example.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', '${utr}', 'processing', true
        ) returning id;
      `)).rows[0].id;

      // Evidence inserted with auth_status = needs_review (default)
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/BANK/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'needs_review'
        ) returning id;
      `)).rows[0].id;

      await authorizeAttribution(orderId, evId, orderRef);

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'user_utr_claim');`)
      ).rejects.toThrow("User UTR claim settlement requires authenticated evidence");
    });

    it("rejects user_utr_claim when bank memo lacks order reference and no authorized attribution record exists", async () => {
      const { eventId } = await createTestEvent("attr-nomemo");
      const orderRef = "CSC-ORD-CLMNOMEMO";
      const utr = `UTR_NOMEMO_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, claimed_utr, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'No Memo User', 'nomemo@example.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', '${utr}', 'processing', true
        ) returning id;
      `)).rows[0].id;

      // Evidence is authenticated, but memo is generic without order reference
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/ANONYMOUS/IOBA/UPI', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'user_utr_claim');`)
      ).rejects.toThrow("Settlement requires an eligible, unconsumed verified attribution");
    });

    it("allows user_utr_claim only when an eligible attribution record exists", async () => {
      const { eventId } = await createTestEvent("attr-authevt");
      const orderRef = "CSC-ORD-CLMAUTHEVT";
      const utr = `UTR_AUTHEVT_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, claimed_utr, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Auth Event User', 'authevt@example.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', '${utr}', 'processing', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/OPAQUE/IOBA/UPI', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await authorizeAttribution(orderId, evId, orderRef);

      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'user_utr_claim');`
      );
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
    });

    it("allows user_utr_claim when bank memo contains order reference without requiring pre-inserted attribution record", async () => {
      const { eventId } = await createTestEvent("attr-clm-memo");
      const orderRef = "CSC-ORD-CLMMEMO01";
      const utr = `UTR_CLMMEMO_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, claimed_utr, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Claim Memo User', 'clmmemo@example.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', '${utr}', 'processing', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Fulfill user_utr_claim without calling authorizeAttribution
      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'user_utr_claim');`
      );
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
    });

    it("rejects automated_worker settlement when transaction note lacks order reference", async () => {
      const { eventId } = await createTestEvent("attr-worker-nomemo");
      const orderRef = "CSC-ORD-WRKNOMEMO";
      const utr = `UTR_WRKNOMEMO_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Worker No Memo', 'wrk@example.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Evidence memo mentions another reference
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/OTHER/IOBA/UPI/CSC-ORD-DIFFERENT123', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow("Automated worker settlement requires verifiable order reference");
    });

    it("successfully fulfills when automated_worker transaction note contains order reference", async () => {
      const { eventId } = await createTestEvent("attr-worker-ok");
      const orderRef = "CSC-ORD-WRKMATCH01";
      const utr = `UTR_WRKMATCH_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Worker Match User', 'wrkmatch@example.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; paid_registration_id: string } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      expect(res.rows[0].csc_fulfill_confirmed_payment.paid_registration_id).toBeDefined();

      // Verify order state transitioned to reconciled
      const orderStatus = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderId}';`
      )).rows[0].status;
      expect(orderStatus).toBe("reconciled");
    });
  });

  describe("Row-level Lock Concurrency & Double-Spend Prevention", () => {
    it("idempotently handles repeated fulfillment calls committing exactly once", async () => {
      const { eventId } = await createTestEvent("idemp-test");
      const orderRef = "CSC-ORD-IDEMP001";
      const utr = `UTR_IDEMP_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Idempotent User', 'idemp@example.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // First fulfillment
      const res1 = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; already_fulfilled?: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(res1.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      expect(res1.rows[0].csc_fulfill_confirmed_payment.already_fulfilled).toBeFalsy();

      // Second identical fulfillment (replay)
      const res2 = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; already_fulfilled?: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(res2.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      expect(res2.rows[0].csc_fulfill_confirmed_payment.already_fulfilled).toBe(true);

      // Verify registrations and passes count is strictly 1
      const regCount = (await db.query<{ count: string }>(
        `select count(*)::text as count from public.paid_event_registrations where email = 'idemp@example.com';`
      )).rows[0].count;
      expect(regCount).toBe("1");

      const passCount = (await db.query<{ count: string }>(
        `select count(*)::text as count from public.event_registrations where source_email = 'idemp@example.com';`
      )).rows[0].count;
      expect(passCount).toBe("1");
    });

    it("prevents double-spending when distinct orders attempt to consume the same payment evidence", async () => {
      const { eventId } = await createTestEvent("dblspend-test");
      const orderRefA = "CSC-ORD-DBLSPENDA";
      const orderRefB = "CSC-ORD-DBLSPENDB";
      const utr = `UTR_DBL_${Date.now()}`;

      const orderA = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRefA}', '${eventId}', 'Buyer A', 'buyera@example.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const orderB = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRefB}', '${eventId}', 'Buyer B', 'buyerb@example.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Evidence with orderRefA in memo
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRefA} ${orderRefB}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Fulfill order A successfully
      await db.query(`select public.csc_fulfill_confirmed_payment('${orderA}', '${evId}', 'automated_worker');`);

      // Attempt to fulfill order B with same evidence -> MUST fail
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderB}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/already matched to another order/i);

      // Order B remains pending
      const orderBStatus = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderB}';`
      )).rows[0].status;
      expect(orderBStatus).toBe("pending");
    });
  });

  describe("Exact Group Pass Generation & Transactional Rollback", () => {
    it("rejects fulfillment and rolls back entire transaction when group attendee identities are missing", async () => {
      const { eventId } = await createTestEvent("rollback-group");
      const orderRef = "CSC-ORD-MISSGROUP";
      const utr = `UTR_MISS_${Date.now()}`;

      // Group order for 3 attendees, but 0 additional names provided
      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms, additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead Buyer', 'leadmiss@example.com', '9876543210',
          'Org', 'Student', 3, 54000, 'upi://pay', 'pending', true, null
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 54000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Settlement must throw due to missing verified names
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow("Pass generation invariant violation: order");

      // Verify atomic transactional rollback:
      // 1. Order status is still 'pending'
      const orderStatus = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderId}';`
      )).rows[0].status;
      expect(orderStatus).toBe("pending");

      // 2. Evidence reconciliation_state is still 'unmatched'
      const evState = (await db.query<{ reconciliation_state: string }>(
        `select reconciliation_state from public.event_payment_evidence where id = '${evId}';`
      )).rows[0].reconciliation_state;
      expect(evState).toBe("unmatched");

      // 3. No paid_event_registrations created
      const paidCount = (await db.query<{ count: string }>(
        `select count(*)::text as count from public.paid_event_registrations where email = 'leadmiss@example.com';`
      )).rows[0].count;
      expect(paidCount).toBe("0");

      // 4. No passes created
      const passCount = (await db.query<{ count: string }>(
        `select count(*)::text as count from public.event_registrations where source_email = 'leadmiss@example.com';`
      )).rows[0].count;
      expect(passCount).toBe("0");
    });

    it("successfully creates exact admission passes matching attendee count when all names are provided", async () => {
      const { eventId } = await createTestEvent("ok-group");
      const orderRef = "CSC-ORD-OKGROUP01";
      const utr = `UTR_OKGRP_${Date.now()}`;

      // Group order for 3 attendees with distinct verified names
      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead Group User', 'leadgroup@example.com', '9876543210',
          'Org', 'Student', 3, 54000, 'upi://pay', 'pending', true,
          'Guest CoFounder 1\nGuest CoFounder 2'
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 54000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; attendee_count: number } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      expect(res.rows[0].csc_fulfill_confirmed_payment.attendee_count).toBe(3);

      // Verify exactly 3 passes created in event_registrations
      const passes = await db.query<{ attendee_name: string }>(
        `select attendee_name from public.event_registrations where source_email = 'leadgroup@example.com' order by created_at asc;`
      );
      expect(passes.rows.length).toBe(3);
      expect(passes.rows.map((p) => p.attendee_name)).toEqual([
        "Lead Group User",
        "Guest CoFounder 1",
        "Guest CoFounder 2",
      ]);
    });
  });

  describe("Guest Pass Email Outbox Delivery, Recipient Fallback & Resend", () => {
    it("ensureEventPassEmail delivers outbox notification for guest registration where user_id is null", async () => {
      let insertedRow: any = null;
      const passId = "33333333-4444-5555-6666-777777777777";

      const mockAdmin = {
        from: (table: string) => {
          if (table === "event_registrations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: passId,
                      user_id: null, // GUEST
                      reference: "CSC-EVT-GUESTPASS1",
                      status: "confirmed",
                      pass_token: "tok_guest_123",
                      source_email: "guest.buyer@example.com",
                      attendee_name: "Guest Buyer",
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "notifications") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: null, error: null }),
                      }),
                    }),
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
              insert: async (data: any) => {
                insertedRow = data;
                return { error: null };
              },
            };
          }
          return {} as any;
        },
      } as any;

      const result = await ensureEventPassEmail(mockAdmin, passId);
      expect(result.ok).toBe(true);
      expect(result.queued).toBe(true);
      expect(insertedRow).toBeDefined();
      expect(insertedRow.recipient).toBe("guest.buyer@example.com");
      expect(insertedRow.recipient_user_id).toBeNull();
      expect(insertedRow.payload.name).toBe("Guest Buyer");
    });

    it("ensureEventPassEmail resolves recipient from linked paid_event_registrations when source_email is empty", async () => {
      let insertedRow: any = null;
      let updatedReg: any = null;
      const passId = "44444444-5555-6666-7777-888888888888";
      const paidRegId = "55555555-6666-7777-8888-999999999999";

      const mockAdmin = {
        from: (table: string) => {
          if (table === "event_registrations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: passId,
                      user_id: null,
                      reference: "CSC-EVT-FALLBACK1",
                      status: "confirmed",
                      pass_token: "tok_fb_123",
                      source_email: null, // Empty on pass
                      attendee_name: null,
                      paid_registration_id: paidRegId,
                    },
                    error: null,
                  }),
                }),
              }),
              update: (patch: any) => ({
                eq: async () => {
                  updatedReg = patch;
                  return { error: null };
                },
              }),
            };
          }
          if (table === "paid_event_registrations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      email: "paid.fallback@example.com",
                      full_name: "Paid Fallback User",
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "notifications") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
              insert: async (data: any) => {
                insertedRow = data;
                return { error: null };
              },
            };
          }
          return {} as any;
        },
      } as any;

      const result = await ensureEventPassEmail(mockAdmin, passId);
      expect(result.ok).toBe(true);
      expect(result.queued).toBe(true);
      expect(insertedRow.recipient).toBe("paid.fallback@example.com");
      expect(insertedRow.payload.name).toBe("Paid Fallback User");
      // Self-healing verified: source_email was updated on event_registrations
      expect(updatedReg.source_email).toBe("paid.fallback@example.com");
    });

    it("ensureEventPassEmail repairs INVALID_RECIPIENT outbox entries without duplicate inserts", async () => {
      let updatedNotification: any = null;
      let insertedCount = 0;
      const passId = "66666666-7777-8888-9999-000000000000";

      const mockAdmin = {
        from: (table: string) => {
          if (table === "event_registrations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: passId,
                      user_id: null,
                      reference: "CSC-EVT-REPAIR1",
                      status: "confirmed",
                      pass_token: "tok_repair_123",
                      source_email: "repair.user@example.com",
                      attendee_name: "Repair User",
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "notifications") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: "notif-invalid-1",
                        status: "failed_permanent",
                        last_error: "INVALID_RECIPIENT",
                        recipient: null,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: (patch: any) => ({
                eq: async () => {
                  updatedNotification = patch;
                  return { error: null };
                },
              }),
              insert: async () => {
                insertedCount++;
                return { error: null };
              },
            };
          }
          return {} as any;
        },
      } as any;

      const result = await ensureEventPassEmail(mockAdmin, passId);
      expect(result.ok).toBe(true);
      expect(result.queued).toBe(true);
      expect(insertedCount).toBe(0);
      expect(updatedNotification).toBeDefined();
      expect(updatedNotification.status).toBe("queued");
      expect(updatedNotification.recipient).toBe("repair.user@example.com");
      expect(updatedNotification.last_error).toBeNull();
    });

    it("ensureEventPassEmail resolves recipient and attendee name from linked event_payment_orders (Tier 3) when source_email and paid_reg are missing", async () => {
      let insertedRow: any = null;
      let updatedReg: any = null;
      const passId = "77777777-8888-9999-0000-111111111111";
      const paidRegId = "paid-reg-tier3-id";

      const mockAdmin = {
        from: (table: string) => {
          if (table === "event_registrations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: passId,
                      user_id: null,
                      reference: "CSC-EVT-FALLBACK-T3",
                      status: "confirmed",
                      pass_token: "tok_fb_tier3",
                      source_email: null,
                      attendee_name: null,
                      paid_registration_id: paidRegId,
                    },
                    error: null,
                  }),
                }),
              }),
              update: (patch: any) => ({
                eq: async () => {
                  updatedReg = patch;
                  return { error: null };
                },
              }),
            };
          }
          if (table === "paid_event_registrations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            };
          }
          if (table === "event_payment_orders") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: {
                          email: "order.fallback@example.com",
                          full_name: "Order Fallback User",
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "notifications") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
              insert: async (data: any) => {
                insertedRow = data;
                return { error: null };
              },
            };
          }
          return {} as any;
        },
      } as any;

      const result = await ensureEventPassEmail(mockAdmin, passId);
      expect(result.ok).toBe(true);
      expect(result.queued).toBe(true);
      expect(insertedRow.recipient).toBe("order.fallback@example.com");
      expect(insertedRow.payload.name).toBe("Order Fallback User");
      expect(updatedReg.source_email).toBe("order.fallback@example.com");
      expect(updatedReg.attendee_name).toBe("Order Fallback User");
    });

    it("ensureEventPassEmail resolves recipient from profiles (Tier 4) for member when source_email is empty", async () => {
      let insertedRow: any = null;
      let updatedReg: any = null;
      const passId = "88888888-9999-0000-1111-222222222222";
      const memberUserId = "user-member-tier4-id";

      const mockAdmin = {
        from: (table: string) => {
          if (table === "event_registrations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: passId,
                      user_id: memberUserId,
                      reference: "CSC-EVT-FALLBACK-T4",
                      status: "confirmed",
                      pass_token: "tok_fb_tier4",
                      source_email: null,
                      attendee_name: null,
                      paid_registration_id: null,
                      event_id: null,
                    },
                    error: null,
                  }),
                }),
              }),
              update: (patch: any) => ({
                eq: async () => {
                  updatedReg = patch;
                  return { error: null };
                },
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      email: "member.profile@example.com",
                      full_name: "Member Profile Name",
                      display_name: "MemberDisplay",
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "notifications") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
              insert: async (data: any) => {
                insertedRow = data;
                return { error: null };
              },
            };
          }
          return {} as any;
        },
      } as any;

      const result = await ensureEventPassEmail(mockAdmin, passId);
      expect(result.ok).toBe(true);
      expect(result.queued).toBe(true);
      expect(insertedRow.recipient).toBe("member.profile@example.com");
      expect(insertedRow.recipient_user_id).toBe(memberUserId);
      expect(insertedRow.payload.name).toBe("Member Profile Name");
      expect(updatedReg.source_email).toBe("member.profile@example.com");
      expect(updatedReg.attendee_name).toBe("Member Profile Name");
    });

    it("ensureEventPassEmail resolves profile.email while preserving existing pass.attendee_name", async () => {
      let insertedRow: any = null;
      let updatedReg: any = null;
      const passId = "99999999-0000-1111-2222-333333333333";
      const memberUserId = "user-member-preservename-id";

      const mockAdmin = {
        from: (table: string) => {
          if (table === "event_registrations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: passId,
                      user_id: memberUserId,
                      reference: "CSC-EVT-PRESERVE",
                      status: "confirmed",
                      pass_token: "tok_preserve",
                      source_email: null,
                      attendee_name: "Original Pass Name",
                      paid_registration_id: null,
                      event_id: null,
                    },
                    error: null,
                  }),
                }),
              }),
              update: (patch: any) => ({
                eq: async () => {
                  updatedReg = patch;
                  return { error: null };
                },
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      email: "member.preservename@example.com",
                      full_name: "Overridden Profile Name",
                      display_name: "OverriddenDisplay",
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "notifications") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
              insert: async (data: any) => {
                insertedRow = data;
                return { error: null };
              },
            };
          }
          return {} as any;
        },
      } as any;

      const result = await ensureEventPassEmail(mockAdmin, passId);
      expect(result.ok).toBe(true);
      expect(result.queued).toBe(true);
      expect(insertedRow.recipient).toBe("member.preservename@example.com");
      expect(insertedRow.payload.name).toBe("Original Pass Name");
      expect(updatedReg.source_email).toBe("member.preservename@example.com");
      expect(updatedReg?.attendee_name).toBeUndefined();
    });

    it("ensureEventPassEmail skips order lookup safely when both paid_registration_id and event_id are null", async () => {
      let orderQueried = false;
      const passId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

      const mockAdmin = {
        from: (table: string) => {
          if (table === "event_registrations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: passId,
                      user_id: null,
                      reference: "CSC-EVT-NOIDS",
                      status: "confirmed",
                      pass_token: "tok_no_ids",
                      source_email: null,
                      attendee_name: null,
                      paid_registration_id: null,
                      event_id: null,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "event_payment_orders") {
            orderQueried = true;
            return { select: () => ({ eq: () => ({}) }) } as any;
          }
          return {} as any;
        },
      } as any;

      const result = await ensureEventPassEmail(mockAdmin, passId);
      expect(result.ok).toBe(false);
      expect(result.queued).toBe(false);
      expect(orderQueried).toBe(false);
    });

    it("SQL csc_resend_event_pass correctly resolves guest recipient and queues outbox row without null recipient", async () => {
      const { eventId } = await createTestEvent("resend-guest");
      const orderRef = "CSC-ORD-RESEND01";
      const utr = `UTR_RESEND_${Date.now()}`;

      // Fulfill order for a guest registration
      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Resend Guest User', 'resendguest@example.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      const fulfillRes = await db.query<{ csc_fulfill_confirmed_payment: { primary_pass_id: string } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      const passId = fulfillRes.rows[0].csc_fulfill_confirmed_payment.primary_pass_id;

      // Resend event pass via SQL RPC
      const resendRes = await db.query<{ csc_resend_event_pass: boolean }>(
        `select public.csc_resend_event_pass('${passId}');`
      );
      expect(resendRes.rows[0].csc_resend_event_pass).toBe(true);

      // Verify resend notification row has non-null recipient matching guest email
      const resendNotif = await db.query<{ recipient: string; recipient_user_id: string | null }>(
        `select recipient, recipient_user_id from public.notifications where related_record_id = '${passId}' and dedupe_key like '%resend:%';`
      );
      expect(resendNotif.rows.length).toBeGreaterThan(0);
      expect(resendNotif.rows[0].recipient).toBe("resendguest@example.com");
      expect(resendNotif.rows[0].recipient_user_id).toBeNull();
    });
  });
});
