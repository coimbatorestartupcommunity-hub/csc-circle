-- Accept generated collaboration 4:3 assets and private logo objects while
-- retaining all prior collaboration authorization and audit behavior.
begin;

create or replace function public.csc_save_collaboration(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text;
  v_title text;
  v_status text;
  v_publication text;
  v_before jsonb;
  v_partners jsonb;
  v_media jsonb;
begin
  if not private.has_permission('content.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(payload) <> 'object'
    or length(coalesce(payload->>'title','')) not between 2 and 160
    or length(coalesce(payload->>'slug','')) not between 2 and 100
    or (payload->>'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(coalesce(payload->>'summary','')) > 500
    or length(coalesce(payload->>'story','')) > 12000
    or length(coalesce(payload->>'tagline','')) > 160 then
    raise exception 'invalid collaboration' using errcode = '22023';
  end if;
  v_slug := payload->>'slug';
  v_title := trim(payload->>'title');
  v_status := coalesce(payload->>'status','completed');
  v_publication := coalesce(payload->>'publication_status','draft');
  if v_status not in ('upcoming','ongoing','completed','cancelled')
    or v_publication not in ('draft','pending','published','archived') then
    raise exception 'invalid collaboration state' using errcode = '22023';
  end if;
  v_partners := coalesce(payload->'partner_ids','[]'::jsonb);
  v_media := coalesce(payload->'media','[]'::jsonb);
  if jsonb_typeof(v_partners) <> 'array' or jsonb_array_length(v_partners) < 2
    or jsonb_array_length(v_partners) > 8
    or jsonb_typeof(v_media) <> 'array' or jsonb_array_length(v_media) > 20
    or jsonb_typeof(coalesce(payload->'highlights','[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(payload->'highlights','[]'::jsonb)) > 12 then
    raise exception 'invalid collaboration relationships' using errcode = '22023';
  end if;
  if nullif(payload->>'featured_image_path','') is not null and (
    not (
      ((payload->>'featured_image_path') ~ '^/(images|brand)/[A-Za-z0-9._/-]+$'
        and (payload->>'featured_image_path') not like '%..%')
      or (payload->>'featured_image_path') ~ '^collaboration-featured/[0-9a-fA-F-]{36}\.webp$'
    )
  ) then
    raise exception 'invalid featured image path' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(v_media) as m(media_path text, alt_text text, caption text, display_order integer)
    where coalesce(media_path,'') <> '' and (
      not (
        (media_path ~ '^/(images|brand)/[A-Za-z0-9._/-]+$' and media_path not like '%..%')
        or media_path ~ '^collaboration-featured/[0-9a-fA-F-]{36}\.webp$'
      )
      or length(coalesce(alt_text,'')) not between 3 and 240
      or length(coalesce(caption,'')) > 240
      or display_order not between 0 and 19
    )
  ) then
    raise exception 'invalid collaboration gallery item' using errcode = '22023';
  end if;

  if nullif(payload->>'id','') is not null then
    v_id := (payload->>'id')::uuid;
    select to_jsonb(c) into v_before from public.collaborations c where c.id=v_id for update;
    if v_before is null then raise exception 'collaboration not found' using errcode = 'P0002'; end if;
    update public.collaborations set
      slug=v_slug, title=v_title, tagline=nullif(trim(payload->>'tagline'),''),
      summary=nullif(trim(payload->>'summary'),''), story=nullif(trim(payload->>'story'),''),
      category=coalesce(nullif(trim(payload->>'category'),''),'Community Collaboration'),
      status=v_status, publication_status=v_publication::public.publication_status,
      featured_image_path=nullif(payload->>'featured_image_path',''),
      highlights=coalesce(payload->'highlights','[]'::jsonb),
      event_id=nullif(payload->>'event_id','')::uuid,
      event_date=nullif(payload->>'event_date','')::timestamptz,
      venue_name=nullif(trim(payload->>'venue_name'),''),
      venue_address=nullif(trim(payload->>'venue_address'),''),
      seo_title=nullif(trim(payload->>'seo_title'),''),
      meta_description=nullif(trim(payload->>'meta_description'),''),
      published_at=case when v_publication='published' then coalesce(published_at,now()) else null end,
      updated_by=auth.uid(), updated_at=now()
    where id=v_id;
  else
    insert into public.collaborations(
      slug,title,tagline,summary,story,category,status,publication_status,
      featured_image_path,highlights,event_id,event_date,venue_name,venue_address,
      seo_title,meta_description,published_at,created_by,updated_by
    ) values (
      v_slug,v_title,nullif(trim(payload->>'tagline'),''),nullif(trim(payload->>'summary'),''),
      nullif(trim(payload->>'story'),''),coalesce(nullif(trim(payload->>'category'),''),'Community Collaboration'),
      v_status,v_publication::public.publication_status,nullif(payload->>'featured_image_path',''),
      coalesce(payload->'highlights','[]'::jsonb),nullif(payload->>'event_id','')::uuid,
      nullif(payload->>'event_date','')::timestamptz,nullif(trim(payload->>'venue_name'),''),
      nullif(trim(payload->>'venue_address'),''),nullif(trim(payload->>'seo_title'),''),
      nullif(trim(payload->>'meta_description'),''),case when v_publication='published' then now() else null end,
      auth.uid(),auth.uid()
    ) returning id into v_id;
    v_before := null;
  end if;

  delete from public.collaboration_partners where collaboration_id=v_id;
  insert into public.collaboration_partners(collaboration_id,organization_id,display_order)
    select v_id, value::uuid, ordinality::integer-1
    from jsonb_array_elements_text(v_partners) with ordinality;
  delete from public.collaboration_media where collaboration_id=v_id;
  insert into public.collaboration_media(collaboration_id,media_path,media_type,alt_text,caption,display_order)
    select v_id, media_path, 'image', alt_text, caption, display_order
    from jsonb_to_recordset(v_media) as m(media_path text,alt_text text,caption text,display_order integer)
    where coalesce(media_path,'') <> '';
  perform private.record_operation('collaboration.saved','collaboration',v_id,v_before,
    jsonb_build_object('slug',v_slug,'title',v_title,'status',v_status,'publication_status',v_publication),null);
  return v_id;
end;
$$;
revoke all on function public.csc_save_collaboration(jsonb) from public, anon;
grant execute on function public.csc_save_collaboration(jsonb) to authenticated;

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
  v_before jsonb;
begin
  if not private.has_permission('content.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
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
    and not (
      ((payload->>'logo_path') ~ '^/(images|brand)/[A-Za-z0-9._/-]+$'
        and (payload->>'logo_path') not like '%..%')
      or (payload->>'logo_path') ~ '^collaboration-logos/[0-9a-fA-F-]{36}\.webp$'
    ) then
    raise exception 'invalid partner logo path' using errcode = '22023';
  end if;
  if nullif(payload->>'website_url','') is not null
    and ((payload->>'website_url') !~ '^https://[^[:space:]]+$' or length(payload->>'website_url') > 255) then
    raise exception 'invalid partner website' using errcode = '22023';
  end if;
  v_name := trim(payload->>'name');
  v_slug := payload->>'slug';
  v_type := payload->>'organization_type';
  if nullif(payload->>'id','') is not null then
    v_id := (payload->>'id')::uuid;
    select to_jsonb(o) into v_before from public.collaboration_organizations o where o.id=v_id for update;
    if v_before is null then raise exception 'partner organization not found' using errcode = 'P0002'; end if;
    update public.collaboration_organizations set
      name=v_name,slug=v_slug,organization_type=v_type,
      description=nullif(trim(payload->>'description'),''),logo_path=nullif(payload->>'logo_path',''),
      website_url=nullif(payload->>'website_url',''),updated_at=now()
    where id=v_id;
  else
    insert into public.collaboration_organizations(name,slug,organization_type,description,logo_path,website_url,publication_status)
    values (v_name,v_slug,v_type,nullif(trim(payload->>'description'),''),nullif(payload->>'logo_path',''),nullif(payload->>'website_url',''),'published'::public.publication_status)
    returning id into v_id;
  end if;
  perform private.record_operation('collaboration.organization_saved','collaboration_organization',v_id,v_before,
    jsonb_build_object('slug',v_slug,'name',v_name,'organization_type',v_type,'publication_status','published'),null);
  return v_id;
end;
$$;
revoke all on function public.csc_save_collaboration_organization(jsonb) from public, anon;
grant execute on function public.csc_save_collaboration_organization(jsonb) to authenticated;

-- In-app acceptance does not carry an email token. It relies on the current
-- authenticated, verified Auth identity and locks the same pending invitation
-- row, retaining expiry, revocation, replay, audit and Super Admin safeguards.
create or replace function public.csc_accept_admin_role_invitation_in_app(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.admin_role_invitations;
  verified_email text;
  auth_time bigint;
  assignment_inserted boolean := false;
  assignment_rows integer := 0;
begin
  if auth.uid() is null or not private.account_allowed() then
    raise exception 'invitation acceptance unavailable' using errcode = '42501';
  end if;
  select lower(u.email) into verified_email
  from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;
  if verified_email is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;
  if p_invitation_id is null then raise exception 'invitation invalid or unavailable' using errcode = '22023'; end if;

  select * into invitation
  from public.admin_role_invitations i
  where i.id = p_invitation_id and i.status = 'pending'
  for update;
  if not found or invitation.expires_at <= now() or invitation.normalized_email <> verified_email then
    if found and invitation.expires_at <= now() then
      update public.admin_role_invitations set status = 'expired', updated_at = now()
      where id = invitation.id and status = 'pending';
    end if;
    raise exception 'invitation invalid or unavailable' using errcode = '42501';
  end if;
  if invitation.role = 'super_admin' and coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    auth_time := coalesce((auth.jwt()->>'auth_time')::bigint, 0);
    if auth_time < extract(epoch from now() - interval '10 minutes')::bigint then
      raise exception 'recent authentication required for Super Admin' using errcode = '42501';
    end if;
  end if;
  insert into public.admin_roles(user_id, role) values (auth.uid(), invitation.role)
  on conflict (user_id, role) do nothing;
  get diagnostics assignment_rows = row_count;
  assignment_inserted := assignment_rows > 0;
  update public.admin_role_invitations
  set status = 'accepted', accepted_at = now(), accepted_by = auth.uid(), updated_at = now()
  where id = invitation.id and status = 'pending';
  if not found then raise exception 'invitation invalid or unavailable' using errcode = '42501'; end if;
  insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, after, correlation_id)
  values ('admin.invitation.accepted', auth.uid(), invitation.role, 'admin_role_invitation', invitation.id::text,
    jsonb_build_object('role', invitation.role, 'assignmentCreated', assignment_inserted, 'channel', 'in_app'), invitation.correlation_id::text);
  insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, after, correlation_id)
  values ('admin.role.assigned', auth.uid(), invitation.role, 'admin_role', auth.uid()::text,
    jsonb_build_object('role', invitation.role, 'invitationId', invitation.id, 'channel', 'in_app'), invitation.correlation_id::text);
  return jsonb_build_object('ok', true, 'role', invitation.role, 'acceptedAt', now(), 'assignmentCreated', assignment_inserted);
end;
$$;
revoke all on function public.csc_accept_admin_role_invitation_in_app(uuid) from public, anon;
grant execute on function public.csc_accept_admin_role_invitation_in_app(uuid) to authenticated;

create or replace function private.sync_admin_invitation_inbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    update public.notifications
    set title = case new.status
          when 'accepted' then 'Administrator invitation accepted'
          when 'revoked' then 'Administrator invitation revoked'
          when 'expired' then 'Administrator invitation expired'
          else title end,
        message = case new.status
          when 'accepted' then 'Your CSC Circle administrator access is active. Open your authorized workspace to continue.'
          when 'revoked' then 'This CSC Circle administrator invitation was revoked and can no longer be accepted.'
          when 'expired' then 'This CSC Circle administrator invitation expired and can no longer be accepted.'
          else message end,
        action_url = case when new.status = 'accepted' then '/admin' else null end,
        read_at = case when new.status in ('accepted','revoked','expired') then coalesce(read_at, now()) else read_at end,
        updated_at = now()
    where channel = 'in_app' and type = 'admin.invitation.received'
      and related_record_type = 'admin_role_invitations' and related_record_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_admin_invitation_inbox() from public, anon, authenticated;
drop trigger if exists sync_admin_invitation_inbox on public.admin_role_invitations;
create trigger sync_admin_invitation_inbox
after update of status on public.admin_role_invitations
for each row execute function private.sync_admin_invitation_inbox();
commit;
