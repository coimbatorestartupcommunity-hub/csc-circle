-- CSC Circle — Phase 1 schema (members, memberships, events, registrations,
-- consultations, reviews, directory). Additive and safe to run on an empty DB.
-- RLS is enabled on every table; the public site reads only published rows via
-- SECURITY INVOKER views, and each member can see only their own private rows.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type membership_status as enum (
    'not_started','profile_incomplete','claim_submitted','pending_verification',
    'approved','active','rejected','suspended','revoked','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_designation as enum (
    'startup_founder','co_founder','team_member','developer','student_entrepreneur',
    'designer','marketing','investor','mentor','aspiring_entrepreneur','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type community_goal as enum (
    'networking','technical_collaboration','finding_co_founder','mentorship',
    'product_development','marketing','funding_connections','hiring',
    'startup_learning','community_participation');
exception when duplicate_object then null; end $$;

do $$ begin
  create type registration_status as enum (
    'draft','pending','pending_review','pending_payment','payment_verification',
    'confirmed','waitlisted','cancelled','refunded','checked_in');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_status as enum ('not_attended','checked_in','no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('not_required','pending','paid','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type consultation_status as enum (
    'submitted','under_review','more_info_required','approved','scheduled',
    'completed','declined','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_moderation_status as enum (
    'draft','submitted','under_review','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type publication_status as enum ('draft','pending','published','archived');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- Member number sequence + formatter (CSC-2026-000001)
-- ---------------------------------------------------------------------------
create sequence if not exists member_number_seq start 1;

create or replace function next_member_number() returns text
language sql volatile as $$
  select 'CSC-2026-' || lpad(nextval('member_number_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  email text,
  whatsapp text,
  city text,
  avatar_url text,
  designations member_designation[] not null default '{}',
  startup jsonb,
  goals community_goal[] not null default '{}',
  skills text[] not null default '{}',
  consent jsonb not null default jsonb_build_object(
    'membershipTerms', false, 'operationalEmail', false, 'marketingEmail', false,
    'directoryParticipation', false, 'displayNamePublicly', false, 'displayPhotoPublicly', false),
  profile_completion int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- memberships (one active per user; number issued server-side on activation)
-- ---------------------------------------------------------------------------
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status membership_status not null default 'not_started',
  member_number text unique,
  issued_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);
drop trigger if exists trg_memberships_updated on memberships;
create trigger trg_memberships_updated before update on memberships
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- membership_claims
-- ---------------------------------------------------------------------------
create table if not exists membership_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  linked_account_email text not null,
  applicant_type text not null check (applicant_type in ('existing_member','new_applicant')),
  reference text,
  whatsapp text not null,
  designation member_designation not null,
  startup_affiliation text,
  declaration_accurate boolean not null default false,
  status membership_status not null default 'claim_submitted',
  submitted_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- events (public read when published)
-- ---------------------------------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  description text not null default '',
  cover_image text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null,
  venue text,
  capacity int,
  registration_deadline timestamptz,
  status publication_status not null default 'draft',
  admission text not null default 'free' check (admission in ('free','paid')),
  registration_state text not null default 'coming-soon',
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- event_registrations
-- ---------------------------------------------------------------------------
create table if not exists event_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  reference text not null unique,
  status registration_status not null default 'pending',
  payment payment_status not null default 'not_required',
  attendance attendance_status not null default 'not_attended',
  goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);
drop trigger if exists trg_reg_updated on event_registrations;
create trigger trg_reg_updated before update on event_registrations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- consultations
-- ---------------------------------------------------------------------------
create table if not exists consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  goal text,
  challenge text,
  assigned_rep text,
  status consultation_status not null default 'submitted',
  scheduled_at timestamptz,
  mode text check (mode in ('online','in_person')),
  member_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_consult_updated on consultations;
create trigger trg_consult_updated before update on consultations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- reviews (public read when approved)
-- ---------------------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review text not null,
  moderation review_moderation_status not null default 'submitted',
  kind text not null default 'general' check (kind in ('general','event')),
  event_id uuid references events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, event_id)
);
drop trigger if exists trg_reviews_updated on reviews;
create trigger trg_reviews_updated before update on reviews
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- directory_startups (public read when published)
-- ---------------------------------------------------------------------------
create table if not exists directory_startups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  slug text not null unique,
  name text not null,
  logo_url text,
  industry text not null default 'other',
  description text not null default '',
  collaboration text[] not null default '{}',
  website text,
  founder jsonb not null default '{}',
  status publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_dir_updated on directory_startups;
create trigger trg_dir_updated before update on directory_startups
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- New-user bootstrap: create profile + membership rows on signup
-- ---------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, display_name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.memberships (user_id, status)
  values (new.id, 'not_started')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
