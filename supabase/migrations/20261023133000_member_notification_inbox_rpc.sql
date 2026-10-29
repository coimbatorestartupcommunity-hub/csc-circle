-- Fetch an authenticated member's inbox in one PostgREST round trip. This is
-- SECURITY INVOKER: table grants and RLS remain authoritative. Session and
-- membership state are checked before private notification data is returned.
begin;

create or replace function public.csc_member_notification_inbox()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when public.csc_validate_member_session() then jsonb_build_object(
      'items', coalesce((
        select jsonb_agg(to_jsonb(inbox_row) order by inbox_row.delivered_at desc)
        from (
          select n.id, n.type, n.title, n.message, n.action_url, n.read_at,
                 n.created_at, n.delivered_at
          from public.notifications n
          where n.channel = 'in_app'
            and n.status = 'available'
            and n.recipient_user_id = auth.uid()
          order by n.delivered_at desc
          limit 30
        ) inbox_row
      ), '[]'::jsonb),
      'unreadCount', coalesce((
        select count(*)::integer
        from public.notifications n
        where n.channel = 'in_app'
          and n.status = 'available'
          and n.recipient_user_id = auth.uid()
          and n.read_at is null
      ), 0)
    )
    else null
  end;
$$;

revoke all on function public.csc_member_notification_inbox() from public, anon;
grant execute on function public.csc_member_notification_inbox() to authenticated;
comment on function public.csc_member_notification_inbox() is
  'Returns up to 30 RLS-filtered in-app notifications and the authenticated member unread count after validating the current Auth session.';

commit;
