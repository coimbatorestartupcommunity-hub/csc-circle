-- Verify an already signature-verified Supabase session against current Auth
-- state and the CSC membership gate. This lets the inbox avoid an Auth
-- getUser() network round trip without trusting cookie contents or IDs.
begin;

create or replace function public.csc_validate_member_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and private.account_allowed()
    and case
      when coalesce(auth.jwt() ->> 'session_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then exists (
        select 1
        from auth.sessions s
        where s.id = (auth.jwt() ->> 'session_id')::uuid
          and s.user_id = auth.uid()
          and (s.not_after is null or s.not_after > statement_timestamp())
      )
      else false
    end;
$$;

revoke all on function public.csc_validate_member_session() from public, anon;
grant execute on function public.csc_validate_member_session() to authenticated;
comment on function public.csc_validate_member_session() is
  'Returns whether the verified JWT belongs to a currently active Auth session and an allowed CSC member account.';

commit;
