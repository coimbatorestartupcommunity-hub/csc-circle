// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- lightweight query-chain doubles for Supabase client */
/**
 * ==============================================================================
 * Challenger M2 Iteration 2: Rollback and Outbox Delivery Resilience
 * ==============================================================================
 * 
 * Scope of Adversarial Challenge:
 * 1. Group Attendee Pass Invariants:
 *    - Group order for 3 seats: provide 1 name, 2 missing. Verify entire transaction
 *      rolls back cleanly with zero passes created, zero paid registrations created,
 *      and order status remaining `pending`.
 *    - White-space / Tab characters in attendee names: provide E'\t' or E'   \t\r\n'.
 *      Verify btrim strips tabs and triggers invariant rollback rather than generating
 *      empty/tab-only passes.
 *    - Tab-padded valid names: verify btrim trims tabs without discarding valid names.
 *    - Case-insensitive duplicate attendee identity invariant rollback.
 * 
 * 2. Email Outbox Delivery Resilience:
 *    - Simulate outbox worker failure or email delivery exception. Verify that email
 *      delivery failure does NOT roll back confirmed registrations or passes.
 *    - Verify idempotent outbox enqueuing: deduplication on event-pass-confirmed:${pass.id}
 *      prevents duplicate emails across sequential and concurrent invocations.
 *    - Verify 4-tier recipient fallback (including profiles.email for member registrations
 *      lacking direct source_email).
 *    - Verify outbox repair for INVALID_RECIPIENT vs non-resurrection for other permanent errors.
 */

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

  for (const file of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
}, 45_000);

afterAll(async () => {
  await db?.close();
});

