-- Membership cards are free. A trusted administrator can approve a submitted
-- claim in one request; the database records verification and activation in
-- the same transaction so a UI-only intermediate step cannot strand claims.
create or replace function public.csc_admin_action(
  kind text,
  target uuid,
  decision text,
  reason text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if kind = 'claim' and decision = 'active' then
    perform private.admin_action('claim', target, 'pending_verification', coalesce(reason, ''));
    return private.admin_action('claim', target, 'active', coalesce(reason, ''));
  end if;

  return private.admin_action(kind, target, decision, coalesce(reason, ''));
end;
$$;

revoke all on function public.csc_admin_action(text, uuid, text, text) from public, anon;
grant execute on function public.csc_admin_action(text, uuid, text, text) to authenticated;
