begin;

-- Keep the two historical resume records, but retire the public application
-- table/API surface. The archive is in a non-exposed schema with no member API
-- grants; no member data is deleted by this feature removal.
alter table public.member_resumes set schema private;
alter table private.member_resumes rename to archived_member_resumes;
revoke all on table private.archived_member_resumes from public, anon, authenticated;

alter table public.profiles add column if not exists about_me text not null default '';
alter table public.directory_startups
  add column if not exists directory_image_path text,
  add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.directory_startups
  add constraint directory_startups_details_object
  check (jsonb_typeof(details) = 'object');

-- Startup publication now uses its own 4:3 image. It must not depend on the
-- member's separate 4:5 identity portrait or legacy profile-wide directory crop.
create or replace function private.directory_visible(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = owner_id
      and p.consent ->> 'directoryParticipation' = 'true'
      and p.consent ->> 'displayNamePublicly' = 'true'
      and nullif(btrim(p.display_name), '') is not null
  );
$$;
revoke all on function private.directory_visible(uuid) from public;
grant execute on function private.directory_visible(uuid) to anon, authenticated;

create or replace function private.require_directory_profile_for_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if new.user_id is null or not private.directory_visible(new.user_id) then
      raise exception 'directory participation and public-name consent are required'
        using errcode = '23514';
    end if;
    if new.directory_image_path is distinct from new.user_id::text || '/' || new.id::text || '-directory-startup.webp'
      or not exists (select 1 from storage.objects o where o.bucket_id='member-portraits' and o.name=new.directory_image_path) then
      raise exception 'a validated startup-specific 4:3 directory image is required'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.require_directory_profile_for_publish() from public, anon, authenticated;

create table if not exists public.directory_startup_private_details (
  startup_id uuid primary key references public.directory_startups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.directory_startup_private_details enable row level security;
revoke all on public.directory_startup_private_details from public, anon, authenticated;
grant all on public.directory_startup_private_details to service_role;

create or replace function public.save_member_startup(p_startup jsonb, p_private_details jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_name text;
  v_slug text;
  v_industry text;
  v_description text;
  v_logo text;
  v_image text;
  v_details jsonb;
  v_display_name text;
  v_old_status public.publication_status;
  v_created boolean := false;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_startup) <> 'object' or jsonb_typeof(coalesce(p_private_details, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid startup payload' using errcode = '22023';
  end if;

  begin
    v_id := nullif(p_startup->>'id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'invalid startup id' using errcode = '22023';
  end;
  if v_id is null then
    raise exception 'startup id is required' using errcode = '22023';
  end if;
  v_name := trim(coalesce(p_startup->>'name', ''));
  v_slug := trim(coalesce(p_startup->>'slug', ''));
  v_industry := trim(coalesce(p_startup->>'industry', ''));
  v_description := trim(coalesce(p_startup->>'description', ''));
  v_logo := nullif(trim(coalesce(p_startup->>'logoPath', '')), '');
  v_image := nullif(trim(coalesce(p_startup->>'directoryImagePath', '')), '');
  v_details := coalesce(p_startup->'details', '{}'::jsonb);

  if length(v_name) not between 2 and 120
    or length(v_slug) not between 3 and 120
    or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(v_industry) not between 2 and 80
    or length(v_description) not between 20 and 3000
    or jsonb_typeof(v_details) <> 'object'
    or coalesce((p_startup->>'consent')::boolean, false) is not true then
    raise exception 'invalid startup details or publication consent' using errcode = '22023';
  end if;

  if v_image is distinct from v_user::text || '/' || v_id::text || '-directory-startup.webp'
    or not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'member-portraits' and o.name = v_image
    ) then
    raise exception 'a verified startup-specific 4:3 directory image is required' using errcode = '23514';
  end if;
  if v_logo is not null and (
    v_logo !~ ('^' || v_user::text || '/[0-9a-f-]{36}-startup-logo\.webp$')
    or not exists (select 1 from storage.objects o where o.bucket_id = 'member-portraits' and o.name = v_logo)
  ) then
    raise exception 'the company logo could not be verified' using errcode = '23514';
  end if;

  select coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), ''))
  into v_display_name from public.profiles p where p.id = v_user;
  if v_display_name is null then
    raise exception 'complete your CSC profile before adding a startup' using errcode = '23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  if p_startup ? 'existingId' then
    begin
      v_id := (p_startup->>'existingId')::uuid;
    exception when invalid_text_representation then
      raise exception 'invalid startup id' using errcode = '22023';
    end;
  end if;

  select d.status into v_old_status
  from public.directory_startups d
  where d.id = v_id and d.user_id = v_user
  for update;

  if found then
    if v_old_status not in ('draft', 'pending') then
      raise exception 'published startups must be edited by a CSC administrator' using errcode = '42501';
    end if;
    update public.directory_startups set
      name = v_name,
      slug = v_slug,
      industry = v_industry,
      description = v_description,
      website = case when coalesce((v_details->'visibility'->>'publishWebsite')::boolean, false) then nullif(trim(p_startup->>'website'), '') else null end,
      logo_url = v_logo,
      directory_image_path = v_image,
      founder = jsonb_build_object('id', v_user, 'name', v_display_name, 'role', coalesce(nullif(v_details->>'founderRole', ''), 'Founder')),
      details = v_details,
      collaboration = coalesce(array(select jsonb_array_elements_text(coalesce(v_details->'collaboration', '[]'::jsonb))), '{}'::text[]),
      publication_consent = true,
      publication_consent_at = now(),
      status = 'pending'
    where id = v_id and user_id = v_user;
  else
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
    if (select count(*) from public.directory_startups d where d.user_id = v_user and d.status <> 'archived') >= 4 then
      raise exception 'startup_limit_reached' using errcode = '23514';
    end if;
    insert into public.directory_startups(
      id, user_id, slug, name, logo_url, directory_image_path, industry, description,
      collaboration, website, founder, details, publication_consent,
      publication_consent_at, status
    ) values (
      v_id, v_user, v_slug, v_name, v_logo, v_image, v_industry, v_description,
      coalesce(array(select jsonb_array_elements_text(coalesce(v_details->'collaboration', '[]'::jsonb))), '{}'::text[]),
      case when coalesce((v_details->'visibility'->>'publishWebsite')::boolean, false) then nullif(trim(p_startup->>'website'), '') else null end,
      jsonb_build_object('id', v_user, 'name', v_display_name, 'role', coalesce(nullif(v_details->>'founderRole', ''), 'Founder')),
      v_details, true, now(), 'pending'
    );
    v_created := true;
  end if;

  insert into public.directory_startup_private_details(startup_id, user_id, details)
  values (v_id, v_user, coalesce(p_private_details, '{}'::jsonb))
  on conflict (startup_id) do update set details = excluded.details, updated_at = now()
  where public.directory_startup_private_details.user_id = v_user;

  if v_created then
    perform private.record_operation('startup.submitted', 'directory_startup', v_id, null,
      jsonb_build_object('name', v_name, 'status', 'pending'), null);
  else
    perform private.record_operation('startup.updated', 'directory_startup', v_id,
      jsonb_build_object('status', v_old_status), jsonb_build_object('name', v_name, 'status', 'pending'), null);
  end if;
  return v_id;
