-- The inserted notification row is intentionally not returned to callers;
-- the stable dedupe key and transaction are the entire operation.
create or replace function private.record_operation(
  action text,
  kind text,
  target uuid,
  before_data jsonb,
  after_data jsonb,
  recipient uuid default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
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

  if action = 'claim.active' and kind = 'claim' then
    update public.notifications
    set status = 'superseded', last_error = 'SUPERSEDED_BUSINESS_STATE', updated_at = now()
    where channel = 'in_app'
      and status = 'available'
      and recipient_user_id = record_operation.recipient
      and type = 'claim.pending_verification'
      and related_record_id = record_operation.target;
  end if;

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
