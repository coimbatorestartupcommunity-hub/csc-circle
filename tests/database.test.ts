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
    create schema storage;
    create table storage.buckets(id text primary key, name text not null, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null);
    create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
    alter table storage.objects enable row level security;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    grant usage on schema storage to anon,authenticated; grant execute on function storage.foldername(text) to anon,authenticated;
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
  it("requires explicit name/photo consent and both validated portrait paths before publication", async () => {
    await expect(db.exec(`insert into directory_startups(user_id,slug,name,status) values ('${a}','blocked-photo-test','Blocked Photo Test','published')`)).rejects.toThrow(/directory profile/i);
    await db.exec(`update profiles set display_name='Test Founder', portrait_path='${a}/portrait.webp', directory_photo_path='${a}/directory.webp', consent='{"directoryParticipation":true,"displayNamePublicly":true,"displayPhotoPublicly":true}'::jsonb where id='${a}'`);
    await db.exec(`insert into directory_startups(user_id,slug,name,status,publication_consent,publication_consent_at) values ('${a}','consented-photo-test','Consented Photo Test','published',true,now())`);
    expect((await db.query(`select status from directory_startups where slug='consented-photo-test'`)).rows).toEqual([{ status: "published" }]);
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
  it("isolates resumes and prevents clients from forging private portrait paths", async () => {
    await asUser(a, `insert into member_resumes(user_id,resume_data) values ('${a}','{"name":"Test Member"}')`);
    expect((await asUser(a, "select resume_data->>'name' as name from member_resumes"))[0].rows).toEqual([{ name: "Test Member" }]);
    expect((await asUser(b, "select user_id from member_resumes"))[0].rows).toHaveLength(0);
    await expect(asUser(a, `update profiles set portrait_path='${a}/forged.webp' where id='${a}'`)).rejects.toThrow(/permission/i);
    await expect(asUser(a, `update profiles set directory_photo_path='${a}/forged-directory.webp' where id='${a}'`)).rejects.toThrow(/permission/i);
    expect((await db.query("select public,file_size_limit from storage.buckets where id='member-portraits'")).rows).toEqual([{ public: false, file_size_limit: 8388608 }]);
  });
  it("restricts collaboration writes to content managers and publishes through the atomic RPC", async () => {
    await db.exec(`insert into admin_roles(user_id,role) values ('${a}','checkin_staff')`);
    await expect(asUser(a, `insert into collaborations(slug,title) values ('blocked-test','Blocked Test')`)).rejects.toThrow();
    await expect(asUser(a, `select public.csc_save_collaboration('{}'::jsonb)`)).rejects.toThrow(/forbidden/);
    await expect(asUser(a, `select public.csc_save_collaboration_organization('{}'::jsonb)`)).rejects.toThrow(/forbidden/);
    await db.exec(`delete from admin_roles where user_id='${a}'; insert into admin_roles(user_id,role) values ('${a}','content_manager')`);
    await expect(asUser(a, `insert into collaborations(slug,title) values ('direct-write-test','Direct Write Test')`)).rejects.toThrow();
    const organizationPayload = JSON.stringify({ name: "Approved Test Partner", slug: "approved-test-partner", organization_type: "startup", publication_approved: true, publication_status: "published" }).replaceAll("'", "''");
    const orgSaved = await asUser(a, `select public.csc_save_collaboration_organization('${organizationPayload}'::jsonb) as id`);
    expect((await db.query("select publication_status from collaboration_organizations where slug='approved-test-partner'")).rows).toEqual([{ publication_status: "published" }]);
    expect((await db.query("select action from audit_logs where target_id=$1", [(orgSaved[0].rows[0] as { id: string }).id])).rows).toEqual([{ action: "collaboration.organization_saved" }]);

    const orgs = await db.query<{ id: string }>("select id from collaboration_organizations where slug in ('csc-circle','outlier') order by slug");
    const payload = JSON.stringify({
      slug: "permission-test", title: "Permission Test", tagline: "A safe test",
      summary: "An isolated database test.", story: "Synthetic test content.",
      category: "Community Meetup", status: "completed", publication_status: "draft",
      partner_ids: orgs.rows.map((org) => org.id), highlights: [], media: [],
    }).replaceAll("'", "''");
    const saved = await asUser(a, `select public.csc_save_collaboration('${payload}'::jsonb) as id`);
    const id = (saved[0].rows[0] as { id: string }).id;
    expect((await db.query("select publication_status from collaborations where id=$1", [id])).rows).toEqual([{ publication_status: "draft" }]);
    expect((await db.query("select action from audit_logs where target_id=$1", [id])).rows).toEqual([{ action: "collaboration.saved" }]);

    await db.exec("set role anon;");
    try {
      expect((await db.query("select id from collaborations where slug='permission-test'")).rows).toHaveLength(0);
    } finally { await db.exec("reset role;"); }
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
  it("keeps startup submissions private until an authorized admin approves them", async () => {
    const startup = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    await db.exec(`update profiles set display_name='Pending Test Founder', consent='{"directoryParticipation":true,"displayNamePublicly":true,"displayPhotoPublicly":true}'::jsonb where id='${a}';
      insert into directory_startups(id,user_id,slug,name,industry,description,status,publication_consent,publication_consent_at,founder)
      values ('${startup}','${a}','approval-workflow-test','Approval Workflow Test','Climate technology','A sufficiently detailed synthetic startup description for the review workflow.','pending',false,null,'{"name":"Pending Test Founder"}');`);
    expect((await asUser(a, `select status from directory_startups where id='${startup}'`))[0].rows).toEqual([{ status: "pending" }]);
    await expect(asUser(a, `select csc_admin_action('startup','${startup}','published','')`)).rejects.toThrow();
    await expect(asUser(admin, `select csc_admin_action('startup','${startup}','published','Reviewed synthetic startup details')`)).rejects.toThrow(/publication consent/i);
    await db.exec(`update directory_startups set publication_consent=true,publication_consent_at=now() where id='${startup}'`);
    await asUser(admin, `select csc_admin_action('startup','${startup}','published','Reviewed synthetic startup details and consent')`);
    expect((await db.query("select status,publication_consent from directory_startups where id=$1", [startup])).rows).toEqual([{ status: "published", publication_consent: true }]);
    await db.exec("set role anon;");
    try {
      expect((await db.query("select name,industry,description from directory_startups where id=$1", [startup])).rows).toEqual([{ name: "Approval Workflow Test", industry: "Climate technology", description: "A sufficiently detailed synthetic startup description for the review workflow." }]);
    } finally { await db.exec("reset role;"); }
    expect((await db.query("select action from audit_logs where target_id=$1", [startup])).rows).toEqual([{ action: "startup.published" }]);
  });
  it("allows direct admin approval of a free membership claim and issues its card", async () => {
    const claim = "abababab-abab-4bab-8bab-abababababab";
    await db.exec(`update memberships set status='not_started',member_number=null,issued_at=null where user_id='${b}';
      insert into membership_claims(id,user_id,full_name,linked_account_email,applicant_type,designation,whatsapp,status)
      values ('${claim}','${b}','Synthetic Member','b@example.test','new_applicant','student_entrepreneur','+15555550123','claim_submitted')`);

    const result = await asUser(admin, `select csc_admin_action('claim','${claim}','active','Reviewed synthetic free membership') as result`);
    expect(result[0].rows[0].result).toMatchObject({ ok: true, status: "active" });
    expect((await db.query(`select status from membership_claims where id='${claim}'`)).rows).toEqual([{ status: "active" }]);
    expect((await db.query(`select status,member_number,issued_at is not null as issued from memberships where user_id='${b}'`)).rows[0]).toMatchObject({ status: "active", issued: true });
    expect((await db.query<{ n: number }>("select count(*)::int as n from payments")).rows[0].n).toBe(0);
    expect((await db.query<{ action: string }>(`select action from audit_logs where target_id='${claim}' order by created_at`)).rows.map((row) => row.action)).toEqual(["claim.pending_verification", "claim.active"]);
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

describe("durable notification delivery",()=>{
 it("queues applicant and admin receipts from persisted records",async()=>{
  const {rows}=await db.query<{template_key:string}>("select template_key from notifications where template_key in ('EventRSVPReceived','EventRSVPAdminAlert')");
  expect(rows.some(r=>r.template_key==='EventRSVPReceived')).toBe(true);expect(rows.some(r=>r.template_key==='EventRSVPAdminAlert')).toBe(true);
 });
 it("does not grant members queue or dispatch authority",async()=>{
  await expect(asUser(b,"select * from csc_claim_notifications()" )).rejects.toThrow();
  await expect(asUser(b,"select csc_retry_notification(gen_random_uuid(),'unauthorized retry',false)")).rejects.toThrow(/forbidden/);
  expect((await asUser(b,"select * from notification_deliveries"))[0].rows).toHaveLength(0);
 });
 it("leases jobs exclusively and never resends an accepted recipient",async()=>{
  await db.exec("set role service_role");
  try {
   const first=await db.query<{id:string;lease_id:string}>("select * from csc_claim_notifications(1,'11111111-1111-4111-8111-111111111111')");
   expect(first.rows).toHaveLength(1);const job=first.rows[0];
   expect((await db.query("select * from csc_claim_notifications(1,'22222222-2222-4222-8222-222222222222')")).rows).toHaveLength(0);
   expect((await db.query("select csc_begin_email_delivery($1,$2,'syntheticdigest') as ok",[job.id,job.lease_id])).rows).toEqual([{ok:true}]);
   await db.query("select csc_finish_email_delivery($1,$2,'syntheticdigest','accepted','')",[job.id,job.lease_id]);
   expect((await db.query("select csc_begin_email_delivery($1,$2,'syntheticdigest') as ok",[job.id,job.lease_id])).rows).toEqual([{ok:false}]);
   await db.query("select csc_finish_notification($1,$2,'sent','')",[job.id,job.lease_id]);
   await db.query("select csc_release_notification_dispatch('11111111-1111-4111-8111-111111111111')");
  }finally{await db.exec("reset role");}
 });
});

describe("notification uncertainty and retry policy",()=>{
 it("requires manual acknowledgement before replaying an uncertain SMTP attempt",async()=>{
  const {rows}=await db.query<{id:string}>("insert into notifications(type,template_key,channel,status,last_error) values('Test','OperationalAlert','email','failed_permanent','AMBIGUOUS_DELIVERY') returning id");
  await db.query("insert into notification_deliveries(notification_id,recipient_digest,status) values($1,'uncertain','ambiguous')",[rows[0].id]);
  await expect(asUser(admin,`select csc_retry_notification('${rows[0].id}','Reviewed test failure',false)`)).rejects.toThrow(/reconciliation/);
  await asUser(admin,`select csc_retry_notification('${rows[0].id}','Mailbox reconciled; synthetic resend approved',true)`);
  expect((await db.query("select status,attempts from notifications where id=$1",[rows[0].id])).rows).toEqual([{status:'queued',attempts:0}]);
 });
 it("limits retries and defers rate caps without consuming retry allowance",async()=>{
  const {rows}=await db.query<{id:string;lease_id:string}>("insert into notifications(type,template_key,channel,status,attempts,max_attempts,lease_id) values('Test','OperationalAlert','email','processing',5,5,gen_random_uuid()) returning id,lease_id");
  await db.query("select csc_finish_notification($1,$2,'failed_retryable','EMAIL_RATE_DEFERRED')",[rows[0].id,rows[0].lease_id]);
  expect((await db.query("select status,attempts from notifications where id=$1",[rows[0].id])).rows).toEqual([{status:'failed_retryable',attempts:4}]);
  await db.query("update notifications set status='processing',attempts=5,lease_id=$2 where id=$1",[rows[0].id,rows[0].lease_id]);
  await db.query("select csc_finish_notification($1,$2,'failed_retryable','SMTP_TEMPORARY_REJECTION')",[rows[0].id,rows[0].lease_id]);
  expect((await db.query("select status from notifications where id=$1",[rows[0].id])).rows).toEqual([{status:'failed_permanent'}]);
 });
});
