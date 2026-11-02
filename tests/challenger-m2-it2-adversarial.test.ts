// @vitest-environment node
/**
 * ==============================================================================
 * Challenger M2 Iteration 2: Empirical Adversarial Verification Suite
 * ==============================================================================
 * 
 * Verifies the 4 critical scope areas mandated for Milestone M2 Iteration 2:
 * 1. Double-Spend & Concurrency Race under PostgreSQL row-level locks
 * 2. Replay Idempotency without duplicate passes or outbox entries
 * 3. Substring Collision in Memo (word-boundary regex enforcement)
 * 4. Direct Automated Settlement without pre-inserted event_payment_attributions
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

describe("Milestone M2 Iteration 2: Empirical Adversarial Verification", () => {
  let db: PGlite;
  let testSeq = 5000;

  function getNextUuid() {
    testSeq++;
    const hex = testSeq.toString(16).padStart(12, "0");
    return `00000000-0000-4000-8000-${hex}`;
  }

  function getNextOrderRef(suffix = "") {
    testSeq++;
    const pad = testSeq.toString().padStart(6, "0");
    return `CSC-ORD-${suffix ? suffix : "REF"}${pad}`;
  }

  async function createEvent(pricePaise = 50000, capacity: number | null = 100) {
    const eventId = getNextUuid();
    const slug = `m2it2-evt-${Date.now()}-${testSeq++}`;
    await db.exec(`
      insert into public.events (
        id, slug, title, category, starts_at, ends_at, location,
        capacity, status, registration_state, admission, price_per_attendee
      ) values (
        '${eventId}', '${slug}', 'M2 It2 Adversarial Event', 'networking',
        now() + interval '1 day', now() + interval '2 days', 'Coimbatore',
        ${capacity === null ? "null" : capacity}, 'published', 'open', 'paid', ${pricePaise / 100}
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

    const migrationFiles = readdirSync("supabase/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
      await db.exec(sql);
    }
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  // ===========================================================================
  // 1. Double-Spend & Concurrency Race
  // ===========================================================================
  describe("1. Double-Spend & Concurrency Race", () => {
    it("1.1 Two concurrent orders racing for the exact same authenticated credit alert: exactly one commits and the second fails with 'is already matched to another order'", async () => {
      const { eventId } = await createEvent(50000);
      const refA = getNextOrderRef("RACEA");
      const refB = getNextOrderRef("RACEB");
      const utr = `UTR_RACE_2WAY_${Date.now()}`;

      const orderA = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${refA}', '${eventId}', 'Buyer Alpha', 'alpha@race.com', '9876543210',
          'Alpha Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const orderB = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${refB}', '${eventId}', 'Buyer Beta', 'beta@race.com', '9876543210',
          'Beta Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Single payment evidence of INR 500.00 mentioning BOTH order references
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/AXIS/UPI/${refA}/${refB}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Both orders race simultaneously against the same evidence
      const results = await Promise.allSettled([
        db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; order_id: string } }>(
          `select public.csc_fulfill_confirmed_payment('${orderA}', '${evId}', 'automated_worker');`
        ),
        db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; order_id: string } }>(
          `select public.csc_fulfill_confirmed_payment('${orderB}', '${evId}', 'automated_worker');`
        ),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{
        rows: { csc_fulfill_confirmed_payment: { ok: boolean; order_id: string } }[];
      }>[];
      const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

      // Exactly ONE must commit
      expect(fulfilled).toHaveLength(1);
      expect(fulfilled[0].value.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      const winnerOrderId = fulfilled[0].value.rows[0].csc_fulfill_confirmed_payment.order_id;

      // Exactly ONE must fail with the row-level lock double-spend error
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason.message).toMatch(
        new RegExp(`Evidence ${evId} is already matched to another order: ${winnerOrderId}`)
      );

      // Verify DB state integrity
      const winningOrder = (await db.query<{ status: string; matched_evidence_id: string }>(
        `select status, matched_evidence_id from public.event_payment_orders where id = '${winnerOrderId}';`
      )).rows[0];
      expect(winningOrder.status).toBe("reconciled");
      expect(winningOrder.matched_evidence_id).toBe(evId);

      const loserOrderId = winnerOrderId === orderA ? orderB : orderA;
      const losingOrder = (await db.query<{ status: string; matched_evidence_id: string | null }>(
        `select status, matched_evidence_id from public.event_payment_orders where id = '${loserOrderId}';`
      )).rows[0];
      expect(losingOrder.status).toBe("pending");
      expect(losingOrder.matched_evidence_id).toBeNull();

      // Exactly ONE pass and ONE paid registration across the entire database for this race
      const paidRegs = await db.query<{ count: string; email: string }>(`
        select count(*)::text as count, max(email) as email
        from public.paid_event_registrations
        where upi_transaction_ref = '${utr}';
      `);
      expect(paidRegs.rows[0].count).toBe("1");
      expect(paidRegs.rows[0].email).toBe(winnerOrderId === orderA ? "alpha@race.com" : "beta@race.com");

      const passes = await db.query<{ count: string }>(`
        select count(*)::text as count
        from public.event_registrations
        where source_email in ('alpha@race.com', 'beta@race.com');
      `);
      expect(passes.rows[0].count).toBe("1");

      const outbox = await db.query<{ count: string }>(`
        select count(*)::text as count
        from public.notifications
        where recipient in ('alpha@race.com', 'beta@race.com') and template_key = 'EventConfirmed';
      `);
      expect(parseInt(outbox.rows[0].count)).toBeGreaterThanOrEqual(1);
    });

    it("1.2 Five concurrent orders racing for the same credit alert: exactly 1 commits, 4 fail with 'is already matched to another order'", async () => {
      const { eventId } = await createEvent(50000);
      const utr = `UTR_RACE_5WAY_${Date.now()}`;
      const orderRefs: string[] = [];
      const orderIds: string[] = [];

      for (let i = 0; i < 5; i++) {
        const ref = getNextOrderRef(`5W${i}`);
        orderRefs.push(ref);
        const oId = (await db.query<{ id: string }>(`
          insert into public.event_payment_orders (
            order_reference, event_id, full_name, email, whatsapp, organization, role,
            attendee_count, amount_paise, upi_uri, status, consent_payment_terms
          ) values (
            '${ref}', '${eventId}', 'Buyer ${i}', 'buyer${i}@race5.com', '9876543210',
            'Org ${i}', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
          ) returning id;
        `)).rows[0].id;
        orderIds.push(oId);
      }

      // Memo mentions all 5 references
      const rawMemo = `UPI/P2A/${utr}/USER/AXIS/UPI/${orderRefs.join("/")}`;
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), '${rawMemo}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      const promises = orderIds.map((oId) =>
        db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; order_id: string } }>(
          `select public.csc_fulfill_confirmed_payment('${oId}', '${evId}', 'automated_worker');`
        )
      );

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{
        rows: { csc_fulfill_confirmed_payment: { ok: boolean; order_id: string } }[];
      }>[];
      const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(4);

      const winnerId = fulfilled[0].value.rows[0].csc_fulfill_confirmed_payment.order_id;
      for (const rej of rejected) {
        expect(rej.reason.message).toMatch(
          new RegExp(`Evidence ${evId} is already matched to another order: ${winnerId}`)
        );
      }

      // Total passes in database for this entire batch must be strictly 1
      const totalPasses = await db.query<{ count: string }>(`
        select count(*)::text as count
        from public.event_registrations
        where source_email like '%@race5.com';
      `);
      expect(totalPasses.rows[0].count).toBe("1");
    });

    it("1.3 Sequential double-spend: Order A fulfills; subsequent Order B targeting the same evidence is immediately rejected", async () => {
      const { eventId } = await createEvent(50000);
      const refA = getNextOrderRef("SEQA");
      const refB = getNextOrderRef("SEQB");
      const utr = `UTR_SEQ_DBL_${Date.now()}`;

      const orderA = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${refA}', '${eventId}', 'Buyer SeqA', 'seqa@test.com', '9876543210',
          'SeqA Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const orderB = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${refB}', '${eventId}', 'Buyer SeqB', 'seqb@test.com', '9876543210',
          'SeqB Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/AXIS/UPI/${refA} ${refB}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // First fulfillment commits cleanly
      const resA = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderA}', '${evId}', 'automated_worker');`
      );
      expect(resA.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);

      // Second fulfillment fails under lock
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderB}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(`Evidence ${evId} is already matched to another order: ${orderA}`);

      // Order B remains pending
      const orderBRow = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderB}';`
      )).rows[0];
      expect(orderBRow.status).toBe("pending");
    });
  });

  // ===========================================================================
  // 2. Replay Idempotency
  // ===========================================================================
  describe("2. Replay Idempotency", () => {
    it("2.1 Replaying fulfillment against an already reconciled single-attendee order returns { ok: true, already_fulfilled: true } without duplicate passes or outbox entries", async () => {
      const { eventId } = await createEvent(50000);
      const ref = getNextOrderRef("REPLAY1");
      const utr = `UTR_REPLAY1_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${ref}', '${eventId}', 'Replay Solo', 'replaysolo@test.com', '9876543210',
          'Solo Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/AXIS/UPI/${ref}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // 1. Initial fulfillment
      const initial = (await db.query<{
        csc_fulfill_confirmed_payment: {
          ok: boolean;
          already_fulfilled?: boolean;
          paid_registration_id: string;
          primary_pass_id: string;
          attendee_count: number;
        };
      }>(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)).rows[0].csc_fulfill_confirmed_payment;

      expect(initial.ok).toBe(true);
      expect(initial.already_fulfilled).toBeFalsy();
      expect(initial.attendee_count).toBe(1);

      // Baseline counts helper
      const getCounts = async () => {
        const passes = (await db.query<{ count: string }>(
          `select count(*)::text as count from public.event_registrations where source_email = 'replaysolo@test.com';`
        )).rows[0].count;
        const paidRegs = (await db.query<{ count: string }>(
          `select count(*)::text as count from public.paid_event_registrations where email = 'replaysolo@test.com';`
        )).rows[0].count;
        const outbox = (await db.query<{ count: string }>(
          `select count(*)::text as count from public.notifications where recipient = 'replaysolo@test.com' and template_key = 'EventConfirmed';`
        )).rows[0].count;
        const recons = (await db.query<{ count: string }>(
          `select count(*)::text as count from public.event_payment_reconciliation where order_id = '${orderId}';`
        )).rows[0].count;
        return { passes, paidRegs, outbox, recons };
      };

      const baseline = await getCounts();
      expect(baseline.passes).toBe("1");
      expect(baseline.paidRegs).toBe("1");
      expect(baseline.recons).toBe("1");
      expect(parseInt(baseline.outbox)).toBeGreaterThanOrEqual(1);

      // 2. Sequential replay
      const replay1 = (await db.query<{
        csc_fulfill_confirmed_payment: {
          ok: boolean;
          already_fulfilled: boolean;
          order_id: string;
          paid_registration_id: string;
          primary_pass_id: string;
          attendee_count: number;
        };
      }>(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)).rows[0].csc_fulfill_confirmed_payment;

      expect(replay1.ok).toBe(true);
      expect(replay1.already_fulfilled).toBe(true);
      expect(replay1.order_id).toBe(orderId);
      expect(replay1.paid_registration_id).toBe(initial.paid_registration_id);
      expect(replay1.primary_pass_id).toBe(initial.primary_pass_id);
      expect(replay1.attendee_count).toBe(1);

      // 3. Concurrent burst of 10 replays
      const burst = await Promise.all(
        Array.from({ length: 10 }, () =>
          db.query<{
            csc_fulfill_confirmed_payment: {
              ok: boolean;
              already_fulfilled: boolean;
            };
          }>(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
        )
      );

      for (const res of burst) {
        expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
        expect(res.rows[0].csc_fulfill_confirmed_payment.already_fulfilled).toBe(true);
      }

      // EMPIRICAL ASSERTION: Counts must remain strictly unchanged after 11 replays
      const afterCounts = await getCounts();
      expect(afterCounts).toEqual(baseline);
    });

    it("2.2 Replaying fulfillment against an already reconciled group order (3 attendees) returns already_fulfilled without duplicate passes or notifications", async () => {
      const { eventId } = await createEvent(150000);
      const ref = getNextOrderRef("REPLAYGRP");
      const utr = `UTR_REPLAYGRP_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, additional_attendee_names, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${ref}', '${eventId}', 'Group Leader', 'groupleader@test.com', '9876543210',
          'Group Corp', 'Startup Founder / Co-Founder', 3, 'Member Two\nMember Three', 150000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 150000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/AXIS/UPI/${ref}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Initial fulfillment
      const initial = (await db.query<{
        csc_fulfill_confirmed_payment: {
          ok: boolean;
          already_fulfilled?: boolean;
          attendee_count: number;
        };
      }>(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)).rows[0].csc_fulfill_confirmed_payment;
      expect(initial.ok).toBe(true);
      expect(initial.attendee_count).toBe(3);

      // Verify exactly 3 passes
      const initialPasses = await db.query<{ attendee_name: string }>(`
        select attendee_name from public.event_registrations where source_email = 'groupleader@test.com' order by created_at asc;
      `);
      expect(initialPasses.rows).toHaveLength(3);
      expect(initialPasses.rows.map((p) => p.attendee_name)).toEqual([
        "Group Leader",
        "Member Two",
        "Member Three",
      ]);

      const initialOutboxCount = (await db.query<{ count: string }>(`
        select count(*)::text as count from public.notifications where recipient = 'groupleader@test.com' and template_key = 'EventConfirmed';
      `)).rows[0].count;

      // Replay 5 times
      for (let i = 0; i < 5; i++) {
        const replay = (await db.query<{
          csc_fulfill_confirmed_payment: {
            ok: boolean;
            already_fulfilled: boolean;
            attendee_count: number;
          };
        }>(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)).rows[0].csc_fulfill_confirmed_payment;

        expect(replay.ok).toBe(true);
        expect(replay.already_fulfilled).toBe(true);
        expect(replay.attendee_count).toBe(3);
      }

      // Re-verify no duplicates in passes or outbox
      const finalPasses = await db.query<{ count: string }>(`
        select count(*)::text as count from public.event_registrations where source_email = 'groupleader@test.com';
      `);
      expect(finalPasses.rows[0].count).toBe("3");

      const finalOutboxCount = (await db.query<{ count: string }>(`
        select count(*)::text as count from public.notifications where recipient = 'groupleader@test.com' and template_key = 'EventConfirmed';
      `)).rows[0].count;
      expect(finalOutboxCount).toBe(initialOutboxCount);
    });

    it("2.3 Replay on reconciled order with mismatched evidence throws 'has inconsistent fulfillment state'", async () => {
      const { eventId } = await createEvent(50000);
      const ref = getNextOrderRef("INCON");
      const utr1 = `UTR_INCON_1_${Date.now()}`;
      const utr2 = `UTR_INCON_2_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${ref}', '${eventId}', 'Incon User', 'incon@test.com', '9876543210',
          'Incon Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId1 = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr1}', now(), 'UPI/P2A/${utr1}/USER/AXIS/UPI/${ref}', 'alerts@axis.bank.in',
          '<msg-${utr1}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      const evId2 = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr2}', now(), 'UPI/P2A/${utr2}/USER/AXIS/UPI/${ref}', 'alerts@axis.bank.in',
          '<msg-${utr2}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Fulfill with evId1
      await db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId1}', 'automated_worker');`);

      // Attempt replay passing evId2
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId2}', 'automated_worker');`)
      ).rejects.toThrow(`Reconciled order ${orderId} has inconsistent fulfillment state`);
    });
  });

  // ===========================================================================
  // 3. Substring Collision in Memo
  // ===========================================================================
  describe("3. Substring Collision in Memo", () => {
    beforeAll(async () => {
      // Temporarily drop format check constraint so verbatim 5-char suffix 'CSC-ORD-ABC12' can be inserted
      await db.exec(`
        alter table public.event_payment_orders drop constraint if exists event_payment_orders_order_reference_check;
      `);
    });

    afterAll(async () => {
      // Re-enable schema constraint
      await db.exec(`
        alter table public.event_payment_orders add constraint event_payment_orders_order_reference_check check (order_reference ~ '^CSC-ORD-[0-9A-Z]{5,32}$');
      `);
    });

    it("3.1 Order CSC-ORD-ABC12 is strictly NOT fulfilled by bank note mentioning CSC-ORD-ABC12345 (word-boundary enforcement)", async () => {
      const { eventId } = await createEvent(50000);
      const targetRef = "CSC-ORD-ABC12";
      const collidingLongRef = "CSC-ORD-ABC12345";
      const utr = `UTR_COLL_SUB_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${targetRef}', '${eventId}', 'Target User', 'target@collision.com', '9876543210',
          'Target Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Evidence mentions collidingLongRef, NOT targetRef
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/AXIS/UPI/${collidingLongRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Settlement must be rejected
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(
        `Automated worker settlement requires verifiable order reference ${targetRef} in transaction note`
      );

      // Order must remain pending
      const orderRow = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(orderRow.status).toBe("pending");
    });

    it("3.2 Rejects alphanumeric and hyphen prefix collisions: PRECSC-ORD-ABC13 and MY-CSC-ORD-ABC13", async () => {
      const { eventId } = await createEvent(50000);
      const targetRef = "CSC-ORD-ABC13";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${targetRef}', '${eventId}', 'Prefix User', 'prefix@collision.com', '9876543210',
          'Target Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Prefix case 1: alphanumeric prefix PRECSC-ORD-ABC13
      const evId1 = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          'UTR_PRE1_${Date.now()}', now(), 'UPI/P2A/111/USER/PRE${targetRef}', 'alerts@axis.bank.in',
          '<msg-pre1@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId1}', 'automated_worker');`)
      ).rejects.toThrow(`Automated worker settlement requires verifiable order reference ${targetRef}`);

      // Prefix case 2: hyphenated prefix MY-CSC-ORD-ABC13
      const evId2 = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          'UTR_PRE2_${Date.now()}', now(), 'UPI/P2A/222/USER/MY-${targetRef}', 'alerts@axis.bank.in',
          '<msg-pre2@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId2}', 'automated_worker');`)
      ).rejects.toThrow(`Automated worker settlement requires verifiable order reference ${targetRef}`);
    });

    it("3.3 Accepts order reference with valid word-boundary delimiters (slashes, whitespace, commas, start/end of string)", async () => {
      const { eventId } = await createEvent(50000);
      const targetRef = "CSC-ORD-ABC14";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${targetRef}', '${eventId}', 'Boundary User', 'boundary@test.com', '9876543210',
          'Boundary Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Authentic memo where targetRef is delimited by slashes and spaces: "UPI/P2A/333/USER/AXIS / CSC-ORD-ABC12 / ALERT"
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          'UTR_BOUND_${Date.now()}', now(), 'UPI/P2A/333/USER/AXIS / ${targetRef} / ALERT', 'alerts@axis.bank.in',
          '<msg-bound@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);

      const orderRow = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(orderRow.status).toBe("reconciled");
    });

    it("3.4 Standard 8-character reference substring collision test (preserves strict schema constraints)", async () => {
      const { eventId } = await createEvent(50000);
      const targetRef = getNextOrderRef("TGT01");
      const collidingRef = `${targetRef}EXTRA`;
      const utr = `UTR_COLL_STD_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${targetRef}', '${eventId}', 'Std Target', 'stdtarget@collision.com', '9876543210',
          'Std Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/AXIS/UPI/${collidingRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(
        `Automated worker settlement requires verifiable order reference ${targetRef} in transaction note`
      );
    });
  });

  // ===========================================================================
  // 4. Direct Automated Settlement
  // ===========================================================================
  describe("4. Direct Automated Settlement", () => {
    it("4.1 Authentic Axis Bank alert with matching order reference fulfills directly without requiring a pre-inserted event_payment_attributions row", async () => {
      const { eventId } = await createEvent(50000);
      const ref = getNextOrderRef("DIRECT");
      const utr = `UTR_DIRECT_AUTO_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${ref}', '${eventId}', 'Direct User', 'direct@test.com', '9876543210',
          'Direct Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status, auth_details
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/COIMBATORE STARTUP/AXIS/${ref}/UPI', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Axis Bank Credit Alert: Rs 500.00',
          'authenticated', '{"dkim": {"pass": true, "domain": "axis.bank.in"}}'::jsonb
        ) returning id;
      `)).rows[0].id;

      // EMPIRICAL ASSERTION: Verify 0 attribution records exist prior to fulfillment
      const preAttribution = await db.query<{ count: string }>(`
        select count(*)::text as count
        from public.event_payment_attributions
        where order_id = '${orderId}' or evidence_id = '${evId}';
      `);
      expect(preAttribution.rows[0].count).toBe("0");

      // Execute automated_worker fulfillment directly
      const result = (await db.query<{
        csc_fulfill_confirmed_payment: {
          ok: boolean;
          order_id: string;
          evidence_id: string;
          paid_registration_id: string;
          primary_pass_id: string;
          attendee_count: number;
        };
      }>(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)).rows[0].csc_fulfill_confirmed_payment;

      expect(result.ok).toBe(true);
      expect(result.order_id).toBe(orderId);
      expect(result.evidence_id).toBe(evId);
      expect(result.paid_registration_id).toBeTruthy();
      expect(result.primary_pass_id).toBeTruthy();
      expect(result.attendee_count).toBe(1);

      // Verify that csc_fulfill_confirmed_payment automatically created and consumed the attribution row
      const postAttribution = (await db.query<{
        order_id: string;
        evidence_id: string;
        attribution_method: string;
        bank_order_reference: string;
        verification_source: string;
        eligible_for_settlement: boolean;
        consumed_at: string | null;
      }>(`
        select order_id, evidence_id, attribution_method, bank_order_reference,
               verification_source, eligible_for_settlement, consumed_at
        from public.event_payment_attributions
        where order_id = '${orderId}';
      `)).rows[0];

      expect(postAttribution).toBeDefined();
      expect(postAttribution.order_id).toBe(orderId);
      expect(postAttribution.evidence_id).toBe(evId);
      expect(postAttribution.attribution_method).toBe("bank_order_reference");
      expect(postAttribution.bank_order_reference).toBe(ref);
      expect(postAttribution.verification_source).toBe("automated_reconciler");
      expect(postAttribution.eligible_for_settlement).toBe(true);
      expect(postAttribution.consumed_at).not.toBeNull();

      // Verify order and evidence states
      const order = (await db.query<{ status: string; matched_evidence_id: string }>(
        `select status, matched_evidence_id from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(order.status).toBe("reconciled");
      expect(order.matched_evidence_id).toBe(evId);

      const evidence = (await db.query<{ reconciliation_state: string; matched_order_id: string }>(
        `select reconciliation_state, matched_order_id from public.event_payment_evidence where id = '${evId}';`
      )).rows[0];
      expect(evidence.reconciliation_state).toBe("matched");
      expect(evidence.matched_order_id).toBe(orderId);

      // Verify registration pass and outbox notification
      const pass = (await db.query<{ id: string; attendee_name: string; status: string }>(
        `select id, attendee_name, status from public.event_registrations where id = '${result.primary_pass_id}';`
      )).rows[0];
      expect(pass.attendee_name).toBe("Direct User");
      expect(pass.status).toBe("confirmed");

      const outbox = (await db.query<{ recipient: string; template_key: string }>(
        `select recipient, template_key from public.notifications where recipient = 'direct@test.com' and template_key = 'EventConfirmed';`
      )).rows[0];
      expect(outbox.recipient).toBe("direct@test.com");
      expect(outbox.template_key).toBe("EventConfirmed");
    });

    it("4.2 Direct automated settlement for group order (attendee_count = 3) generates exact passes without pre-inserted attribution", async () => {
      const { eventId } = await createEvent(150000);
      const ref = getNextOrderRef("DIRGRP");
      const utr = `UTR_DIR_GRP_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, additional_attendee_names, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${ref}', '${eventId}', 'Direct Lead', 'dirlead@test.com', '9876543210',
          'Lead Corp', 'Startup Founder / Co-Founder', 3, 'Second Attendee\nThird Attendee', 150000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 150000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/AXIS/UPI/${ref}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      const result = (await db.query<{
        csc_fulfill_confirmed_payment: {
          ok: boolean;
          attendee_count: number;
        };
      }>(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)).rows[0].csc_fulfill_confirmed_payment;

      expect(result.ok).toBe(true);
      expect(result.attendee_count).toBe(3);

      const passes = await db.query<{ attendee_name: string }>(`
        select attendee_name from public.event_registrations
        where source_email = 'dirlead@test.com'
        order by created_at asc;
      `);
      expect(passes.rows).toHaveLength(3);
      expect(passes.rows.map((p) => p.attendee_name)).toEqual([
        "Direct Lead",
        "Second Attendee",
        "Third Attendee",
      ]);

      const attribution = (await db.query<{ eligible_for_settlement: boolean; consumed_at: string | null }>(`
        select eligible_for_settlement, consumed_at from public.event_payment_attributions
        where order_id = '${orderId}';
      `)).rows[0];
      expect(attribution.eligible_for_settlement).toBe(true);
      expect(attribution.consumed_at).not.toBeNull();
    });

    it("4.3 Rejects direct automated settlement when evidence auth_status is 'needs_review', 'untrusted', or 'forged'", async () => {
      const { eventId } = await createEvent(50000);

      for (const badAuth of ["needs_review", "untrusted", "forged"] as const) {
        const ref = getNextOrderRef(`BAD${badAuth.slice(0, 3).toUpperCase()}`);
        const utr = `UTR_BAD_${badAuth}_${Date.now()}`;
        const uniqueEmail = `badauth_${badAuth}_${Date.now()}@test.com`;

        const orderId = (await db.query<{ id: string }>(`
          insert into public.event_payment_orders (
            order_reference, event_id, full_name, email, whatsapp, organization, role,
            attendee_count, amount_paise, upi_uri, status, consent_payment_terms
          ) values (
            '${ref}', '${eventId}', 'Bad Auth User', '${uniqueEmail}', '9876543210',
            'Bad Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
          ) returning id;
        `)).rows[0].id;

        const evId = (await db.query<{ id: string }>(`
          insert into public.event_payment_evidence (
            bank, direction, currency, amount_paise, receiving_account_suffix,
            utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
            auth_status
          ) values (
            'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
            '${utr}', now(), 'UPI/P2A/${utr}/USER/AXIS/UPI/${ref}', 'alerts@axis.bank.in',
            '<msg-${utr}@axis.bank.in>', 'Credit Alert', '${badAuth}'
          ) returning id;
        `)).rows[0].id;

        if (badAuth === "needs_review") {
          await expect(
            db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
          ).rejects.toThrow(`Evidence ${evId} failed authentication (status: needs_review)`);
        } else {
          await expect(
            db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
          ).rejects.toThrow(`Evidence ${evId} failed authentication with untrusted status: ${badAuth}`);
        }

        // Verify order remained pending
        const orderRow = (await db.query<{ status: string }>(
          `select status from public.event_payment_orders where id = '${orderId}';`
        )).rows[0];
        expect(orderRow.status).toBe("pending");
      }
    });
  });
});
