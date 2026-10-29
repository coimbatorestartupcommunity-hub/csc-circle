-- Membership submission and activation are separate milestones. Keep both in
-- the member inbox, and allow a queued review-status email to drain even if
-- approval occurs before the email worker gets to it.
begin;

-- Durable, non-dispatchable hold state. The email worker, recovery cron and
-- user-triggered drains only claim 'queued'/'failed_retryable' jobs, and the
-- retry path refuses anything other than a failed job, so a 'held' row cannot
-- be dispatched by any automatic or retry path. Adding it in this same
-- transaction means historical jobs are never dispatchable for an instant.
alter table public.notifications drop constraint if exists notifications_status_check;
alter table public.notifications add constraint notifications_status_check
  check (status in ('queued','processing','sent','available','superseded','held','failed_retryable','failed_permanent','failed','retrying'));

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
      when 'claim.pending_verification' then 'Your membership application was received. Sign in to see its current status and any next steps.'
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
  action text,
  kind text,
  target uuid,
  before_data jsonb,
  after_data jsonb,
  recipient uuid default null
) returns void
language plpgsql security definer set search_path='' as $$
declare
  copy_row record;
  dedupe text;
begin
  insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, before, after, correlation_id)
  values (
    action,
    auth.uid(),
    (select role from public.admin_roles where user_id = auth.uid() order by role limit 1),
    kind,
    target::text,
    jsonb_build_object('status', coalesce(before_data->>'status', before_data->>'moderation')),
    after_data,
    gen_random_uuid()::text
  );

  if recipient is null then return; end if;

  select * into copy_row from private.notification_copy(action, kind);
  dedupe := action || ':' || target || ':' || coalesce(after_data->>'status', after_data->>'moderation', '');

  insert into public.notifications(
    type, channel, recipient, recipient_user_id, audience, related_record_type, related_record_id,
    title, message, action_url, payload, dedupe_key, status, delivered_at
  ) values (
    action,
    'in_app',
    recipient::text,
    recipient,
    'member',
    kind,
    target,
    copy_row.title,
    copy_row.message,
    copy_row.action_url,
    jsonb_build_object('target', target, 'kind', kind),
    dedupe,
    'available',
    now()
  ) on conflict (dedupe_key) do nothing;
end;
$$;

-- Restore authentic historical submission notices that the previous logic
-- hid after the same claim was approved. Never reassign them to another user.
update public.notifications n
set status='available',
    title='Membership application received',
    message='Your membership application was received. Sign in to see its current status and any next steps.',
    action_url='/member/claim',
    last_error=null,
    delivered_at=coalesce(n.delivered_at, now()),
    updated_at=now()
from public.membership_claims c
where n.channel='in_app'
  and n.type='claim.pending_verification'
  and n.status='superseded'
  and n.last_error='SUPERSEDED_BUSINESS_STATE'
  and n.related_record_type='claim'
  and n.related_record_id=c.id
  and n.recipient_user_id=c.user_id
  and c.status='active';

-- These status-update emails were skipped before SMTP began. Preserve the job,
-- its intended recipient and its claim relationship, but place it on an
-- explicit hold instead of requeuing it: there is no verified prior SMTP
-- acceptance for these historical recipients, so they must never dispatch
-- automatically. Restore only verified owners' active claims, and only when no
-- per-recipient delivery record exists. Releasing a held job is a separate,
-- permissioned, audited action (public.csc_release_held_notification). The
-- far-future available_at is defence-in-depth; the 'held' status is the
-- authoritative guard.
update public.notifications n
set status='held',
    attempts=0,
    available_at='infinity'::timestamptz,
    last_error='HISTORICAL_HOLD_PENDING_APPROVAL',
    lease_id=null,
    locked_until=null,
    updated_at=now()
from public.membership_claims c
join auth.users u on u.id=c.user_id and u.email_confirmed_at is not null
where n.channel='email'
  and n.template_key='MembershipMoreInformation'
  and n.status='superseded'
  and n.last_error='SUPERSEDED_BUSINESS_STATE'
  and n.related_record_type='membership_claims'
  and n.related_record_id=c.id
  and n.recipient_user_id=c.user_id
  and c.status='active'
  and not exists (
    select 1 from public.notification_deliveries d
    where d.notification_id=n.id
  );

-- Record each hold so the preserved-but-withheld state is auditable.
insert into public.audit_logs(action, target_type, target_id, after, correlation_id)
select 'notification.held', 'notification', n.id::text,
       jsonb_build_object(
         'reason', 'historical membership email preserved pending release approval',
         'template_key', n.template_key,
         'recipient_user_id', n.recipient_user_id),
       gen_random_uuid()::text
from public.notifications n
where n.channel='email'
  and n.template_key='MembershipMoreInformation'
  and n.status='held'
  and n.last_error='HISTORICAL_HOLD_PENDING_APPROVAL';

commit;
