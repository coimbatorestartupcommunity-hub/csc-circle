-- CSC Circle — Phase 4 admin schema. Additive. RLS fails closed: only
-- provisioned admins can read admin tables, and there are NO client write
-- policies (privileged writes happen through service-role operations in Phase 1).

-- ---------------------------------------------------------------------------
-- admin_roles — provisioned by a DBA / privileged op, never from the client.
-- A user may hold multiple roles.
-- ---------------------------------------------------------------------------
create table if not exists admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in (
    'super_admin','community_admin','event_manager','checkin_staff',
    'finance_reviewer','content_manager','tech_admin')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Is the current user a provisioned admin? SECURITY DEFINER avoids RLS recursion.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_roles where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- audit_logs — append-only record of privileged actions.
-- ---------------------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid,
  actor_role text,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  correlation_id text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- content_blocks — structured public content (no raw HTML).
-- ---------------------------------------------------------------------------
create table if not exists content_blocks (
  key text primary key,
  label text not null,
  value text not null default '',
  status publication_status not null default 'draft',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- media_assets — metadata for the media library (files live in Storage).
-- ---------------------------------------------------------------------------
create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  alt_text text,
  type text,
  width int,
  height int,
  size_bytes bigint,
  category text not null default 'gallery',
  visibility text not null default 'private' check (visibility in ('public','private')),
  storage_path text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications — outbox; queued from committed business events (Phase 1).
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  channel text not null check (channel in ('in_app','email','whatsapp')),
  recipient text,
  status text not null default 'queued' check (status in ('queued','sent','failed','retrying')),
  payload jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- ---------------------------------------------------------------------------
-- RLS — enable everywhere; admin-only reads; no client writes.
-- ---------------------------------------------------------------------------
alter table admin_roles    enable row level security;
alter table audit_logs     enable row level security;
alter table content_blocks enable row level security;
alter table media_assets   enable row level security;
alter table notifications  enable row level security;

grant usage on schema public to authenticated;
grant select on admin_roles, audit_logs, content_blocks, media_assets, notifications to authenticated;
grant execute on function is_admin() to anon, authenticated;

-- A user may read their OWN admin role rows (needed by the server-side gate).
drop policy if exists admin_roles_select_own on admin_roles;
create policy admin_roles_select_own on admin_roles for select
  using (user_id = auth.uid());

-- Admins may read the operational tables.
drop policy if exists audit_admin_read on audit_logs;
create policy audit_admin_read on audit_logs for select using (is_admin());
drop policy if exists content_admin_read on content_blocks;
create policy content_admin_read on content_blocks for select using (is_admin());
drop policy if exists media_admin_read on media_assets;
create policy media_admin_read on media_assets for select using (is_admin());
drop policy if exists notif_admin_read on notifications;
create policy notif_admin_read on notifications for select using (is_admin());

-- Published content may also be read publicly (for future dynamic content).
drop policy if exists content_public_read on content_blocks;
create policy content_public_read on content_blocks for select using (status = 'published');
grant select on content_blocks to anon;
