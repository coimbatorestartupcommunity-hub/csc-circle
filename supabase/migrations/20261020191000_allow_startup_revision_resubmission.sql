begin;

create or replace function public.submit_startup_revision(
  p_startup_id uuid,p_revision_id uuid,p_proposed jsonb,p_private_details jsonb,p_submit boolean default true
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_startup public.directory_startups%rowtype; v_profile public.profiles%rowtype; v_revision public.directory_startup_revisions%rowtype; v_name text; v_slug text; v_industry text; v_description text; v_path text; v_logo text; v_status text;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if jsonb_typeof(p_proposed)<>'object' or jsonb_typeof(coalesce(p_private_details,'{}'::jsonb))<>'object' then raise exception 'invalid revision data' using errcode='22023'; end if;
  select * into v_startup from public.directory_startups where id=p_startup_id and user_id=v_user for update;
  if not found or v_startup.status<>'published' then raise exception 'published startup ownership required' using errcode='42501'; end if;
  select * into v_profile from public.profiles where id=v_user;
  if v_profile.display_name is null or v_profile.consent->>'directoryParticipation'<>'true' or v_profile.consent->>'displayNamePublicly'<>'true' then raise exception 'directory consent required' using errcode='23514'; end if;
  v_name:=trim(coalesce(p_proposed->>'name','')); v_slug:=trim(coalesce(p_proposed->>'slug',''));
  v_industry:=trim(coalesce(p_proposed->>'industry','')); v_description:=trim(coalesce(p_proposed->>'description',''));
  v_path:=nullif(p_proposed->>'directory_image_path',''); v_logo:=nullif(p_proposed->>'logo_url','');
  if length(v_name) not between 2 and 120 or length(v_slug) not between 3 and 120 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(v_industry) not between 2 and 80 or length(v_description) not between 20 and 3000
    or jsonb_typeof(coalesce(p_proposed->'details','{}'::jsonb))<>'object' then raise exception 'invalid startup details' using errcode='22023'; end if;
  if exists(select 1 from public.directory_startups where slug=v_slug and id<>p_startup_id) then raise exception 'duplicate key value violates unique constraint' using errcode='23505'; end if;
  if v_path is distinct from v_user::text||'/'||p_startup_id::text||'-directory-startup.webp'
    and v_path !~ ('^'||v_user::text||'/'||p_startup_id::text||'-revision-'||p_revision_id::text||'-directory-startup\.webp$') then raise exception 'invalid revision image path' using errcode='23514'; end if;
  if not exists(select 1 from storage.objects where bucket_id='member-portraits' and name=v_path) then raise exception 'revision image missing' using errcode='23514'; end if;
  if v_logo is not null and v_logo is distinct from v_user::text||'/'||p_startup_id::text||'-startup-logo.webp'
    and v_logo !~ ('^'||v_user::text||'/'||p_startup_id::text||'-revision-'||p_revision_id::text||'-startup-logo\.webp$') then raise exception 'invalid revision logo path' using errcode='23514'; end if;
  if v_logo is not null and not exists(select 1 from storage.objects where bucket_id='member-portraits' and name=v_logo) then raise exception 'revision logo missing' using errcode='23514'; end if;
  if exists(select 1 from public.directory_startup_revisions r where r.startup_id=p_startup_id and r.id<>p_revision_id and r.status in ('draft','pending')) then raise exception 'startup revision already pending' using errcode='23514'; end if;
  select * into v_revision from public.directory_startup_revisions where id=p_revision_id and startup_id=p_startup_id and submitted_by=v_user for update;
  if found and v_revision.status not in ('draft','rejected') then raise exception 'revision is already submitted for review' using errcode='23514'; end if;
  v_status:=case when p_submit then 'pending' else 'draft' end;
  if v_revision.id is null then
    insert into public.directory_startup_revisions(id,startup_id,submitted_by,status,base_version,proposed_data,proposed_private_details,submitted_at)
    values(p_revision_id,p_startup_id,v_user,v_status,v_startup.revision_version,p_proposed,coalesce(p_private_details,'{}'::jsonb),case when p_submit then now() end);
  else
    update public.directory_startup_revisions set status=v_status,base_version=v_startup.revision_version,proposed_data=p_proposed,
      proposed_private_details=coalesce(p_private_details,'{}'::jsonb),submitted_at=case when p_submit then now() else null end,
      reviewed_by=null,reviewed_at=null,review_reason=null,updated_at=now()
    where id=p_revision_id;
  end if;
  if p_submit then perform private.record_operation('startup.revision.submitted','directory_startup_revision',p_revision_id,
    jsonb_build_object('status',coalesce(v_revision.status,'new')),
    jsonb_build_object('status','pending','startup_id',p_startup_id,'startup_name',v_name),v_user); end if;
  return p_revision_id;
end;
$$;

revoke all on function public.submit_startup_revision(uuid,uuid,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.submit_startup_revision(uuid,uuid,jsonb,jsonb,boolean) to authenticated;

commit;
