// @vitest-environment node
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("contact submissions & whatsapp outbox database migration", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
    `);

    // Load and run our migration
    const migrationSql = readFileSync(
      join(process.cwd(), "supabase/migrations/20261123233000_contact_submissions_and_whatsapp_outbox.sql"),
      "utf-8"
    );
    await db.exec(migrationSql);
  });

  afterEach(async () => {
    await db?.close();
  });

  it("inserts contact and queues outbox record atomically when consent is true", async () => {
    const res = await db.query<{ submit_contact_inquiry: { contact_id: string; outbox_id: string; whatsapp_status: string } }>(`
      select public.submit_contact_inquiry(
        p_name => 'Vikash Saravanan',
        p_phone => '+919876543210',
        p_phone_chat_id => '919876543210@c.us',
        p_inquiry => 'Inquiring about founder mentorship',
        p_whatsapp_consent => true,
        p_consent_notice_version => '1.0',
        p_source => 'website_contact_form',
        p_idempotency_key => 'idem-test-101'
      ) as submit_contact_inquiry;
    `);

    const outcome = res.rows[0].submit_contact_inquiry;
    expect(outcome.contact_id).toBeDefined();
    expect(outcome.outbox_id).toBeDefined();
    expect(outcome.whatsapp_status).toBe("queued");

    // Verify contact table row
    const contactRows = await db.query<{ name: string; phone: string; whatsapp_consent: boolean }>(`
      select name, phone, whatsapp_consent from public.contact_submissions where id = $1;
    `, [outcome.contact_id]);
    expect(contactRows.rows[0].name).toBe("Vikash Saravanan");
    expect(contactRows.rows[0].phone).toBe("+919876543210");
    expect(contactRows.rows[0].whatsapp_consent).toBe(true);

    // Verify outbox table row
    const outboxRows = await db.query<{ status: string; recipient_chat_id: string; idempotency_key: string }>(`
      select status, recipient_chat_id, idempotency_key from public.whatsapp_message_outbox where id = $1;
    `, [outcome.outbox_id]);
    expect(outboxRows.rows[0].status).toBe("pending");
    expect(outboxRows.rows[0].recipient_chat_id).toBe("919876543210@c.us");
    expect(outboxRows.rows[0].idempotency_key).toBe("idem-test-101");
  });

  it("inserts contact but skips outbox when consent is false", async () => {
    const res = await db.query<{ submit_contact_inquiry: { contact_id: string; outbox_id: string | null; whatsapp_status: string } }>(`
      select public.submit_contact_inquiry(
        p_name => 'No Consent User',
        p_phone => '+919876543211',
        p_phone_chat_id => '919876543211@c.us',
        p_inquiry => 'General note',
        p_whatsapp_consent => false
      ) as submit_contact_inquiry;
    `);

    const outcome = res.rows[0].submit_contact_inquiry;
    expect(outcome.contact_id).toBeDefined();
    expect(outcome.outbox_id).toBeNull();
    expect(outcome.whatsapp_status).toBe("skipped_no_consent");

    const outboxCount = await db.query<{ count: string }>(`
      select count(*) as count from public.whatsapp_message_outbox where contact_id = $1;
    `, [outcome.contact_id]);
    expect(Number(outboxCount.rows[0].count)).toBe(0);
  });

  it("handles idempotency safely by returning existing outcome on duplicate key", async () => {
    const first = await db.query<{ submit_contact_inquiry: { contact_id: string; outbox_id: string; existing: boolean } }>(`
      select public.submit_contact_inquiry(
        p_name => 'Idempotent User',
        p_phone => '+919876543212',
        p_phone_chat_id => '919876543212@c.us',
        p_inquiry => 'First call',
        p_whatsapp_consent => true,
        p_idempotency_key => 'idem-duplicate-check'
      ) as submit_contact_inquiry;
    `);
    expect(first.rows[0].submit_contact_inquiry.existing).toBe(false);

    const second = await db.query<{ submit_contact_inquiry: { contact_id: string; outbox_id: string; existing: boolean } }>(`
      select public.submit_contact_inquiry(
        p_name => 'Idempotent User',
        p_phone => '+919876543212',
        p_phone_chat_id => '919876543212@c.us',
        p_inquiry => 'Second call',
        p_whatsapp_consent => true,
        p_idempotency_key => 'idem-duplicate-check'
      ) as submit_contact_inquiry;
    `);
    expect(second.rows[0].submit_contact_inquiry.existing).toBe(true);
    expect(second.rows[0].submit_contact_inquiry.outbox_id).toBe(first.rows[0].submit_contact_inquiry.outbox_id);

    // Verify exactly one row was created in contact_submissions and outbox
    const outboxTotal = await db.query<{ count: string }>(`
      select count(*) as count from public.whatsapp_message_outbox where idempotency_key = 'idem-duplicate-check';
    `);
    expect(Number(outboxTotal.rows[0].count)).toBe(1);
  });

  it("claims pending outbox batch atomically with row locking", async () => {
    // Insert 2 records
    await db.exec(`
      select public.submit_contact_inquiry(
        p_name => 'User One',
        p_phone => '+919876543213',
        p_phone_chat_id => '919876543213@c.us',
        p_inquiry => 'Question 1',
        p_whatsapp_consent => true,
        p_idempotency_key => 'claim-item-1'
      );
      select public.submit_contact_inquiry(
        p_name => 'User Two',
        p_phone => '+919876543214',
        p_phone_chat_id => '919876543214@c.us',
        p_inquiry => 'Question 2',
        p_whatsapp_consent => true,
        p_idempotency_key => 'claim-item-2'
      );
    `);

    // Claim batch of 10
    const claimed = await db.query<{ id: string; recipient_chat_id: string; attempts: number }>(`
      select * from public.claim_whatsapp_outbox_batch(10, 300);
    `);
    expect(claimed.rows.length).toBe(2);
    expect(claimed.rows[0].attempts).toBe(1);

    // Verify status updated to 'processing'
    const statusCheck = await db.query<{ status: string }>(`
      select status from public.whatsapp_message_outbox where id = $1;
    `, [claimed.rows[0].id]);
    expect(statusCheck.rows[0].status).toBe("processing");

    // Immediate second claim should return 0 rows (since they are in processing)
    const secondClaim = await db.query(`
      select * from public.claim_whatsapp_outbox_batch(10, 300);
    `);
    expect(secondClaim.rows.length).toBe(0);
  });

  it("updates outbox status to accepted_by_gateway with gateway message ID", async () => {
    const res = await db.query<{ submit_contact_inquiry: { outbox_id: string } }>(`
      select public.submit_contact_inquiry(
        p_name => 'Status Update User',
        p_phone => '+919876543215',
        p_phone_chat_id => '919876543215@c.us',
        p_inquiry => 'Status test',
        p_whatsapp_consent => true,
        p_idempotency_key => 'status-update-key'
      ) as submit_contact_inquiry;
    `);
    const outboxId = res.rows[0].submit_contact_inquiry.outbox_id;

    await db.query(`
      select public.update_whatsapp_outbox_status(
        p_outbox_id => $1,
        p_status => 'accepted_by_gateway',
        p_openwa_message_id => 'msg-openwa-7890'
      );
    `, [outboxId]);

    const updated = await db.query<{ status: string; openwa_message_id: string; sent_at: string | null }>(`
      select status, openwa_message_id, sent_at from public.whatsapp_message_outbox where id = $1;
    `, [outboxId]);

    expect(updated.rows[0].status).toBe("accepted_by_gateway");
    expect(updated.rows[0].openwa_message_id).toBe("msg-openwa-7890");
    expect(updated.rows[0].sent_at).not.toBeNull();
  });
});
