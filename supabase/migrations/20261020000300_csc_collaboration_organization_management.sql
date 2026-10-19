-- Add verified partner organizations through an audited, permission-checked
-- operation. Client write grants remain revoked by the preceding migration.
begin;
create or replace function public.csc_save_collaboration_organization(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_name text;
  v_slug text;
  v_type text;
begin
  if not private.has_permission('content.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(payload) <> 'object'
    or length(coalesce(payload->>'name','')) not between 2 and 120
    or coalesce(payload->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or coalesce(payload->>'organization_type','') not in ('community','startup','company','college','incubator','accelerator','other')
    or coalesce(payload->>'publication_approved','false') <> 'true'
    or coalesce(payload->>'publication_status','') <> 'published'
    or length(coalesce(payload->>'description','')) > 800 then
    raise exception 'invalid partner organization' using errcode = '22023';
  end if;
  if nullif(payload->>'logo_path','') is not null
    and ((payload->>'logo_path') !~ '^/(images|brand)/[A-Za-z0-9._/-]+$'
      or (payload->>'logo_path') like '%..%') then
    raise exception 'invalid partner logo path' using errcode = '22023';
  end if;
  if nullif(payload->>'website_url','') is not null
    and ((payload->>'website_url') !~ '^https://[^[:space:]]+$'
      or length(payload->>'website_url') > 255) then
    raise exception 'invalid partner website' using errcode = '22023';
  end if;

  v_name := trim(payload->>'name');
  v_slug := payload->>'slug';
  v_type := payload->>'organization_type';
  insert into public.collaboration_organizations(
    name,slug,organization_type,description,logo_path,website_url,publication_status
  ) values (
    v_name,v_slug,v_type,nullif(trim(payload->>'description'),''),
    nullif(payload->>'logo_path',''),nullif(payload->>'website_url',''),
    'published'::public.publication_status
  ) returning id into v_id;

  perform private.record_operation(
    'collaboration.organization_saved','collaboration_organization',v_id,null,
    jsonb_build_object('slug',v_slug,'name',v_name,'organization_type',v_type,'publication_status','published'),null
  );
  return v_id;
end;
$$;
revoke all on function public.csc_save_collaboration_organization(jsonb) from public,anon;
grant execute on function public.csc_save_collaboration_organization(jsonb) to authenticated;
commit;
