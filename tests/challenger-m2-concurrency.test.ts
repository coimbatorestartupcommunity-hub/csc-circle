// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Milestone M2 Empirical Adversarial Stress Test Suite", () => {
  let db: PGlite;
  let testSeq = 1000;

  function getNextUuid() {
    testSeq++;
    const hex = testSeq.toString(16).padStart(12, "0");
    return `00000000-0000-4000-8000-${hex}`;
  }

  function getNextOrderRef(prefix = "REF") {
    testSeq++;
    const pad = testSeq.toString().padStart(8, "0");
    return `CSC-ORD-${prefix}${pad}`;
  }

  async function createTestEvent(slugPrefix = "m2-adv-evt", capacity: number | null = 100) {
    const eventId = getNextUuid();
    const slug = `${slugPrefix}-${Date.now()}-${testSeq++}`;
    await db.exec(`
      insert into public.events (
        id, slug, title, category, starts_at, ends_at, location,
        capacity, status, registration_state, admission, price_per_attendee
      ) values (
        '${eventId}', '${slug}', 'M2 Adversarial Stress Event', 'networking',
        now() + interval '1 day', now() + interval '2 days', 'Coimbatore',
        ${capacity === null ? "null" : capacity}, 'published', 'open', 'paid', 500.00
      );
    `);
    return { eventId, slug };
  }

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

    // Load migrations in chronological order
    const migrationFiles = readdirSync("supabase/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
      await db.exec(sql);
    }
  }, 45_000);

  afterAll(async () => {
    await db?.close();
  });

  // =========================================================================
  // Dimension 1: Concurrency Races
  // =========================================================================
  describe("Dimension 1: Concurrency Races", () => {
    it("1.1 Serializes 10 concurrent fulfillment attempts for the same single-attendee order: exactly ONE commits and 9 report already fulfilled", async () => {
      const { eventId } = await createTestEvent("race-single");
      const orderRef = getNextOrderRef("RACESNG");
      const utr = `UTR_RACE_SNG_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Single Race Buyer', 'race-sng@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Fire 10 simultaneous execution promises
      const concurrencyLevel = 10;
      const promises = Array.from({ length: concurrencyLevel }, () =>
        db.query<{
          csc_fulfill_confirmed_payment: {
            ok: boolean;
            already_fulfilled?: boolean;
            paid_registration_id: string;
            primary_pass_id: string;
            attendee_count: number;
          };
        }>(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      );

      const results = await Promise.all(promises);

      // Verify all 10 calls succeeded without throwing unhandled transaction conflicts
      expect(results).toHaveLength(10);
      for (const res of results) {
        expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      }

      // Exactly ONE must be the initial commit (already_fulfilled is falsy or undefined)
      const initialCommits = results.filter(
        (r) => !r.rows[0].csc_fulfill_confirmed_payment.already_fulfilled
      );
      expect(initialCommits).toHaveLength(1);

      // Exactly 9 must report already_fulfilled: true
      const idempotentReturns = results.filter(
        (r) => r.rows[0].csc_fulfill_confirmed_payment.already_fulfilled === true
      );
      expect(idempotentReturns).toHaveLength(concurrencyLevel - 1);

      // Check database state: exactly ONE paid_event_registrations record
      const paidRegs = await db.query<{ count: string; id: string }>(`
        select count(*)::text as count, max(id::text) as id
        from public.paid_event_registrations
        where email = 'race-sng@example.com';
      `);
      expect(paidRegs.rows[0].count).toBe("1");

      // Exactly ONE event_registrations pass
      const passes = await db.query<{ count: string }>(`
        select count(*)::text as count
        from public.event_registrations
        where paid_registration_id = '${paidRegs.rows[0].id}';
      `);
      expect(passes.rows[0].count).toBe("1");

      // Exactly ONE reconciliation mapping
      const recons = await db.query<{ count: string }>(`
        select count(*)::text as count
        from public.event_payment_reconciliation
        where order_id = '${orderId}';
      `);
      expect(recons.rows[0].count).toBe("1");

      // Exactly ONE audit log event
      const auditEvents = await db.query<{ count: string }>(`
        select count(*)::text as count
        from public.event_payment_events
        where order_id = '${orderId}' and event_type = 'payment_reconciled';
      `);
      expect(auditEvents.rows[0].count).toBe("1");

      // Exactly ONE transactional outbox email enqueued
      const outbox = await db.query<{ count: string }>(`
        select count(*)::text as count
        from public.notifications
        where recipient = 'race-sng@example.com' and template_key = 'EventConfirmed';
      `);
      expect(outbox.rows[0].count).toBe("1");
    });

    it("1.2 Serializes 10 concurrent fulfillment attempts for a group order: creates exactly attendee_count passes and 1 paid registration", async () => {
      const { eventId } = await createTestEvent("race-group");
      const orderRef = getNextOrderRef("RACEGRP");
      const utr = `UTR_RACE_GRP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, additional_attendee_names, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Primary Group Leader', 'race-grp@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 3, 'Attendee Two\nAttendee Three', 150000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 150000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      const concurrencyLevel = 10;
      const promises = Array.from({ length: concurrencyLevel }, () =>
        db.query<{
          csc_fulfill_confirmed_payment: {
            ok: boolean;
            already_fulfilled?: boolean;
            paid_registration_id: string;
            attendee_count: number;
          };
        }>(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      const initialCommits = results.filter(
        (r) => !r.rows[0].csc_fulfill_confirmed_payment.already_fulfilled
      );
      expect(initialCommits).toHaveLength(1);

      const idempotentReturns = results.filter(
        (r) => r.rows[0].csc_fulfill_confirmed_payment.already_fulfilled === true
      );
      expect(idempotentReturns).toHaveLength(9);

      // Verify DB counts: exactly 1 paid registration, exactly 3 passes
      const paidRegs = await db.query<{ count: string; id: string }>(`
        select count(*)::text as count, max(id::text) as id
        from public.paid_event_registrations
        where email = 'race-grp@example.com';
      `);
      expect(paidRegs.rows[0].count).toBe("1");

      const passes = await db.query<{ count: string; attendee_names: string }>(`
        select count(*)::text as count, string_agg(attendee_name, ', ' order by created_at) as attendee_names
        from public.event_registrations
        where paid_registration_id = '${paidRegs.rows[0].id}';
      `);
      expect(passes.rows[0].count).toBe("3");
      expect(passes.rows[0].attendee_names).toContain("Primary Group Leader");
      expect(passes.rows[0].attendee_names).toContain("Attendee Two");
      expect(passes.rows[0].attendee_names).toContain("Attendee Three");
    });
  });

  // =========================================================================
  // Dimension 2: Double-Spend Exploitation
  // =========================================================================
  describe("Dimension 2: Double-Spend Exploitation", () => {
    it("2.1 Sequential Double-Spend: Order A fulfills; Order B targeting the same 500 evidence is strictly rejected", async () => {
      const { eventId } = await createTestEvent("dbl-seq");
      const orderRefA = getNextOrderRef("DBLA");
      const orderRefB = getNextOrderRef("DBLB");
      const utr = `UTR_DBL_SEQ_${Date.now()}`;

      const orderA = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRefA}', '${eventId}', 'Buyer A', 'buyera-seq@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const orderB = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRefB}', '${eventId}', 'Buyer B', 'buyerb-seq@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Evidence mentions both references in memo (adversary crafting multi-ref memo or shared UTR)
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRefA} ${orderRefB}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Fulfill Order A
      const resA = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderA}', '${evId}', 'automated_worker');`
      );
      expect(resA.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);

      // Attempt to fulfill Order B using same evidence -> strictly throws double-spend error
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderB}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/already matched to another order/i);

      // Check evidence is matched solely to Order A
      const evState = (await db.query<{ matched_order_id: string; reconciliation_state: string }>(
        `select matched_order_id, reconciliation_state from public.event_payment_evidence where id = '${evId}';`
      )).rows[0];
      expect(evState.matched_order_id).toBe(orderA);
      expect(evState.reconciliation_state).toBe("matched");

      // Check Order B remains pending and has no registrations
      const orderBState = (await db.query<{ status: string; paid_registration_id: string | null }>(
        `select status, paid_registration_id from public.event_payment_orders where id = '${orderB}';`
      )).rows[0];
      expect(orderBState.status).toBe("pending");
      expect(orderBState.paid_registration_id).toBeNull();

      const orderBPasses = (await db.query<{ count: string }>(
        `select count(*)::text as count from public.event_registrations where source_email = 'buyerb-seq@example.com';`
      )).rows[0].count;
      expect(orderBPasses).toBe("0");
    });

    it("2.2 Concurrent Double-Spend Race: Order A and Order B race for the same 500 evidence -> exactly ONE wins, the other is strictly rejected", async () => {
      const { eventId } = await createTestEvent("dbl-race");
      const orderRefA = getNextOrderRef("RACEDA");
      const orderRefB = getNextOrderRef("RACEDB");
      const utr = `UTR_DBL_RACE_${Date.now()}`;

      const orderA = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRefA}', '${eventId}', 'Race Buyer A', 'buyera-race@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const orderB = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRefB}', '${eventId}', 'Race Buyer B', 'buyerb-race@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRefA} ${orderRefB}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Run both fulfillment promises simultaneously
      const results = await Promise.allSettled([
        db.query(`select public.csc_fulfill_confirmed_payment('${orderA}', '${evId}', 'automated_worker');`),
        db.query(`select public.csc_fulfill_confirmed_payment('${orderB}', '${evId}', 'automated_worker');`),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectionReason.message).toMatch(/already matched to another order/i);

      // Verify the evidence matched_order_id matches the one that succeeded
      const evState = (await db.query<{ matched_order_id: string }>(
        `select matched_order_id from public.event_payment_evidence where id = '${evId}';`
      )).rows[0];

      // Exactly 1 order is reconciled, 1 order is pending
      const orderAStatus = (await db.query<{ status: string }>(`select status from public.event_payment_orders where id = '${orderA}';`)).rows[0].status;
      const orderBStatus = (await db.query<{ status: string }>(`select status from public.event_payment_orders where id = '${orderB}';`)).rows[0].status;

      if (orderAStatus === "reconciled") {
        expect(orderBStatus).toBe("pending");
        expect(evState.matched_order_id).toBe(orderA);
      } else {
        expect(orderAStatus).toBe("pending");
        expect(orderBStatus).toBe("reconciled");
        expect(evState.matched_order_id).toBe(orderB);
      }
    });
  });

  // =========================================================================
  // Dimension 3: Unauthenticated / Tampered Evidence
  // =========================================================================
  describe("Dimension 3: Unauthenticated / Tampered Evidence", () => {
    it("3.1 Rejects settlement immediately when evidence has auth_status = 'needs_review'", async () => {
      const { eventId } = await createTestEvent("unauth-review");
      const orderRef = getNextOrderRef("REVIEW");
      const utr = `UTR_REV_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Needs Review Buyer', 'rev@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Ingest evidence with default needs_review status
      const evId = (await db.query<{ id: string; auth_status: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert'
        ) returning id, auth_status;
      `)).rows[0];
      expect(evId.auth_status).toBe("needs_review");

      // automated_worker must reject
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId.id}', 'automated_worker');`)
      ).rejects.toThrow(/failed authentication/i);

      // user_utr_claim must reject
      await db.exec(`update public.event_payment_orders set claimed_utr = '${utr}', status = 'processing' where id = '${orderId}';`);
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId.id}', 'user_utr_claim');`)
      ).rejects.toThrow(/requires authenticated evidence/i);
    });

    it("3.2 Rejects settlement immediately when evidence has auth_status = 'untrusted' or 'forged'", async () => {
      const { eventId } = await createTestEvent("unauth-forged");
      const orderRef = getNextOrderRef("FORGED");
      const utrUntrusted = `UTR_UNTRUSTED_${Date.now()}`;
      const utrForged = `UTR_FORGED_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Forged Test Buyer', 'forged@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evUntrusted = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utrUntrusted}', now(), 'UPI/P2A/${utrUntrusted}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utrUntrusted}@axis.bank.in>', 'Credit Alert', 'untrusted'
        ) returning id;
      `)).rows[0].id;

      const evForged = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utrForged}', now(), 'UPI/P2A/${utrForged}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utrForged}@axis.bank.in>', 'Credit Alert', 'forged'
        ) returning id;
      `)).rows[0].id;

      // Both must reject with untrusted/forged status
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evUntrusted}', 'automated_worker');`)
      ).rejects.toThrow(/failed authentication with untrusted status/i);

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evForged}', 'automated_worker');`)
      ).rejects.toThrow(/failed authentication with untrusted status/i);

      // Even admin_manual must be blocked from fulfilling 'untrusted' or 'forged' evidence
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evForged}', 'admin_manual', 'Admin override attempt');`)
      ).rejects.toThrow(/failed authentication with untrusted status/i);
    });

    it("3.3 Enforces database check constraint rejecting invalid auth_status values like 'failed' or arbitrary strings", async () => {
      const utr = `UTR_BADSTATUS_${Date.now()}`;
      await expect(
        db.query(`
          insert into public.event_payment_evidence(
            bank, direction, currency, amount_paise, receiving_account_suffix,
            utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
            auth_status
          ) values (
            'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
            '${utr}', now(), 'UPI/P2A/123/MEMO', 'alerts@axis.bank.in',
            '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'failed'
          );
        `)
      ).rejects.toThrow(/event_payment_evidence_auth_status_check/i);
    });

    it("3.4 Rejects financial tampering: direction != CREDIT, amount mismatch, receiving account suffix mismatch", async () => {
      const { eventId } = await createTestEvent("fin-tamper");
      const orderRef = getNextOrderRef("TAMPER");

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, expected_account_suffix, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Tamper Target', 'tamper@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, '1995', 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Evidence A: DEBIT direction
      const evDebit = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'DEBIT', 'INR', 50000, '1995',
          'UTR_DEBIT_${Date.now()}', now(), 'UPI/P2A/${orderRef}', 'alerts@axis.bank.in',
          '<msg-deb@axis.bank.in>', 'Debit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evDebit}', 'automated_worker');`)
      ).rejects.toThrow(/direction is not CREDIT/i);

      // Evidence B: Amount underpayment (49999 vs 50000)
      const evUnder = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 49999, '1995',
          'UTR_UNDER_${Date.now()}', now(), 'UPI/P2A/${orderRef}', 'alerts@axis.bank.in',
          '<msg-und@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evUnder}', 'automated_worker');`)
      ).rejects.toThrow(/amount .* does not match order amount/i);

      // Evidence C: Account suffix spoofing ('9999' vs expected '1995')
      const evSuffix = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '9999',
          'UTR_SFX_${Date.now()}', now(), 'UPI/P2A/${orderRef}', 'alerts@axis.bank.in',
          '<msg-sfx@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evSuffix}', 'automated_worker');`)
      ).rejects.toThrow(/account suffix 9999 does not match expected suffix 1995/i);
    });
  });

  // =========================================================================
  // Dimension 4: Word-Boundary & Substring Injection
  // =========================================================================
  describe("Dimension 4: Word-Boundary & Substring Injection", () => {
    it("4.1 Rejects alphanumeric non-word-boundary prefixes (e.g. NONCSC-ORD-...) and suffixes (e.g. ...EXTRA)", async () => {
      const { eventId } = await createTestEvent("wb-prefix");
      const orderRef = getNextOrderRef("WBALPH");
      const utrPrefix = `UTR_WBALPH_PRE_${Date.now()}`;
      const utrSuffix = `UTR_WBALPH_SUF_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Regex Test User', 'wb@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Note has alphanumeric character directly adjacent to CSC: NONCSC-ORD-...
      const evPrefix = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utrPrefix}', now(), 'UPI/P2A/${utrPrefix}/USER/IOBA/UPI/NON${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utrPrefix}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evPrefix}', 'automated_worker');`)
      ).rejects.toThrow(/requires verifiable order reference/i);

      // Note has alphanumeric character directly adjacent to end: ...EXTRA
      const evSuffix = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utrSuffix}', now(), 'UPI/P2A/${utrSuffix}/USER/IOBA/UPI/${orderRef}EXTRA', 'alerts@axis.bank.in',
          '<msg-${utrSuffix}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evSuffix}', 'automated_worker');`)
      ).rejects.toThrow(/requires verifiable order reference/i);
    });

    it("4.2 Empirical Evaluation of Hyphen-Boundary Substring Injection: FAKE-CSC-ORD-...-EXTRA", async () => {
      // NOTE: In POSIX ERE, '\\y' matches the boundary between a word character [A-Za-z0-9_] and non-word character.
      // Because '-' (hyphen) is a non-word character, '\\y' considers '-' as a boundary!
      // This test empirically evaluates whether 'FAKE-CSC-ORD-...-EXTRA' matches or gets rejected.
      const { eventId } = await createTestEvent("wb-hyphen");
      const orderRef = getNextOrderRef("HYPHEN");
      const utr = `UTR_HYPHEN_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Hyphen Boundary User', 'hyphen@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const bankMemo = `UPI/P2A/${utr}/USER/IOBA/UPI/FAKE-${orderRef}-EXTRA`;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), '${bankMemo}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Directly evaluate the PostgreSQL regex behavior on this exact input:
      const regexMatchResult = await db.query<{ matches: boolean }>(`
        select ('${bankMemo}' ~* ('\\y' || '${orderRef}' || '\\y')) as matches;
      `);

      // Empirical finding: In PostgreSQL, '\\y' does NOT treat '-' as a word constituent!
      // Therefore, 'FAKE-CSC...' HAS a word boundary between '-' and 'C', and '...-EXTRA' has a word boundary between the last digit and '-'.
      expect(regexMatchResult.rows[0].matches).toBe(true);

      // Now attempt the fulfillment call:
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Automated worker settlement requires verifiable order reference/);
    });

    it("4.3 Exact Word Boundary with standard delimiters (slashes, spaces, punctuation) succeeds cleanly", async () => {
      const { eventId } = await createTestEvent("wb-exact");
      const orderRef = getNextOrderRef("EXACT");
      const utr = `UTR_EXACT_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Exact Delim User', 'exact@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Realistic UPI memo separated by slashes
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}/REGISTRATION', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(`
        select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');
      `);
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
    });
  });

  // =========================================================================
  // Dimension 5: UTR Claim Without Attribution
  // =========================================================================
  describe("Dimension 5: UTR Claim Without Attribution", () => {
    it("5.1 Rejects user_utr_claim when bank memo does NOT mention the order reference and NO admin authorization exists", async () => {
      const { eventId } = await createTestEvent("utr-noattr");
      const orderRef = getNextOrderRef("NOATTR");
      const utr = `UTR_NOATTR_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, claimed_utr, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'No Attr User', 'noattr@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'processing', '${utr}', true
        ) returning id;
      `)).rows[0].id;

      // Authenticated evidence with opaque bank memo
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/ANONYMOUS/IOBA/UPI', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'user_utr_claim');`)
      ).rejects.toThrow(/Settlement requires an eligible, unconsumed verified attribution|User UTR claim settlement requires/);
    });

    it("5.2 Rejects user_utr_claim when order claimed_utr does not match evidence UTR", async () => {
      const { eventId } = await createTestEvent("utr-mismatch");
      const orderRef = getNextOrderRef("MISMATCH");
      const utrClaimed = `UTR_CLAIMED_${Date.now()}`;
      const utrEvidence = `UTR_EVIDENCE_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, claimed_utr, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Mismatch User', 'mismatch@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'processing', '${utrClaimed}', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utrEvidence}', now(), 'UPI/P2A/${utrEvidence}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utrEvidence}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'user_utr_claim');`)
      ).rejects.toThrow(/User UTR claim settlement requires verified matching claimed UTR/i);
    });

    it("5.3 Accepts user_utr_claim with opaque bank memo when an explicit admin attribution event is logged", async () => {
      const { eventId } = await createTestEvent("utr-admin-auth");
      const orderRef = getNextOrderRef("ADMINAUTH");
      const utr = `UTR_ADMINAUTH_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, claimed_utr, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Admin Auth User', 'adminauth@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'processing', '${utr}', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/OPAQUE_NOTE/IOBA/UPI', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Add authorized attribution event in event_payment_events and event_payment_attributions
      await db.exec(`
        insert into public.event_payment_events(order_id, event_type, details)
        values ('${orderId}', 'admin_attribution_authorized', '{"approved_by":"superadmin","reason":"Manual bank verification completed"}'::jsonb);
        insert into public.event_payment_attributions(order_id, evidence_id, attribution_method, verification_source, policy_version, eligible_for_settlement)
        values ('${orderId}', '${evId}', 'admin_bank_record_review', 'm2-concurrency-harness', 'v1.0', true);
      `);

      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(`
        select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'user_utr_claim');
      `);
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);

      const orderStatus = (await db.query<{ status: string }>(`select status from public.event_payment_orders where id = '${orderId}';`)).rows[0].status;
      expect(orderStatus).toBe("reconciled");
    });
  });

  // =========================================================================
  // Dimension 6: Atomic Rollback and Invariant Enforcement
  // =========================================================================
  describe("Dimension 6: Atomic Rollback and Invariant Enforcement", () => {
    it("6.1 Group attendee count mismatch rolls back the entire transaction atomically (no partial passes, no orphan registrations)", async () => {
      const { eventId } = await createTestEvent("atomic-rollback");
      const orderRef = getNextOrderRef("ATOMIC");
      const utr = `UTR_ATOMIC_${Date.now()}`;

      // Order demands 3 attendees, but 0 additional names provided
      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Primary Alone', 'atomic@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 3, 150000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 150000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Fulfillment must fail with invariant violation
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 3 attendees but only 1 verified names were provided/i);

      // Verify ZERO state changes committed (atomic rollback verification)
      const orderState = (await db.query<{ status: string; matched_evidence_id: string | null; paid_registration_id: string | null }>(
        `select status, matched_evidence_id, paid_registration_id from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(orderState.status).toBe("pending");
      expect(orderState.matched_evidence_id).toBeNull();
      expect(orderState.paid_registration_id).toBeNull();

      const evState = (await db.query<{ reconciliation_state: string; matched_order_id: string | null }>(
        `select reconciliation_state, matched_order_id from public.event_payment_evidence where id = '${evId}';`
      )).rows[0];
      expect(evState.reconciliation_state).toBe("unmatched");
      expect(evState.matched_order_id).toBeNull();

      const paidRegsCount = (await db.query<{ count: string }>(
        `select count(*)::text as count from public.paid_event_registrations where email = 'atomic@example.com';`
      )).rows[0].count;
      expect(paidRegsCount).toBe("0");

      const passesCount = (await db.query<{ count: string }>(
        `select count(*)::text as count from public.event_registrations where source_email = 'atomic@example.com';`
      )).rows[0].count;
      expect(passesCount).toBe("0");

      const outboxCount = (await db.query<{ count: string }>(
        `select count(*)::text as count from public.notifications where recipient = 'atomic@example.com';`
      )).rows[0].count;
      expect(outboxCount).toBe("0");
    });

    it("6.2 Rejects fulfillment when terms consent is missing (false or null)", async () => {
      const { eventId } = await createTestEvent("terms-consent");
      const orderRef = getNextOrderRef("NOCONSENT");
      const utr = `UTR_NOCONSENT_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'No Consent User', 'noconsent@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', false
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/lacks required affirmative payment terms consent/i);
    });

    it("6.3 Rejects fulfillment when event capacity is exceeded", async () => {
      // Event with capacity = 1
      const { eventId } = await createTestEvent("capacity-full", 1);
      const orderRef1 = getNextOrderRef("CAP1");
      const orderRef2 = getNextOrderRef("CAP2");
      const utr1 = `UTR_CAP1_${Date.now()}`;
      const utr2 = `UTR_CAP2_${Date.now()}`;

      // Fulfill 1 seat
      const order1 = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef1}', '${eventId}', 'First Cap User', 'cap1@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const ev1 = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr1}', now(), 'UPI/P2A/${utr1}/USER/IOBA/UPI/${orderRef1}', 'alerts@axis.bank.in',
          '<msg-${utr1}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await db.query(`select public.csc_fulfill_confirmed_payment('${order1}', '${ev1}', 'automated_worker');`);

      // Try to fulfill second order for the same capped event
      const order2 = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef2}', '${eventId}', 'Second Cap User', 'cap2@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const ev2 = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr2}', now(), 'UPI/P2A/${utr2}/USER/IOBA/UPI/${orderRef2}', 'alerts@axis.bank.in',
          '<msg-${utr2}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${order2}', '${ev2}', 'automated_worker');`)
      ).rejects.toThrow(/capacity exceeded/i);
    });
  });
});
