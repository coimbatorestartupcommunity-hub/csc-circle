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
    create schema auth; create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', email_confirmed_at timestamptz, last_sign_in_at timestamptz);
    create table auth.sessions(id uuid primary key, user_id uuid not null, not_after timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create schema storage;
    create table storage.buckets(id text primary key, name text not null, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null);
    create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
    alter table storage.objects enable row level security;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; grant execute on function auth.jwt() to anon,authenticated;
    grant usage on schema storage to anon,authenticated; grant execute on function storage.foldername(text) to anon,authenticated;
  `);
  for (const file of readdirSync("supabase/migrations").filter(f => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values ('${a}','a@example.test',now()),('${b}','b@example.test',now());`);
}, 30_000);
afterAll(async () => { await db?.close(); });
describe("isolated PostgreSQL authorization regressions", () => {
  it("keeps opaque pass tokens on event passes, not paid-registration submissions", async () => {
    const paidColumns = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema='public' and table_name='paid_event_registrations'",
    );
    const passColumns = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema='public' and table_name='event_registrations'",
    );
    expect(paidColumns.rows.map((row) => row.column_name)).not.toContain("pass_token");
    expect(passColumns.rows.map((row) => row.column_name)).toContain("pass_token");
  });

  it("issues stable unique event pass UIDs and stores attendee names for imports", async () => {
    await db.exec("begin");
    try {
      await db.exec(`
        update public.profiles set full_name='Imported Attendee' where id='${a}';
        insert into public.events(slug,title,category,starts_at,ends_at,location)
        values ('uid-integrity-test','UID Integrity Test','networking','2026-11-01T06:00:00Z','2026-11-01T09:00:00Z','TICEL Bio Park, Coimbatore');
        insert into public.event_registrations(user_id,event_id)
        select '${a}', id from public.events where slug='uid-integrity-test';
        insert into public.event_registrations(user_id,event_id,attendee_name)
        select '${b}', id, 'Second imported attendee' from public.events where slug='uid-integrity-test';
      `);
      const registrations = await db.query<{ id: string; reference: string; attendee_name: string | null; user_id: string }>(
        `select id,reference,attendee_name,user_id from public.event_registrations where event_id=(select id from public.events where slug='uid-integrity-test') order by user_id`,
      );
      expect(registrations.rows).toHaveLength(2);
      expect(registrations.rows[0].reference).toMatch(/^CSC-EVT-[A-F0-9]{32}$/);
      expect(registrations.rows[1].reference).toMatch(/^CSC-EVT-[A-F0-9]{32}$/);
      expect(registrations.rows[0].reference).not.toBe(registrations.rows[1].reference);
      expect(registrations.rows.map((row) => row.attendee_name)).toEqual(["Imported Attendee", "Second imported attendee"]);

      await db.exec(`update public.event_registrations set status='confirmed' where id='${registrations.rows[0].id}'`);
      const reread = await db.query<{ reference: string }>("select reference from public.event_registrations where id=$1", [registrations.rows[0].id]);
      expect(reread.rows[0].reference).toBe(registrations.rows[0].reference);
    } finally {
      await db.exec("rollback");
    }
  });

  it("accepts an in-app admin invitation only for its verified recipient and consumes it once", async () => {
    const invitation = "c1000000-0000-4000-8000-000000000099";
    await db.exec(`insert into public.admin_role_invitations(
      id,invitee_email,normalized_email,role,token_hash,invited_by,status,delivery_status,expires_at
    ) values ('${invitation}','b@example.test','b@example.test','event_manager',repeat('a',64),'${a}','pending','failed',now()+interval '1 day');
    insert into notifications(type,channel,recipient,recipient_user_id,audience,related_record_type,related_record_id,title,message,action_url,dedupe_key,status,delivered_at)
    values ('admin.invitation.received','in_app','b@example.test','${b}','member','admin_role_invitations','${invitation}',
      'Administrator invitation received','Synthetic invitation','/admin/accept-invitation?invitationId=${invitation}',
      'admin.invitation:${invitation}','available',now());`);

    await expect(asUser(a, `select csc_accept_admin_role_invitation_in_app('${invitation}')`)).rejects.toThrow();
    await asUser(b, `select csc_accept_admin_role_invitation_in_app('${invitation}')`);
    expect((await db.query("select role from admin_roles where user_id=$1 and role='event_manager'", [b])).rows).toHaveLength(1);
    expect((await db.query("select status,accepted_by from admin_role_invitations where id=$1", [invitation])).rows).toEqual([{ status: "accepted", accepted_by: b }]);
    expect((await db.query("select title,action_url,read_at is not null as read from notifications where related_record_id=$1", [invitation])).rows).toEqual([{
      title: "Administrator invitation accepted", action_url: "/admin", read: true,
    }]);
    await expect(asUser(b, `select csc_accept_admin_role_invitation_in_app('${invitation}')`)).rejects.toThrow();
  });

  it("commits expiration state instead of rolling it back with an exception", async () => {
    const invitation = "c1000000-0000-4000-8000-000000000098";
    await db.exec(`insert into public.admin_role_invitations(
      id,invitee_email,normalized_email,role,token_hash,invited_by,status,expires_at
    ) values ('${invitation}','b@example.test','b@example.test','checkin_staff',repeat('b',64),'${a}','pending',now()-interval '1 minute');
    insert into notifications(type,channel,recipient,recipient_user_id,audience,related_record_type,related_record_id,title,message,action_url,dedupe_key,status,delivered_at)
    values ('admin.invitation.received','in_app','${b}','${b}','member','admin_role_invitations','${invitation}',
      'Administrator invitation received','Synthetic invitation','/admin/accept-invitation?invitationId=${invitation}',
      'admin.invitation.expired:${invitation}','available',now());`);

    const result = await asUser(b, `select csc_accept_admin_role_invitation_in_app('${invitation}') as result`);
    expect(result[0].rows).toEqual([{ result: { ok: false, reason: "expired" } }]);
    expect((await db.query("select status from admin_role_invitations where id=$1", [invitation])).rows).toEqual([{ status: "expired" }]);
    expect((await db.query("select title,action_url,read_at is not null as read from notifications where related_record_id=$1", [invitation])).rows).toEqual([{
      title: "Administrator invitation expired", action_url: null, read: true,
    }]);
  });

  it("bootstraps exactly one non-active membership and profile per Auth UUID", async () => {
    const result = await db.query("select count(*)::int as n from memberships where status='not_started'");
    expect(result.rows).toEqual([{ n: 2 }]);
  });
  it("isolates private profiles between users", async () => {
    const result = await asUser(a, "select id from profiles");
    expect(result[0].rows).toEqual([{ id: a }]);
  });
  it("allows members to save About Me without granting access to protected profile fields", async () => {
    const saved = await asUser(a, `update profiles set about_me='A short professional introduction.' where id='${a}' returning about_me`);
    expect(saved[0].rows).toEqual([{ about_me: "A short professional introduction." }]);
    const profile = await asUser(a, `update profiles set full_name='Member A Updated',display_name='Member A',whatsapp='+919000000000',city='Coimbatore',skills=array['Product','Engineering'],startup='{"name":"Test Company","website":"https://example.test"}'::jsonb where id='${a}' returning id`);
    expect(profile[0].rows).toEqual([{ id: a }]);
    expect((await db.query(`select full_name,display_name,whatsapp,city,skills,startup->>'name' as startup_name from profiles where id='${a}'`)).rows).toEqual([{
      full_name: "Member A Updated", display_name: "Member A", whatsapp: "+919000000000", city: "Coimbatore", skills: ["Product", "Engineering"], startup_name: "Test Company",
    }]);
    await expect(asUser(a, `update profiles set portrait_path='${a}/forged.webp' where id='${a}'`)).rejects.toThrow(/permission/i);
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
  it("publishes only consented approved reviews and removes an unpublished review", async () => {
    await db.exec(`update profiles set display_name='Member B',consent='{"displayNamePublicly":true,"displayPhotoPublicly":false,"showProfessionalRoleToMembers":false}'::jsonb where id='${b}'`);
    const inserted = await asUser(b, `insert into reviews(user_id,rating,review,publication_consent,publication_consent_at,publication_consent_version) values ('${b}',5,'A detailed review of the CSC founder community.',true,now(),'csc-review-publication-v1') returning id`);
    const reviewId = inserted[0].rows[0].id as string;
    await db.exec(`insert into admin_roles(user_id,role) values ('${a}','content_manager')`);
    const own = await asUser(a, `select id from reviews where user_id='${a}' and kind='general'`);
    const ownReviewId = own[0].rows[0].id as string;
    await expect(asUser(a, `select csc_admin_action('review','${ownReviewId}','approved','')`)).rejects.toThrow(/cannot approve their own/i);
    await asUser(a, `select csc_admin_action('review','${reviewId}','approved','')`);
    await db.exec("set role anon;");
    try {
      const published = await db.query(`select id,name,avatar_url,designation from public_testimonials where id='${reviewId}'`);
      expect(published.rows).toEqual([{ id: reviewId, name: "Member B", avatar_url: null, designation: "Community Member" }]);
    } finally { await db.exec("reset role;"); }
    await asUser(a, `select csc_admin_action('review','${reviewId}','under_review','Unpublished by admin')`);
    await db.exec("set role anon;");
    try { expect((await db.query(`select id from public_testimonials where id='${reviewId}'`)).rows).toEqual([]); }
    finally { await db.exec("reset role;"); }
    await db.exec(`insert into admin_roles(user_id,role) values ('${b}','content_manager')`);
    await asUser(b, `select csc_admin_action('review','${ownReviewId}','approved','')`);
    await db.exec("set role anon;");
    try { expect((await db.query(`select id from public_testimonials where id='${ownReviewId}'`)).rows).toEqual([]); }
    finally { await db.exec("reset role;"); }
  });
  it("honors scheduled content windows, immediate unpublishing, and soft deletion", async () => {
    await db.exec(`insert into admin_roles(user_id,role) values ('${a}','content_manager') on conflict do nothing`);
    await asUser(a, `select csc_manage_content('publish','homepage.announcement','Timed CSC notice',now()+interval '1 day',now()+interval '2 days')`);
    await db.exec("set role anon;");
    try { expect((await db.query("select key from content_blocks where key='homepage.announcement'")).rows).toEqual([]); }
    finally { await db.exec("reset role;"); }
    await asUser(a, `select csc_manage_content('publish','homepage.announcement','Timed CSC notice',now()-interval '1 day',now()+interval '1 day')`);
    await db.exec("set role anon;");
    try { expect((await db.query("select value from content_blocks where key='homepage.announcement'")).rows).toEqual([{ value: "Timed CSC notice" }]); }
    finally { await db.exec("reset role;"); }
    await asUser(a, `select csc_manage_content('unpublish','homepage.announcement','',null::timestamptz,null::timestamptz)`);
    await db.exec("set role anon;");
    try { expect((await db.query("select key from content_blocks where key='homepage.announcement'")).rows).toEqual([]); }
    finally { await db.exec("reset role;"); }
    await asUser(a, `select csc_manage_content('delete','homepage.announcement','',null::timestamptz,null::timestamptz)`);
    expect((await db.query("select deleted_at is not null as deleted from content_blocks where key='homepage.announcement'")).rows).toEqual([{ deleted: true }]);
    expect((await db.query("select count(*)::int as n from audit_logs where target_type='content' and target_id='homepage.announcement' and action in ('content.published','content.unpublished','content.deleted')")).rows).toEqual([{ n: 4 }]);
  });
  it("cannot publish its own startup directly", async () => {
    await expect(asUser(a, `insert into directory_startups(user_id,slug,name,status) values ('${a}','test-startup','Test Startup','published')`)).rejects.toThrow();
  });
  it("requires name consent and a validated startup-specific 4:3 image before publication", async () => {
    await expect(db.exec(`insert into directory_startups(user_id,slug,name,status) values ('${a}','blocked-photo-test','Blocked Photo Test','published')`)).rejects.toThrow(/directory participation/i);
    await db.exec(`update profiles set display_name='Test Founder', consent='{"directoryParticipation":true,"displayNamePublicly":true}'::jsonb where id='${a}'`);
    const startupId = "c1000000-0000-4000-8000-000000000001";
    const imagePath = `${a}/${startupId}-directory-startup.webp`;
    await expect(db.exec(`insert into directory_startups(id,user_id,slug,name,status,publication_consent,publication_consent_at,directory_image_path) values ('${startupId}','${a}','consented-photo-test','Consented Photo Test','published',true,now(),'${imagePath}')`)).rejects.toThrow(/4:3 directory image/i);
    await db.exec(`insert into storage.objects(bucket_id,name) values ('member-portraits','${imagePath}');
      insert into directory_startups(id,user_id,slug,name,status,publication_consent,publication_consent_at,directory_image_path) values ('${startupId}','${a}','consented-photo-test','Consented Photo Test','published',true,now(),'${imagePath}')`);
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
  it("archives historical resume data and prevents clients from forging private portrait paths", async () => {
    const archive = await db.query("select table_schema,table_name from information_schema.tables where table_name='archived_member_resumes'");
    expect(archive.rows).toEqual([{ table_schema: "private", table_name: "archived_member_resumes" }]);
    const exposed = await db.query("select count(*)::int as n from information_schema.tables where table_schema='public' and table_name='member_resumes'");
    expect(exposed.rows).toEqual([{ n: 0 }]);
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
    const organizationId = (orgSaved[0].rows[0] as { id: string }).id;
    expect((await db.query("select action from audit_logs where target_id=$1", [organizationId])).rows).toEqual([{ action: "collaboration.organization_saved" }]);
    const editOrganization = JSON.stringify({ id: organizationId, name: "Approved Test Partner Updated", slug: "approved-test-partner", organization_type: "startup", publication_approved: true, publication_status: "published", logo_path: "collaboration-logos/11111111-1111-4111-8111-111111111111.webp" }).replaceAll("'", "''");
    const editedOrganization = await asUser(a, `select public.csc_save_collaboration_organization('${editOrganization}'::jsonb) as id`);
    expect((editedOrganization[0].rows[0] as { id: string }).id).toBe(organizationId);
    expect((await db.query("select name,logo_path from collaboration_organizations where id=$1", [organizationId])).rows).toEqual([{
      name: "Approved Test Partner Updated", logo_path: "collaboration-logos/11111111-1111-4111-8111-111111111111.webp",
    }]);

    const orgs = await db.query<{ id: string }>("select id from collaboration_organizations where slug in ('csc-circle','outlier') order by slug");
    const payload = JSON.stringify({
      slug: "permission-test", title: "Permission Test", tagline: "A safe test",
      summary: "An isolated database test.", story: "Synthetic test content.",
      category: "Community Meetup", status: "completed", publication_status: "draft",
      featured_image_path: "collaboration-featured/22222222-2222-4222-8222-222222222222.webp",
      partner_ids: orgs.rows.map((org) => org.id), highlights: [], media: [],
    }).replaceAll("'", "''");
    const saved = await asUser(a, `select public.csc_save_collaboration('${payload}'::jsonb) as id`);
    const id = (saved[0].rows[0] as { id: string }).id;
    expect((await db.query("select publication_status from collaborations where id=$1", [id])).rows).toEqual([{ publication_status: "draft" }]);
    expect((await db.query("select featured_image_path from collaborations where id=$1", [id])).rows).toEqual([{ featured_image_path: "collaboration-featured/22222222-2222-4222-8222-222222222222.webp" }]);
    expect((await db.query("select action from audit_logs where target_id=$1", [id])).rows).toEqual([{ action: "collaboration.saved" }]);

    await db.exec("set role anon;");
    try {
      expect((await db.query("select id from collaborations where slug='permission-test'")).rows).toHaveLength(0);
    } finally { await db.exec("reset role;"); }
  });
});

describe("CSC founder hub database permissions", () => {
  it("saves four separate startup records through the RPC and rejects a fifth", async () => {
    await db.exec(`update profiles set display_name='Quota Test Founder', consent='{"directoryParticipation":true,"displayNamePublicly":true}'::jsonb where id='${b}'`);
    const ids = [
      "f1000000-0000-4000-8000-000000000001",
      "f1000000-0000-4000-8000-000000000002",
      "f1000000-0000-4000-8000-000000000003",
      "f1000000-0000-4000-8000-000000000004",
    ];
    for (let i = 0; i < ids.length; i += 1) {
      const image = `${b}/${ids[i]}-directory-startup.webp`;
      await db.exec(`insert into storage.objects(bucket_id,name) values ('member-portraits','${image}')`);
      const payload = JSON.stringify({
        id: ids[i], name: `Independent Startup ${i + 1}`, slug: `independent-startup-${i + 1}`,
        industry: "Climate technology", description: "An independent startup profile with a complete review-ready description.",
        website: null, logoPath: null, directoryImagePath: image, founderRole: "Founder", consent: true,
        details: { city: "Coimbatore", visibility: { publishWebsite: false } },
      }).replaceAll("'", "''");
      const result = await asUser(b, `select public.save_member_startup('${payload}'::jsonb,'{"companyEmail":"private@example.test"}'::jsonb) as id`);
      expect(result[0].rows).toEqual([{ id: ids[i] }]);
    }
    const fifthId = "f1000000-0000-4000-8000-000000000005";
    const fifthImage = `${b}/${fifthId}-directory-startup.webp`;
    await db.exec(`insert into storage.objects(bucket_id,name) values ('member-portraits','${fifthImage}')`);
    const fifth = JSON.stringify({ id: fifthId, name: "Startup Five", slug: "startup-five", industry: "Climate technology", description: "A fifth startup request should fail at the trusted database boundary.", logoPath: null, directoryImagePath: fifthImage, consent: true, details: {} }).replaceAll("'", "''");
    await expect(asUser(b, `select public.save_member_startup('${fifth}'::jsonb,'{}'::jsonb)`)).rejects.toThrow(/startup_limit_reached/);
    expect((await db.query(`select count(*)::int as n from directory_startups where user_id='${b}' and status <> 'archived'`)).rows).toEqual([{ n: 4 }]);
    await expect(asUser(b, `select details from directory_startup_private_details`)).rejects.toThrow();
  });

  it("returns only opted-in member fields and cannot search hidden profile data", async () => {
    await db.exec(`update memberships set status='active',member_number=case when user_id='${a}' then 'CSC-2026-900001' else 'CSC-2026-900002' end,issued_at=now(),verification_token=case when user_id='${a}' then repeat('a',64) else repeat('b',64) end where user_id in ('${a}','${b}');
      update profiles set display_name='Consent Test Founder', city='Hidden City', designations=array['developer']::member_designation[], skills=array['Hidden Expertise'], about_me='Private introduction', consent='{"communityProfileVisible":true,"showCityToMembers":false,"showProfessionalRoleToMembers":true,"showAboutMeToMembers":false,"showSkillsToMembers":false,"showStartupAffiliationsToMembers":false,"shareWhatsappWithMembers":false,"showProfilePhotoToMembers":false}'::jsonb where id='${a}';`);
    const listed = await asUser(b, "select display_name,city,designation,about_me,skills,whatsapp,has_photo from public.list_discoverable_members('',30,0)");
    expect(listed[0].rows).toEqual([{ display_name: "Consent Test Founder", city: null, designation: "developer", about_me: null, skills: [], whatsapp: null, has_photo: false }]);
    const hiddenCity = await asUser(b, "select member_id from public.list_discoverable_members('Hidden City',30,0)");
    const hiddenSkill = await asUser(b, "select member_id from public.list_discoverable_members('Hidden Expertise',30,0)");
    expect(hiddenCity[0].rows).toHaveLength(0);
    expect(hiddenSkill[0].rows).toHaveLength(0);
    const ownListing = await asUser(a, "select member_id,display_name from public.list_discoverable_members('',30,0)");
    expect(ownListing[0].rows).toEqual([{ member_id: a, display_name: "Consent Test Founder" }]);
    const ownProfile = await asUser(a, `select member_id from public.get_discoverable_member('${a}')`);
    expect(ownProfile[0].rows).toEqual([{ member_id: a }]);
  });

  it("prevents unverified, inactive, and non-card holders from enabling community sharing", async () => {
    await db.exec(`update profiles set display_name='Sharing Test Member' where id='${b}'; update memberships set status='pending_verification',member_number=null,issued_at=null,verification_token=null where user_id='${b}';`);
    await expect(asUser(b, `select set_member_profile_sharing(true,'{"showCity":true}'::jsonb)`)).rejects.toThrow(/active CSC membership/i);
    expect((await db.query(`select consent->>'communityProfileVisible' as visible from profiles where id='${b}'`)).rows).toEqual([{ visible: null }]);
  });

  it("keeps a published startup unchanged until its owner revision is approved", async () => {
    const startupId = "f2000000-0000-4000-8000-000000000001";
    const revisionId = "f2000000-0000-4000-8000-000000000002";
    const imagePath = `${a}/${startupId}-directory-startup.webp`;
    const revisionImagePath = `${a}/${startupId}-revision-${revisionId}-directory-startup.webp`;
    const revisionLogoPath = `${a}/${startupId}-revision-${revisionId}-startup-logo.webp`;
    await db.exec(`update profiles set display_name='Revision Test Founder',consent='{"directoryParticipation":true,"displayNamePublicly":true}'::jsonb where id='${a}';
      insert into storage.objects(bucket_id,name) values ('member-portraits','${imagePath}'),('member-portraits','${revisionImagePath}'),('member-portraits','${revisionLogoPath}');
      insert into directory_startups(id,user_id,slug,name,industry,description,status,publication_consent,publication_consent_at,founder,directory_image_path)
      values ('${startupId}','${a}','revision-test-startup','Revision Test Startup','Software','The currently approved published startup description is long enough.','published',true,now(),'{"name":"Revision Test Founder"}','${imagePath}');`);
    const proposed = JSON.stringify({ name: "Revision Test Startup Updated", slug: "revision-test-startup", industry: "Software", description: "The proposed description is different, complete, and meets the validation limit.", website: null, logo_url: revisionLogoPath, directory_image_path: revisionImagePath, details: { city: "Coimbatore" }, collaboration: [], founder: { id: a, name: "Revision Test Founder", role: "Founder" } }).replaceAll("'", "''");
    const submitted = await asUser(a, `select submit_startup_revision('${startupId}','${revisionId}','${proposed}'::jsonb,'{}'::jsonb,true) as id`);
    expect(submitted[0].rows).toEqual([{ id: revisionId }]);
    // The RPC rejects all submitted revisions; the authenticated API performs
    // the safe exact-snapshot replay check through the owner-scoped SELECT policy.
    await expect(asUser(a, `select submit_startup_revision('${startupId}','${revisionId}','${proposed}'::jsonb,'{}'::jsonb,true)`)).rejects.toThrow(/already submitted for review/i);
    expect((await db.query(`select count(*)::int as n from directory_startup_revisions where startup_id='${startupId}' and status='pending'`)).rows).toEqual([{ n: 1 }]);
    const changedWhilePending = JSON.stringify({ name: "Revision Test Startup Updated", slug: "revision-test-startup", industry: "Software", description: "A different follow-up payload that must not replace the revision already awaiting approval.", website: null, logo_url: null, directory_image_path: imagePath, details: { city: "Coimbatore" }, collaboration: [], founder: { id: a, name: "Revision Test Founder", role: "Founder" } }).replaceAll("'", "''");
    await expect(asUser(a, `select submit_startup_revision('${startupId}','${revisionId}','${changedWhilePending}'::jsonb,'{}'::jsonb,true)`)).rejects.toThrow(/already submitted for review/i);
    expect((await db.query(`select name,description,status from directory_startups where id='${startupId}'`)).rows).toEqual([{ name: "Revision Test Startup", description: "The currently approved published startup description is long enough.", status: "published" }]);
    await expect(asUser(a, `select review_startup_revision('${revisionId}','approved','')`)).rejects.toThrow(/forbidden/i);
    const approver = "f3000000-0000-4000-8000-000000000001";
    await db.exec(`insert into auth.users(id,email,email_confirmed_at) values ('${approver}','revision-admin@example.test',now()); insert into admin_roles(user_id,role) values ('${approver}','community_admin');`);
    await asUser(approver, `select review_startup_revision('${revisionId}','approved','Reviewed updated startup information')`);
    expect((await db.query(`select id,name,description,status,logo_url,directory_image_path from directory_startups where id='${startupId}'`)).rows).toEqual([{ id: startupId, name: "Revision Test Startup Updated", description: "The proposed description is different, complete, and meets the validation limit.", status: "published", logo_url: revisionLogoPath, directory_image_path: revisionImagePath }]);
    expect((await db.query(`select status from directory_startup_revisions where id='${revisionId}'`)).rows).toEqual([{ status: "approved" }]);

    const correction = "f2000000-0000-4000-8000-000000000003";
    const firstCorrection = JSON.stringify({ name: "Revision Test Startup Updated", slug: "revision-test-startup", industry: "Software", description: "The first follow-up description is complete but needs administrator feedback.", website: null, logo_url: null, directory_image_path: imagePath, details: { city: "Coimbatore" }, collaboration: [], founder: { id: a, name: "Revision Test Founder", role: "Founder" } }).replaceAll("'", "''");
    await asUser(a, `select submit_startup_revision('${startupId}','${correction}','${firstCorrection}'::jsonb,'{}'::jsonb,true)`);
    await asUser(approver, `select review_startup_revision('${correction}','rejected','Please clarify the service coverage area.')`);
    const corrected = JSON.stringify({ name: "Revision Test Startup Updated", slug: "revision-test-startup", industry: "Software", description: "The corrected follow-up description now clearly explains our service coverage area across Tamil Nadu.", website: null, logo_url: null, directory_image_path: imagePath, details: { city: "Coimbatore" }, collaboration: [], founder: { id: a, name: "Revision Test Founder", role: "Founder" } }).replaceAll("'", "''");
    await asUser(a, `select submit_startup_revision('${startupId}','${correction}','${corrected}'::jsonb,'{}'::jsonb,true)`);
    expect((await db.query(`select status,review_reason,reviewed_at,proposed_data->>'description' as description from directory_startup_revisions where id='${correction}'`)).rows).toEqual([{ status: "pending", review_reason: null, reviewed_at: null, description: "The corrected follow-up description now clearly explains our service coverage area across Tamil Nadu." }]);
    expect((await db.query(`select action from audit_logs where target_id='${correction}' order by created_at`)).rows).toEqual([{ action: "startup.revision.submitted" }, { action: "startup.revision.rejected" }, { action: "startup.revision.submitted" }]);

    const legacyStartup = "f2000000-0000-4000-8000-000000000004";
    const legacyRevision = "f2000000-0000-4000-8000-000000000005";
    const legacyImage = `${a}/${legacyStartup}-directory-startup.webp`;
    const legacyLogo = `${a}/f2000000-0000-4000-8000-000000000006-startup-logo.webp`;
    await db.exec(`insert into storage.objects(bucket_id,name) values ('member-portraits','${legacyImage}'),('member-portraits','${legacyLogo}');
      insert into directory_startups(id,user_id,slug,name,industry,description,status,publication_consent,publication_consent_at,founder,directory_image_path,logo_url)
      values ('${legacyStartup}','${a}','legacy-logo-startup','Legacy Logo Startup','Software','The previously approved startup description remains long enough.','published',true,now(),'{"name":"Revision Test Founder"}','${legacyImage}','${legacyLogo}');`);
    const legacyLogoProposal = JSON.stringify({ name: "Legacy Logo Startup", slug: "legacy-logo-startup", industry: "Software", description: "Updated startup description preserves an existing owner-scoped logo unchanged.", website: null, logo_url: legacyLogo, directory_image_path: legacyImage, details: { city: "Coimbatore" }, collaboration: [], founder: { id: a, name: "Revision Test Founder", role: "Founder" } }).replaceAll("'", "''");
    await asUser(a, `select submit_startup_revision('${legacyStartup}','${legacyRevision}','${legacyLogoProposal}'::jsonb,'{}'::jsonb,true)`);
    expect((await db.query(`select status,proposed_data->>'logo_url' as logo_url from directory_startup_revisions where id='${legacyRevision}'`)).rows).toEqual([{ status: "pending", logo_url: legacyLogo }]);

    // A legacy published directory image may have a noncanonical object name.
    // Only the exact path already stored on this locked startup row is accepted.
    const legacyPhotoStartup = "f2000000-0000-4000-8000-000000000007";
    const legacyPhotoRevision = "f2000000-0000-4000-8000-000000000008";
    const legacyPhotoPath = `${a}/legacy-directory/${legacyPhotoStartup}.webp`;
    const otherStartupPhotoPath = `${a}/another-startup/directory.webp`;
    const canonicalPhotoPath = `${a}/${legacyPhotoStartup}-directory-startup.webp`;
    await db.exec(`insert into storage.objects(bucket_id,name) values ('member-portraits','${legacyPhotoPath}'),('member-portraits','${otherStartupPhotoPath}'),('member-portraits','${canonicalPhotoPath}');
      insert into directory_startups(id,user_id,slug,name,industry,description,status,publication_consent,publication_consent_at,founder,directory_image_path)
      values ('${legacyPhotoStartup}','${a}','legacy-directory-photo','Legacy Directory Photo','Software','A valid previously published directory image uses a legacy object naming convention.','published',true,now(),'{"name":"Revision Test Founder"}','${canonicalPhotoPath}');
      update directory_startups set directory_image_path='${legacyPhotoPath}' where id='${legacyPhotoStartup}';`);
    const legacyPhotoProposal = JSON.stringify({ name: "Legacy Directory Photo", slug: "legacy-directory-photo", industry: "Software", description: "The owner updates text while keeping the exact previously approved directory photo.", website: null, logo_url: null, directory_image_path: legacyPhotoPath, details: { city: "Coimbatore" }, collaboration: [], founder: { id: a, name: "Revision Test Founder", role: "Founder" } }).replaceAll("'", "''");
    await asUser(a, `select submit_startup_revision('${legacyPhotoStartup}','${legacyPhotoRevision}','${legacyPhotoProposal}'::jsonb,'{}'::jsonb,true)`);
    expect((await db.query(`select status,proposed_data->>'directory_image_path' as directory_image_path from directory_startup_revisions where id='${legacyPhotoRevision}'`)).rows).toEqual([{ status: "pending", directory_image_path: legacyPhotoPath }]);
    const forgedPhotoProposal = legacyPhotoProposal.replace(legacyPhotoPath, otherStartupPhotoPath);
    await expect(asUser(a, `select submit_startup_revision('${legacyPhotoStartup}','${legacyPhotoRevision}','${forgedPhotoProposal}'::jsonb,'{}'::jsonb,true)`)).rejects.toThrow(/invalid revision image path/i);
  });
  it("stores resume data through owner-bound functions and hides the underlying table", async () => {
    const payload = JSON.stringify({ headline: "Member-entered role", summary: "A synthetic resume summary owned by one test member." }).replaceAll("'", "''");
    await asUser(a, `select save_member_resume('${payload}'::jsonb)`);
    expect((await asUser(a, "select get_member_resume() as resume"))[0].rows[0].resume).toEqual({ headline: "Member-entered role", summary: "A synthetic resume summary owned by one test member." });
    expect((await asUser(b, "select get_member_resume() as resume"))[0].rows[0].resume).toEqual({});
    await expect(asUser(a, "select * from private.member_resumes")).rejects.toThrow(/permission/i);
    await db.exec("set role anon;");
    try { await expect(db.exec(`select public.get_member_resume()`)).rejects.toThrow(/permission/i); }
    finally { await db.exec("reset role;"); }
  });
  it("saves private professional details and synchronizes only the owner profile summary and skills", async () => {
    const payload = JSON.stringify({
      aboutMe: "Synthetic professional summary for member A.",
      skills: [{ id: "2f9c8d84-7d86-4b55-bf6b-4a28cc098688", category: "Engineering", items: ["TypeScript", "PostgreSQL"] }],
      experiences: [{ id: "c48fd041-f44d-44bd-96d3-0e00d6e80aae", title: "Test Role" }],
    }).replaceAll("'", "''");
    await asUser(a, `select save_member_resume('${payload}'::jsonb)`);
    expect((await db.query("select about_me,skills from profiles where id=$1", [a])).rows).toEqual([{
      about_me: "Synthetic professional summary for member A.", skills: ["PostgreSQL", "TypeScript"],
    }]);
    expect((await db.query("select about_me,skills from profiles where id=$1", [b])).rows).toEqual([{ about_me: "", skills: [] }]);
    expect((await asUser(a, "select get_member_resume() as resume"))[0].rows[0].resume).toMatchObject({ aboutMe: "Synthetic professional summary for member A." });

    const malformed = JSON.stringify({ skills: [{ category: "", items: ["TypeScript"] }] }).replaceAll("'", "''");
    await expect(asUser(a, `select save_member_resume('${malformed}'::jsonb)`)).rejects.toThrow(/invalid skills/i);
    await expect(asUser(a, `select save_member_resume('{"aboutMe":"${"x".repeat(1201)}"}'::jsonb)`)).rejects.toThrow(/invalid profile biography/i);
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
  it("creates an event with explicit local-time timestamp parsing", async () => {
    const payload = JSON.stringify({
      slug: "timestamp-regression-event", title: "Timestamp Regression Event",
      category: "meetup", description: "A synthetic event used to verify the admin event save path.",
      status: "draft", admission: "free", date: "2099-01-02", startTime: "10:00",
      endTime: "12:00", capacity: "25", venueAddress: "Coimbatore",
    }).replaceAll("'", "''");
    const saved = await asUser(admin, `select public.csc_save_event('${payload}'::jsonb,null) as id`);
    const id = (saved[0].rows[0] as { id: string }).id;
    expect((await db.query("select starts_at,ends_at,status from events where id=$1", [id])).rows).toEqual([
      { starts_at: new Date("2099-01-02T04:30:00.000Z"), ends_at: new Date("2099-01-02T06:30:00.000Z"), status: "draft" },
    ]);
  });
  it("keeps startup submissions private until an authorized admin approves them", async () => {
    const startup = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const startupImage = `${a}/${startup}-directory-startup.webp`;
    await db.exec(`update profiles set display_name='Pending Test Founder', consent='{"directoryParticipation":true,"displayNamePublicly":true}'::jsonb where id='${a}';
      insert into storage.objects(bucket_id,name) values ('member-portraits','${startupImage}');
      insert into directory_startups(id,user_id,slug,name,industry,description,status,publication_consent,publication_consent_at,founder,directory_image_path)
      values ('${startup}','${a}','approval-workflow-test','Approval Workflow Test','Climate technology','A sufficiently detailed synthetic startup description for the review workflow.','pending',false,null,'{"name":"Pending Test Founder"}','${startupImage}');`);
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
    const notificationStart = new Date().toISOString();
    await db.exec(`update memberships set status='not_started',member_number=null,issued_at=null where user_id='${b}';
      insert into membership_claims(id,user_id,full_name,linked_account_email,applicant_type,designation,whatsapp,status)
      values ('${claim}','${b}','Synthetic Member','b@example.test','new_applicant','student_entrepreneur','+15555550123','claim_submitted')`);

    const result = await asUser(admin, `select csc_admin_action('claim','${claim}','active','Reviewed synthetic free membership') as result`);
    expect(result[0].rows[0].result).toMatchObject({ ok: true, status: "active" });
    expect((await db.query(`select status from membership_claims where id='${claim}'`)).rows).toEqual([{ status: "active" }]);
    expect((await db.query(`select status,member_number,issued_at is not null as issued from memberships where user_id='${b}'`)).rows[0]).toMatchObject({ status: "active", issued: true });
    expect((await db.query<{ n: number }>("select count(*)::int as n from payments")).rows[0].n).toBe(0);
    expect((await db.query<{ action: string }>(`select action from audit_logs where target_id='${claim}' order by created_at`)).rows.map((row) => row.action)).toEqual(["claim.pending_verification", "claim.active"]);
    expect((await db.query<{ type: string; status: string; recipient_user_id: string; title: string }>(
      "select type,status,recipient_user_id,title from notifications where channel='in_app' and related_record_id=$1 order by type", [claim],
    )).rows).toEqual([
      { type: "claim.active", status: "available", recipient_user_id: b, title: "CSC membership is active" },
      { type: "claim.pending_verification", status: "available", recipient_user_id: b, title: "Membership application received" },
    ]);
    const membershipId = (await db.query<{ id: string }>("select id from memberships where user_id=$1", [b])).rows[0].id;
    expect((await db.query<{ template_key: string; status: string }>(
      "select template_key,status from notifications where channel='email' and recipient_user_id=$1 and created_at >= $2 and ((template_key='MembershipApplicationReceived' and related_record_type='membership_claims' and related_record_id=$3) or (template_key='MembershipApproved' and related_record_type='memberships' and related_record_id=$4)) order by template_key",
      [b, notificationStart, claim, membershipId],
    )).rows).toEqual([
      { template_key: "MembershipApplicationReceived", status: "queued" },
      { template_key: "MembershipApproved", status: "queued" },
    ]);
  });
  it("keeps the claim-submitted email queued when approval follows before dispatch", async () => {
    const claim = "acacacac-acac-4cac-8cac-acacacacacac";
    await db.exec(`update memberships set status='not_started',member_number=null,issued_at=null where user_id='${b}';
      insert into membership_claims(id,user_id,full_name,linked_account_email,applicant_type,designation,whatsapp,status)
      values ('${claim}','${b}','Synthetic Member','b@example.test','new_applicant','student_entrepreneur','+15555550123','claim_submitted');`);
    await asUser(admin, `select csc_admin_action('claim','${claim}','pending_verification','Reviewed submitted membership ID')`);
    await asUser(admin, `select csc_admin_action('claim','${claim}','active','Verified submitted membership ID')`);

    expect((await db.query<{ type: string; status: string }>(
      "select type,status from notifications where channel='email' and recipient_user_id=$1 and related_record_id=$2 and template_key='MembershipMoreInformation'",
      [b, claim],
    )).rows).toEqual([{ type: "MembershipMoreInformation", status: "queued" }]);
    expect((await db.query<{ type: string; status: string; message: string }>(
      "select type,status,message from notifications where channel='in_app' and recipient_user_id=$1 and related_record_id=$2 order by type",
      [b, claim],
    )).rows).toEqual([
      { type: "claim.active", status: "available", message: "Your CSC membership is now active." },
      { type: "claim.pending_verification", status: "available", message: "Your CSC Circle membership application has been submitted and is awaiting review." },
    ]);
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
  it("allows authorised staff to manually check in a confirmed attendee after an event", async () => {
    const completedEvent = "e1000000-0000-4000-8000-000000000001";
    const registration = "e1000000-0000-4000-8000-000000000002";
    await db.exec(`
      insert into events(id,slug,title,category,starts_at,ends_at,location,status,admission,registration_state)
      values ('${completedEvent}','manual-check-in-test','Manual Check-In Test','networking',now()-interval '3 hours',now()-interval '1 hour','Test venue','published','free','completed');
      insert into event_registrations(id,user_id,event_id,status,payment,attendance,attendee_name)
      values ('${registration}','${b}','${completedEvent}','confirmed','not_required','not_attended','Manual Attendee');
    `);

    await expect(asUser(a, `select csc_manual_check_in('${registration}')`)).rejects.toThrow(/forbidden/i);
    const first = await asUser(admin, `select csc_manual_check_in('${registration}') as result`);
    expect((first[0].rows[0] as { result: { status: string; name: string } }).result).toMatchObject({ status: "valid", name: "Manual Attendee" });
    const second = await asUser(admin, `select csc_manual_check_in('${registration}') as result`);
    expect((second[0].rows[0] as { result: { status: string } }).result.status).toBe("already");
    expect((await db.query("select status,attendance from event_registrations where id=$1", [registration])).rows).toEqual([{ status: "checked_in", attendance: "checked_in" }]);
    expect((await db.query("select count(*)::int as n from attendance_checkins where registration_id=$1", [registration])).rows).toEqual([{ n: 1 }]);
    expect((await db.query("select action,after->>'method' as method from audit_logs where target_id=$1", [registration])).rows).toEqual([{ action: "attendance.checked_in", method: "manual" }]);
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
 it("queues a one-time welcome after first verified sign-in",async()=>{
  await db.exec(`update auth.users set last_sign_in_at=now() where id='${a}'`);
  expect((await db.query("select count(*)::int as n from notifications where template_key='FirstLoginWelcome' and recipient_user_id=$1",[a])).rows).toEqual([{n:1}]);
  await db.exec(`update auth.users set last_sign_in_at=now()+interval '1 minute' where id='${a}'`);
  expect((await db.query("select count(*)::int as n from notifications where template_key='FirstLoginWelcome' and recipient_user_id=$1",[a])).rows).toEqual([{n:1}]);
 });
 it("fans out published event details only to verified opted-in members",async()=>{
  const broadcast = "12121212-1212-4212-8212-121212121212";
  await db.exec(`update auth.users set last_sign_in_at=now() where id in ('${a}','${b}');
    update profiles set consent=consent||'{"operationalEmail":true}'::jsonb where id='${a}';
    update profiles set consent=consent||'{"operationalEmail":false}'::jsonb where id='${b}';
    insert into events(id,slug,title,category,description,starts_at,ends_at,location,capacity,status,admission,registration_state,price_minor)
    values ('${broadcast}','email-broadcast-test','Synthetic email broadcast test','meetup','Details must be sent.',now()+interval '2 days',now()+interval '2 days 2 hours','Coimbatore',20,'draft','free','open',0);
    update events set status='published' where id='${broadcast}';`);
  const {rows}=await db.query<{recipient_user_id:string;payload:Record<string,unknown>}>(
    "select recipient_user_id,payload from notifications where template_key='EventPublishedBroadcast' and related_record_id=$1",[broadcast]);
  expect(rows).toHaveLength(1);
  expect(rows[0].recipient_user_id).toBe(a);
  expect(rows[0].payload).toMatchObject({eventTitle:"Synthetic email broadcast test",location:"Coimbatore",admission:"free"});
 });
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
 it("exposes only a member's available in-app notifications and limits updates to read state",async()=>{
  const {rows}=await db.query<{id:string}>(
   "insert into notifications(type,channel,recipient,recipient_user_id,audience,title,message,action_url,status,delivered_at) values ('review.approved','in_app',$1::uuid::text,$1::uuid,'member','Review approved','Your review is approved.','/member/reviews','available',now()),('review.approved','in_app',$2::uuid::text,$2::uuid,'member','Review approved','Private to B.','/member/reviews','available',now()) returning id",
   [a,b]);
  const own=await asUser(a,`select id,type,read_at from notifications where id='${rows[0].id}' and channel='in_app' and status='available'`);
  expect(own[0].rows).toHaveLength(1);
  expect((await asUser(b,`select id from notifications where id='${rows[0].id}'`))[0].rows).toHaveLength(0);
  await asUser(a,`update notifications set read_at=now() where id='${rows[0].id}'`);
  expect((await db.query("select read_at is not null as read from notifications where id=$1",[rows[0].id])).rows).toEqual([{read:true}]);
  await expect(asUser(a,`update notifications set status='superseded' where id='${rows[0].id}'`)).rejects.toThrow();
 });
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
 it("holds historical email jobs out of every dispatch path until explicitly released",async()=>{
  // available_at=now() so the ONLY thing withholding the job is status='held'.
  const {rows}=await db.query<{id:string}>("insert into notifications(type,template_key,channel,status,last_error,available_at,recipient_user_id) values('MembershipMoreInformation','MembershipMoreInformation','email','held','HISTORICAL_HOLD_PENDING_APPROVAL',now(),$1) returning id",[b]);
  const held=rows[0].id;
  await db.exec("set role service_role");
  try {
   // worker/cron/drain claim path must skip a held job even when it is due.
   expect((await db.query<{id:string}>("select id from csc_claim_notifications(50,'33333333-3333-4333-8333-333333333333')")).rows.some((r)=>r.id===held)).toBe(false);
   await db.query("select csc_release_notification_dispatch('33333333-3333-4333-8333-333333333333')");
  } finally { await db.exec("reset role"); }
  // the ordinary retry path refuses a held job (retries cannot circumvent the hold).
  await expect(asUser(admin,`select csc_retry_notification('${held}','Attempting to retry a held job',true)`)).rejects.toThrow(/not retryable/);
  // a member cannot release a hold.
  await expect(asUser(b,`select csc_release_held_notification('${held}','Member must not release held jobs')`)).rejects.toThrow();
  // an authorized release moves it to queued and writes an audit record.
  await asUser(admin,`select csc_release_held_notification('${held}','Historical membership email approved for send')`);
  expect((await db.query("select status,attempts from notifications where id=$1",[held])).rows).toEqual([{status:'queued',attempts:0}]);
  expect((await db.query("select action from audit_logs where target_id=$1 and action='notification.release_hold'",[held])).rows).toHaveLength(1);
 });
 it("still dispatches ordinary queued transactional email jobs",async()=>{
  // Earliest available_at so this job sorts first and is deterministically
  // inside the capped claim batch regardless of other queued test rows.
  const {rows}=await db.query<{id:string}>("insert into notifications(type,template_key,channel,status,available_at,recipient_user_id) values('OperationalAlert','OperationalAlert','email','queued',now()-interval '3650 days',$1) returning id",[b]);
  await db.exec("set role service_role");
  try {
   expect((await db.query<{id:string}>("select id from csc_claim_notifications(5,'44444444-4444-4444-8444-444444444444')")).rows.some((r)=>r.id===rows[0].id)).toBe(true);
   await db.query("select csc_release_notification_dispatch('44444444-4444-4444-8444-444444444444')");
  } finally { await db.exec("reset role"); }
 });
});

describe("resources & opportunities CMS", () => {
  const member = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"; // no content.manage
  const mgr = "ffffffff-ffff-4fff-8fff-ffffffffffff";    // content manager
  beforeAll(async () => {
    await db.exec(`insert into auth.users(id,email,email_confirmed_at) values ('${member}','cm@example.test',now()),('${mgr}','mgr@example.test',now()) on conflict do nothing;
      insert into public.admin_roles(user_id,role) values ('${mgr}','content_manager') on conflict do nothing;
      insert into public.resources(slug,title,summary,description,publication_status,resource_type,document_path,document_mime,document_size,publication_consent,attribution)
      values ('draft-res','Draft Resource','Draft summary','A sufficiently detailed description for this resource.', 'draft','document','resource-docs/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf','application/pdf',123,true,'CSC'),
      ('pub-res','Published Resource','Published summary','A sufficiently detailed description for this resource.', 'published','document','resource-docs/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf','application/pdf',123,true,'CSC');
      insert into public.opportunities(slug,title,summary,description,organization,source,organization_verified,publication_consent,application_url,publication_status,deadline)
      values ('draft-opp','Draft Opp','Draft summary','A sufficiently detailed opportunity description.','Org','Verified source',true,true,'https://example.test/apply','draft',null),
      ('pub-opp','Published Opp','Published summary','A sufficiently detailed opportunity description.','Org','Verified source',true,true,'https://example.test/apply','published',null),
      ('exp-opp','Expired Opp','Expired summary','A sufficiently detailed opportunity description.','Org','Verified source',true,true,'https://example.test/apply','published',(current_date - 1));
      insert into public.community_updates(slug,title,category,summary,body,publication_status,publication_consent)
      values ('draft-story','Draft Story','Community News','Draft summary','A sufficiently detailed community story for the draft record.','draft',false),
      ('published-story','Published Story','Event Highlights','Published summary','A sufficiently detailed community story for the published record.','published',true);`);
  });

  it("exposes only published records to the public and hides drafts", async () => {
    await db.exec("set role anon;");
    try {
      expect((await db.query<{ slug: string }>("select slug from public.resources order by slug")).rows).toEqual([{ slug: "pub-res" }]);
      expect((await db.query<{ slug: string }>("select slug from public.opportunities order by slug")).rows.map((r) => r.slug)).toEqual(["pub-opp"]);
      expect((await db.query<{ slug: string }>("select slug from public.community_updates order by slug")).rows).toEqual([{ slug: "published-story" }]);
      await expect(db.query("select created_by from public.resources")).rejects.toThrow();
      // Active (non-expired) published opportunities = the public listing (Coming Soon when 0).
      expect((await db.query<{ n: number }>("select count(*)::int n from public.opportunities where publication_status='published' and (deadline is null or deadline>=current_date)")).rows).toEqual([{ n: 1 }]);
    } finally { await db.exec("reset role;"); }
  });

  it("prevents non-content-managers from creating CMS content", async () => {
    await expect(asUser(member, "insert into public.resources(slug,title) values ('member-res','Member Resource')")).rejects.toThrow();
    await expect(asUser(member, "insert into public.opportunities(slug,title) values ('member-opp','Member Opp')")).rejects.toThrow();
    await expect(asUser(member, "insert into public.community_updates(slug,title,category,summary,body) values ('member-story','Member Story','Community News','Story summary','A sufficiently detailed community story from a member.')")).rejects.toThrow();
  });

  it("publishes Updates through the same independent record-driven visibility rule", async () => {
    await asUser(mgr, "insert into public.community_updates(slug,title,category,summary,body,publication_consent) values ('manager-story','Manager Story','Community News','Manager summary','A sufficiently detailed community story created by a content manager.',true)");
    await db.exec("set role anon;");
    try {
      expect((await db.query<{ slug: string }>("select slug from public.community_updates order by slug")).rows).toEqual([{ slug: "published-story" }]);
    } finally { await db.exec("reset role;"); }
    await asUser(mgr, "update public.community_updates set publication_status='published',published_at=now() where slug='manager-story'");
    await db.exec("set role anon;");
    try {
      expect((await db.query<{ slug: string }>("select slug from public.community_updates order by slug")).rows).toEqual([{ slug: "manager-story" }, { slug: "published-story" }]);
    } finally { await db.exec("reset role;"); }
    await asUser(mgr, "update public.community_updates set publication_status='draft',published_at=null where slug='manager-story'");
    await db.exec("set role anon;");
    try {
      expect((await db.query<{ slug: string }>("select slug from public.community_updates order by slug")).rows).toEqual([{ slug: "published-story" }]);
    } finally { await db.exec("reset role;"); }
  });

  it("rejects direct publication when required content, permission or verification is missing", async () => {
    await expect(asUser(mgr, "insert into public.resources(slug,title,publication_status) values ('invalid-res','Invalid Resource','published')")).rejects.toThrow(/required|permission|attribution/i);
    await expect(asUser(mgr, "insert into public.opportunities(slug,title,publication_status) values ('invalid-opp','Invalid Opportunity','published')")).rejects.toThrow(/required|verification|permission/i);
  });

  it("lets a content manager publish and unpublish, flipping public visibility", async () => {
    await db.exec("set role anon;");
    const before = (await db.query<{ n: number }>("select count(*)::int n from public.resources where publication_status='published'")).rows[0].n;
    await db.exec("reset role;");

    await asUser(mgr, "insert into public.resources(slug,title,summary,description,publication_status,resource_type,document_path,document_mime,document_size,publication_consent,attribution,published_at) values ('mgr-res','Manager Resource','Manager summary','A sufficiently detailed description for this manager resource.','published','document','resource-docs/cccccccc-cccc-4ccc-8ccc-cccccccccccc.pdf','application/pdf',123,true,'CSC',now())");
    await db.exec("set role anon;");
    try {
      expect((await db.query<{ n: number }>("select count(*)::int n from public.resources where publication_status='published'")).rows[0].n).toBe(before + 1);
      expect((await db.query<{ title: string }>("select title from public.resources where slug='mgr-res'")).rows).toEqual([{ title: "Manager Resource" }]);
    } finally { await db.exec("reset role;"); }

    await asUser(mgr, "update public.resources set publication_status='draft', published_at=null where slug='mgr-res'");
    await db.exec("set role anon;");
    try {
      expect((await db.query("select title from public.resources where slug='mgr-res'")).rows).toHaveLength(0);
    } finally { await db.exec("reset role;"); }
  });

  it("keeps Resources and Opportunities independent and returns each empty section to its empty state", async () => {
    await asUser(mgr, "update public.resources set publication_status='draft', published_at=null where slug='pub-res'");
    await db.exec("set role anon;");
    try {
      expect((await db.query<{ n: number }>("select count(*)::int n from public.resources where publication_status='published'")).rows).toEqual([{ n: 0 }]);
      expect((await db.query<{ n: number }>("select count(*)::int n from public.opportunities where publication_status='published' and (deadline is null or deadline>=current_date)")).rows).toEqual([{ n: 1 }]);
    } finally { await db.exec("reset role;"); }

    await asUser(mgr, "update public.opportunities set publication_status='draft', published_at=null where publication_status='published'");
    await db.exec("set role anon;");
    try {
      expect((await db.query<{ n: number }>("select count(*)::int n from public.opportunities where publication_status='published' and (deadline is null or deadline>=current_date)")).rows).toEqual([{ n: 0 }]);
    } finally { await db.exec("reset role;"); }
  });
});