end;
$$;

revoke all on function public.save_member_startup(jsonb, jsonb) from public, anon;
grant execute on function public.save_member_startup(jsonb, jsonb) to authenticated;
revoke insert, update, delete on public.directory_startups from authenticated;

-- Return only consented community-profile fields. Both the viewer and the
-- listed member must have active CSC membership. Private contact info is
-- omitted unless the member explicitly enables WhatsApp sharing.
create or replace function public.list_discoverable_members(p_search text default '', p_limit integer default 30, p_offset integer default 0)
returns table(member_id uuid, display_name text, city text, designation text, about_me text, skills text[], startup_name text, whatsapp text, has_photo boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_viewer uuid := auth.uid(); v_query text := left(trim(coalesce(p_search, '')), 80);
begin
  if v_viewer is null or not exists(select 1 from public.memberships m where m.user_id=v_viewer and m.status='active') then
    raise exception 'active CSC membership required' using errcode='42501';
  end if;
  return query
    select p.id,
      coalesce(nullif(p.display_name, ''), p.full_name),
      case when coalesce((p.consent->>'showCityToMembers')::boolean,false) then p.city end,
      case when coalesce((p.consent->>'showProfessionalRoleToMembers')::boolean,false) then coalesce(p.designations[1]::text,'') end,
      case when coalesce((p.consent->>'showAboutMeToMembers')::boolean,false) then p.about_me end,
      case when coalesce((p.consent->>'showSkillsToMembers')::boolean,false) then p.skills else '{}'::text[] end,
      case when coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) then p.startup->>'name' end,
      case when coalesce((p.consent->>'shareWhatsappWithMembers')::boolean,false) then p.whatsapp end,
      coalesce((p.consent->>'showProfilePhotoToMembers')::boolean,false) and p.portrait_path is not null
    from public.profiles p
    join public.memberships m on m.user_id=p.id and m.status='active'
    where coalesce((p.consent->>'communityProfileVisible')::boolean,false)
      and coalesce(nullif(p.display_name,''), nullif(p.full_name,'')) is not null
      and (v_query = ''
        or p.display_name ilike '%'||v_query||'%'
        or p.full_name ilike '%'||v_query||'%'
        or (coalesce((p.consent->>'showCityToMembers')::boolean,false) and p.city ilike '%'||v_query||'%')
        or (coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) and p.startup->>'name' ilike '%'||v_query||'%')
        or (coalesce((p.consent->>'showProfessionalRoleToMembers')::boolean,false) and exists(select 1 from unnest(p.designations) d where d::text ilike '%'||v_query||'%'))
        or (coalesce((p.consent->>'showSkillsToMembers')::boolean,false) and exists(select 1 from unnest(p.skills) s where s ilike '%'||v_query||'%'))
        or (coalesce((p.consent->>'showAboutMeToMembers')::boolean,false) and p.about_me ilike '%'||v_query||'%')
        or (coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) and exists(select 1 from public.directory_startups d where d.user_id=p.id and d.status='published' and d.name ilike '%'||v_query||'%'))
        or (coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) and exists(select 1 from public.directory_startups d where d.user_id=p.id and d.status='published' and d.industry ilike '%'||v_query||'%')))
    order by coalesce(nullif(p.display_name,''),p.full_name)
    limit greatest(1, least(coalesce(p_limit,30),50)) offset greatest(0, least(coalesce(p_offset,0),10000));
