# CSC Circle Supabase Migration Reconciliation

Audit date: 2026-10-21. Project reference verified as `mmsrtfktwcrbyrucjmzo` (`csc-circle-production`).

## Reconciliation result

Before the audit migration, live Supabase migration history matched all 35 committed local migrations through `20261020222000_accept_verified_published_startup_media`.

The access-control migration is applied in production and recorded remotely as `20261021114330_restrict_notification_worker_state_access`. Its local migration filename uses the same version. The SQL revokes all table privileges from `PUBLIC`, `anon`, and `authenticated`, then grants the existing worker identity (`service_role`) `SELECT, UPDATE` on `public.notification_worker_state`.

Post-apply privilege verification returned:

| Role | SELECT | UPDATE | DELETE | TRUNCATE |
|---|---:|---:|---:|---:|
| `anon` | no | no | no | no |
| `authenticated` | no | no | no | no |
| `service_role` | yes | yes | yes | yes |

The last two service-role capabilities are inherited from the role's normal elevated table access; client roles have none. The migration changes privileges only and does not alter rows, user records, policies, functions, startup/member/event data, or storage.

The application worker's existing RPC uses the service-role client. The claim/release worker was not invoked during verification because a live queue may contain real member notifications; delivery behavior therefore remains untested by this release.

## Other database advisor findings

- 24 RLS policies have auth initplan warnings. Prepare a separate reviewed, semantics-preserving migration only after policy-level diff and tests.
- 14 multiple-permissive-policy warnings require per-table access-combination review.
- 21 unindexed foreign keys are informational. Index only where query plans/workload support it.
- Five indexes are reported unused. Do not drop based on short advisor observation.

No production rows were changed during this audit.
