-- Secure administrator invitation lifecycle and role activation.
-- Invitations are readable/writable only through trusted server operations;
-- acceptance is the only authenticated mutation and is bound to auth.uid().
begin;

create table public.admin_role_invitations (
  id uuid primary key default gen_random_uuid(),
  invitee_email text not null,
  invitee_name text check (invitee_name is null or length(invitee_name) <= 80),
  normalized_email text not null,
  role text not null check (role in (
    'super_admin','community_admin','event_manager','checkin_staff',
    'finance_reviewer','content_manager','tech_admin'
  )),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked','cancelled')),
  delivery_status text not null default 'queued' check (delivery_status in ('queued','sending','smtp_accepted','failed')),
  delivery_attempts integer not null default 0 check (delivery_attempts >= 0),
  last_delivery_error text,
  expires_at timestamptz not null,
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  invitation_message text check (invitation_message is null or length(invitation_message) <= 500),
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (normalized_email = lower(trim(normalized_email))),
  check ((status = 'accepted') = (accepted_at is not null and accepted_by is not null)),
  check ((status = 'revoked') = (revoked_at is not null and revoked_by is not null))
);

create unique index admin_role_invitation_one_pending_per_email
  on public.admin_role_invitations(normalized_email) where status = 'pending';
create index admin_role_invitations_status_created
  on public.admin_role_invitations(status, created_at desc);

alter table public.admin_role_invitations enable row level security;
revoke all on public.admin_role_invitations from public, anon, authenticated;
grant all on public.admin_role_invitations to service_role;

create or replace function public.csc_accept_admin_role_invitation(p_token_hash text)
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

  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invitation invalid or unavailable' using errcode = '22023';
  end if;

  select * into invitation
  from public.admin_role_invitations i
  where i.token_hash = p_token_hash and i.status = 'pending'
  for update;

  if not found or invitation.delivery_status <> 'smtp_accepted'
     or invitation.expires_at <= now()
     or invitation.normalized_email <> verified_email then
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

  insert into public.admin_roles(user_id, role)
  values (auth.uid(), invitation.role)
  on conflict (user_id, role) do nothing;
  get diagnostics assignment_rows = row_count;
  assignment_inserted := assignment_rows > 0;

  update public.admin_role_invitations
  set status = 'accepted', accepted_at = now(), accepted_by = auth.uid(), updated_at = now()
  where id = invitation.id and status = 'pending';

  insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, after, correlation_id)
  values (
    'admin.invitation.accepted', auth.uid(), invitation.role,
    'admin_role_invitation', invitation.id::text,
    jsonb_build_object('role', invitation.role, 'assignmentCreated', assignment_inserted),
    invitation.correlation_id::text
  );

  insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, after, correlation_id)
  values (
    'admin.role.assigned', auth.uid(), invitation.role, 'admin_role', auth.uid()::text,
    jsonb_build_object('role', invitation.role, 'invitationId', invitation.id), invitation.correlation_id::text
  );

  return jsonb_build_object('ok', true, 'role', invitation.role, 'acceptedAt', now(), 'assignmentCreated', assignment_inserted);
end;
$$;
revoke all on function public.csc_accept_admin_role_invitation(text) from public, anon;
grant execute on function public.csc_accept_admin_role_invitation(text) to authenticated;

create or replace function public.csc_revoke_admin_role(p_user_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_id uuid;
  active_super_admins integer;
begin
  if auth.uid() is null or not private.has_permission('roles.manage') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if p_user_id is null or p_role not in (
    'super_admin','community_admin','event_manager','checkin_staff',
    'finance_reviewer','content_manager','tech_admin'
  ) then
    raise exception 'invalid role assignment' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(20261020, 1);
  if p_role = 'super_admin' then
    select count(*) into active_super_admins from public.admin_roles where role = 'super_admin';
    if active_super_admins <= 1 then
      raise exception 'last super admin cannot be revoked' using errcode = '23514';
    end if;
  end if;

  delete from public.admin_roles
  where user_id = p_user_id and role = p_role
  returning id into removed_id;
  if removed_id is null then
    raise exception 'role assignment not found' using errcode = 'P0002';
  end if;

  insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, before, after, correlation_id)
  values (
    'admin.role.revoked', auth.uid(), 'super_admin', 'admin_role', p_user_id::text,
    jsonb_build_object('role', p_role, 'assignmentId', removed_id),
    jsonb_build_object('role', p_role, 'status', 'revoked'), gen_random_uuid()::text
  );

  return jsonb_build_object('ok', true, 'userId', p_user_id, 'role', p_role);
