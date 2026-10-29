-- CSC Circle — Resources & Opportunities CMS. Additive. Public reads only
-- PUBLISHED records; content managers manage all. Visibility is data-driven:
-- a section shows "Coming Soon" purely because it has zero published records.
-- No separate launch flag.
begin;

-- Keep the existing storage bucket private while allowing the CMS's validated
-- PDFs. It is shared with existing member media and remains within the current
-- 8 MiB bucket limit.
update storage.buckets
set public = false,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']::text[]
where id = 'member-portraits';

-- ---------------------------------------------------------------------------
-- Resources
-- ---------------------------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'Learning Materials',
  resource_type text not null default 'document'
    check (resource_type in ('document','guide','presentation','link','article','template','video')),
  summary text,
  description text,
  tags jsonb not null default '[]',
  audience text,
  cover_image_path text,
  thumbnail_path text,
  org_logo_path text,
  document_path text,
  document_filename text,
  document_mime text,
  document_size bigint check (document_size is null or document_size between 0 and 8388608),
  constraint resources_document_path_format check (document_path is null or document_path ~ '^resource-docs/[0-9a-f-]{36}[.]pdf$'),
  constraint resources_document_metadata_check check (document_path is null or (document_mime = 'application/pdf' and document_size between 1 and 8388608)),
  external_url text,
  source_name text,
  source_organization text,
  source_url text,
  author text,
  license text,
  attribution text,
  publication_consent boolean not null default false,
  seo_title text,
  meta_description text,
  publication_status publication_status not null default 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_resources_updated on public.resources;
create trigger trg_resources_updated before update on public.resources
  for each row execute function set_updated_at();
create index if not exists resources_public_idx on public.resources(publication_status, published_at desc);

-- ---------------------------------------------------------------------------
-- Opportunities
-- ---------------------------------------------------------------------------
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'Community Programs',
  summary text,
  description text,
  organization text,
  audience text,
  eligibility text,
  skills text,
  location text,
  participation_mode text check (participation_mode is null or participation_mode in ('onsite','remote','hybrid')),
  starts_on date,
  deadline date,
  ends_on date,
  application_url text,
  application_instructions text,
  contact text,
  banner_path text,
  org_logo_path text,
  source text,
  organization_verified boolean not null default false,
  publication_consent boolean not null default false,
  last_reviewed_at timestamptz,
  seo_title text,
  meta_description text,
  publication_status publication_status not null default 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_opportunities_updated on public.opportunities;
create trigger trg_opportunities_updated before update on public.opportunities
  for each row execute function set_updated_at();
create index if not exists opportunities_public_idx on public.opportunities(publication_status, deadline);

-- Publication rules are checked in PostgreSQL as well as in the API so an
-- authenticated administrator cannot bypass eligibility checks with a direct
-- Data API update.
create or replace function private.validate_resource_publication()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.publication_status = 'published' then
    if length(trim(coalesce(new.title, ''))) < 3
       or length(trim(coalesce(new.summary, ''))) < 5
       or length(trim(coalesce(new.description, ''))) < 20 then
      raise exception 'resource title, summary and detailed description are required before publication' using errcode = '23514';
    end if;
    if not new.publication_consent then
      raise exception 'publication permission must be confirmed before publication' using errcode = '23514';
    end if;
    if not (nullif(trim(new.attribution), '') is not null or nullif(trim(new.author), '') is not null or nullif(trim(new.source_organization), '') is not null) then
      raise exception 'resource attribution is required before publication' using errcode = '23514';
    end if;
    if new.resource_type = 'link' or new.resource_type = 'video' then
      if new.external_url is null or new.external_url !~ '^https?://' then
        raise exception 'a valid external resource URL is required before publication' using errcode = '23514';
      end if;
    else
      if new.document_path is null or new.document_mime is distinct from 'application/pdf' or coalesce(new.document_size, 0) < 1 then
        raise exception 'a valid uploaded PDF is required before publication' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists resources_publication_guard on public.resources;
create trigger resources_publication_guard before insert or update on public.resources
  for each row execute function private.validate_resource_publication();

create or replace function private.validate_opportunity_publication()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.publication_status = 'published' then
    if length(trim(coalesce(new.title, ''))) < 3
       or length(trim(coalesce(new.summary, ''))) < 5
       or length(trim(coalesce(new.description, ''))) < 20
       or nullif(trim(new.organization), '') is null
       or nullif(trim(new.source), '') is null then
      raise exception 'opportunity title, summary, description, organization and verified source are required before publication' using errcode = '23514';
    end if;
    if not new.organization_verified or not new.publication_consent then
      raise exception 'organization verification and publication permission are required before publication' using errcode = '23514';
    end if;
    if nullif(trim(new.application_url), '') is null and nullif(trim(new.contact), '') is null and nullif(trim(new.application_instructions), '') is null then
      raise exception 'application instructions, URL or contact are required before publication' using errcode = '23514';
    end if;
    if new.application_url is not null and new.application_url !~ '^https?://' then
      raise exception 'application URL must use HTTP or HTTPS' using errcode = '23514';
    end if;
    if new.ends_on is not null and new.starts_on is not null and new.ends_on < new.starts_on then
      raise exception 'opportunity end date cannot precede its start date' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists opportunities_publication_guard on public.opportunities;
create trigger opportunities_publication_guard before insert or update on public.opportunities
  for each row execute function private.validate_opportunity_publication();

revoke all on function private.validate_resource_publication() from public, anon, authenticated;
revoke all on function private.validate_opportunity_publication() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row-Level Security — public reads published only; content managers manage all
-- ---------------------------------------------------------------------------
alter table public.resources enable row level security;
alter table public.opportunities enable row level security;

drop policy if exists resources_public_read on public.resources;
create policy resources_public_read on public.resources for select
  using (publication_status = 'published');
drop policy if exists resources_admin_all on public.resources;
create policy resources_admin_all on public.resources for all to authenticated
  using (private.has_permission('content.manage')) with check (private.has_permission('content.manage'));

drop policy if exists opportunities_public_read on public.opportunities;
create policy opportunities_public_read on public.opportunities for select
  using (
    publication_status = 'published'
    and (deadline is null or deadline >= (timezone('Asia/Kolkata', now()))::date)
  );
drop policy if exists opportunities_admin_all on public.opportunities;
create policy opportunities_admin_all on public.opportunities for all to authenticated
  using (private.has_permission('content.manage')) with check (private.has_permission('content.manage'));

revoke all on public.resources from public, anon;
grant select (id,slug,title,category,resource_type,summary,description,tags,audience,cover_image_path,document_path,document_filename,document_mime,external_url,source_name,source_organization,source_url,author,license,attribution,seo_title,meta_description,publication_status,published_at,updated_at) on public.resources to anon;
grant select on public.resources to authenticated;
grant select, insert, update, delete on public.resources to authenticated;
revoke all on public.opportunities from public, anon;
grant select (id,slug,title,category,summary,description,organization,audience,eligibility,skills,location,participation_mode,starts_on,deadline,ends_on,application_url,application_instructions,contact,banner_path,org_logo_path,source,seo_title,meta_description,publication_status,published_at,updated_at) on public.opportunities to anon;
grant select on public.opportunities to authenticated;
grant select, insert, update, delete on public.opportunities to authenticated;

commit;
