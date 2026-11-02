// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Milestone M2 Replacement Challenger Adversarial Stress Test Harness", () => {
  let db: PGlite;
  let testSeq = 2000;

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

  async function createTestEvent(slugPrefix = "m2-rep-evt", capacity: number | null = 100) {
    const eventId = getNextUuid();
    const slug = `${slugPrefix}-${Date.now()}-${testSeq++}`;
    await db.exec(`
      insert into public.events (
        id, slug, title, category, starts_at, ends_at, location,
        capacity, status, registration_state, admission, price_per_attendee
      ) values (
        '${eventId}', '${slug}', 'M2 Replacement Challenger Event', 'networking',
        now() + interval '1 day', now() + interval '2 days', 'Coimbatore',
        ${capacity === null ? "null" : capacity}, 'published', 'open', 'paid', 500.00
      );
    `);
    return { eventId, slug };
  }

  async function authorizeAttribution(
    orderId: string,
    evidenceId: string,
    orderReference: string,
    method: "bank_order_reference" | "admin_bank_record_review" = "bank_order_reference",
    verifiedBy: string | null = null
  ) {
    await db.exec(`
      insert into public.event_payment_attributions(
        order_id, evidence_id, attribution_method, bank_order_reference,
        verification_source, policy_version, verified_by, supporting_evidence, eligible_for_settlement
      ) values (
        '${orderId}', '${evidenceId}', '${method}',
        ${method === "bank_order_reference" ? `'${orderReference}'` : "null"},
        'm2-rep-adversarial-harness', 'v1.0', ${verifiedBy ? `'${verifiedBy}'` : "null"},
        '{"adversarial": true}'::jsonb, true
      );
    `);
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

    // Load all migrations chronologically
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
  // Objective 1: Concurrency Races
  // =========================================================================
  describe("Objective 1: Concurrency Races", () => {
    it("1.1 Serializes 10 concurrent fulfillment attempts for the same single-attendee order: exactly ONE commits and 9 report already fulfilled", async () => {
      const { eventId } = await createTestEvent("concur-single");
      const orderRef = getNextOrderRef("RACESNG");
      const utr = `UTR_CONCUR_SNG_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Single Concurrency Buyer', 'concur-sng@example.com', '9876543210',
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

      await authorizeAttribution(orderId, evId, orderRef);

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

      // Verify all 10 calls resolved successfully
      expect(results).toHaveLength(concurrencyLevel);
      for (const res of results) {
        expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      }

      // Exactly ONE must be the initial commit (already_fulfilled is falsy)
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
        where email = 'concur-sng@example.com';
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
        where recipient = 'concur-sng@example.com' and template_key = 'EventConfirmed';
      `);
      expect(outbox.rows[0].count).toBe("1");

      // Attribution consumed_at is timestamped
      const attribution = (await db.query<{ consumed_at: string | null }>(`
        select consumed_at from public.event_payment_attributions
        where order_id = '${orderId}' and evidence_id = '${evId}';
      `)).rows[0];
      expect(attribution.consumed_at).not.toBeNull();
    });

    it("1.2 Serializes 10 concurrent fulfillment attempts for a group order (attendee_count = 3): creates exactly 3 passes and 1 paid registration", async () => {
      const { eventId } = await createTestEvent("concur-group");
      const orderRef = getNextOrderRef("RACEGRP");
      const utr = `UTR_CONCUR_GRP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, additional_attendee_names, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Primary Group Leader', 'concur-grp@example.com', '9876543210',
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

      await authorizeAttribution(orderId, evId, orderRef);

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
      expect(results).toHaveLength(concurrencyLevel);

      const initialCommits = results.filter(
        (r) => !r.rows[0].csc_fulfill_confirmed_payment.already_fulfilled
      );
      expect(initialCommits).toHaveLength(1);

      const idempotentReturns = results.filter(
        (r) => r.rows[0].csc_fulfill_confirmed_payment.already_fulfilled === true
      );
      expect(idempotentReturns).toHaveLength(concurrencyLevel - 1);

      // Verify exactly ONE paid_event_registrations record
      const paidRegs = await db.query<{ count: string; id: string }>(`
        select count(*)::text as count, max(id::text) as id
        from public.paid_event_registrations
        where email = 'concur-grp@example.com';
      `);
      expect(paidRegs.rows[0].count).toBe("1");

      // Verify exactly THREE passes created for the 3 distinct attendee names
      const passes = await db.query<{ attendee_name: string }>(`
        select attendee_name from public.event_registrations
        where paid_registration_id = '${paidRegs.rows[0].id}'
        order by created_at asc;
      `);
      expect(passes.rows).toHaveLength(3);
      expect(passes.rows.map((p) => p.attendee_name)).toEqual([
        "Primary Group Leader",
        "Attendee Two",
        "Attendee Three",
      ]);
    });
  });

  // =========================================================================
  // Objective 2: Double-Spend Exploitation
  // =========================================================================
  describe("Objective 2: Double-Spend Exploitation", () => {
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
          '${orderRefA}', '${eventId}', 'Buyer A', 'buyer-a-seq@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const orderB = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRefB}', '${eventId}', 'Buyer B', 'buyer-b-seq@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Single payment evidence of INR 500.00 (50000 paise)
      // Even if attacker crafted bank note containing both references
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

      // Authorize attribution for Order A + Evidence
      await authorizeAttribution(orderA, evId, orderRefA);

      // Fulfill Order A -> Must succeed
      const resA = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderA}', '${evId}', 'automated_worker');`
      );
      expect(resA.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);

      // Order A status transitioned to reconciled
      const orderAStatus = (await db.query<{ status: string; matched_evidence_id: string }>(
        `select status, matched_evidence_id from public.event_payment_orders where id = '${orderA}';`
      )).rows[0];
      expect(orderAStatus.status).toBe("reconciled");
      expect(orderAStatus.matched_evidence_id).toBe(evId);

      // Attempting to insert a second attribution for the same evidence must fail due to unique constraint
      await expect(
        authorizeAttribution(orderB, evId, orderRefB)
      ).rejects.toThrow(/unique constraint/i);

      // Attempting to fulfill Order B targeting the consumed evidence must be strictly rejected
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderB}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/is already matched to another order/i);

      // Verify Order B state is strictly pending and untouched
      const orderBStatus = (await db.query<{ status: string; matched_evidence_id: string | null }>(
        `select status, matched_evidence_id from public.event_payment_orders where id = '${orderB}';`
      )).rows[0];
      expect(orderBStatus.status).toBe("pending");
      expect(orderBStatus.matched_evidence_id).toBeNull();

      // Zero registrations or passes created for Buyer B
      const buyerBRegs = await db.query<{ count: string }>(
        `select count(*)::text as count from public.paid_event_registrations where email = 'buyer-b-seq@example.com';`
      );
      expect(buyerBRegs.rows[0].count).toBe("0");

      // Evidence remains matched strictly and exclusively to Order A
      const evidence = (await db.query<{ matched_order_id: string; reconciliation_state: string }>(
        `select matched_order_id, reconciliation_state from public.event_payment_evidence where id = '${evId}';`
      )).rows[0];
      expect(evidence.matched_order_id).toBe(orderA);
      expect(evidence.reconciliation_state).toBe("matched");
    });

    it("2.2 Concurrent Double-Spend Race: Order A and Order B race simultaneously for the same 500 evidence -> exactly ONE wins, the other is strictly rejected", async () => {
      const { eventId } = await createTestEvent("dbl-concur");
      const orderRefA = getNextOrderRef("RACEA");
      const orderRefB = getNextOrderRef("RACEB");
      const utr = `UTR_DBL_CONCUR_${Date.now()}`;

      const orderA = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRefA}', '${eventId}', 'Buyer A Concur', 'buyer-a-concur@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const orderB = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRefB}', '${eventId}', 'Buyer B Concur', 'buyer-b-concur@example.com', '9876543210',
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
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRefA}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Legitimate attribution authorized for Order A
      await authorizeAttribution(orderA, evId, orderRefA);

      // Race both orders concurrently
      const results = await Promise.allSettled([
        db.query(`select public.csc_fulfill_confirmed_payment('${orderA}', '${evId}', 'automated_worker');`),
        db.query(`select public.csc_fulfill_confirmed_payment('${orderB}', '${evId}', 'automated_worker');`),
      ]);

      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");

      // Verify Order A is reconciled
      const orderAStatus = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderA}';`
      )).rows[0].status;
      expect(orderAStatus).toBe("reconciled");

      // Verify Order B is pending
      const orderBStatus = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderB}';`
      )).rows[0].status;
      expect(orderBStatus).toBe("pending");

      // Evidence is strictly linked to Order A
      const evRow = (await db.query<{ matched_order_id: string }>(
        `select matched_order_id from public.event_payment_evidence where id = '${evId}';`
      )).rows[0];
      expect(evRow.matched_order_id).toBe(orderA);
    });
  });

  // =========================================================================
  // Objective 3: Unauthenticated / Tampered Evidence
  // =========================================================================
  describe("Objective 3: Unauthenticated / Tampered Evidence", () => {
    it("3.1 Rejects settlement immediately when evidence has auth_status = 'needs_review'", async () => {
      const { eventId } = await createTestEvent("unauth-needs-review");
      const orderRef = getNextOrderRef("REVIEW");
      const utr = `UTR_REVIEW_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms, claimed_utr
        ) values (
          '${orderRef}', '${eventId}', 'Review User', 'review@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true, '${utr}'
        ) returning id;
      `)).rows[0].id;

      // Evidence default or explicit auth_status = 'needs_review'
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'needs_review'
        ) returning id;
      `)).rows[0].id;

      await authorizeAttribution(orderId, evId, orderRef);

      // Automated worker settlement must reject
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Evidence .* failed authentication \(status: needs_review\)/i);

      // User UTR claim settlement must reject
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'user_utr_claim');`)
      ).rejects.toThrow(/User UTR claim settlement requires authenticated evidence \(status: needs_review\)/i);

      // Order remains pending, zero passes created
      const orderStatus = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderId}';`
      )).rows[0].status;
      expect(orderStatus).toBe("pending");

      const passCount = (await db.query<{ count: string }>(
        `select count(*)::text as count from public.event_registrations where source_email = 'review@example.com';`
      )).rows[0].count;
      expect(passCount).toBe("0");
    });

    it("3.2 Rejects settlement immediately when evidence has auth_status = 'untrusted' or 'forged'", async () => {
      const { eventId } = await createTestEvent("unauth-untrusted-forged");
      const orderRef1 = getNextOrderRef("UNTRUST");
      const orderRef2 = getNextOrderRef("FORGED");
      const utr1 = `UTR_UNTRUST_${Date.now()}`;
      const utr2 = `UTR_FORGED_${Date.now()}`;

      const order1 = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef1}', '${eventId}', 'Untrusted User', 'untrusted@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      const order2 = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef2}', '${eventId}', 'Forged User', 'forged@example.com', '9876543210',
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
          '${utr1}', now(), 'UPI/P2A/${utr1}/USER/IOBA/UPI/${orderRef1}', 'alerts@axis.bank.in',
          '<msg-${utr1}@axis.bank.in>', 'Credit Alert', 'untrusted'
        ) returning id;
      `)).rows[0].id;

      const evForged = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr2}', now(), 'UPI/P2A/${utr2}/USER/IOBA/UPI/${orderRef2}', 'alerts@axis.bank.in',
          '<msg-${utr2}@axis.bank.in>', 'Credit Alert', 'forged'
        ) returning id;
      `)).rows[0].id;

      await authorizeAttribution(order1, evUntrusted, orderRef1);
      await authorizeAttribution(order2, evForged, orderRef2);

      // Rejects untrusted status before pathway evaluation
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${order1}', '${evUntrusted}', 'automated_worker');`)
      ).rejects.toThrow(/Evidence .* failed authentication with untrusted status: untrusted/i);

      // Rejects forged status before pathway evaluation
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${order2}', '${evForged}', 'automated_worker');`)
      ).rejects.toThrow(/Evidence .* failed authentication with untrusted status: forged/i);
    });

    it("3.3 Enforces database check constraint rejecting invalid auth_status values like 'failed' or arbitrary strings", async () => {
      const utr = `UTR_CHK_${Date.now()}`;

      // Inserting 'failed' is rejected by schema constraint
      await expect(
        db.exec(`
          insert into public.event_payment_evidence(
            bank, direction, currency, amount_paise, receiving_account_suffix,
            utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
            auth_status
          ) values (
            'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
            '${utr}', now(), 'raw memo', 'alerts@axis.bank.in',
            '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'failed'
          );
        `)
      ).rejects.toThrow(/event_payment_evidence_auth_status_check/i);
    });

    it("3.4 Rejects financial tampering: direction != CREDIT, amount mismatch, receiving account suffix mismatch", async () => {
      const { eventId } = await createTestEvent("fin-tamper");
      const orderRef = getNextOrderRef("TAMPER");
      const utrDebit = `UTR_DEBIT_${Date.now()}`;
      const utrAmt = `UTR_AMT_${Date.now()}`;
      const utrSuffix = `UTR_SUFFIX_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Tamper User', 'tamper@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Tampered Direction: DEBIT instead of CREDIT
      const evDebit = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'DEBIT', 'INR', 50000, '1995',
          '${utrDebit}', now(), 'UPI/P2A/${utrDebit}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utrDebit}@axis.bank.in>', 'Debit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Tampered Amount: Underpaid (40000 paise instead of 50000)
      const evUnderpaid = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 40000, '1995',
          '${utrAmt}', now(), 'UPI/P2A/${utrAmt}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utrAmt}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Tampered Account Suffix: 9999 instead of 1995
      const evSuffix = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '9999',
          '${utrSuffix}', now(), 'UPI/P2A/${utrSuffix}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utrSuffix}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await authorizeAttribution(orderId, evDebit, orderRef);
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evDebit}', 'automated_worker');`)
      ).rejects.toThrow(/direction is not CREDIT/i);

      // Clean up attribution for next test
      await db.query(`delete from public.event_payment_attributions where order_id = '${orderId}';`);

      await authorizeAttribution(orderId, evUnderpaid, orderRef);
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evUnderpaid}', 'automated_worker');`)
      ).rejects.toThrow(/amount .* does not match order amount/i);

      await db.query(`delete from public.event_payment_attributions where order_id = '${orderId}';`);

      await authorizeAttribution(orderId, evSuffix, orderRef);
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evSuffix}', 'automated_worker');`)
      ).rejects.toThrow(/account suffix .* does not match expected suffix/i);
    });
  });

  // =========================================================================
  // Objective 4: Word-Boundary & Substring Injection
  // =========================================================================
  describe("Objective 4: Word-Boundary & Substring Injection", () => {
    it("4.1 Rejects alphanumeric non-word-boundary prefix: NONCSC-ORD-... and suffix: ...EXTRA", async () => {
      const { eventId } = await createTestEvent("wb-alphanumeric");
      const orderRef = getNextOrderRef("WORD01");
      const utrPrefix = `UTR_NON_${Date.now()}`;
      const utrSuffix = `UTR_EXTRA_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Word Boundary User', 'wb@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
        ) returning id;
      `)).rows[0].id;

      // Note has alphanumeric character directly adjacent to start: NONCSC-ORD-...
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

      await authorizeAttribution(orderId, evPrefix, orderRef);

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evPrefix}', 'automated_worker');`)
      ).rejects.toThrow(/requires verifiable order reference/i);

      await db.query(`delete from public.event_payment_attributions where order_id = '${orderId}';`);

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

      await authorizeAttribution(orderId, evSuffix, orderRef);

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evSuffix}', 'automated_worker');`)
      ).rejects.toThrow(/requires verifiable order reference/i);
    });

    it("4.2 Rejects hyphen-boundary substring injection: FAKE-CSC-ORD-...-EXTRA", async () => {
      // NOTE: In standard POSIX ERE, '\\y' matches word-to-nonword boundaries.
      // Because '-' (hyphen) is a non-word character, naïve '\\y' considers '-' as a boundary!
      // In 20261102020000_settlement_security_hardening.sql, this was hardened to:
      // '(^|[^A-Z0-9-])' || v_order.order_reference || '([^A-Z0-9-]|$)'
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

      // 1. Empirical demonstration: Naïve \\y evaluates to true because '-' is a POSIX non-word delimiter
      const naiveYMatch = await db.query<{ matches: boolean }>(`
        select ('${bankMemo}' ~* ('\\y' || '${orderRef}' || '\\y')) as matches;
      `);
      expect(naiveYMatch.rows[0].matches).toBe(true);

      // 2. Empirical demonstration: Hardened regex in settlement migration evaluates to false!
      const hardenedMatch = await db.query<{ matches: boolean }>(`
        select ('${bankMemo}' ~* ('(^|[^A-Z0-9-])' || '${orderRef}' || '([^A-Z0-9-]|$)')) as matches;
      `);
      expect(hardenedMatch.rows[0].matches).toBe(false);

      // 3. Fulfill attempt through csc_fulfill_confirmed_payment: MUST BE REJECTED!
      await authorizeAttribution(orderId, evId, orderRef);
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Automated worker settlement requires verifiable order reference .* in transaction note/i);
    });

    it("4.3 Accepts exact word boundary with standard delimiters (slashes, whitespace, start/end of string)", async () => {
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

      // Standard UPI memo delimited by slashes
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}/PAYMENT', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await authorizeAttribution(orderId, evId, orderRef);

      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);

      const orderStatus = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderId}';`
      )).rows[0].status;
      expect(orderStatus).toBe("reconciled");
    });
  });

  // =========================================================================
  // Objective 5: UTR Claim Without Attribution
  // =========================================================================
  describe("Objective 5: UTR Claim Without Attribution", () => {
    it("5.1 Rejects user_utr_claim when bank memo does NOT mention the order reference and NO admin authorization was recorded", async () => {
      const { eventId } = await createTestEvent("claim-no-attr");
      const orderRef = getNextOrderRef("NOATTR");
      const utr = `UTR_OPAQUE_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms, claimed_utr
        ) values (
          '${orderRef}', '${eventId}', 'Opaque UTR User', 'opaque@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true, '${utr}'
        ) returning id;
      `)).rows[0].id;

      // Authenticated credit alert where memo does NOT mention the order reference
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/UNKNOWN_SENDER/IOBA/UPI', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // NO attribution record inserted into event_payment_attributions
      // Attempt user_utr_claim settlement -> MUST BE REJECTED!
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'user_utr_claim');`)
      ).rejects.toThrow(/Settlement requires an eligible, unconsumed verified attribution/i);

      // Verify order remains pending and NO passes or paid registrations exist
      const order = (await db.query<{ status: string; matched_evidence_id: string | null }>(
        `select status, matched_evidence_id from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(order.status).toBe("pending");
      expect(order.matched_evidence_id).toBeNull();

      const regCount = (await db.query<{ count: string }>(
        `select count(*)::text as count from public.paid_event_registrations where email = 'opaque@example.com';`
      )).rows[0].count;
      expect(regCount).toBe("0");
    });

    it("5.2 Rejects user_utr_claim when order claimed_utr does not match evidence UTR", async () => {
      const { eventId } = await createTestEvent("claim-mismatch");
      const orderRef = getNextOrderRef("MISMATCH");
      const claimedUtr = `UTR_CLAIMED_${Date.now()}`;
      const actualUtr = `UTR_ACTUAL_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms, claimed_utr
        ) values (
          '${orderRef}', '${eventId}', 'Mismatch UTR User', 'mismatch@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true, '${claimedUtr}'
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${actualUtr}', now(), 'UPI/P2A/${actualUtr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${actualUtr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await authorizeAttribution(orderId, evId, orderRef);

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'user_utr_claim');`)
      ).rejects.toThrow(/User UTR claim settlement requires verified matching claimed UTR/i);
    });

    it("5.3 Accepts user_utr_claim with opaque bank memo when authorized admin attribution record exists in event_payment_attributions", async () => {
      const { eventId } = await createTestEvent("claim-authorized");
      const orderRef = getNextOrderRef("AUTHOK");
      const utr = `UTR_AUTHORIZED_${Date.now()}`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms, claimed_utr
        ) values (
          '${orderRef}', '${eventId}', 'Authorized UTR User', 'authorized@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true, '${utr}'
        ) returning id;
      `)).rows[0].id;

      // Opaque memo without order reference
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject, auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 50000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/OPAQUE_SENDER/IOBA/UPI', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // Admin conducts manual review and logs attribution record with 'admin_bank_record_review'
      await authorizeAttribution(orderId, evId, orderRef, "admin_bank_record_review");

      // Settlement now succeeds through user_utr_claim pathway
      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'user_utr_claim');`
      );
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);

      const order = (await db.query<{ status: string; matched_evidence_id: string }>(
        `select status, matched_evidence_id from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(order.status).toBe("reconciled");
      expect(order.matched_evidence_id).toBe(evId);

      const pass = (await db.query<{ attendee_name: string; reference: string }>(
        `select attendee_name, reference from public.event_registrations where source_email = 'authorized@example.com';`
      )).rows[0];
      expect(pass.attendee_name).toBe("Authorized UTR User");
    });
  });

  // =========================================================================
  // Invariant & Rollback Integrity
  // =========================================================================
  describe("Invariant & Rollback Integrity", () => {
    it("6.1 Group attendee count mismatch rolls back entire transaction atomically (0 partial passes, 0 paid registrations)", async () => {
      const { eventId } = await createTestEvent("rollback-group");
      const orderRef = getNextOrderRef("RBKGRP");
      const utr = `UTR_ROLLBACK_${Date.now()}`;

      // Expected 3 attendees, but 0 additional names provided
      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms, additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead Rollback User', 'lead-rbk@example.com', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 3, 150000, 'upi://pay', 'pending', true, null
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

      await authorizeAttribution(orderId, evId, orderRef);

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 3 attendees but only 1 verified names were provided/);

      // Verify ATOMIC ROLLBACK: zero surviving artifacts
      const order = (await db.query<{ status: string; matched_evidence_id: string | null }>(
        `select status, matched_evidence_id from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(order.status).toBe("pending");
      expect(order.matched_evidence_id).toBeNull();

      const paidRegs = await db.query<{ count: string }>(
        `select count(*)::text as count from public.paid_event_registrations where email = 'lead-rbk@example.com';`
      );
      expect(paidRegs.rows[0].count).toBe("0");

      const passes = await db.query<{ count: string }>(
        `select count(*)::text as count from public.event_registrations where source_email = 'lead-rbk@example.com';`
      );
      expect(passes.rows[0].count).toBe("0");

      const outbox = await db.query<{ count: string }>(
        `select count(*)::text as count from public.notifications where recipient = 'lead-rbk@example.com';`
      );
      expect(outbox.rows[0].count).toBe("0");
    });
  });
});