end;
$$;
revoke all on function public.csc_revoke_admin_role(uuid, text) from public, anon;
grant execute on function public.csc_revoke_admin_role(uuid, text) to authenticated;

create or replace function public.csc_checkin_available_events()
returns table(id uuid, title text, starts_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_permission('attendance.scan') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  return query
  select e.id, e.title, e.starts_at
  from public.events e
  where e.status = 'published' and e.ends_at > now()
    and (private.has_permission('events.update') or exists (
      select 1 from public.event_staff s where s.event_id = e.id and s.user_id = auth.uid()
    ))
  order by e.starts_at asc
  limit 100;
end;
$$;
revoke all on function public.csc_checkin_available_events() from public, anon;
grant execute on function public.csc_checkin_available_events() to authenticated;

-- Replace legacy broad admin RLS policies with the approved role permissions.
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select to authenticated using (private.has_permission('audit.read'));
drop policy if exists content_admin_read on public.content_blocks;
create policy content_admin_read on public.content_blocks for select to authenticated using (private.has_permission('content.manage'));
drop policy if exists media_admin_read on public.media_assets;
create policy media_admin_read on public.media_assets for select to authenticated using (private.has_permission('media.manage'));
drop policy if exists notif_admin_read on public.notifications;
create policy notif_admin_read on public.notifications for select to authenticated using (private.has_permission('roles.manage'));
drop policy if exists notification_delivery_admin_read on public.notification_deliveries;
create policy notification_delivery_admin_read on public.notification_deliveries for select to authenticated using (private.has_permission('roles.manage'));

drop policy if exists collab_admin_all on public.collaborations;
create policy collab_admin_all on public.collaborations for all to authenticated using (private.has_permission('content.manage')) with check (private.has_permission('content.manage'));
drop policy if exists collab_org_admin_all on public.collaboration_organizations;
create policy collab_org_admin_all on public.collaboration_organizations for all to authenticated using (private.has_permission('content.manage')) with check (private.has_permission('content.manage'));
drop policy if exists collab_partners_admin_all on public.collaboration_partners;
create policy collab_partners_admin_all on public.collaboration_partners for all to authenticated using (private.has_permission('content.manage')) with check (private.has_permission('content.manage'));
drop policy if exists collab_media_admin_all on public.collaboration_media;
create policy collab_media_admin_all on public.collaboration_media for all to authenticated using (private.has_permission('content.manage')) with check (private.has_permission('content.manage'));

create or replace function private.save_content(content_key text, content_value text, publish boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.has_permission('content.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if content_key not in ('homepage.announcement','community.introduction','about.mission','about.vision','homepage.event_notice') or length(content_value) > 4000 then raise exception 'invalid content'; end if;
  insert into public.content_blocks(key,label,value,status)
    values(content_key,content_key,content_value,case when publish then 'published'::public.publication_status else 'draft'::public.publication_status end)
    on conflict(key) do update set value=excluded.value,status=excluded.status,updated_at=now();
  insert into public.audit_logs(action,actor_id,target_type,target_id,after,correlation_id)
    values('content.saved',auth.uid(),'content',content_key,jsonb_build_object('published',publish),gen_random_uuid()::text);
end $$;
revoke all on function private.save_content(text,text,boolean) from public;
grant execute on function private.save_content(text,text,boolean) to authenticated;

-- Event notices are event-promotion tools. Content/settings roles cannot publish them.
create or replace function private.manage_event_notice(
  operation text, notice_id uuid, linked_event_id uuid default null, notice_title text default null,
  notice_message text default null, notice_button_label text default 'View Event', notice_banner_path text default null,
  starts_at timestamptz default null, stops_at timestamptz default null, priority integer default 0
) returns jsonb language plpgsql security definer set search_path='' as $$
declare old_row public.event_notices; new_row public.event_notices; linked_status public.publication_status; linked_end timestamptz;
begin
  if not private.has_permission('events.publish') then raise exception 'forbidden' using errcode='42501'; end if;
  if operation not in ('save','publish','unpublish','delete') then raise exception 'invalid operation' using errcode='22023'; end if;
  select * into old_row from public.event_notices where id=notice_id for update;
  if operation in ('unpublish','delete') then
    if not found or old_row.deleted_at is not null then raise exception 'notice not found' using errcode='P0002'; end if;
    if operation='unpublish' then update public.event_notices set status='draft',unpublished_at=now(),updated_by=auth.uid() where id=notice_id returning * into new_row;
    else update public.event_notices set status='archived',deleted_at=now(),unpublished_at=now(),updated_by=auth.uid() where id=notice_id returning * into new_row; end if;
  else
    if linked_event_id is null or notice_title is null or notice_message is null or notice_button_label is null then raise exception 'incomplete notice' using errcode='22023'; end if;
    if char_length(btrim(notice_title)) not between 3 and 100 or char_length(btrim(notice_message)) not between 8 and 500 or char_length(btrim(notice_button_label)) not between 2 and 40 then raise exception 'invalid notice content' using errcode='22023'; end if;
    if priority not between 0 and 1000 or (starts_at is not null and stops_at is not null and starts_at >= stops_at) then raise exception 'invalid schedule' using errcode='22023'; end if;
    select status,ends_at into linked_status,linked_end from public.events where id=linked_event_id;
    if not found then raise exception 'event not found' using errcode='P0002'; end if;
    if operation='publish' and linked_status <> 'published' then raise exception 'event must be published first' using errcode='22023'; end if;
    if operation='publish' and linked_end <= now() then raise exception 'event has already ended' using errcode='22023'; end if;
    if old_row.id is null then
      insert into public.event_notices(id,event_id,title,message,button_label,banner_path,status,visible_from,visible_until,display_priority,created_by,updated_by,published_at)
      values(notice_id,linked_event_id,btrim(notice_title),btrim(notice_message),btrim(notice_button_label),notice_banner_path,case when operation='publish' then 'published' else 'draft' end,starts_at,stops_at,priority,auth.uid(),auth.uid(),case when operation='publish' then now() else null end) returning * into new_row;
    else
      update public.event_notices set event_id=linked_event_id,title=btrim(notice_title),message=btrim(notice_message),button_label=btrim(notice_button_label),banner_path=notice_banner_path,
        status=case when operation='publish' then 'published' else 'draft' end,visible_from=starts_at,visible_until=stops_at,display_priority=priority,updated_by=auth.uid(),deleted_at=null,
        published_at=case when operation='publish' then coalesce(published_at,now()) else published_at end,unpublished_at=case when operation='publish' then null else unpublished_at end
      where id=notice_id returning * into new_row;
    end if;
  end if;
  insert into public.audit_logs(action,actor_id,actor_role,target_type,target_id,before,after,correlation_id)
    values('event_notice.'||case when operation='save' then 'saved' when operation='publish' then 'published' when operation='unpublish' then 'unpublished' else 'deleted' end,
      auth.uid(),(select role from public.admin_roles where user_id=auth.uid() order by role limit 1),'event_notice',notice_id::text,
      case when old_row.id is null then null else to_jsonb(old_row) end,to_jsonb(new_row),gen_random_uuid()::text);
  return jsonb_build_object('ok',true,'id',new_row.id,'status',new_row.status);
end; $$;
revoke all on function private.manage_event_notice(text,uuid,uuid,text,text,text,text,timestamptz,timestamptz,integer) from public;
grant execute on function private.manage_event_notice(text,uuid,uuid,text,text,text,text,timestamptz,timestamptz,integer) to authenticated;

-- Transactional queue retries are restricted to Super Admin (roles.manage),
-- preventing technical settings access from becoming email resend authority.
create or replace function private.retry_notification(job uuid,reason text,acknowledge_ambiguous boolean) returns void language plpgsql security definer set search_path='' as $$
declare n public.notifications;
begin
 if not private.has_permission('roles.manage') then raise exception 'forbidden' using errcode='42501'; end if;
 if length(trim(reason)) not between 5 and 500 then raise exception 'reason required'; end if;
 select * into n from public.notifications where id=job for update;
 if not found or n.status not in ('failed_retryable','failed_permanent') then raise exception 'not retryable'; end if;
 if (n.last_error='AMBIGUOUS_DELIVERY' or exists(select 1 from public.notification_deliveries where notification_id=job and status in ('attempting','ambiguous'))) and not acknowledge_ambiguous then raise exception 'manual mailbox reconciliation required'; end if;
 update public.notification_deliveries set status='failed_retryable' where notification_id=job and status<>'accepted';
 update public.notifications set status='queued',attempts=0,available_at=now(),last_error=null,lease_id=null,locked_until=null where id=job;
 insert into public.audit_logs(action,actor_id,target_type,target_id,after) values('notification.retry',auth.uid(),'notification',job::text,jsonb_build_object('reason',reason,'ambiguousAcknowledged',acknowledge_ambiguous));
end $$;
revoke all on function private.retry_notification(uuid,text,boolean) from public;
grant execute on function private.retry_notification(uuid,text,boolean) to authenticated;

commit;
