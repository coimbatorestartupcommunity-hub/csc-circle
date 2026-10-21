-- The worker lease is an internal coordination table. Its row is managed only
-- by the trusted notification processor through service_role-only RPCs.
-- RLS has no client policies, but table-level TRUNCATE/trigger privileges are
-- not governed by row-level policies; explicitly remove all client privileges.
revoke all privileges on table public.notification_worker_state from public;
revoke all privileges on table public.notification_worker_state from anon;
revoke all privileges on table public.notification_worker_state from authenticated;

grant select, update on table public.notification_worker_state to service_role;
