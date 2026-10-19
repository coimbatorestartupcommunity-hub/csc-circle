-- CSC Circle — Row-Level Security, grants and public read views.
-- Principle: members see only their own private rows; the public site reads
-- only published/approved content through narrow views or published-row policies.

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table profiles            enable row level security;
alter table memberships         enable row level security;
alter table membership_claims   enable row level security;
alter table events              enable row level security;
alter table event_registrations enable row level security;
alter table consultations       enable row level security;
alter table reviews             enable row level security;
alter table directory_startups  enable row level security;

-- ---------------------------------------------------------------------------
-- Base grants (RLS still restricts per-row). Service role bypasses RLS.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on events, directory_startups to anon, authenticated;
grant select, insert, update on profiles, memberships, membership_claims,
  event_registrations, consultations, reviews, directory_startups to authenticated;

-- ---------------------------------------------------------------------------
-- profiles: owner-only access
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles for select
  using (auth.uid() = id);
drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own on profiles for insert
  with check (auth.uid() = id);
drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- memberships: owner may read; issuance/changes are service-role only
-- ---------------------------------------------------------------------------
drop policy if exists memberships_select_own on memberships;
create policy memberships_select_own on memberships for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- membership_claims: owner insert + read own
-- ---------------------------------------------------------------------------
drop policy if exists claims_insert_own on membership_claims;
create policy claims_insert_own on membership_claims for insert
  with check (auth.uid() = user_id);
drop policy if exists claims_select_own on membership_claims;
create policy claims_select_own on membership_claims for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- events: anyone may read published; writes are service-role only
-- ---------------------------------------------------------------------------
drop policy if exists events_select_published on events;
create policy events_select_published on events for select
  using (status = 'published');

-- ---------------------------------------------------------------------------
-- event_registrations: owner only
-- ---------------------------------------------------------------------------
drop policy if exists reg_select_own on event_registrations;
create policy reg_select_own on event_registrations for select
  using (auth.uid() = user_id);
drop policy if exists reg_insert_own on event_registrations;
create policy reg_insert_own on event_registrations for insert
  with check (auth.uid() = user_id);
drop policy if exists reg_update_own on event_registrations;
create policy reg_update_own on event_registrations for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- consultations: owner only
-- ---------------------------------------------------------------------------
drop policy if exists consult_select_own on consultations;
create policy consult_select_own on consultations for select
  using (auth.uid() = user_id);
drop policy if exists consult_insert_own on consultations;
create policy consult_insert_own on consultations for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reviews: owner insert/read/update own; public read of approved via view
-- ---------------------------------------------------------------------------
drop policy if exists reviews_select_own on reviews;
create policy reviews_select_own on reviews for select
  using (auth.uid() = user_id);
drop policy if exists reviews_insert_own on reviews;
create policy reviews_insert_own on reviews for insert
  with check (auth.uid() = user_id);
drop policy if exists reviews_update_own on reviews;
create policy reviews_update_own on reviews for update
  using (auth.uid() = user_id and moderation in ('draft','submitted'))
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- directory_startups: public read published; owner manages own
-- ---------------------------------------------------------------------------
drop policy if exists dir_select_published on directory_startups;
create policy dir_select_published on directory_startups for select
  using (status = 'published' or auth.uid() = user_id);
drop policy if exists dir_insert_own on directory_startups;
create policy dir_insert_own on directory_startups for insert
  with check (auth.uid() = user_id);
drop policy if exists dir_update_own on directory_startups;
create policy dir_update_own on directory_startups for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Public testimonials view (approved general reviews, consent-respecting).
-- SECURITY DEFINER view exposes only safe, consented columns to the public.
-- ---------------------------------------------------------------------------
create or replace view public_testimonials
with (security_invoker = false) as
  select
    r.id,
    r.rating,
    r.review,
    r.created_at,
    case when coalesce((p.consent->>'displayNamePublicly')::boolean, false)
         then coalesce(p.display_name, 'CSC Member') else 'CSC Member' end as name,
    case when coalesce((p.consent->>'displayPhotoPublicly')::boolean, false)
         then p.avatar_url else null end as avatar_url,
    coalesce((p.designations)[1]::text, 'Community Member') as designation
  from reviews r
  join profiles p on p.id = r.user_id
  where r.moderation = 'approved' and r.kind = 'general';

grant select on public_testimonials to anon, authenticated;
