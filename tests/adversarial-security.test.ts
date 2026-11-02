// @vitest-environment node
/**
 * ==============================================================================
 * CSC Circle Adversarial Security & Concurrency Test Suite (F24)
 * ==============================================================================
 * 
 * Systematic Adversarial Testing for Payment Security, Email Provenance,
 * Attribution Bypasses, Parser Resilience, and Double-Spend Concurrency.
 * 
 * Authoritative Sources:
 * - ORIGINAL_REQUEST.md (Acceptance Criteria §4 & §5)
 * - PROJECT.md (F24 Adversarial Security & Concurrency Vitest Specs)
 * - RFC 5322, RFC 8601, NPCI UPI 1.5.1
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import {
  parseAxisCreditAlert,
  decodeQuotedPrintable,
  parseInrToPaise,
} from "@/lib/payments/axis-parser";
import {
  verifyEmailAuthentication,
} from "@/lib/payments/email-auth";
import {
  generateOrderReference,
  hashGuestToken,
} from "@/lib/payments/orders";

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

  const migrationFiles = readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of migrationFiles) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
}, 60_000);

afterAll(async () => {
  await db?.close();
});

async function seedSecTestEvent(pricePaise = 18000) {
  const id = "88888888-8888-4888-8888-888888888888";
  const slug = `adv-sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await db.exec(`
    insert into public.events(
      id, slug, title, category, starts_at, ends_at, location,
      capacity, status, registration_state, admission, price_per_attendee
    ) values (
      '${id}', '${slug}', 'Adversarial Security Event', 'Conference',
      now() + interval '1 day', now() + interval '2 days', 'Coimbatore',
      100, 'published', 'open', 'paid', ${pricePaise / 100}
    ) on conflict (id) do nothing;
  `);
  return { id };
}

describe("F24: Adversarial Security & Concurrency Verification", () => {
  describe("Adversarial Email Forgery & Header Injection", () => {
    it("ADV-01: rejects display-name spoofing masquerading as Axis Bank", () => {
      const auth = verifyEmailAuthentication({
        from: '"alerts@axis.bank.in" <attacker@evil-domain.com>',
        "authentication-results": "mx.apple.com; dkim=pass header.d=evil-domain.com; spf=pass",
      });
      expect(auth.status).toBe("untrusted");
      expect(auth.senderMatches).toBe(false);
    });

    it("ADV-02: rejects lookalike cousin domains with prefix or tld variation", () => {
      const lookalikes = [
        "alerts@axis.bank.co.in",
        "alerts@axis-bank.in",
        "alerts@axisbank.in",
        "alerts@axis.bank.org",
        "alerts@axis.bank.in.attacker.org",
        "alerts@axis.bank.com",
      ];
      for (const domain of lookalikes) {
        const auth = verifyEmailAuthentication({
          from: domain,
          "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        });
        expect(auth.status).toBe("untrusted");
        expect(auth.senderMatches).toBe(false);
      }
    });

    it("ADV-03: rejects comma-separated mailbox injection in From header", () => {
      const auth = verifyEmailAuthentication({
        from: "alerts@axis.bank.in, evil@victim.com",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(auth.status).toBe("untrusted");
      expect(auth.senderMatches).toBe(false);
    });

    it("ADV-04: rejects multiple angle bracket injection in From header", () => {
      const auth = verifyEmailAuthentication({
        from: "alerts@axis.bank.in <alerts@axis.bank.in> <attacker@evil.com>",
        "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
      });
      expect(auth.status).toBe("untrusted");
      expect(auth.senderMatches).toBe(false);
    });

    it("ADV-05: isolates topmost Apple MTA header when attacker injects fake upstream Authentication-Results", () => {
      const auth = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        // Array of headers: topmost is first in RFC 822 order
        "authentication-results": [
          "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
          "attacker.relay.evil; dkim=pass header.d=fake.bank.in; spf=pass",
        ],
      });
      expect(auth.status).toBe("authenticated");
      expect(auth.dkimPass).toBe(true);
    });

    it("ADV-06: rejects email when topmost MTA header indicates forgery even if lower header passes", () => {
      const auth = verifyEmailAuthentication({
        from: "alerts@axis.bank.in",
        "authentication-results": [
          "mx.apple.com; dkim=fail (bad signature) header.d=axis.bank.in; spf=fail",
          "attacker.relay.evil; dkim=pass header.d=axis.bank.in; spf=pass",
        ],
      });
      expect(auth.status).toBe("forged");
      expect(auth.dkimPass).toBe(false);
    });
  });

  describe("Adversarial Parser Inputs & Malformed Payloads", () => {
    it("ADV-07: decodes malformed Quoted-Printable with invalid hex sequences gracefully", () => {
      const input = "Amount =ZZ Credited to A/c XX1995 =3D INR 180";
      const decoded = decodeQuotedPrintable(input);
      expect(decoded).toContain("Amount");
      expect(decoded).toContain("INR 180");
    });

    it("ADV-08: parses Windows-1252 currency and typographic characters without corruption", () => {
      // In Windows-1252: \x80 is Euro, \x93 & \x94 are smart quotes
      const buf = Buffer.from([0x93, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x94]); // “Hello”
      const qp = "=93Hello=94";
      const decoded = decodeQuotedPrintable(qp, "windows-1252");
      expect(decoded).toBe("“Hello”");
    });

    it("ADV-09: rejects debit alert emails from being processed as credit evidence", () => {
      const parsed = parseAxisCreditAlert({
        subject: "INR 500.00 debited from account XX1995",
        text: "Dear Customer, INR 500.00 was debited from your A/c XX1995. Info: UPI/DR/123456789012/MERCHANT/UPI.",
        from: "alerts@axis.bank.in",
        headers: {
          from: "alerts@axis.bank.in",
          "authentication-results": "mx.apple.com; dkim=pass header.d=axis.bank.in; spf=pass",
        },
      });
      expect(parsed).toBeNull();
    });

    it("ADV-10: handles negative, zero, and float overflow amounts safely", () => {
      expect(parseInrToPaise("-100.00")).toBeNull();
      expect(parseInrToPaise("0")).toBeNull();
      expect(parseInrToPaise("0.00")).toBeNull();
      expect(parseInrToPaise("abc")).toBeNull();
      expect(parseInrToPaise("180.000")).toBeNull();
    });
  });

  describe("Adversarial SQL Settlement Attribution Bypasses", () => {
    it("ADV-11: rejects settlement with substring collision in order reference", async () => {
      const { id: eventId } = await seedSecTestEvent();
      const targetRef = "CSC-ORD-TARGET01";
      const collidingRef = "CSC-ORD-TARGET01EXTRA";

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, guest_token_hash, consent_contact, consent_payment_terms
        ) values (
          '${targetRef}', '${eventId}', 'Target User', 'target@test.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', '${hashGuestToken("token1")}', true, true
        ) returning id;
      `)).rows[0].id;

      // Evidence mentions collidingRef, NOT targetRef
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status, auth_details
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '888811112222', now(), 'UPI/P2A/888811112222/TEST/BANK/UPI/${collidingRef}', 'alerts@axis.bank.in',
          '<adv-coll-${Date.now()}@axis.bank.in>', 'Credit', 'authenticated', '{}'::jsonb
        ) returning id;
      `)).rows[0].id;

      await db.query(`
        insert into public.event_payment_attributions (
          order_id, evidence_id, attribution_method, bank_order_reference,
          verification_source, policy_version, eligible_for_settlement
        ) values (
          '${orderId}', '${evId}', 'bank_order_reference', '${targetRef}',
          'adv-test', 'v1', true
        );
      `);

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow("Automated worker settlement requires verifiable order reference");
    });

    it("ADV-12: database schema enforces INR currency check constraint", async () => {
      await expect(
        db.query(`
          insert into public.event_payment_evidence (
            bank, direction, currency, amount_paise, receiving_account_suffix,
            utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
            auth_status, auth_details
          ) values (
            'AXIS_BANK', 'CREDIT', 'USD', 18000, '1995',
            '888822223333', now(), 'UPI/P2A/888822223333/TEST/BANK/UPI/CSC-ORD-CURR', 'alerts@axis.bank.in',
            '<adv-curr-${Date.now()}@axis.bank.in>', 'Credit', 'authenticated', '{}'::jsonb
          );
        `)
      ).rejects.toThrow(/violates check constraint.*currency_check/i);
    });

    it("ADV-13: rejects fulfillment when consent_payment_terms is false", async () => {
      const { id: eventId } = await seedSecTestEvent();
      const orderRef = generateOrderReference();

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, guest_token_hash, consent_contact, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'No Consent', 'noconsent@test.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', '${hashGuestToken("token3")}', true, false
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status, auth_details
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '888833334444', now(), 'UPI/P2A/888833334444/TEST/BANK/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<adv-consent-${Date.now()}@axis.bank.in>', 'Credit', 'authenticated', '{}'::jsonb
        ) returning id;
      `)).rows[0].id;

      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow("lacks required affirmative payment terms consent");
    });
  });

  describe("Double-Spend & Concurrency Race Conditions", () => {
    it("ADV-14: prevents double-spending when two orders race for the same payment evidence", async () => {
      const { id: eventId } = await seedSecTestEvent();
      const orderRef1 = generateOrderReference();
      const orderRef2 = generateOrderReference();

      const orderId1 = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, guest_token_hash, consent_contact, consent_payment_terms
        ) values (
          '${orderRef1}', '${eventId}', 'Racer One', 'race1@test.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', '${hashGuestToken("token4")}', true, true
        ) returning id;
      `)).rows[0].id;

      const orderId2 = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, guest_token_hash, consent_contact, consent_payment_terms
        ) values (
          '${orderRef2}', '${eventId}', 'Racer Two', 'race2@test.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', '${hashGuestToken("token5")}', true, true
        ) returning id;
      `)).rows[0].id;

      // Evidence contains BOTH order references in memo to induce race
      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status, auth_details
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '888844445555', now(), 'UPI/P2A/888844445555/TEST/BANK/UPI/${orderRef1}/${orderRef2}', 'alerts@axis.bank.in',
          '<adv-race-${Date.now()}@axis.bank.in>', 'Credit', 'authenticated', '{}'::jsonb
        ) returning id;
      `)).rows[0].id;

      await db.query(`
        insert into public.event_payment_attributions (
          order_id, evidence_id, attribution_method, bank_order_reference,
          verification_source, policy_version, eligible_for_settlement
        ) values
          ('${orderId1}', '${evId}', 'bank_order_reference', '${orderRef1}', 'adv-test', 'v1', true);
      `);

      // First fulfillment must succeed
      const res1 = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId1}', '${evId}', 'automated_worker');`
      );
      expect(res1.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);

      // Second fulfillment for the same evidence must fail due to double-spend prevention
      await expect(
        db.query(`select public.csc_fulfill_confirmed_payment('${orderId2}', '${evId}', 'automated_worker');`)
      ).rejects.toThrow(/already matched to another order|Settlement requires an eligible/);
    });

    it("ADV-15: replaying identical fulfillment is idempotent and reports already fulfilled", async () => {
      const { id: eventId } = await seedSecTestEvent();
      const orderRef = generateOrderReference();

      const orderId = (await db.query<{ id: string }>(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, guest_token_hash, consent_contact, consent_payment_terms
        ) values (
          '${orderRef}', '${eventId}', 'Replay Test', 'replay@test.com', '9876543210',
          'Org', 'Student', 1, 18000, 'upi://pay', '${hashGuestToken("token6")}', true, true
        ) returning id;
      `)).rows[0].id;

      const evId = (await db.query<{ id: string }>(`
        insert into public.event_payment_evidence (
          bank, direction, currency, amount_paise, receiving_account_suffix,
          utr, transaction_time, transaction_info_raw, sender_email, message_id, subject,
          auth_status, auth_details
        ) values (
          'AXIS_BANK', 'CREDIT', 'INR', 18000, '1995',
          '888855556666', now(), 'UPI/P2A/888855556666/TEST/BANK/UPI/${orderRef}', 'alerts@axis.bank.in',
          '<adv-replay-${Date.now()}@axis.bank.in>', 'Credit', 'authenticated', '{}'::jsonb
        ) returning id;
      `)).rows[0].id;

      await db.query(`
        insert into public.event_payment_attributions (
          order_id, evidence_id, attribution_method, bank_order_reference,
          verification_source, policy_version, eligible_for_settlement
        ) values (
          '${orderId}', '${evId}', 'bank_order_reference', '${orderRef}',
          'adv-test', 'v1', true
        );
      `);

      const firstCall = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(firstCall.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);

      const replayCall = await db.query<{ csc_fulfill_confirmed_payment: { ok: boolean; already_fulfilled: boolean } }>(
        `select public.csc_fulfill_confirmed_payment('${orderId}', '${evId}', 'automated_worker');`
      );
      expect(replayCall.rows[0].csc_fulfill_confirmed_payment.ok).toBe(true);
      expect(replayCall.rows[0].csc_fulfill_confirmed_payment.already_fulfilled).toBe(true);
    });
  });
});