end;
$$;
revoke all on function public.list_discoverable_members(text,integer,integer) from public, anon;
grant execute on function public.list_discoverable_members(text,integer,integer) to authenticated;

create or replace function public.get_discoverable_member(p_member_id uuid)
returns table(member_id uuid, display_name text, city text, designation text, about_me text, skills text[], startup_name text, whatsapp text, has_photo boolean, startup_website text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_viewer uuid := auth.uid();
begin
  if v_viewer is null or not exists(select 1 from public.memberships m where m.user_id=v_viewer and m.status='active') then
    raise exception 'active CSC membership required' using errcode='42501';
  end if;
  return query
    select p.id,
      coalesce(nullif(p.display_name, ''), p.full_name),
      case when coalesce((p.consent->>'showCityToMembers')::boolean,false) then p.city end,
      case when coalesce((p.consent->>'showProfessionalRoleToMembers')::boolean,false) then coalesce(p.designations[1]::text,'') end,
      case when coalesce((p.consent->>'showAboutMeToMembers')::boolean,false) then p.about_me end,
      case when coalesce((p.consent->>'showSkillsToMembers')::boolean,false) then p.skills else '{}'::text[] end,
      case when coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) then p.startup->>'name' end,
      case when coalesce((p.consent->>'shareWhatsappWithMembers')::boolean,false) then p.whatsapp end,
      coalesce((p.consent->>'showProfilePhotoToMembers')::boolean,false) and p.portrait_path is not null,
      case when coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) then p.startup->>'website' end
    from public.profiles p join public.memberships m on m.user_id=p.id and m.status='active'
    where p.id=p_member_id and p.id<>v_viewer
      and coalesce((p.consent->>'communityProfileVisible')::boolean,false)
      and coalesce(nullif(p.display_name,''), nullif(p.full_name,'')) is not null;
end;
$$;
revoke all on function public.get_discoverable_member(uuid) from public, anon;
grant execute on function public.get_discoverable_member(uuid) to authenticated;

create or replace function public.get_directory_startup_contacts(p_startup_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_startup public.directory_startups%rowtype; v_private jsonb; v_out jsonb := '{}'::jsonb; v_visibility jsonb;
begin
  if v_user is null or not exists(select 1 from public.memberships m where m.user_id=v_user and m.status='active') then
    raise exception 'active CSC membership required' using errcode='42501';
  end if;
  select * into v_startup from public.directory_startups where id=p_startup_id and status='published';
  if not found then return null; end if;
  select d.details into v_private from public.directory_startup_private_details d where d.startup_id=p_startup_id and d.user_id=v_startup.user_id;
  if v_private is null then return '{}'::jsonb; end if;
  v_visibility := coalesce(v_startup.details->'visibility','{}'::jsonb);
  if coalesce((v_visibility->>'publishWebsite')::boolean,false) then v_out := v_out || jsonb_strip_nulls(jsonb_build_object('website',v_private->>'website')); end if;
  if coalesce((v_visibility->>'publishBusinessEmail')::boolean,false) then v_out := v_out || jsonb_strip_nulls(jsonb_build_object('companyEmail',v_private->>'companyEmail','supportEmail',v_private->>'supportEmail','additionalSupportEmail',v_private->>'additionalSupportEmail')); end if;
  if coalesce((v_visibility->>'publishCompanyPhone')::boolean,false) then v_out := v_out || jsonb_strip_nulls(jsonb_build_object('companyMobile',v_private->>'companyMobile','companyWhatsapp',v_private->>'companyWhatsapp')); end if;
  if coalesce((v_visibility->>'publishFounderContact')::boolean,false) then v_out := v_out || jsonb_strip_nulls(jsonb_build_object('founderEmail',v_private->>'founderEmail','founderMobile',v_private->>'founderMobile','founderWhatsapp',v_private->>'founderWhatsapp')); end if;
  return v_out;
end;
$$;
revoke all on function public.get_directory_startup_contacts(uuid) from public, anon;
grant execute on function public.get_directory_startup_contacts(uuid) to authenticated;

-- Separate portrait delivery for an opted-in member profile. The handler
-- authenticates the caller and checks this consent and active status again.
create index if not exists directory_startups_owner_status_idx on public.directory_startups(user_id, status, created_at desc);
create index if not exists directory_startups_published_updated_idx on public.directory_startups(status, updated_at desc) where status='published';

commit;
