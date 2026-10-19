-- CSC Circle — integration migration.
-- 1) Public submission queues for anonymous website forms (RSVP, consultation).
-- 2) Admin read/manage RLS so provisioned admins can see & moderate records.
-- Additive and safe.

-- ---------------------------------------------------------------------------
-- Public submission queues (anonymous website forms)
-- ---------------------------------------------------------------------------
create table if not exists consultation_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  startup text,
  whatsapp text not null,
  email text not null,
  challenge text,
  goal text,
  consent boolean not null default false,
  status consultation_status not null default 'submitted',
  assigned_rep text,
  scheduled_at timestamptz,
  member_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_consub_updated on consultation_submissions;
create trigger trg_consub_updated before update on consultation_submissions
  for each row execute function set_updated_at();

create table if not exists rsvp_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete set null,
  event_label text,
  full_name text not null,
  startup text,
  whatsapp text not null,
  email text not null,
  goal text,
  consent boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending','confirmed','waitlisted','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_rsvpsub_updated on rsvp_submissions;
create trigger trg_rsvpsub_updated before update on rsvp_submissions
  for each row execute function set_updated_at();

alter table consultation_submissions enable row level security;
alter table rsvp_submissions enable row level security;

-- Anonymous visitors may submit (insert) but never read the queue.
grant insert on consultation_submissions, rsvp_submissions to anon, authenticated;
grant select, update on consultation_submissions, rsvp_submissions to authenticated;

-- Anyone may enqueue a submission; consent + field validation are enforced
-- server-side in the API route (a client-supplied flag is not an RLS control).
drop policy if exists consub_insert_public on consultation_submissions;
create policy consub_insert_public on consultation_submissions for insert
  to anon, authenticated with check (true);
drop policy if exists consub_admin_read on consultation_submissions;
create policy consub_admin_read on consultation_submissions for select using (is_admin());
drop policy if exists consub_admin_update on consultation_submissions;
create policy consub_admin_update on consultation_submissions for update using (is_admin());

drop policy if exists rsvpsub_insert_public on rsvp_submissions;
create policy rsvpsub_insert_public on rsvp_submissions for insert
  to anon, authenticated with check (true);
drop policy if exists rsvpsub_admin_read on rsvp_submissions;
create policy rsvpsub_admin_read on rsvp_submissions for select using (is_admin());
drop policy if exists rsvpsub_admin_update on rsvp_submissions;
create policy rsvpsub_admin_update on rsvp_submissions for update using (is_admin());

-- ---------------------------------------------------------------------------
-- Admin read / manage policies on member-owned tables.
-- Ownership policies from 0002 still apply to members; these ADD admin access.
-- Fine-grained permission (which admin role) is enforced in the app/service
-- layer and future privileged RPCs; RLS here gates to any provisioned admin.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_admin_read on profiles;
create policy profiles_admin_read on profiles for select using (is_admin());

drop policy if exists memberships_admin_read on memberships;
create policy memberships_admin_read on memberships for select using (is_admin());
drop policy if exists memberships_admin_write on memberships;
create policy memberships_admin_write on memberships for update using (is_admin());

drop policy if exists claims_admin_read on membership_claims;
create policy claims_admin_read on membership_claims for select using (is_admin());
drop policy if exists claims_admin_write on membership_claims;
create policy claims_admin_write on membership_claims for update using (is_admin());

drop policy if exists reg_admin_read on event_registrations;
create policy reg_admin_read on event_registrations for select using (is_admin());
drop policy if exists reg_admin_write on event_registrations;
create policy reg_admin_write on event_registrations for update using (is_admin());

drop policy if exists consult_admin_read on consultations;
create policy consult_admin_read on consultations for select using (is_admin());
drop policy if exists consult_admin_write on consultations;
create policy consult_admin_write on consultations for update using (is_admin());

drop policy if exists reviews_admin_read on reviews;
create policy reviews_admin_read on reviews for select using (is_admin());
drop policy if exists reviews_admin_write on reviews;
create policy reviews_admin_write on reviews for update using (is_admin());

drop policy if exists dir_admin_write on directory_startups;
create policy dir_admin_write on directory_startups for update using (is_admin());
