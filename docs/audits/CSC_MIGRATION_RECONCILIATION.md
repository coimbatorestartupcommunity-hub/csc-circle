# CSC Circle Supabase Migration Reconciliation

Audit date: 2026-10-21. Project reference verified as `mmsrtfktwcrbyrucjmzo` (`csc-circle-production`).

## Reconciliation result

Before audit changes, live Supabase migration history matched all 35 committed local migration files through `20261020222000_accept_verified_published_startup_media`. No pre-existing drift was found. The audit adds one new, unapplied local migration:

`20261021140000_restrict_notification_worker_state_access.sql`

It narrowly revokes `PUBLIC`, `anon`, and `authenticated` privileges on the internal `public.notification_worker_state` relation and grants the worker's existing `service_role` only `SELECT, UPDATE`. It does not alter rows, user records, policies, functions, startup/member/event data, or storage.

## Required approval and runbook

This migration has **not** been applied to production. Before applying:

1. Owner reviews and approves the SQL and confirms the notification worker uses service-role access (source grants and live RPC grants were inspected).
2. Apply only through the existing authorized Supabase migration workflow.
3. Verify the applied migration version.
4. Re-query `information_schema.role_table_grants` and confirm `anon`/`authenticated` have no privileges while `service_role` retains `SELECT, UPDATE`.
5. Run a notification worker claim/release health test using a designated non-recipient test fixture; do not send test emails to real members.
6. Re-run Supabase Security and Performance Advisors and capture the change.

Rollback should restore the intended state only if service processing fails; do not restore client privileges. Investigate the worker service identity instead.

## Other database advisor findings

- 24 RLS policies have auth initplan warnings. Prepare a separate reviewed, semantics-preserving migration only after policy-level diff and tests.
- 14 multiple-permissive-policy warnings require per-table access-combination review.
- 21 unindexed foreign keys are informational. Index only where query plans/workload support it.
- Five indexes are reported unused. Do not drop based on short advisor observation.

No database migration was applied and no production rows were changed during this audit.
