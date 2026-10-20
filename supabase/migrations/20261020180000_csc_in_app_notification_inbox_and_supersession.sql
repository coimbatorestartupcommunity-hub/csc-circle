-- In-app notifications are persisted directly to the member inbox. They do not
-- pass through the SMTP worker, so their availability is recorded separately
-- from email transport status and from a member's read state.
begin;

alter table public.notifications
  add column if not exists title text,
  add column if not exists message text,
  add column if not exists action_url text,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

alter table public.notifications drop constraint if exists notifications_status_check;
alter table public.notifications add constraint notifications_status_check
  check (status in ('queued','processing','sent','available','superseded','failed_retryable','failed_permanent','failed','retrying'));

create or replace function public.csc_finish_notification(job uuid,lease uuid,outcome text,code text) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if outcome not in ('sent','failed_retryable','failed_permanent','superseded') or length(coalesce(code,''))>80 then raise exception 'invalid outcome'; end if;
  update public.notifications
  set attempts=case when code='EMAIL_RATE_DEFERRED' then greatest(attempts-1,0) else attempts end,
      status=case
        when outcome='failed_retryable' and code<>'EMAIL_RATE_DEFERRED' and attempts>=max_attempts then 'failed_permanent'
        else outcome
      end,
      last_error=code,
      available_at=now()+make_interval(secs=>least(3600,60*power(2,least(attempts,6))::integer)),
      sent_at=case when outcome='sent' then now() else sent_at end,
      accepted_at=case when outcome='sent' then now() else accepted_at end,
      lease_id=null,locked_until=null,updated_at=now()
  where id=job and lease_id=lease and status='processing';
  if not found then raise exception 'lease expired'; end if;
