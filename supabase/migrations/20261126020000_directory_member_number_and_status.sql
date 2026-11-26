-- Make the CSC Member Directory publicly accessible (anon + authenticated) and
-- automatically include all active members without requiring manual opt-in.
-- Returns member_number and membership_status alongside Google avatar_url fallback
-- and membership_claims designation/startup_affiliation fallbacks.
-- WhatsApp number remains opt-in only via shareWhatsappWithMembers consent.

drop function if exists public.list_discoverable_members(text, integer, integer);
create or replace function public.list_discoverable_members(
  p_search text default '',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table(
  member_id uuid,
  display_name text,
  city text,
  designation text,
  about_me text,
  skills text[],
  startup_name text,
  whatsapp text,
  has_photo boolean,
  member_number text,
  membership_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := left(trim(coalesce(p_search, '')), 80);
begin
  return query
    select p.id,
      coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), '')),
      nullif(trim(p.city), ''),
      coalesce(
        nullif(p.designations[1]::text, ''),
        (
          select mc.designation::text
          from public.membership_claims mc
          where mc.user_id = p.id
          order by mc.created_at desc
          limit 1
        ),
        ''
      ),
      p.about_me,
      p.skills,
      coalesce(
        (
          select d.name
          from public.directory_startups d
          where d.user_id = p.id and d.status = 'published'
          order by d.updated_at desc
          limit 1
        ),
        (
          select nullif(trim(mc.startup_affiliation), '')
          from public.membership_claims mc
          where mc.user_id = p.id
          order by mc.created_at desc
          limit 1
        )
      ),
      case
        when coalesce((p.consent->>'shareWhatsappWithMembers')::boolean, false)
        then p.whatsapp
      end,
      (p.portrait_path is not null or nullif(trim(coalesce(p.avatar_url, '')), '') is not null),
      m.member_number,
      m.status::text
    from public.profiles p
    join public.memberships m on m.user_id = p.id and m.status = 'active'
    where private.member_directory_eligible(p.id)
      and coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), '')) is not null
      and (
        v_query = ''
        or p.display_name ilike '%' || v_query || '%'
        or p.full_name ilike '%' || v_query || '%'
        or p.city ilike '%' || v_query || '%'
        or m.member_number ilike '%' || v_query || '%'
        or exists (
          select 1
          from public.directory_startups d
          where d.user_id = p.id
            and d.status = 'published'
            and (d.name ilike '%' || v_query || '%' or d.industry ilike '%' || v_query || '%')
        )
        or exists (
          select 1
          from public.membership_claims mc
          where mc.user_id = p.id
            and (mc.startup_affiliation ilike '%' || v_query || '%' or mc.designation::text ilike '%' || v_query || '%')
        )
        or exists (
          select 1
          from unnest(p.designations) desig
          where desig::text ilike '%' || v_query || '%'
        )
        or exists (
          select 1
          from unnest(p.skills) skill
          where skill ilike '%' || v_query || '%'
        )
        or p.about_me ilike '%' || v_query || '%'
      )
    order by coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), ''))
    limit greatest(1, least(coalesce(p_limit, 50), 100))
    offset greatest(0, least(coalesce(p_offset, 0), 10000));
end;
$$;

revoke all on function public.list_discoverable_members(text, integer, integer) from public, anon, authenticated;
grant execute on function public.list_discoverable_members(text, integer, integer) to anon, authenticated;

drop function if exists public.get_discoverable_member(uuid);
create or replace function public.get_discoverable_member(p_member_id uuid)
returns table(
  member_id uuid,
  display_name text,
  city text,
  designation text,
  about_me text,
  skills text[],
  startup_name text,
  whatsapp text,
  has_photo boolean,
  startup_website text,
  member_number text,
  membership_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select p.id,
      coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), '')),
      nullif(trim(p.city), ''),
      coalesce(
        nullif(p.designations[1]::text, ''),
        (
          select mc.designation::text
          from public.membership_claims mc
          where mc.user_id = p.id
          order by mc.created_at desc
          limit 1
        ),
        ''
      ),
      p.about_me,
      p.skills,
      coalesce(
        (
          select d.name
          from public.directory_startups d
          where d.user_id = p.id and d.status = 'published'
          order by d.updated_at desc
          limit 1
        ),
        (
          select nullif(trim(mc.startup_affiliation), '')
          from public.membership_claims mc
          where mc.user_id = p.id
          order by mc.created_at desc
          limit 1
        )
      ),
      case
        when coalesce((p.consent->>'shareWhatsappWithMembers')::boolean, false)
        then p.whatsapp
      end,
      (p.portrait_path is not null or nullif(trim(coalesce(p.avatar_url, '')), '') is not null),
      (
        select d.website
        from public.directory_startups d
        where d.user_id = p.id and d.status = 'published'
        order by d.updated_at desc
        limit 1
      ),
      m.member_number,
      m.status::text
    from public.profiles p
    join public.memberships m on m.user_id = p.id and m.status = 'active'
    where p.id = p_member_id
      and private.member_directory_eligible(p.id)
      and coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), '')) is not null;
end;
$$;

revoke all on function public.get_discoverable_member(uuid) from public, anon, authenticated;
grant execute on function public.get_discoverable_member(uuid) to anon, authenticated;
