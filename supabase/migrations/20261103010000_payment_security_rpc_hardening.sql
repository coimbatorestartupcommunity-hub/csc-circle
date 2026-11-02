-- Migration: 20261103010000_payment_security_rpc_hardening.sql
-- Security Hardening for Payment Worker RPCs, Event Pass Resend, and Distributed Rate Limits

begin;

-- ============================================================================
-- 1. Restrict Payment Worker Lease RPCs to service_role ONLY
-- Revoke from public, anon, and authenticated so ordinary users cannot call them.
-- ============================================================================
revoke all on function public.csc_acquire_payment_worker_lease(text, integer) from public, anon, authenticated;
grant execute on function public.csc_acquire_payment_worker_lease(text, integer) to service_role;

revoke all on function public.csc_release_payment_worker_lease(text, text, integer, integer, bigint, text, bigint, text) from public, anon, authenticated;
grant execute on function public.csc_release_payment_worker_lease(text, text, integer, integer, bigint, text, bigint, text) to service_role;

-- ============================================================================
-- 2. Restrict Event Pass Resend RPC to service_role ONLY
-- Revoke execution from public, anon, and authenticated.
-- All invocation must pass through verified server-side admin endpoints.
-- ============================================================================
revoke all on function public.csc_resend_event_pass(uuid) from public, anon, authenticated;
grant execute on function public.csc_resend_event_pass(uuid) to service_role;

-- ============================================================================
-- 3. Restrict Fulfillment RPC to service_role ONLY (Defense-in-Depth)
-- ============================================================================
revoke all on function public.csc_fulfill_confirmed_payment(uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.csc_fulfill_confirmed_payment(uuid, uuid, text, text, uuid) to service_role;

-- ============================================================================
-- 4. RLS Policy for distributed_rate_limits
-- Resolves "Table public.distributed_rate_limits has RLS enabled but no policies"
-- ============================================================================
drop policy if exists distributed_rate_limits_admin_read on public.distributed_rate_limits;
create policy distributed_rate_limits_admin_read on public.distributed_rate_limits
  for select to authenticated
  using (
    exists (
      select 1 from public.admin_roles a
      where a.user_id = (select auth.uid())
        and a.role in ('super_admin', 'finance_reviewer', 'event_manager')
    )
  );

commit;