end $$;
revoke all on function public.csc_finish_notification(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.csc_finish_notification(uuid,uuid,text,text) to service_role;

create index if not exists notifications_member_inbox
  on public.notifications(recipient_user_id, delivered_at desc)
  where channel='in_app' and status='available';

drop policy if exists notification_member_inbox_read on public.notifications;
create policy notification_member_inbox_read on public.notifications
  for select to authenticated
  using (channel='in_app' and status='available' and recipient_user_id=auth.uid());

drop policy if exists notification_member_read_state on public.notifications;
create policy notification_member_read_state on public.notifications
  for update to authenticated
  using (channel='in_app' and status='available' and recipient_user_id=auth.uid())
  with check (channel='in_app' and status='available' and recipient_user_id=auth.uid());
grant update (read_at) on public.notifications to authenticated;

-- This is a safe, server-authored copy catalog. No client controls the text or
-- destination, and the message never includes claim evidence or private data.
create or replace function private.notification_copy(p_action text, p_kind text)
returns table(title text, message text, action_url text)
language sql immutable set search_path='' as $$
  select
    case p_action
      when 'claim.active' then 'CSC membership is active'
      when 'claim.pending_verification' then 'Membership application received'
      when 'review.approved' then 'Review approved'
      when 'review.rejected' then 'Review update'
      when 'startup.published' then 'Startup profile published'
      when 'registration.submitted' then 'Event registration received'
      when 'attendance.checked_in' then 'Event check-in complete'
      else 'CSC account update'
    end,
    case p_action
      when 'claim.active' then 'Your CSC membership is now active.'
      when 'claim.pending_verification' then 'Your CSC membership application is awaiting verification.'
      when 'review.approved' then 'Your CSC community review has been approved.'
      when 'review.rejected' then 'There is an update to your CSC community review.'
      when 'startup.published' then 'Your startup profile is now published in the CSC directory.'
      when 'registration.submitted' then 'Your event registration has been received.'
      when 'attendance.checked_in' then 'Your attendance has been recorded.'
      else 'There is an update to your CSC account.'
    end,
    case p_action
      when 'claim.active' then '/member/id-card'
      when 'claim.pending_verification' then '/member/claim'
      when 'review.approved' then '/member/reviews'
      when 'review.rejected' then '/member/reviews'
      when 'startup.published' then '/member/startups'
      when 'registration.submitted' then '/member/events'
      when 'attendance.checked_in' then '/member/events'
      else '/member'
    end
$$;

create or replace function private.record_operation(
  action text, kind text, target uuid, before_data jsonb, after_data jsonb, recipient uuid default null
) returns void
language plpgsql security definer set search_path='' as $$
declare
  copy_row record;
  notification_id uuid;
  dedupe text;
begin
  insert into public.audit_logs(action,actor_id,actor_role,target_type,target_id,before,after,correlation_id)
  values(action,auth.uid(),(select role from public.admin_roles where user_id=auth.uid() order by role limit 1),kind,target::text,
    jsonb_build_object('status',coalesce(before_data->>'status',before_data->>'moderation')),after_data,gen_random_uuid()::text);

  if recipient is null then return; end if;
  if action='claim.active' and kind='claim' then
    update public.notifications
    set status='superseded',last_error='SUPERSEDED_BUSINESS_STATE',updated_at=now()
    where channel='in_app' and status='available' and recipient_user_id=record_operation.recipient
      and type='claim.pending_verification' and related_record_id=record_operation.target;
  end if;
  select * into copy_row from private.notification_copy(action,kind);
  dedupe := action||':'||target||':'||coalesce(after_data->>'status',after_data->>'moderation','');

  insert into public.notifications(
    type,channel,recipient,recipient_user_id,audience,related_record_type,related_record_id,
    title,message,action_url,payload,dedupe_key,status,delivered_at
  ) values (
    action,'in_app',recipient::text,recipient,'member',kind,target,
    copy_row.title,copy_row.message,copy_row.action_url,
    jsonb_build_object('target',target,'kind',kind),dedupe,'available',now()
  ) on conflict(dedupe_key) do nothing returning id into notification_id;
end $$;
revoke all on function private.notification_copy(text,text) from public,anon,authenticated;
revoke all on function private.record_operation(text,text,uuid,jsonb,jsonb,uuid) from public,anon,authenticated;

-- Reconcile legacy in-app outbox entries only when their recipient is a real
-- Auth UUID. Their source-state checks prevent stale pending notices from being
-- shown after a later membership approval.
update public.notifications n
set recipient_user_id = n.recipient::uuid,
    related_record_type = coalesce(n.related_record_type,n.payload->>'kind'),
    related_record_id = coalesce(n.related_record_id,case when n.payload->>'target' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (n.payload->>'target')::uuid end),
    title = (select c.title from private.notification_copy(n.type,n.payload->>'kind') c),
    message = (select c.message from private.notification_copy(n.type,n.payload->>'kind') c),
    action_url = (select c.action_url from private.notification_copy(n.type,n.payload->>'kind') c),
    status = case
      when n.type='claim.active' and exists(select 1 from public.membership_claims x where x.id=(n.payload->>'target')::uuid and x.status='active') then 'available'
      when n.type='claim.pending_verification' and exists(select 1 from public.membership_claims x where x.id=(n.payload->>'target')::uuid and x.status='pending_verification') then 'available'
      when n.type='review.approved' and exists(select 1 from public.reviews x where x.id=(n.payload->>'target')::uuid and x.moderation='approved') then 'available'
      when n.type='startup.published' and exists(select 1 from public.directory_startups x where x.id=(n.payload->>'target')::uuid and x.status='published') then 'available'
      else 'superseded'
    end,
    delivered_at = case
      when n.type='claim.active' and exists(select 1 from public.membership_claims x where x.id=(n.payload->>'target')::uuid and x.status='active') then now()
      when n.type='claim.pending_verification' and exists(select 1 from public.membership_claims x where x.id=(n.payload->>'target')::uuid and x.status='pending_verification') then now()
      when n.type='review.approved' and exists(select 1 from public.reviews x where x.id=(n.payload->>'target')::uuid and x.moderation='approved') then now()
      when n.type='startup.published' and exists(select 1 from public.directory_startups x where x.id=(n.payload->>'target')::uuid and x.status='published') then now()
      else null
    end,
    last_error = case
      when n.type='claim.active' and exists(select 1 from public.membership_claims x where x.id=(n.payload->>'target')::uuid and x.status='active') then null
      when n.type='claim.pending_verification' and exists(select 1 from public.membership_claims x where x.id=(n.payload->>'target')::uuid and x.status='pending_verification') then null
      when n.type='review.approved' and exists(select 1 from public.reviews x where x.id=(n.payload->>'target')::uuid and x.moderation='approved') then null
      when n.type='startup.published' and exists(select 1 from public.directory_startups x where x.id=(n.payload->>'target')::uuid and x.status='published') then null
      else 'SUPERSEDED_BUSINESS_STATE'
    end,
    updated_at=now()
where n.channel='in_app' and n.status='queued'
  and n.recipient ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and n.payload->>'target' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists(select 1 from auth.users u where u.id=n.recipient::uuid);

-- Rows with a recipient that cannot be tied to a genuine Auth identity are
-- retained as terminal records for admin inspection and never exposed.
update public.notifications n
set status='failed_permanent',last_error='INVALID_IN_APP_RECIPIENT',updated_at=now()
where n.channel='in_app' and n.status='queued'
  and (n.recipient is null or n.recipient !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or n.payload->>'target' is null or n.payload->>'target' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

update public.notifications n
set status='failed_permanent',last_error='INVALID_IN_APP_RECIPIENT',updated_at=now()
where n.channel='in_app' and n.status='queued'
  and n.recipient ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and n.payload->>'target' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and not exists(select 1 from auth.users u where u.id=n.recipient::uuid);

-- This historical code already means the source claim no longer required the
-- message at send time. Close it as superseded only when the claim is still in a
-- later state; accepted emails and still-valid requests remain untouched.
update public.notifications n
set status='superseded',updated_at=now()
where n.channel='email' and n.template_key='MembershipMoreInformation'
  and n.status='failed_permanent' and n.last_error='SUPERSEDED_BUSINESS_STATE'
  and n.related_record_type='membership_claims'
  and exists(select 1 from public.membership_claims c where c.id=n.related_record_id and c.status<>'pending_verification');

commit;
