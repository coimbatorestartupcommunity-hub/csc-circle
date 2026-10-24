-- CSC community updates CMS. Additive; public reads are limited to published
-- rows and administrator writes use the existing content.manage permission.
begin;

create table if not exists public.community_updates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 3 and 160),
  category text not null check (category in (
    'Community News','Event Highlights','Startup Achievements','Founder Spotlight',
    'Community Milestones','Collaborations','Announcements','Workshops & Learning','Other'
  )),
  summary text not null check (length(btrim(summary)) between 5 and 500),
  body text not null check (length(btrim(body)) between 20 and 20000),
  featured boolean not null default false,
  cover_image_path text,
  cover_image_alt text,
  gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery) = 'array'),
  author text,
  source text,
  publication_consent boolean not null default false,
  related_event_id uuid,
  related_collaboration_id uuid,
  seo_title text,
  meta_description text,
  publication_status publication_status not null default 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_updates_cover_path check (cover_image_path is null or cover_image_path ~ '^updates-media/[0-9a-f-]{36}[.]webp$')
);

drop trigger if exists trg_community_updates_updated on public.community_updates;
create trigger trg_community_updates_updated before update on public.community_updates
  for each row execute function set_updated_at();
create index if not exists community_updates_public_idx
  on public.community_updates(publication_status, published_at desc);
create index if not exists community_updates_featured_idx
  on public.community_updates(featured, published_at desc)
  where publication_status = 'published';

create or replace function private.validate_community_update_publication()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.publication_status = 'published' then
    if length(btrim(coalesce(new.title, ''))) < 3
       or length(btrim(coalesce(new.summary, ''))) < 5
       or length(btrim(coalesce(new.body, ''))) < 20 then
      raise exception 'update title, summary and article are required before publication' using errcode = '23514';
    end if;
    if not new.publication_consent then
      raise exception 'publication permission must be confirmed before publication' using errcode = '23514';
    end if;
    if new.cover_image_path is not null and new.cover_image_path !~ '^updates-media/[0-9a-f-]{36}[.]webp$' then
      raise exception 'update cover path is invalid' using errcode = '23514';
    end if;
    if new.cover_image_path is not null and length(btrim(coalesce(new.cover_image_alt, ''))) = 0 then
      raise exception 'update cover alt text is required' using errcode = '23514';
    end if;
    if exists (
      select 1 from jsonb_array_elements(new.gallery) as item(value)
      where coalesce(item.value ->> 'path', '') !~ '^updates-media/[0-9a-f-]{36}[.]webp$'
         or length(btrim(coalesce(item.value ->> 'alt', ''))) = 0
         or length(coalesce(item.value ->> 'alt', '')) > 250
    ) then
      raise exception 'update gallery paths and alt text must be valid' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists community_updates_publication_guard on public.community_updates;
create trigger community_updates_publication_guard before insert or update on public.community_updates
  for each row execute function private.validate_community_update_publication();
revoke all on function private.validate_community_update_publication() from public, anon, authenticated;

alter table public.community_updates enable row level security;
drop policy if exists community_updates_public_read on public.community_updates;
create policy community_updates_public_read on public.community_updates for select
  to anon, authenticated using (publication_status = 'published');
drop policy if exists community_updates_admin_all on public.community_updates;
create policy community_updates_admin_all on public.community_updates for all to authenticated
  using (private.has_permission('content.manage'))
  with check (private.has_permission('content.manage'));

revoke all on public.community_updates from public, anon;
  grant select (id,slug,title,category,summary,body,featured,cover_image_path,cover_image_alt,gallery,author,source,related_event_id,related_collaboration_id,seo_title,meta_description,publication_status,published_at,created_at,updated_at)
  on public.community_updates to anon;
grant select on public.community_updates to authenticated;
grant select, insert, update, delete on public.community_updates to authenticated;

commit;