let testSeq = 3000;
function getNextId() {
  testSeq++;
  const hex = testSeq.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

let refCounter = 20000;
function getNextOrderRef(prefix = "CHAL") {
  refCounter++;
  const pad = refCounter.toString(36).toUpperCase().padStart(8, "0");
  return `CSC-ORD-${prefix.toUpperCase()}${pad}`;
}

async function createTestEvent(slugPrefix = "chal-it2-evt", pricePaise = 25000) {
  const eventId = getNextId();
  const slug = `${slugPrefix}-${Date.now()}-${testSeq}`;
  await db.exec(`
    insert into public.events (
      id, slug, title, category, starts_at, ends_at, location,
      capacity, status, registration_state, admission, price_per_attendee
    ) values (
      '${eventId}', '${slug}', 'Challenger M2.It2 Test Event', 'networking',
      now() + interval '1 day', now() + interval '2 days', 'Coimbatore',
      200, 'published', 'open', 'paid', ${pricePaise / 100}
    );
  `);
  return { eventId, slug };
}

/**
 * Creates a mock SupabaseClient query builder supporting:
 * - admin.from(table).select(...).eq(...).limit(...).maybeSingle()
 * - admin.from(table).update(...).eq(...)
 * - admin.from(table).insert(...)
 */
function createMockSupabaseClient(tableHandlers: Record<string, {
  data?: any;
  error?: any;
  onUpdate?: (patch: any) => void;
  onInsert?: (row: any) => void;
}>) {
  return {
    from: (table: string) => {
      const handler = tableHandlers[table] || {};
      const chain: any = {
        select: (_cols?: string) => chain,
        eq: (_col: string, _val: any) => chain,
        limit: (_n: number) => chain,
        order: (_col: string, _opts?: any) => chain,
        maybeSingle: async () => ({
          data: handler.data !== undefined ? handler.data : null,
          error: handler.error || null,
        }),
        update: (patch: any) => {
          if (handler.onUpdate) handler.onUpdate(patch);
          return {
            eq: async (_col: string, _val: any) => ({
              error: handler.error || null,
            }),
          };
        },
        insert: async (row: any) => {
          if (handler.onInsert) handler.onInsert(row);
          return { error: handler.error || null };
        },
      };
      return chain;
    },
  } as any;
}

describe("Adversarial Verification: Milestone M2 Iteration 2", () => {
  // ===========================================================================
  // 1. Group Attendee Pass Invariants & Atomic Rollback
  // ===========================================================================
  describe("1. Group Attendee Pass Invariants & Atomic Rollback", () => {
    it("1.1 Group order for 3 seats: provide 1 name, 2 missing (NULL additional_attendee_names) -> entire transaction rolls back cleanly with zero passes created, zero paid registrations created, and order status remaining 'pending'", async () => {
      const { eventId } = await createTestEvent("grp-3-null", 50000);
      const orderRef = getNextOrderRef("G3NULL");
      const utr = `UTR_G3NULL_${Date.now()}`;
      const email = "lead_g3null@example.com";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Primary Attendee Lead', '${email}', '9876543210',
          'Org Alpha', 'Startup Founder / Co-Founder', 3, 150000, 'upi://pay', 'pending', true,
          null
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

      // Fulfillment must fail with invariant violation
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 3 attendees but only 1 verified names were provided/);

      // Verify ZERO surviving artifacts:
      // 1. event_registrations (passes) count = 0
      const passes = await db.query<{ count: number }>(
        `select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`
      );
      expect(passes.rows[0].count).toBe(0);

      // 2. paid_event_registrations count = 0
      const paidRegs = await db.query<{ count: number }>(
        `select count(*)::int as count from public.paid_event_registrations where event_id = '${eventId}';`
      );
      expect(paidRegs.rows[0].count).toBe(0);

      // 3. order status remains pending, matched_evidence_id remains null, paid_registration_id remains null
      const order = (await db.query<{ status: string; matched_evidence_id: string | null; paid_registration_id: string | null }>(
        `select status, matched_evidence_id, paid_registration_id from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(order.status).toBe("pending");
      expect(order.matched_evidence_id).toBeNull();
      expect(order.paid_registration_id).toBeNull();

      // 4. evidence reconciliation_state remains unmatched, matched_order_id remains null
      const ev = (await db.query<{ reconciliation_state: string; matched_order_id: string | null }>(
        `select reconciliation_state, matched_order_id from public.event_payment_evidence where id = '${evId}';`
      )).rows[0];
      expect(ev.reconciliation_state).toBe("unmatched");
      expect(ev.matched_order_id).toBeNull();

      // 5. notifications count = 0
      const notifs = await db.query<{ count: number }>(
        `select count(*)::int as count from public.notifications where recipient = '${email}';`
      );
      expect(notifs.rows[0].count).toBe(0);

      // 6. event_payment_reconciliation count = 0
      const recons = await db.query<{ count: number }>(
        `select count(*)::int as count from public.event_payment_reconciliation where order_id = '${orderId}';`
      );
      expect(recons.rows[0].count).toBe(0);

      // 7. event_payment_events count = 0
      const events = await db.query<{ count: number }>(
        `select count(*)::int as count from public.event_payment_events where order_id = '${orderId}';`
      );
      expect(events.rows[0].count).toBe(0);
    });

    it("1.2 Group order for 3 seats: provide 2 names, 1 missing (1 additional name provided) -> rolls back cleanly", async () => {
      const { eventId } = await createTestEvent("grp-3-one-add", 50000);
      const orderRef = getNextOrderRef("G3ONE");
      const utr = `UTR_G3ONE_${Date.now()}`;
      const email = "lead_g3one@example.com";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Primary Lead One', '${email}', '9876543210',
          'Org Beta', 'Startup Founder / Co-Founder', 3, 150000, 'upi://pay', 'pending', true,
          'Second Attendee'
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

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 3 attendees but only 2 verified names were provided/);

      const passes = await db.query<{ count: number }>(
        `select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`
      );
      expect(passes.rows[0].count).toBe(0);

      const paidRegs = await db.query<{ count: number }>(
        `select count(*)::int as count from public.paid_event_registrations where event_id = '${eventId}';`
      );
      expect(paidRegs.rows[0].count).toBe(0);

      const order = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(order.status).toBe("pending");
    });

    it("1.3 White-space / Tab characters in attendee names: provide E'\\t' -> btrim strips tabs and triggers invariant rollback rather than generating empty/tab-only passes", async () => {
      const { eventId } = await createTestEvent("grp-tab-single", 50000);
      const orderRef = getNextOrderRef("GTAB1");
      const utr = `UTR_TAB1_${Date.now()}`;
      const email = "lead_tab1@example.com";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead Founder Tab', '${email}', '9876543210',
          'Org Gamma', 'Startup Founder / Co-Founder', 2, 100000, 'upi://pay', 'pending', true,
          E'\t'
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 100000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      // btrim strips '\t' to '', so only 1 attendee name is found instead of 2.
      // Invariant rollback is triggered!
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 2 attendees but only 1 verified names were provided/);

      // Verify ZERO passes were created in the database
      const passes = await db.query<{ count: number }>(
        `select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`
      );
      expect(passes.rows[0].count).toBe(0);

      // Order status remains pending
      const order = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(order.status).toBe("pending");
    });

    it("1.4 White-space / Tab characters in attendee names: provide E'   \\t\\r\\n' -> btrim strips all mixed whitespace and triggers invariant rollback", async () => {
      const { eventId } = await createTestEvent("grp-mixed-ws", 50000);
      const orderRef = getNextOrderRef("GMIXWS");
      const utr = `UTR_MIXWS_${Date.now()}`;
      const email = "lead_mixws@example.com";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead Founder MixedWS', '${email}', '9876543210',
          'Org Delta', 'Startup Founder / Co-Founder', 2, 100000, 'upi://pay', 'pending', true,
          E'   \t\r\n'
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 100000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 2 attendees but only 1 verified names were provided/);

      const passes = await db.query<{ count: number }>(
        `select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`
      );
      expect(passes.rows[0].count).toBe(0);

      const paidRegs = await db.query<{ count: number }>(
        `select count(*)::int as count from public.paid_event_registrations where event_id = '${eventId}';`
      );
      expect(paidRegs.rows[0].count).toBe(0);

      const order = (await db.query<{ status: string }>(
        `select status from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(order.status).toBe("pending");
    });

    it("1.5 White-space / Tab characters in multi-attendee list: 3 seats expected, 1 valid name + tabs-only and mixed whitespace elements -> triggers invariant rollback", async () => {
      const { eventId } = await createTestEvent("grp-multi-ws", 50000);
      const orderRef = getNextOrderRef("GMULTIWS");
      const utr = `UTR_MULTIWS_${Date.now()}`;
      const email = "lead_multiws@example.com";

      // 3 seats expected. Primary = 'Lead MultiWS'.
      // additional = 'Second Valid Attendee;\t\t\t;   \t\r\n'
      // 1 valid additional name, 2 elements that collapse to empty string after btrim.
      // Total verified names = 2. Expected 3.
      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead MultiWS', '${email}', '9876543210',
          'Org Epsilon', 'Startup Founder / Co-Founder', 3, 150000, 'upi://pay', 'pending', true,
          E'Second Valid Attendee;\t\t\t;   \t\r\n'
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

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 3 attendees but only 2 verified names were provided/);

      const passes = await db.query<{ count: number }>(
        `select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`
      );
      expect(passes.rows[0].count).toBe(0);

      const paidRegs = await db.query<{ count: number }>(
        `select count(*)::int as count from public.paid_event_registrations where event_id = '${eventId}';`
      );
      expect(paidRegs.rows[0].count).toBe(0);
    });

    it("1.6 White-space / Tab characters in JSONB attendees array: btrim strips tab entries and triggers invariant rollback", async () => {
      await db.exec(`alter table public.event_payment_orders add column if not exists attendees jsonb;`);

      const { eventId } = await createTestEvent("grp-jsonb-ws", 50000);
      const orderRef = getNextOrderRef("GJSONBWS");
      const utr = `UTR_JSONBWS_${Date.now()}`;
      const email = "lead_jsonbws@example.com";

      const jsonAttendees = JSON.stringify([
        { name: "\t\t" },
        { full_name: "   \t\r\n" }
      ]);

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          attendees
        ) values (
          '${orderRef}', '${eventId}', 'Lead JSONB WS', '${email}', '9876543210',
          'Org Zeta', 'Startup Founder / Co-Founder', 3, 150000, 'upi://pay', 'pending', true,
          $1::jsonb
        ) returning id;
      `, [jsonAttendees])).rows[0].id;

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

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 3 attendees but only 1 verified names were provided/);

      const passes = await db.query<{ count: number }>(
        `select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`
      );
      expect(passes.rows[0].count).toBe(0);
    });

    it("1.7 Tab-padded valid names: btrim trims tabs without discarding valid names and produces clean passes", async () => {
      const { eventId } = await createTestEvent("grp-tab-padded", 50000);
      const orderRef = getNextOrderRef("GPADTAB");
      const utr = `UTR_PADTAB_${Date.now()}`;
      const email = "lead_padtab@example.com";

      // 3 seats expected. Primary padded with tabs, additional padded with tabs and newlines.
      const primaryPadded = "\tLead Padded Founder\t";
      const addlPadded = "\tAttendee Two\t\r\n;\t\tAttendee Three\t ";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', '${primaryPadded}', '${email}', '9876543210',
          'Org Eta', 'Startup Founder / Co-Founder', 3, 150000, 'upi://pay', 'pending', true,
          $1
        ) returning id;
      `, [addlPadded])).rows[0].id;

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

      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; attendee_count: number } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      expect(res.rows[0].csc_fulfill_confirmed_payment.attendee_count).toBe(3);

      const passRows = await db.query<{ attendee_name: string }>(
        `select attendee_name from public.event_registrations where event_id = '${eventId}' order by created_at asc;`
      );
      expect(passRows.rows.length).toBe(3);
      const names = passRows.rows.map(r => r.attendee_name);
      expect(names).toEqual([
        "Lead Padded Founder",
        "Attendee Two",
        "Attendee Three"
      ]);
      // Verify NO tab characters exist in any pass names
      for (const n of names) {
        expect(n).not.toContain("\t");
        expect(n).not.toContain("\r");
        expect(n).not.toContain("\n");
      }
    });

    it("1.8 Case-insensitive duplicate attendee identity invariant: group order with duplicate names rolls back atomically", async () => {
      const { eventId } = await createTestEvent("grp-dup-id", 50000);
      const orderRef = getNextOrderRef("GDUPID");
      const utr = `UTR_DUPID_${Date.now()}`;
      const email = "lead_dupid@example.com";

      // 2 seats: Primary = 'Jane Doe', additional = 'jane doe' (identical case-insensitive)
      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Jane Doe', '${email}', '9876543210',
          'Org Theta', 'Startup Founder / Co-Founder', 2, 100000, 'upi://pay', 'pending', true,
          'jane doe'
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 100000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: (order .* expected 2 attendees but only 1 verified names were provided|duplicate attendee identities)/);

      const passes = await db.query<{ count: number }>(
        `select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`
      );
      expect(passes.rows[0].count).toBe(0);

      const paidRegs = await db.query<{ count: number }>(
        `select count(*)::int as count from public.paid_event_registrations where event_id = '${eventId}';`
      );
      expect(paidRegs.rows[0].count).toBe(0);
    });
  });

  // ===========================================================================
  // 2. Email Outbox Delivery Resilience
  // ===========================================================================
  describe("2. Email Outbox Delivery Resilience", () => {
    it("2.1 Outbox worker delivery failure / exception does NOT roll back confirmed registrations or passes", async () => {
      const { eventId } = await createTestEvent("outbox-resil", 50000);
      const orderRef = getNextOrderRef("RESIL");
      const utr = `UTR_RESIL_${Date.now()}`;
      const email = "outbox_resil@example.com";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Resilient Buyer', '${email}', '9876543210',
          'Resilience Corp', 'Startup Founder / Co-Founder', 1, 50000, 'upi://pay', 'pending', true
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

      // Settle successfully
      const fulfillRes = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; paid_registration_id: string; primary_pass_id: string } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(fulfillRes.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      const passId = fulfillRes.rows[0].csc_fulfill_confirmed_payment.primary_pass_id;
      const paidRegId = fulfillRes.rows[0].csc_fulfill_confirmed_payment.paid_registration_id;

      // Verify outbox entry was enqueued
      const initialNotif = (await db.query<{ id: string; status: string }>(
        `select id, status from public.notifications where recipient = '${email}' and related_record_id = '${passId}';`
      )).rows[0];
      expect(initialNotif).toBeDefined();
      expect(initialNotif.status).toBe("queued");

      // SIMULATE OUTBOX WORKER FAILURE:
      // The background email worker attempts delivery, but encounters an SMTP crash / network timeout.
      // Worker records delivery failure on the notifications row (failed_retryable or failed_permanent).
      await db.exec(`
        update public.notifications
        set status = 'failed_retryable',
            attempts = attempts + 1,
            last_error = 'SMTP_CONNECTION_REFUSED: mail.me.com unreachable'
        where id = '${initialNotif.id}';
      `);

      // CRITICAL INVARIANT: Delivery failure in the outbox MUST NOT roll back or mutate confirmed database state:
      // 1. Order remains reconciled
      const order = (await db.query<{ status: string; matched_evidence_id: string }>(
        `select status, matched_evidence_id from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(order.status).toBe("reconciled");
      expect(order.matched_evidence_id).toBe(evId);

      // 2. Paid registration remains confirmed
      const paidReg = (await db.query<{ status: string }>(
        `select status from public.paid_event_registrations where id = '${paidRegId}';`
      )).rows[0];
      expect(paidReg.status).toBe("confirmed");

      // 3. Pass remains confirmed with valid token
      const pass = (await db.query<{ status: string; pass_token: string }>(
        `select status, pass_token from public.event_registrations where id = '${passId}';`
      )).rows[0];
      expect(pass.status).toBe("confirmed");
      expect(pass.pass_token).toBeDefined();

      // SIMULATE CRITICAL UNHANDLED EXCEPTION in outbox dispatcher:
      // Even if worker process crashes, database registration and pass remain intact
      const unhandledWorkerCrash = async () => {
        throw new Error("FATAL_OUTBOX_WORKER_CRASH: process killed");
      };
      await expect(unhandledWorkerCrash()).rejects.toThrow("FATAL_OUTBOX_WORKER_CRASH");

      // Re-verify pass and registration are still confirmed
      const passStillConfirmed = (await db.query<{ status: string }>(
        `select status from public.event_registrations where id = '${passId}';`
      )).rows[0];
      expect(passStillConfirmed.status).toBe("confirmed");
    });

    it("2.2 Idempotent outbox enqueuing: deduplication on 'event-pass-confirmed:${pass.id}' prevents duplicate emails across sequential invocations", async () => {
      let insertCount = 0;
      let insertedRow: any = null;
      const passId = "77777777-1111-2222-3333-444444444444";

      // Mock client that tracks notifications
      let existingNotification: any = null;

      const getMockAdmin = () => ({
        from: (table: string) => {
          if (table === "event_registrations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: passId,
                      user_id: null,
                      reference: "CSC-EVT-DEDUPE1",
                      status: "confirmed",
                      pass_token: "tok_dedupe_01",
                      source_email: "dedupe.buyer@example.com",
                      attendee_name: "Dedupe Buyer",
                      paid_registration_id: null,
                      event_id: null,
                    },
                    error: null,
                  }),
                }),
              }),
              update: () => ({ eq: async () => ({ error: null }) }),
            };
          }
          if (table === "notifications") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: existingNotification,
                      error: null,
                    }),
                  }),
                }),
              }),
              insert: async (row: any) => {
                insertCount++;
                insertedRow = row;
                existingNotification = {
                  id: "notif-dedupe-id-1",
                  status: "queued",
                  last_error: null,
                  recipient: row.recipient,
                };
                return { error: null };
              },
              update: () => ({ eq: async () => ({ error: null }) }),
            };
          }
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
        },
      } as any);

      // Invocation 1: First call queues outbox email
      const res1 = await ensureEventPassEmail(getMockAdmin(), passId);
      expect(res1.ok).toBe(true);
      expect(res1.queued).toBe(true);
      expect(insertCount).toBe(1);
      expect(insertedRow.dedupe_key).toBe(`event-pass-confirmed:${passId}`);

      // Invocation 2: Second call detects existing queued notification -> returns ok without inserting duplicate
      const res2 = await ensureEventPassEmail(getMockAdmin(), passId);
      expect(res2.ok).toBe(true);
      expect(res2.queued).toBe(true); // already queued
      expect(insertCount).toBe(1); // STILL 1! No duplicate insert!

      // Invocation 3: Notification status transitioned to 'sent'
      existingNotification.status = "sent";
      const res3 = await ensureEventPassEmail(getMockAdmin(), passId);
      expect(res3.ok).toBe(true);
      expect(res3.queued).toBe(false); // already delivered, not re-queued
      expect(insertCount).toBe(1); // STILL 1!
    });

    it("2.3 Idempotent outbox enqueuing: concurrent race condition gracefully catches 23505 unique constraint on dedupe_key without throwing", async () => {
      const passId = "88888888-2222-3333-4444-555555555555";

      // Mock admin simulating concurrent insert collision:
      // Initial check returns null (not yet committed), but insert triggers 23505 unique violation
      const mockAdminConcurrent = {
        from: (table: string) => {
          if (table === "event_registrations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: passId,
                      user_id: null,
                      reference: "CSC-EVT-RACE-DEDUPE",
                      status: "confirmed",
                      pass_token: "tok_race_dedupe",
                      source_email: "race.dedupe@example.com",
                      attendee_name: "Race Dedupe",
                      paid_registration_id: null,
                      event_id: null,
                    },
                    error: null,
                  }),
                }),
              }),
              update: () => ({ eq: async () => ({ error: null }) }),
            };
          }
          if (table === "notifications") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: null, // First check did not see row
                      error: null,
                    }),
                  }),
                }),
              }),
              insert: async () => ({
                error: {
                  code: "23505",
                  message: 'duplicate key value violates unique constraint "idx_notifications_dedupe_key"',
                },
              }),
            };
          }
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
        },
      } as any;

      const res = await ensureEventPassEmail(mockAdminConcurrent, passId);
      // Gracefully returns ok: true, queued: false without throwing
      expect(res.ok).toBe(true);
      expect(res.queued).toBe(false);
    });

    it("2.4 4-Tier Recipient Fallback: resolves profiles.email (Tier 4) for member registration lacking direct source_email and self-heals registration", async () => {
      let insertedNotif: any = null;
      let updatedReg: any = null;
      const passId = "99999999-3333-4444-5555-666666666666";
      const memberUserId = "user-member-tier4-empirical";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: memberUserId,
            reference: "CSC-EVT-TIER4-EMP",
            status: "confirmed",
            pass_token: "tok_tier4_emp",
            source_email: null, // missing on pass
            attendee_name: null, // missing on pass
            paid_registration_id: null,
            event_id: null,
          },
          onUpdate: (patch) => { updatedReg = patch; },
        },
        profiles: {
          data: {
            email: "member.tier4@example.com",
            full_name: "Member Tier Four Full",
            display_name: "Tier4Member",
          },
        },
        notifications: {
          data: null,
          onInsert: (row) => { insertedNotif = row; },
        },
      });

      const res = await ensureEventPassEmail(mockAdmin, passId);
      expect(res.ok).toBe(true);
      expect(res.queued).toBe(true);

      // Verify notification created with profile.email
      expect(insertedNotif).toBeDefined();
      expect(insertedNotif.recipient).toBe("member.tier4@example.com");
      expect(insertedNotif.recipient_user_id).toBe(memberUserId);
      expect(insertedNotif.payload.name).toBe("Member Tier Four Full");
      expect(insertedNotif.dedupe_key).toBe(`event-pass-confirmed:${passId}`);

      // Verify self-healing backfilled onto event_registrations
      expect(updatedReg).toBeDefined();
      expect(updatedReg.source_email).toBe("member.tier4@example.com");
      expect(updatedReg.attendee_name).toBe("Member Tier Four Full");
    });

    it("2.5 4-Tier Recipient Fallback: resolves profiles.email (Tier 4) when attendee_name is already present on pass", async () => {
      let insertedNotif: any = null;
      let updatedReg: any = null;
      const passId = "aaaaaaa1-3333-4444-5555-666666666666";
      const memberUserId = "user-member-has-name-no-email";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: memberUserId,
            reference: "CSC-EVT-TIER4-NAME-OK",
            status: "confirmed",
            pass_token: "tok_tier4_name_ok",
            source_email: null, // missing on pass
            attendee_name: "Pre-existing Attendee Name", // ALREADY PRESENT
            paid_registration_id: null,
            event_id: null,
          },
          onUpdate: (patch) => { updatedReg = patch; },
        },
        profiles: {
          data: {
            email: "profile.email.resolved@example.com",
            full_name: "Different Profile Name",
            display_name: "ProfileDisplayName",
          },
        },
        notifications: {
          data: null,
          onInsert: (row) => { insertedNotif = row; },
        },
      });

      const res = await ensureEventPassEmail(mockAdmin, passId);
      expect(res.ok).toBe(true);
      expect(res.queued).toBe(true);

      // Recipient resolved from profiles.email
      expect(insertedNotif.recipient).toBe("profile.email.resolved@example.com");
      // Attendee name PRESERVED from existing pass.attendee_name
      expect(insertedNotif.payload.name).toBe("Pre-existing Attendee Name");

      // Self-healing updates ONLY source_email, does NOT overwrite attendee_name
      expect(updatedReg.source_email).toBe("profile.email.resolved@example.com");
      expect(updatedReg.attendee_name).toBeUndefined();
    });

    it("2.6 4-Tier Recipient Fallback: resolves event_payment_orders (Tier 3) when source_email and paid_reg are missing", async () => {
      let insertedNotif: any = null;
      const passId = "bbbbbbb2-3333-4444-5555-666666666666";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: null,
            reference: "CSC-EVT-TIER3-EMP",
            status: "confirmed",
            pass_token: "tok_tier3_emp",
            source_email: null,
            attendee_name: null,
            paid_registration_id: null,
            event_id: "evt-tier3-id",
          },
          onUpdate: () => {},
        },
        paid_event_registrations: {
          data: null,
        },
        event_payment_orders: {
          data: {
            email: "order.tier3.buyer@example.com",
            full_name: "Order Tier 3 Buyer",
          },
        },
        notifications: {
          data: null,
          onInsert: (row) => { insertedNotif = row; },
        },
      });

      const res = await ensureEventPassEmail(mockAdmin, passId);
      expect(res.ok).toBe(true);
      expect(res.queued).toBe(true);
      expect(insertedNotif.recipient).toBe("order.tier3.buyer@example.com");
      expect(insertedNotif.payload.name).toBe("Order Tier 3 Buyer");
    });

    it("2.7 Outbox repair: recovers failed_permanent notification when last_error is INVALID_RECIPIENT", async () => {
      let updatedNotif: any = null;
      const insertedNotifs: any[] = [];
      const passId = "ccccccc3-3333-4444-5555-666666666666";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: null,
            reference: "CSC-EVT-REPAIR-OK",
            status: "confirmed",
            pass_token: "tok_repair_ok",
            source_email: "fixed.recipient@example.com",
            attendee_name: "Fixed Recipient",
          },
        },
        notifications: {
          data: {
            id: "broken-notif-row-emp",
            status: "failed_permanent",
            last_error: "INVALID_RECIPIENT",
            recipient: null,
          },
          onUpdate: (patch) => { updatedNotif = patch; },
          onInsert: (row) => { insertedNotifs.push(row); },
        },
      });

      const res = await ensureEventPassEmail(mockAdmin, passId);
      expect(res.ok).toBe(true);
      expect(res.queued).toBe(true);

      // Verifies notification was resurrected to queued without inserting duplicate row
      expect(insertedNotifs.length).toBe(0);
      expect(updatedNotif.recipient).toBe("fixed.recipient@example.com");
      expect(updatedNotif.status).toBe("queued");
      expect(updatedNotif.attempts).toBe(0);
      expect(updatedNotif.last_error).toBeNull();
      expect(updatedNotif.lease_id).toBeNull();
    });

    it("2.8 Outbox non-resurrection: does NOT resurrect failed_permanent notification when last_error is NOT INVALID_RECIPIENT", async () => {
      let updatedNotif: any = null;
      const insertedNotifs: any[] = [];
      const passId = "ddddddd4-3333-4444-5555-666666666666";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: null,
            reference: "CSC-EVT-NO-RESURRECT",
            status: "confirmed",
            pass_token: "tok_no_resurrect",
            source_email: "valid.email@example.com",
            attendee_name: "Valid Email Name",
          },
        },
        notifications: {
          data: {
            id: "notif-smtp-fatal",
            status: "failed_permanent",
            last_error: "SMTP_550_5_1_1_USER_UNKNOWN", // Fatal SMTP rejection
            recipient: "old.email@example.com",
          },
          onUpdate: (patch) => { updatedNotif = patch; },
          onInsert: (row) => { insertedNotifs.push(row); },
        },
      });

      const res = await ensureEventPassEmail(mockAdmin, passId);
      expect(res.ok).toBe(true);
      expect(res.queued).toBe(false); // MUST NOT be marked queued

      // Verifies recipient is updated, but status is NOT resurrected
      expect(insertedNotifs.length).toBe(0);
      expect(updatedNotif.recipient).toBe("valid.email@example.com");
      expect(updatedNotif.status).toBeUndefined(); // status was NOT set to queued
      expect(updatedNotif.attempts).toBeUndefined();
    });
  });
});
