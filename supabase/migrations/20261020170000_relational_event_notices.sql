-- Promotional event notices are independent of events, bookings and tickets.
-- The stable event UUID is the source of truth for the destination and status.
create table if not exists public.event_notices (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 100),
  message text not null check (char_length(btrim(message)) between 8 and 500),
  button_label text not null default 'View Event' check (char_length(btrim(button_label)) between 2 and 40),
  banner_path text check (banner_path is null or banner_path ~ '^event-banners/[0-9a-f-]{36}\.webp$'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  visible_from timestamptz,
  visible_until timestamptz,
  display_priority integer not null default 0 check (display_priority between 0 and 1000),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  unpublished_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_notices_visibility_window check (visible_from is null or visible_until is null or visible_from < visible_until)
);

create index if not exists event_notices_event_id_idx on public.event_notices(event_id);
create index if not exists event_notices_active_window_idx on public.event_notices(status, visible_from, visible_until, display_priority desc)
  where deleted_at is null;

drop trigger if exists event_notices_updated_at on public.event_notices;
create trigger event_notices_updated_at before update on public.event_notices
  for each row execute function public.set_updated_at();

alter table public.event_notices enable row level security;
revoke all on public.event_notices from anon, authenticated;
grant select on public.event_notices to anon, authenticated;
grant all on public.event_notices to service_role;

drop policy if exists event_notices_public_active_read on public.event_notices;
create policy event_notices_public_active_read on public.event_notices
  for select to anon, authenticated using (
    status = 'published'
    and deleted_at is null
    and (visible_from is null or visible_from <= now())
    and (visible_until is null or visible_until > now())
    and exists (
      select 1 from public.events e
      where e.id = event_notices.event_id and e.status = 'published' and e.ends_at > now()
    )
  );

-- The old singleton remains archived in content_blocks for history, but it is
-- no longer a public source of event promotions.
drop policy if exists content_public_read on public.content_blocks;
create policy content_public_read on public.content_blocks for select
  using (
    key <> 'homepage.event_notice'
    and status = 'published'
    and deleted_at is null
    and (visible_from is null or visible_from <= now())
    and (visible_until is null or visible_until > now())
  );

comment on table public.event_notices is 'Time-bounded promotions for existing events; never the source of event registration or ticket data.';
comment on column public.event_notices.event_id is 'Stable relationship to the authoritative event record.';
