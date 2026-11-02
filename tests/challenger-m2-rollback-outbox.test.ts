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

  for (const file of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
}, 30_000);

afterAll(async () => {
  await db?.close();
});

let testSeq = 2000;
function getNextId() {
  testSeq++;
  const hex = testSeq.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

let refCounter = 10000;
function getNextOrderRef(prefix = "CHAL") {
  refCounter++;
  const pad = refCounter.toString(36).toUpperCase().padStart(8, "0");
  return `CSC-ORD-${prefix.toUpperCase()}${pad}`;
}

async function createTestEvent(slugPrefix = "challenger-evt") {
  const eventId = getNextId();
  const slug = `${slugPrefix}-${Date.now()}-${testSeq}`;
  await db.exec(`
    insert into public.events (
      id, slug, title, category, starts_at, ends_at, location,
      capacity, status, registration_state, admission, price_per_attendee
    ) values (
      '${eventId}', '${slug}', 'Challenger Test Event', 'networking',
      now() + interval '1 day', now() + interval '2 days', 'Coimbatore',
      200, 'published', 'open', 'paid', 250.00
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
      'pglite-challenger-test', 'test-v1', '{"fixture":true}'::jsonb, true
    );
  `);
}

/**
 * Creates a flexible chainable mock for SupabaseClient supporting all method chains
 * called by ensureEventPassEmail:
 * - admin.from(table).select(...).eq(...).eq(...).maybeSingle()
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

describe("Adversarial Challenger M2.2: Database Settlement & Atomic Fulfillment", () => {
  describe("1. Exact Group Pass Generation and Atomic Rollback", () => {
    it("rejects group order expecting 2 attendees when additional_attendee_names is NULL and leaves 0 surviving artifacts", async () => {
      const { eventId } = await createTestEvent("grp-null-2");
      const orderRef = getNextOrderRef("GNULL2");
      const utr = `UTR_NULL2_${Date.now()}`;
      const email = "group_null_2@example.com";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead User 2', '${email}', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 2, 50000, 'upi://pay', 'pending', true,
          null
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

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 2 attendees but only 1 verified names were provided/);

      // Verify ZERO surviving artifacts:
      // 1. Order remains pending with unmatched evidence and null paid_registration_id
      const order = (await db.query<{ status: string; matched_evidence_id: string | null; paid_registration_id: string | null }>(
        `select status, matched_evidence_id, paid_registration_id from public.event_payment_orders where id = '${orderId}';`
      )).rows[0];
      expect(order.status).toBe("pending");
      expect(order.matched_evidence_id).toBeNull();
      expect(order.paid_registration_id).toBeNull();

      // 2. Evidence remains unmatched
      const ev = (await db.query<{ reconciliation_state: string; matched_order_id: string | null }>(
        `select reconciliation_state, matched_order_id from public.event_payment_evidence where id = '${evId}';`
      )).rows[0];
      expect(ev.reconciliation_state).toBe("unmatched");
      expect(ev.matched_order_id).toBeNull();

      // 3. paid_event_registrations row count is 0
      const paidRegs = await db.query<{ count: number }>(`select count(*)::int as count from public.paid_event_registrations where event_id = '${eventId}';`);
      expect(paidRegs.rows[0].count).toBe(0);

      // 4. event_registrations (passes) row count is 0
      const passes = await db.query<{ count: number }>(`select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`);
      expect(passes.rows[0].count).toBe(0);

      // 5. notifications row count is 0
      const notifs = await db.query<{ count: number }>(`select count(*)::int as count from public.notifications where recipient = '${email}';`);
      expect(notifs.rows[0].count).toBe(0);

      // 6. event_payment_reconciliation row count is 0
      const recons = await db.query<{ count: number }>(`select count(*)::int as count from public.event_payment_reconciliation where order_id = '${orderId}';`);
      expect(recons.rows[0].count).toBe(0);
    });

    it("rejects group order expecting 2 attendees when additional_attendee_names is spaces-only whitespace and leaves 0 surviving artifacts", async () => {
      const { eventId } = await createTestEvent("grp-white-2");
      const orderRef = getNextOrderRef("GWHITE2");
      const utr = `UTR_WHITE2_${Date.now()}`;
      const email = "group_white_2@example.com";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead User White', '${email}', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 2, 50000, 'upi://pay', 'pending', true,
          '     '
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

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 2 attendees but only 1 verified names were provided/);

      // Verify ZERO surviving artifacts:
      const passes = await db.query<{ count: number }>(`select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`);
      expect(passes.rows[0].count).toBe(0);

      const paidRegs = await db.query<{ count: number }>(`select count(*)::int as count from public.paid_event_registrations where event_id = '${eventId}';`);
      expect(paidRegs.rows[0].count).toBe(0);

      const notifs = await db.query<{ count: number }>(`select count(*)::int as count from public.notifications where recipient = '${email}';`);
      expect(notifs.rows[0].count).toBe(0);

      const order = (await db.query<{ status: string }>(`select status from public.event_payment_orders where id = '${orderId}';`)).rows[0];
      expect(order.status).toBe("pending");
    });

    it("rejects group order expecting 2 attendees when additional_attendee_names is empty string ''", async () => {
      const { eventId } = await createTestEvent("grp-empty-2");
      const orderRef = getNextOrderRef("GEMPTY2");
      const utr = `UTR_EMPTY2_${Date.now()}`;
      const email = "group_empty_2@example.com";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead User Empty', '${email}', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 2, 50000, 'upi://pay', 'pending', true,
          ''
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

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 2 attendees but only 1 verified names were provided/);

      const passes = await db.query<{ count: number }>(`select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`);
      expect(passes.rows[0].count).toBe(0);
    });

    it("rejects group order expecting 4 attendees when only 1 or 2 additional names are provided", async () => {
      const { eventId } = await createTestEvent("grp-part-4");
      const orderRef = getNextOrderRef("GPART4");
      const utr = `UTR_PART4_${Date.now()}`;
      const email = "group_part_4@example.com";

      // 4 attendees expected, but only 2 additional provided via semicolon (total 3 names, missing 1)
      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead User 4', '${email}', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 4, 100000, 'upi://pay', 'pending', true,
          'Member 2; Member 3'
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

      await authorizeAttribution(orderId, evId, orderRef);

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 4 attendees but only 3 verified names were provided/);

      // Verify ZERO surviving artifacts:
      const passes = await db.query<{ count: number }>(`select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`);
      expect(passes.rows[0].count).toBe(0);

      const paidRegs = await db.query<{ count: number }>(`select count(*)::int as count from public.paid_event_registrations where event_id = '${eventId}';`);
      expect(paidRegs.rows[0].count).toBe(0);

      const notifs = await db.query<{ count: number }>(`select count(*)::int as count from public.notifications where recipient = '${email}';`);
      expect(notifs.rows[0].count).toBe(0);

      const order = (await db.query<{ status: string }>(`select status from public.event_payment_orders where id = '${orderId}';`)).rows[0];
      expect(order.status).toBe("pending");
    });

    it("rejects group order expecting 10 attendees with only 5 names and rolls back cleanly", async () => {
      const { eventId } = await createTestEvent("grp-part-10");
      const orderRef = getNextOrderRef("GPART10");
      const utr = `UTR_PART10_${Date.now()}`;
      const email = "group_part_10@example.com";

      // 10 attendees expected, but only 4 additional provided (total 5 names, missing 5)
      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead User 10', '${email}', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 10, 250000, 'upi://pay', 'pending', true,
          'Guest A; Guest B; Guest C; Guest D'
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 250000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await authorizeAttribution(orderId, evId, orderRef);

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: order .* expected 10 attendees but only 5 verified names were provided/);

      // Verify ZERO surviving artifacts:
      const passes = await db.query<{ count: number }>(`select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`);
      expect(passes.rows[0].count).toBe(0);

      const paidRegs = await db.query<{ count: number }>(`select count(*)::int as count from public.paid_event_registrations where event_id = '${eventId}';`);
      expect(paidRegs.rows[0].count).toBe(0);

      const notifs = await db.query<{ count: number }>(`select count(*)::int as count from public.notifications where recipient = '${email}';`);
      expect(notifs.rows[0].count).toBe(0);

      const order = (await db.query<{ status: string }>(`select status from public.event_payment_orders where id = '${orderId}';`)).rows[0];
      expect(order.status).toBe("pending");
    });

    it("successfully fulfills group order with complex names containing commas, quotes, Unicode, leading/trailing whitespace, and newlines", async () => {
      const { eventId } = await createTestEvent("grp-adv-names");
      const orderRef = getNextOrderRef("GADVNAME");
      const utr = `UTR_ADVNAME_${Date.now()}`;
      const email = "lead_adv@example.com";

      // 4 attendees: 1 primary + 3 additional with commas, quotes, Tamil script, French accents, and messy whitespace
      const primaryName = "Dr. M. K. Velumani, Ph.D.";
      const guest1 = "Smith, Jr., Dr. Alice";
      const guest2 = "O'Connor, Tim \"The Strategist\"";
      const guest3 = "அருண் குமார் (Arun Kumar) & René Châteaubriand";

      const rawAdditional = `\r\n\n   ${guest1}   ;\n\n   ${guest2}   ;\r\n   ${guest3}   \n\n`;

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', '${primaryName}', '${email}', '9876543210',
          'DeepTech Labs', 'Startup Founder / Co-Founder', 4, 100000, 'upi://pay', 'pending', true,
          $1
        ) returning id;
      `, [rawAdditional])).rows[0].id;

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

      await authorizeAttribution(orderId, evId, orderRef);

      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; attendee_count: number } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      expect(res.rows[0].csc_fulfill_confirmed_payment.attendee_count).toBe(4);

      // Verify exactly 4 passes created in event_registrations
      const passRows = await db.query<{ attendee_name: string; status: string; source_email: string }>(
        `select attendee_name, status, source_email from public.event_registrations where event_id = '${eventId}' order by created_at asc;`
      );
      expect(passRows.rows.length).toBe(4);

      const generatedNames = passRows.rows.map(r => r.attendee_name);
      expect(generatedNames).toContain(primaryName);
      expect(generatedNames).toContain(guest1);
      expect(generatedNames).toContain(guest2);
      expect(generatedNames).toContain(guest3);

      for (const row of passRows.rows) {
        expect(row.status).toBe("confirmed");
        expect(row.source_email).toBe(email);
      }

      // Outbox notification enqueued for primary recipient
      const notif = await db.query<{ recipient: string; payload: any }>(
        `select recipient, payload from public.notifications where recipient = '${email}' and template_key = 'EventConfirmed';`
      );
      expect(notif.rows.length).toBe(1);
      expect(notif.rows[0].recipient).toBe(email);
      expect(notif.rows[0].payload.attendeeCount).toBe(4);
    });

    it("successfully fulfills group order with JSONB attendees array when column is supported", async () => {
      // Test forward-compatibility of csc_fulfill_confirmed_payment with JSONB attendees column
      await db.exec(`alter table public.event_payment_orders add column if not exists attendees jsonb;`);

      const { eventId } = await createTestEvent("grp-jsonb");
      const orderRef = getNextOrderRef("GJSONB");
      const utr = `UTR_JSONB_${Date.now()}`;
      const email = "jsonb_lead@example.com";

      const primaryName = "Primary Lead";
      const attendeesJson = JSON.stringify([
        { name: "விக்னேஷ் (Vignesh), CTO" },
        "Sarah O'Neill, VP Eng"
      ]);

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          attendees
        ) values (
          '${orderRef}', '${eventId}', '${primaryName}', '${email}', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 3, 75000, 'upi://pay', 'pending', true,
          $1::jsonb
        ) returning id;
      `, [attendeesJson])).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 75000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await authorizeAttribution(orderId, evId, orderRef);

      const res = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; attendee_count: number } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(res.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      expect(res.rows[0].csc_fulfill_confirmed_payment.attendee_count).toBe(3);

      const passRows = await db.query<{ attendee_name: string }>(
        `select attendee_name from public.event_registrations where event_id = '${eventId}' order by created_at asc;`
      );
      expect(passRows.rows.length).toBe(3);
      expect(passRows.rows.map(r => r.attendee_name)).toEqual([
        primaryName,
        "விக்னேஷ் (Vignesh), CTO",
        "Sarah O'Neill, VP Eng"
      ]);
    });
  });

  describe("2. Guest Pass Delivery & 4-Tier Recipient Fallback + Outbox Repair", () => {
    it("delivers pass email for guest registration where user_id is null and source_email is provided directly (Tier 1)", async () => {
      let insertedNotif: any = null;
      const passId = "11111111-2222-3333-4444-555555555555";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: null,
            reference: "CSC-EVT-GUEST01",
            status: "confirmed",
            pass_token: "tok_guest_01",
            source_email: "guest.direct@example.com",
            attendee_name: "Guest Direct",
            paid_registration_id: null,
          },
        },
        notifications: {
          data: null, // no existing notification
          onInsert: (row) => { insertedNotif = row; },
        },
      });

      const res = await ensureEventPassEmail(mockAdmin, passId);
      expect(res.ok).toBe(true);
      expect(res.queued).toBe(true);
      expect(insertedNotif).toBeDefined();
      expect(insertedNotif.recipient).toBe("guest.direct@example.com");
      expect(insertedNotif.recipient_user_id).toBeNull();
      expect(insertedNotif.payload.name).toBe("Guest Direct");
    });

    it("falls back to Tier 2 (paid_event_registrations) when source_email is missing and self-heals registration", async () => {
      let insertedNotif: any = null;
      let updatedReg: any = null;
      const passId = "22222222-3333-4444-5555-666666666666";
      const paidRegId = "paid-reg-tier2-id";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: null,
            reference: "CSC-EVT-TIER2",
            status: "confirmed",
            pass_token: "tok_tier2",
            source_email: null, // missing on pass
            attendee_name: null,
            paid_registration_id: paidRegId,
          },
          onUpdate: (patch) => { updatedReg = patch; },
        },
        paid_event_registrations: {
          data: {
            email: "buyer.tier2@example.com",
            full_name: "Buyer Tier Two",
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
      expect(insertedNotif.recipient).toBe("buyer.tier2@example.com");
      expect(insertedNotif.payload.name).toBe("Buyer Tier Two");
      // Self-healing verified:
      expect(updatedReg.source_email).toBe("buyer.tier2@example.com");
      expect(updatedReg.attendee_name).toBe("Buyer Tier Two");
    });

    it("falls back to Tier 3 (event_payment_orders) when source_email and paid_reg email are both missing", async () => {
      let insertedNotif: any = null;
      let updatedReg: any = null;
      const passId = "33333333-4444-5555-6666-777777777777";
      const paidRegId = "paid-reg-tier3-id";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: null,
            reference: "CSC-EVT-TIER3",
            status: "confirmed",
            pass_token: "tok_tier3",
            source_email: null,
            attendee_name: null,
            paid_registration_id: paidRegId,
            event_id: "evt-tier3-id",
          },
          onUpdate: (patch) => { updatedReg = patch; },
        },
        paid_event_registrations: {
          data: null,
        },
        event_payment_orders: {
          data: {
            email: "order.tier3@example.com",
            full_name: "Order Tier Three",
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
      expect(insertedNotif.recipient).toBe("order.tier3@example.com");
      expect(insertedNotif.payload.name).toBe("Order Tier Three");
      // Self-healing verified:
      expect(updatedReg.source_email).toBe("order.tier3@example.com");
      expect(updatedReg.attendee_name).toBe("Order Tier Three");
    });

    it("falls back to Tier 4 (profiles) when earlier tiers are missing and user_id is present", async () => {
      let insertedNotif: any = null;
      const passId = "44444444-5555-6666-7777-888888888888";
      const memberUserId = "user-member-tier4-id";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: memberUserId,
            reference: "CSC-EVT-TIER4",
            status: "confirmed",
            pass_token: "tok_tier4",
            source_email: "member.source@example.com", // recipient from source
            attendee_name: null, // missing attendee name
            paid_registration_id: null,
            event_id: null,
          },
        },
        profiles: {
          data: {
            full_name: "Member Tier Four",
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
      expect(insertedNotif.recipient).toBe("member.source@example.com");
      expect(insertedNotif.recipient_user_id).toBe(memberUserId);
      expect(insertedNotif.payload.name).toBe("Member Tier Four");
    });

    it("safely handles total resolution exhaustion and returns { ok: false, queued: false }", async () => {
      let insertedNotif: any = null;
      const passId = "55555555-6666-7777-8888-999999999999";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: null,
            reference: "CSC-EVT-FAIL",
            status: "confirmed",
            pass_token: "tok_fail",
            source_email: null,
            attendee_name: null,
            paid_registration_id: null,
            event_id: null,
          },
        },
        notifications: {
          data: null,
          onInsert: (row) => { insertedNotif = row; },
        },
      });

      const res = await ensureEventPassEmail(mockAdmin, passId);
      expect(res.ok).toBe(false);
      expect(res.queued).toBe(false);
      expect(insertedNotif).toBeNull();
    });

    it("repairs outbox notification with status = 'failed_permanent' and last_error = 'INVALID_RECIPIENT'", async () => {
      let updatedNotif: any = null;
      const insertedNotifs: any[] = [];
      const passId = "66666666-7777-8888-9999-000000000000";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: null,
            reference: "CSC-EVT-REPAIR-STRESS",
            status: "confirmed",
            pass_token: "tok_repair_stress",
            source_email: "repaired.recipient@example.com",
            attendee_name: "Repaired Recipient",
          },
        },
        notifications: {
          data: {
            id: "broken-notif-row-1",
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

      // Verify NO new row was inserted (avoids duplicate jobs):
      expect(insertedNotifs.length).toBe(0);

      // Verify existing row was repaired:
      expect(updatedNotif).toBeDefined();
      expect(updatedNotif.recipient).toBe("repaired.recipient@example.com");
      expect(updatedNotif.status).toBe("queued");
      expect(updatedNotif.attempts).toBe(0);
      expect(updatedNotif.last_error).toBeNull();
      expect(updatedNotif.lease_id).toBeNull();
      expect(typeof updatedNotif.available_at).toBe("string");
    });
  });

  describe("3. Partial Unique Index on Active Orders (idx_active_orders_per_email)", () => {
    it("strictly prevents concurrent active orders (pending, processing, verified) for the same event and email", async () => {
      const { eventId } = await createTestEvent("active-idx-stress");
      const baseEmail = "Active.Order.Racer@Example.COM";

      const ref1 = getNextOrderRef("ACT1");
      const ref2 = getNextOrderRef("ACT2");
      const ref3 = getNextOrderRef("ACT3");
      const ref4 = getNextOrderRef("ACT4");

      // 1. Insert first active order with status = 'pending'
      await db.exec(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status
        ) values (
          '${ref1}', '${eventId}', 'Active Racer',
          '${baseEmail}', '9876543210', 'Org', 'Student',
          1, 25000, 'upi://pay', 'pending'
        );
      `);

      // 2. Attempt duplicate with status = 'pending' (different case) -> MUST FAIL
      await expect(
        db.exec(`
          insert into public.event_payment_orders(
            order_reference, event_id, full_name, email, whatsapp, organization, role,
            attendee_count, amount_paise, upi_uri, status
          ) values (
            '${ref2}', '${eventId}', 'Active Racer Duplicate',
            'active.order.racer@example.com', '9876543210', 'Org', 'Student',
            1, 25000, 'upi://pay', 'pending'
          );
        `)
      ).rejects.toThrow(/idx_active_orders_per_email/i);

      // 3. Attempt duplicate with status = 'processing' -> MUST FAIL
      await expect(
        db.exec(`
          insert into public.event_payment_orders(
            order_reference, event_id, full_name, email, whatsapp, organization, role,
            attendee_count, amount_paise, upi_uri, status
          ) values (
            '${ref3}', '${eventId}', 'Active Racer Processing',
            'ACTIVE.ORDER.RACER@EXAMPLE.COM', '9876543210', 'Org', 'Student',
            1, 25000, 'upi://pay', 'processing'
          );
        `)
      ).rejects.toThrow(/idx_active_orders_per_email/i);

      // 4. Attempt duplicate with status = 'verified' -> MUST FAIL
      await expect(
        db.exec(`
          insert into public.event_payment_orders(
            order_reference, event_id, full_name, email, whatsapp, organization, role,
            attendee_count, amount_paise, upi_uri, status
          ) values (
            '${ref4}', '${eventId}', 'Active Racer Verified',
            'active.order.racer@example.com', '9876543210', 'Org', 'Student',
            1, 25000, 'upi://pay', 'verified'
          );
        `)
      ).rejects.toThrow(/idx_active_orders_per_email/i);
    });

    it("allows new active order after previous order enters non-active states (reconciled, expired, failed)", async () => {
      const { eventId } = await createTestEvent("inactive-allow");
      const email = "lifecycle_user@example.com";

      const ref1 = getNextOrderRef("LIFE1");
      const ref2 = getNextOrderRef("LIFE2");
      const ref3 = getNextOrderRef("LIFE3");
      const ref4 = getNextOrderRef("LIFE4");

      // Insert order 1 as pending
      await db.exec(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status
        ) values (
          '${ref1}', '${eventId}', 'Lifecycle User',
          '${email}', '9876543210', 'Org', 'Student',
          1, 25000, 'upi://pay', 'pending'
        );
      `);

      // Transition order 1 to 'reconciled'
      await db.exec(`update public.event_payment_orders set status = 'reconciled' where order_reference = '${ref1}';`);

      // Order 2 with 'pending' can now be inserted for same email and event!
      await db.exec(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status
        ) values (
          '${ref2}', '${eventId}', 'Lifecycle User Again',
          '${email}', '9876543210', 'Org', 'Student',
          1, 25000, 'upi://pay', 'pending'
        );
      `);

      // Transition order 2 to 'expired'
      await db.exec(`update public.event_payment_orders set status = 'expired' where order_reference = '${ref2}';`);

      // Order 3 with 'processing' can now be inserted!
      await db.exec(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status
        ) values (
          '${ref3}', '${eventId}', 'Lifecycle User Third',
          '${email}', '9876543210', 'Org', 'Student',
          1, 25000, 'upi://pay', 'processing'
        );
      `);

      // Transition order 3 to 'failed'
      await db.exec(`update public.event_payment_orders set status = 'failed' where order_reference = '${ref3}';`);

      // Order 4 with 'pending' can now be inserted!
      await db.exec(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status
        ) values (
          '${ref4}', '${eventId}', 'Lifecycle User Fourth',
          '${email}', '9876543210', 'Org', 'Student',
          1, 25000, 'upi://pay', 'pending'
        );
      `);

      const totalOrders = await db.query<{ count: string }>(
        `select count(*)::text as count from public.event_payment_orders where event_id = '${eventId}';`
      );
      expect(totalOrders.rows[0].count).toBe("4");
    });

    it("allows concurrent active orders across different events or different emails", async () => {
      const { eventId: event1 } = await createTestEvent("evt-cross-1");
      const { eventId: event2 } = await createTestEvent("evt-cross-2");
      const sharedEmail = "cross_event_user@example.com";

      const ref1 = getNextOrderRef("CROSS1");
      const ref2 = getNextOrderRef("CROSS2");
      const ref3 = getNextOrderRef("CROSS3");

      // Order on Event 1
      await db.exec(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status
        ) values (
          '${ref1}', '${event1}', 'Cross User',
          '${sharedEmail}', '9876543210', 'Org', 'Student',
          1, 25000, 'upi://pay', 'pending'
        );
      `);

      // Order on Event 2 with SAME email concurrently -> MUST SUCCEED
      await db.exec(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status
        ) values (
          '${ref2}', '${event2}', 'Cross User',
          '${sharedEmail}', '9876543210', 'Org', 'Student',
          1, 25000, 'upi://pay', 'pending'
        );
      `);

      // Order on Event 1 with DIFFERENT email concurrently -> MUST SUCCEED
      await db.exec(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status
        ) values (
          '${ref3}', '${event1}', 'Different User',
          'different_user@example.com', '9876543210', 'Org', 'Student',
          1, 25000, 'upi://pay', 'pending'
        );
      `);

      const e1Orders = await db.query<{ count: string }>(
        `select count(*)::text as count from public.event_payment_orders where event_id = '${event1}';`
      );
      expect(e1Orders.rows[0].count).toBe("2");

      const e2Orders = await db.query<{ count: string }>(
        `select count(*)::text as count from public.event_payment_orders where event_id = '${event2}';`
      );
      expect(e2Orders.rows[0].count).toBe("1");
    });

    it("enforces idx_active_orders_per_email across all 6 active statuses (pending, processing, verified, needs_review, unmatched, underpaid)", async () => {
      const activeStatuses = ["pending", "processing", "verified", "needs_review", "unmatched", "underpaid"] as const;

      for (const status of activeStatuses) {
        const { eventId } = await createTestEvent(`active-${status}`);
        const email = `active_${status}@example.com`;

        const refA = getNextOrderRef(`ACTA${status.slice(0, 3)}`);
        const refB = getNextOrderRef(`ACTB${status.slice(0, 3)}`);

        // First active order with given status
        await db.exec(`
          insert into public.event_payment_orders(
            order_reference, event_id, full_name, email, whatsapp, organization, role,
            attendee_count, amount_paise, upi_uri, status
          ) values (
            '${refA}', '${eventId}', 'Status Tester',
            '${email}', '9876543210', 'Org', 'Student',
            1, 25000, 'upi://pay', '${status}'
          );
        `);

        // Second active order with same email on same event MUST FAIL for all active statuses
        await expect(
          db.exec(`
            insert into public.event_payment_orders(
              order_reference, event_id, full_name, email, whatsapp, organization, role,
              attendee_count, amount_paise, upi_uri, status
            ) values (
              '${refB}', '${eventId}', 'Duplicate Tester',
              '${email}', '9876543210', 'Org', 'Student',
              1, 25000, 'upi://pay', 'pending'
            );
          `)
        ).rejects.toThrow(/idx_active_orders_per_email/i);
      }
    });
  });

  describe("4. Edge-Case Invariant Hardening & Outbox Safety", () => {
    it("rejects group order with duplicate attendee identities (case-insensitive) and rolls back atomically", async () => {
      const { eventId } = await createTestEvent("dup-identities");
      const orderRef = getNextOrderRef("GDUPID");
      const utr = `UTR_DUPID_${Date.now()}`;
      const email = "lead_dup@example.com";

      // 3 attendees: Primary is 'Jane Doe', additional names include 'JANE DOE' (duplicate) and 'Bob Smith'
      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Jane Doe', '${email}', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 3, 75000, 'upi://pay', 'pending', true,
          'JANE DOE; Bob Smith'
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence(
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 75000, '1995',
          '${utr}', now(), 'UPI/P2A/${utr}/USER/IOBA/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<msg-${utr}@axis.bank.in>', 'Credit Alert', 'authenticated'
        ) returning id;
      `)).rows[0].id;

      await authorizeAttribution(orderId, evId, orderRef);

      // Duplicate identity must throw exception
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation: duplicate attendee identities|Pass generation invariant violation/);

      // Verify ZERO surviving artifacts:
      const passes = await db.query<{ count: number }>(`select count(*)::int as count from public.event_registrations where event_id = '${eventId}';`);
      expect(passes.rows[0].count).toBe(0);

      const paidRegs = await db.query<{ count: number }>(`select count(*)::int as count from public.paid_event_registrations where event_id = '${eventId}';`);
      expect(paidRegs.rows[0].count).toBe(0);

      const order = (await db.query<{ status: string }>(`select status from public.event_payment_orders where id = '${orderId}';`)).rows[0];
      expect(order.status).toBe("pending");
    });

    it("ensureEventPassEmail preserves failed_permanent status when last_error is NOT INVALID_RECIPIENT", async () => {
      let updatedNotif: any = null;
      const insertedNotifs: any[] = [];
      const passId = "77777777-8888-9999-0000-111111111111";

      const mockAdmin = createMockSupabaseClient({
        event_registrations: {
          data: {
            id: passId,
            user_id: null,
            reference: "CSC-EVT-PRESERVE",
            status: "confirmed",
            pass_token: "tok_preserve",
            source_email: "valid.user@example.com",
            attendee_name: "Valid User",
          },
        },
        notifications: {
          data: {
            id: "notif-smtp-error",
            status: "failed_permanent",
            last_error: "SMTP_550_USER_UNKNOWN", // Not INVALID_RECIPIENT
            recipient: "old.email@example.com",
          },
          onUpdate: (patch) => { updatedNotif = patch; },
          onInsert: (row) => { insertedNotifs.push(row); },
        },
      });

      const res = await ensureEventPassEmail(mockAdmin, passId);
      expect(res.ok).toBe(true);
      expect(res.queued).toBe(false); // MUST NOT be marked queued

      // Verify recipient updated, but status was NOT resurrected
      expect(insertedNotifs.length).toBe(0);
      expect(updatedNotif.recipient).toBe("valid.user@example.com");
      expect(updatedNotif.status).toBeUndefined(); // status was not updated to queued
      expect(updatedNotif.attempts).toBeUndefined();
    });

    it("rejects tab-only whitespace attendee names and rolls back cleanly", async () => {
      const { eventId } = await createTestEvent("tab-edge-case");
      const orderRef = getNextOrderRef("GTABEDGE");
      const utr = `UTR_TABEDGE_${Date.now()}`;
      const email = "tab_edge@example.com";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders(
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, status, consent_payment_terms,
          additional_attendee_names
        ) values (
          '${orderRef}', '${eventId}', 'Lead User Tab', '${email}', '9876543210',
          'Org', 'Startup Founder / Co-Founder', 2, 50000, 'upi://pay', 'pending', true,
          E'\t'
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

      // Fulfilling with E'\t' is properly rejected because btrim strips tab characters as whitespace
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/Pass generation invariant violation/);
    });
  });
});
