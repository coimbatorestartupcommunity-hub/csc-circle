-- Explicit, permissioned, audited release path for the historical membership
-- email jobs that 20261021163000 placed on hold. The ordinary retry path
-- (private.retry_notification) only accepts failed jobs and therefore refuses
-- a 'held' row, so releasing a hold is deliberately a separate approved action
-- rather than an accidental side effect of a retry or drain.
begin;

-- Defence-in-depth: keep the 'held' status permitted even if an earlier
-- constraint were ever re-applied. Idempotent via drop-if-exists.
alter table public.notifications drop constraint if exists notifications_status_check;
alter table public.notifications add constraint notifications_status_check
  check (status in ('queued','processing','sent','available','superseded','held','failed_retryable','failed_permanent','failed','retrying'));

create or replace function private.release_held_notification(job uuid, reason text) returns void
language plpgsql security definer set search_path='' as $$
declare n public.notifications;
begin
  if not private.has_permission('settings.manage') then raise exception 'forbidden' using errcode='42501'; end if;
  if length(trim(coalesce(reason,''))) not between 5 and 500 then raise exception 'reason required'; end if;
  select * into n from public.notifications where id=job for update;
  if not found or n.status<>'held' then raise exception 'not held'; end if;
  update public.notifications
    set status='queued', attempts=0, available_at=now(), last_error=null, lease_id=null, locked_until=null, updated_at=now()
    where id=job;
  insert into public.audit_logs(action, actor_id, target_type, target_id, after)
    values ('notification.release_hold', auth.uid(), 'notification', job::text,
            jsonb_build_object('reason', reason, 'template_key', n.template_key, 'recipient_user_id', n.recipient_user_id));
end $$;
revoke all on function private.release_held_notification(uuid,text) from public;
grant execute on function private.release_held_notification(uuid,text) to authenticated;

create function public.csc_release_held_notification(job uuid, reason text) returns void
language sql security invoker set search_path='' as $$select private.release_held_notification(job,reason)$$;
revoke all on function public.csc_release_held_notification(uuid,text) from public;
grant execute on function public.csc_release_held_notification(uuid,text) to authenticated;

commit;
