-- A member who has explicitly enabled sharing should also see their card in
-- the authenticated community directory. Keep all membership, credential,
-- consent, field-level privacy, and viewer eligibility checks intact.
create or replace function public.list_discoverable_members(
  p_search text default '',
  p_limit integer default 30,
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
  has_photo boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_viewer uuid := auth.uid();
  v_query text := left(trim(coalesce(p_search, '')), 80);
begin
  if v_viewer is null or not private.member_directory_eligible(v_viewer) then
    raise exception 'active CSC membership and a valid Digital ID are required'
      using errcode = '42501';
  end if;

  return query
    select p.id,
      coalesce(nullif(p.display_name, ''), p.full_name),
      case when coalesce((p.consent->>'showCityToMembers')::boolean, false) then p.city end,
      case when coalesce((p.consent->>'showProfessionalRoleToMembers')::boolean, false) then coalesce(p.designations[1]::text, '') end,
      case when coalesce((p.consent->>'showAboutMeToMembers')::boolean, false) then p.about_me end,
      case when coalesce((p.consent->>'showSkillsToMembers')::boolean, false) then p.skills else '{}'::text[] end,
      case when coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean, false)
        then (select d.name from public.directory_startups d where d.user_id = p.id and d.status = 'published' order by d.updated_at desc limit 1) end,
      case when coalesce((p.consent->>'shareWhatsappWithMembers')::boolean, false) then p.whatsapp end,
      coalesce((p.consent->>'showProfilePhotoToMembers')::boolean, false) and p.portrait_path is not null
    from public.profiles p
    join public.memberships m on m.user_id = p.id and m.status = 'active'
    where private.member_directory_eligible(p.id)
      and coalesce((p.consent->>'communityProfileVisible')::boolean, false)
      and coalesce(nullif(p.display_name, ''), nullif(p.full_name, '')) is not null
      and (v_query = ''
        or p.display_name ilike '%' || v_query || '%'
        or p.full_name ilike '%' || v_query || '%'
        or (coalesce((p.consent->>'showCityToMembers')::boolean, false) and p.city ilike '%' || v_query || '%')
        or (coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean, false) and exists (
          select 1 from public.directory_startups d where d.user_id = p.id and d.status = 'published' and d.name ilike '%' || v_query || '%'))
        or (coalesce((p.consent->>'showProfessionalRoleToMembers')::boolean, false) and exists (
          select 1 from unnest(p.designations) d where d::text ilike '%' || v_query || '%'))
        or (coalesce((p.consent->>'showSkillsToMembers')::boolean, false) and exists (
          select 1 from unnest(p.skills) s where s ilike '%' || v_query || '%'))
        or (coalesce((p.consent->>'showAboutMeToMembers')::boolean, false) and p.about_me ilike '%' || v_query || '%')
        or (coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean, false) and exists (
          select 1 from public.directory_startups d where d.user_id = p.id and d.status = 'published' and d.industry ilike '%' || v_query || '%')))
    order by coalesce(nullif(p.display_name, ''), p.full_name)
    limit greatest(1, least(coalesce(p_limit, 30), 50))
    offset greatest(0, least(coalesce(p_offset, 0), 10000));
end;
$$;

revoke all on function public.list_discoverable_members(text, integer, integer) from public, anon;
grant execute on function public.list_discoverable_members(text, integer, integer) to authenticated;
