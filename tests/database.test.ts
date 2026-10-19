// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
let db: PGlite;
const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function asUser(id: string, sql: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);
  try { return await db.exec(sql); } finally { await db.exec("reset role;"); }
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
  `);
  for (const file of readdirSync("supabase/migrations").filter(f => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values ('${a}','a@example.test',now()),('${b}','b@example.test',now());`);
}, 30_000);
afterAll(async () => { await db?.close(); });
describe("isolated PostgreSQL authorization regressions", () => {
  it("bootstraps exactly one non-active membership and profile per Auth UUID", async () => {
    const result = await db.query("select count(*)::int as n from memberships where status='not_started'");
    expect(result.rows).toEqual([{ n: 2 }]);
  });
  it("isolates private profiles between users", async () => {
    const result = await asUser(a, "select id from profiles");
    expect(result[0].rows).toEqual([{ id: a }]);
  });
  it("cannot activate membership or assign roles", async () => {
    const result = await asUser(a, `update memberships set status='active' where user_id='${a}' returning id`);
    expect(result[0].rows).toHaveLength(0);
    await expect(asUser(a, `insert into admin_roles(user_id,role) values ('${a}','super_admin')`)).rejects.toThrow();
  });
  it("cannot self-approve a review", async () => {
    await expect(asUser(a, `insert into reviews(user_id,rating,review,moderation) values ('${a}',5,'A sufficiently detailed test review','approved')`)).rejects.toThrow();
    await asUser(a, `insert into reviews(user_id,rating,review) values ('${a}',3,'A sufficiently detailed test review')`);
    await expect(asUser(a, `update reviews set moderation='approved' where user_id='${a}'`)).rejects.toThrow();
  });
  it("cannot publish its own startup directly", async () => {
    await expect(asUser(a, `insert into directory_startups(user_id,slug,name,status) values ('${a}','test-startup','Test Startup','published')`)).rejects.toThrow();
  });
  it("cannot use anonymous submission RPCs to bypass server validation", async () => {
    await db.exec("set role anon;");
    try { await expect(db.exec("select submit_consultation('a','b','c','d','e')")).rejects.toThrow(); }
    finally { await db.exec("reset role;"); }
  });
  it("blocks suspended users even with a valid UUID", async () => {
    await db.exec(`update memberships set status='suspended' where user_id='${b}'`);
    const result = await asUser(b, "select id from profiles");
    expect(result[0].rows).toHaveLength(0);
  });
  it("check-in staff cannot read private profiles or payment authority", async () => {
    await db.exec(`insert into admin_roles(user_id,role) values ('${a}','checkin_staff')`);
    const result = await asUser(a, "select private.has_permission('payments.verify') as pay, private.has_permission('attendance.scan') as scan");
    expect(result[0].rows).toEqual([{ pay: false, scan: true }]);
    await db.exec(`delete from admin_roles where user_id='${a}'`);
  });
  it("revoked admin role loses permission immediately", async () => {
    await db.exec(`insert into admin_roles(user_id,role) values ('${a}','community_admin')`);
    expect((await asUser(a, "select private.has_permission('members.approve') as allowed"))[0].rows).toEqual([{ allowed: true }]);
    await db.exec(`delete from admin_roles where user_id='${a}'`);
    expect((await asUser(a, "select private.has_permission('members.approve') as allowed"))[0].rows).toEqual([{ allowed: false }]);
  });
});

const admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const event = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
describe("trusted operations and replay protection", () => {
  beforeAll(async () => {
    await db.exec(`insert into auth.users(id,email,email_confirmed_at) values ('${admin}','admin@example.test',now());
      insert into admin_roles(user_id,role) values ('${admin}','super_admin');
      update memberships set status='active' where user_id in ('${a}','${b}');
      insert into events(id,slug,title,category,starts_at,ends_at,location,capacity,status,admission,registration_state)
      values ('${event}','isolated-event','Isolated Test Event','meetup',now()+interval '1 hour',now()+interval '3 hours','Test venue',1,'published','free','open');`);
  });
  it("registers idempotently without issuing a pass", async () => {
    const first = await asUser(a, `select csc_register_event('${event}','Networking') as result`);
    const second = await asUser(a, `select csc_register_event('${event}','Networking') as result`);
    expect(first[0].rows).toEqual(second[0].rows);
    expect((await db.query("select pass_token from event_registrations where user_id=$1", [a])).rows).toEqual([{ pass_token: null }]);
  });
  it("denies member approval and serializes final-seat decisions", async () => {
    await asUser(b, `select csc_register_event('${event}','Mentorship')`);
    const rows = await db.query<{ id: string; user_id: string }>("select id,user_id from event_registrations order by user_id");
    const one = rows.rows.find(r => r.user_id === a)!.id;
    const two = rows.rows.find(r => r.user_id === b)!.id;
    await expect(asUser(a, `select csc_admin_action('registration','${one}','confirmed','')`)).rejects.toThrow();
    await asUser(admin, `select csc_admin_action('registration','${one}','confirmed','')`);
    await expect(asUser(admin, `select csc_admin_action('registration','${two}','confirmed','')`)).rejects.toThrow(/full/);
    expect((await db.query("select count(*)::int as n from event_registrations where status='confirmed'")).rows).toEqual([{ n: 1 }]);
  });
  it("rejects a forged token and duplicate check-in", async () => {
    expect((await asUser(admin, `select csc_check_in('${event}','${"0".repeat(64)}') as result`))[0].rows).toEqual([{ result: { status: "invalid" } }]);
    const { rows } = await db.query<{ pass_token: string }>("select pass_token from event_registrations where user_id=$1", [a]);
    const token = rows[0].pass_token;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const first = await asUser(admin, `select csc_check_in('${event}','${token}') as result`);
    expect((first[0].rows[0] as { result: { status: string } }).result.status).toBe("valid");
    const second = await asUser(admin, `select csc_check_in('${event}','${token}') as result`);
    expect((second[0].rows[0] as { result: { status: string } }).result.status).toBe("already");
    expect((await db.query("select count(*)::int as n from attendance_checkins")).rows).toEqual([{ n: 1 }]);
  });
  it("rejects suspended membership with an existing downloaded pass", async () => {
    const { rows } = await db.query<{ pass_token: string }>("select pass_token from event_registrations where user_id=$1", [a]);
    await db.exec(`update memberships set status='suspended' where user_id='${a}'`);
    expect((await asUser(admin, `select csc_check_in('${event}','${rows[0].pass_token}') as result`))[0].rows).toEqual([{ result: { status: "revoked" } }]);
    await db.exec(`update memberships set status='active' where user_id='${a}'`);
  });
  it("requires verified independent payment before confirmation", async () => {
    const paid = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    await db.exec(`insert into events(id,slug,title,category,starts_at,ends_at,location,capacity,status,admission,registration_state,price_minor) values('${paid}','paid-test','Paid Test','meetup',now()+interval '1 hour',now()+interval '3 hours','Test',10,'published','paid','open',10000)`);
    await asUser(b, `select csc_register_event('${paid}','Networking')`);
    const { rows } = await db.query<{ id: string }>("select id from event_registrations where event_id=$1", [paid]);
    await expect(asUser(admin, `select csc_admin_action('registration','${rows[0].id}','confirmed','')`)).rejects.toThrow(/payment/);
    const payment = await db.query<{ id: string }>("select id from payments where registration_id=$1", [rows[0].id]);
    await expect(asUser(b, `select csc_admin_action('payment','${payment.rows[0].id}','verified','fake screenshot')`)).rejects.toThrow();
    await asUser(admin, `select csc_admin_action('payment','${payment.rows[0].id}','verified','Isolated test settlement independently checked')`);
    await asUser(admin, `select csc_admin_action('registration','${rows[0].id}','confirmed','')`);
    expect((await db.query("select status from event_registrations where id=$1", [rows[0].id])).rows).toEqual([{ status: "confirmed" }]);
  });
  it("does not persist credentials or personal fields in operational audit snapshots", async () => {
    const { rows } = await db.query("select before,after from audit_logs");
    expect(rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(rows)).not.toMatch(/pass_token|verification_token|password|@example/);
  });
});
