// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

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

describe("Payment Worker Concurrency & Database Reconciliation", () => {
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
    // Valid reference succeeds
    await db.exec(`
      insert into public.events(id, slug, title, category, starts_at, ends_at, location)
      values ('11111111-1111-4111-8111-111111111111', 'order-test-event', 'Order Test Event', 'networking', now() + interval '1 day', now() + interval '2 days', 'Coimbatore')
      on conflict (slug) do nothing;

      insert into public.event_payment_orders(
        order_reference, event_id, full_name, email, whatsapp, organization, role,
        attendee_count, amount_paise, upi_uri
      ) values (
        'CSC-ORD-ABC123DEF456', '11111111-1111-4111-8111-111111111111', 'Test Attendee',
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
          'INVALID-REF', '11111111-1111-4111-8111-111111111111', 'Bad Attendee',
          'bad@example.com', '9876543210', 'Test Org', 'Student',
          1, 18000, 'upi://pay'
        );
      `)
    ).rejects.toThrow();
  });
});
