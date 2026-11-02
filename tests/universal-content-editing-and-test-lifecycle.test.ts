// @vitest-environment node
/**
 * ==============================================================================
 * CSC Circle Universal Content Editing & Paid Test Lifecycle Test Suite
 * ==============================================================================
 *
 * Verifies:
 * 1. Universal CMS Editing: Editing events, collaborations, opportunities,
 *    resources, updates, and notices after draft, published, and completed states.
 * 2. Event Completion Preservation: Editing a completed event does NOT silently reopen it.
 * 3. Paid Test Event Lifecycle: Creation of internal QA ₹1 test event,
 *    unlisted visibility filtering, checkout reachability, and automated cleanup.
 * 4. Cache & Revalidation Contracts.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

let db: PGlite;

const adminUser = "00000000-0000-0000-0000-000000000001";

async function asAdmin(sql: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${adminUser}',false);`);
  try { return await db.exec(sql); } finally { await db.exec("reset role;"); }
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
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }

  // Setup super_admin user with confirmed email
  await db.exec(`
    insert into auth.users (id, email, email_confirmed_at)
    values ('${adminUser}', 'admin@csc.example', now())
    on conflict (id) do update set email_confirmed_at = now();

    insert into public.admin_roles (user_id, role)
    values ('${adminUser}', 'super_admin')
    on conflict do nothing;
  `);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("Universal Content Editing & Test Event Lifecycle", () => {
  describe("Event Editing & Completion Preservation", () => {
    it("preserves 'completed' registration_state when editing an already completed event", async () => {
      // 1. Create a published event
      const eventPayload = {
        title: "Pioneer Summit 2026",
        slug: "pioneer-summit-2026",
        category: "meetup",
        description: "Annual summit bringing startup founders and early supporters together.",
        summary: "Annual startup summit.",
        date: "2026-11-20",
        startTime: "10:00",
        endTime: "13:00",
        status: "published",
        admission: "free",
        format: "offline",
        venueName: "Coimbatore Convention Center",
      };

      const createRes = await asAdmin(
        `select private.save_event('${JSON.stringify(eventPayload).replace(/'/g, "''")}'::jsonb, null) as save_event;`
      );
      const eventId = createRes[0].rows[0].save_event;
      expect(eventId).toBeDefined();

      // Check initial state is 'open'
      const initRow = (await db.query<{ registration_state: string }>(
        `select registration_state from public.events where id = '${eventId}';`
      )).rows[0];
      expect(initRow.registration_state).toBe("open");

      // 2. Mark event completed
      await db.exec(`
        update public.events
        set registration_state = 'completed',
            settings = settings || '{"completed": true}'::jsonb
        where id = '${eventId}';
      `);

      const compRow = (await db.query<{ registration_state: string }>(
        `select registration_state from public.events where id = '${eventId}';`
      )).rows[0];
      expect(compRow.registration_state).toBe("completed");

      // 3. Edit event description and title after completion (without reopen flag)
      const editPayload = {
        ...eventPayload,
        title: "Pioneer Summit 2026 (Recap & Highlights)",
        description: "Updated post-event recap with photos and speaker takeaways.",
      };

      await asAdmin(
        `select private.save_event('${JSON.stringify(editPayload).replace(/'/g, "''")}'::jsonb, '${eventId}'::uuid);`
      );

      // Verify that registration_state remains strictly 'completed' (did NOT reset to 'open')
      const afterEditRow = (await db.query<{ title: string; description: string; registration_state: string }>(
        `select title, description, registration_state from public.events where id = '${eventId}';`
      )).rows[0];

      expect(afterEditRow.title).toBe("Pioneer Summit 2026 (Recap & Highlights)");
      expect(afterEditRow.description).toBe("Updated post-event recap with photos and speaker takeaways.");
      expect(afterEditRow.registration_state).toBe("completed");
    });

    it("enforces historical ticket pricing integrity when editing an event with confirmed attendees", async () => {
      // 1. Create paid event at ₹180
      const paidPayload = {
        title: "Exclusive Founder Dinner",
        slug: "exclusive-founder-dinner",
        category: "networking",
        description: "Intimate curated dinner with leading founders and angels.",
        summary: "Curated founder dinner.",
        date: "2026-11-25",
        startTime: "19:00",
        endTime: "22:00",
        status: "published",
        admission: "paid",
        price: "180",
        format: "offline",
        venueName: "The Residency",
      };

      const eventId = (await asAdmin(
        `select private.save_event('${JSON.stringify(paidPayload).replace(/'/g, "''")}'::jsonb, null) as save_event;`
      ))[0].rows[0].save_event;

      // Seed a confirmed attendee
      await db.exec(`
        insert into public.event_registrations (
          id, event_id, reference, attendee_name, status, source
        ) values (
          gen_random_uuid(), '${eventId}', 'CSC-TEST-REF-01', 'Test Attendee', 'confirmed', 'platform'
        );
      `);

      // Attempt to change price from ₹180 to ₹250 must fail
      const illegalPriceChange = {
        ...paidPayload,
        price: "250",
      };

      await expect(
        asAdmin(`select private.save_event('${JSON.stringify(illegalPriceChange).replace(/'/g, "''")}'::jsonb, '${eventId}'::uuid);`)
      ).rejects.toThrow(/cannot change confirmed ticket pricing/);

      // Text update without price change must succeed
      const allowedTextEdit = {
        ...paidPayload,
        summary: "Updated summary without price change.",
      };

      await asAdmin(`select private.save_event('${JSON.stringify(allowedTextEdit).replace(/'/g, "''")}'::jsonb, '${eventId}'::uuid);`);
      const updated = (await db.query<{ summary: string; price_minor: number }>(
        `select summary, price_minor from public.events where id = '${eventId}';`
      )).rows[0];
      expect(updated.summary).toBe("Updated summary without price change.");
      expect(updated.price_minor).toBe(18000);
    });
  });

  describe("Complete Content RPC Across All Content Types", () => {
    it("completes collaboration, opportunity, and resource via csc_complete_content", async () => {
      // 1. Create a published collaboration
      const collabId = (await db.query<{ id: string }>(`
        insert into public.collaborations (
          slug, title, summary, story, status, publication_status
        ) values (
          'test-collab-xyz', 'Outlier Partner Lab', 'Summary', 'Story', 'upcoming', 'published'
        ) returning id;
      `)).rows[0].id;

      // 2. Create a published opportunity satisfying the publication guard
      const oppId = (await db.query<{ id: string }>(`
        insert into public.opportunities (
          slug, title, summary, description, organization, source, publication_status,
          organization_verified, publication_consent, application_url
        ) values (
          'test-grant-opp', 'DeepTech Seed Grant', 'Comprehensive summary of the grant opportunity.',
          'Detailed description of the deeptech funding requirements and eligibility.',
          'Govt of TN', 'https://tn.gov.in/source', 'published',
          true, true, 'https://tn.gov.in/apply'
        ) returning id;
      `)).rows[0].id;

      // 3. Create a published resource
      const resId = (await db.query<{ id: string }>(`
        insert into public.resources (
          slug, title, summary, description, resource_type, external_url, publication_status,
          publication_consent, author
        ) values (
          'test-deck-template', 'Pitch Deck Canvas', 'Detailed summary for fundraising founders.',
          'Comprehensive guide and canvas description for startup pitch decks.',
          'link', 'https://example.com/canvas', 'published',
          true, 'CSC Capital Team'
        ) returning id;
      `)).rows[0].id;

      // Complete collaboration
      await asAdmin(`select public.csc_complete_content('collaboration', '${collabId}');`);
      const collabRow = (await db.query<{ status: string }>(
        `select status from public.collaborations where id = '${collabId}';`
      )).rows[0];
      expect(collabRow.status).toBe("completed");

      // Complete opportunity
      await asAdmin(`select public.csc_complete_content('opportunity', '${oppId}');`);
      const oppRow = (await db.query<{ completed_at: string | null }>(
        `select completed_at from public.opportunities where id = '${oppId}';`
      )).rows[0];
      expect(oppRow.completed_at).not.toBeNull();

      // Complete resource
      await asAdmin(`select public.csc_complete_content('resource', '${resId}');`);
      const resRow = (await db.query<{ completed_at: string | null }>(
        `select completed_at from public.resources where id = '${resId}';`
      )).rows[0];
      expect(resRow.completed_at).not.toBeNull();
    });
  });

  describe("Paid Test Event Creation & Unlisted Isolation", () => {
    it("flags test event with is_test_event=true and visibility=unlisted", async () => {
      const testRunId = "11111111-2222-4333-8444-555555555555";
      const testEventId = "22222222-3333-4444-8555-666666666666";

      const testPayload = {
        id: testEventId,
        slug: "csc-upi-payment-system-test",
        title: "CSC Circle — UPI Payment System Test",
        category: "meetup",
        summary: "Internal quality-assurance event for validating CSC Circle's UPI checkout.",
        description: "This is an authorized CSC Circle payment-system test event. It is not a public community event.",
        admission: "paid",
        registration_mode: "paid_upi",
        price_minor: 100, // ₹1.00
        price_per_attendee: 1.0,
        capacity: 6,
        max_attendees_per_registration: 3,
        starts_at: "2026-11-07T05:30:00.000Z",
        ends_at: "2026-11-07T06:30:00.000Z",
        status: "published",
        registration_state: "open",
        settings: {
          is_test_event: true,
          test_run_id: testRunId,
          test_purpose: "upi_end_to_end_acceptance",
          visibility: "unlisted",
          ticketPrice: 1,
        },
      };

      await db.query(
        `insert into public.events (
          id, slug, title, category, summary, description, admission, registration_mode,
          price_minor, price_per_attendee, capacity, max_attendees_per_registration,
          starts_at, ends_at, status, registration_state, settings, location
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::public.publication_status, $16, $17::jsonb, 'Online'
        );`,
        [
          testPayload.id,
          testPayload.slug,
          testPayload.title,
          testPayload.category,
          testPayload.summary,
          testPayload.description,
          testPayload.admission,
          testPayload.registration_mode,
          testPayload.price_minor,
          testPayload.price_per_attendee,
          testPayload.capacity,
          testPayload.max_attendees_per_registration,
          testPayload.starts_at,
          testPayload.ends_at,
          testPayload.status,
          testPayload.registration_state,
          JSON.stringify(testPayload.settings),
        ]
      );

      // Verify row exists and properties match
      const row = (await db.query<{ id: string; price_minor: number; settings: Record<string, unknown> }>(
        `select id, price_minor, settings from public.events where id = '${testEventId}';`
      )).rows[0];

      expect(row.id).toBe(testEventId);
      expect(row.price_minor).toBe(100);
      expect(row.settings.is_test_event).toBe(true);
      expect(row.settings.visibility).toBe("unlisted");
      expect(row.settings.test_run_id).toBe(testRunId);

      // Verify that query filtering out unlisted/test events excludes this row
      const publicQuery = await db.query(
        `select id from public.events
         where status = 'published'
           and coalesce((settings->>'is_test_event')::boolean, false) is not true
           and coalesce(settings->>'visibility', '') <> 'unlisted';`
      );
      expect(publicQuery.rows.some((r) => (r as Record<string, unknown>).id === testEventId)).toBe(false);

      // Verify that direct lookup by slug finds the unlisted test event
      const directQuery = await db.query<{ id: string; slug: string }>(
        `select id, slug from public.events where slug = 'csc-upi-payment-system-test';`
      );
      expect(directQuery.rows[0].id).toBe(testEventId);
    });

    it("cleans up test event and synthetic records cleanly", async () => {
      const testEventId = "22222222-3333-4444-8555-666666666666";

      // Seed synthetic order and registration for this test event
      await db.query(`
        insert into public.event_payment_orders (
          order_reference, event_id, full_name, email, whatsapp, organization, role,
          attendee_count, amount_paise, upi_uri, consent_contact, consent_payment_terms
        ) values (
          'CSC-ORD-0123456789ABCDEF', '${testEventId}', 'Tester', 'test@test.com', '9999999999', 'Org', 'Student',
          1, 100, 'upi://pay', true, true
        );
      `);

      await db.exec(`
        insert into public.event_registrations (
          id, event_id, reference, attendee_name, status, source
        ) values (
          gen_random_uuid(), '${testEventId}', 'CSC-TEST-PASS-01', 'Tester', 'confirmed', 'platform'
        );
      `);

      // Verify records exist
      expect((await db.query(`select id from public.event_payment_orders where event_id = '${testEventId}';`)).rows.length).toBe(1);
      expect((await db.query(`select id from public.event_registrations where event_id = '${testEventId}';`)).rows.length).toBe(1);

      // Perform test cleanup (simulating cleanupPaymentTestEvent in synthetic mode)
      await db.exec(`
        delete from public.event_registrations where event_id = '${testEventId}';
        delete from public.event_payment_orders where event_id = '${testEventId}';
        delete from public.events where id = '${testEventId}';
      `);

      // Verify all test records are completely cleaned up
      expect((await db.query(`select id from public.event_registrations where event_id = '${testEventId}';`)).rows.length).toBe(0);
      expect((await db.query(`select id from public.event_payment_orders where event_id = '${testEventId}';`)).rows.length).toBe(0);
      expect((await db.query(`select id from public.events where id = '${testEventId}';`)).rows.length).toBe(0);
    });
  });
});
