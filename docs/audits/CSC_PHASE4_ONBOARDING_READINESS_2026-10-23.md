# CSC Circle Phase 4 Local Verification and Onboarding Readiness

**Date:** 2026-10-23 (Asia/Kolkata)
**Branch:** `phase4/local-email-notifications-collaboration`
**Base HEAD:** `8aaa21c611c21dc387db7ce7ae941b9222ab8c7c`
**Scope:** Local-only implementation and verification. No commit, push, production migration, production email, or deployment was performed.

## Outcome

The Phase 4 changes build locally and the latest automated checks pass: TypeScript, ESLint, 246 unit tests, 46 authenticated browser tests, three local email/notification integration tests, production dependency audit, secret scan, local migration synchronization, and local schema lint (with one warning). The local mail capture verifies application SMTP acceptance and Supabase Auth message generation; it does not prove production inbox delivery.

**Readiness decision: NO-GO for the requested 100–150 simultaneous active-user onboarding target.** At 100 virtual users the local read-only benchmark repeatedly exceeded latency targets and timed out on the notifications endpoint; at 150 users the initial run had a 20.72% failure rate. The 200-user stage was not run. No production load test was performed. This is a material blocker until the bottleneck is diagnosed and the test is repeated successfully against a representative isolated environment.

## Confirmed fixes and behavior

- Membership notification history migration restores eligible previously superseded application notifications and only requeues email notifications with no delivery-attempt record, avoiding replay of accepted or uncertain sends.
- Invitation expiry now persists as `expired` and returns an explicit result rather than raising an exception that rolls the status update back. The API maps that result to HTTP 410.
- The invitation acceptance page uses actual links for navigation. Its acceptance action remains a button and the E2E test verifies protected admin navigation redirects unauthenticated users to login.
- Local SMTP capture is opt-in and restricted to the loopback Mailpit host/port with no credentials and local application URLs. Production transport validation remains Gmail-specific and authenticated; local capture does not add a public SMTP relay.
- Collaboration organization logos use a protected upload endpoint and circular `object-contain` presentation. Collaboration featured/gallery images are normalized to 4:3. Historical image references remain readable.
- The admin Media navigation/page was removed as requested in the earlier UI change.

## Email and invitation validation

`npm run test:email:local` passed 3 tests covering local Supabase Auth confirmation, recovery, email-change and Auth invitation messages, notification outbox dispatch captured by Mailpit, all seven administrator roles, wrong-account/expired/revoked/replay acceptance cases, and SMTP acceptance lifecycle. The integration fixture and its notification rows were cleaned up. A separate E2E test covers authorized collaboration media upload and anonymous denial.

This validates local code paths only. Production SMTP configuration, Supabase Auth SMTP/templates, DNS sender alignment, spam placement, and successful delivery to a real inbox were not inspected or tested. Do not label provider acceptance as inbox delivery. No real mail was sent.

## Test evidence

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test -- --reporter=dot` | 43 files passed, 1 skipped; 246 tests passed, 3 skipped |
| `npm run test:e2e:local` | 46/46 passed; isolated local Supabase, synthetic accounts |
| `npm run test:email:local` | 3/3 passed; local Supabase + loopback Mailpit |
| `npm run build` | Passed; Next.js 16.4.2, 112 pages generated |
| `npm audit --omit=dev --audit-level=high` | Passed; 0 production vulnerabilities |
| `npm run security:scan` | Passed; 517 files scanned, no secret findings |
| `git diff --check` | Passed |
| `supabase migration list --local` | Local migration history synchronized through `20261023120000` |
| `supabase db lint --local --schema public,private` | Completed with one warning: unused `p_event_label` in `public.submit_rsvp` |
| Local RLS smoke | Passed for member isolation, role escalation denial, queue-claim denial and admin read behavior |

The known Supabase SSR `Date.now()` prerender diagnostic still appears when authenticated routes are requested by the E2E server. It was not suppressed or considered fixed. The prior 14 multiple-permissive-policy advisor warnings remain unresolved. Local production build passed despite the request-time diagnostic.

## Local performance measurements

Benchmark command: `npm run benchmark:local`; production Next build served locally on loopback; local Supabase; read-only route mix of home, events, startup directory, collaborations, member dashboard/profile/card/startups and notifications; one synthetic member session shared across VUs; 1.5 second ramp, 350 ms think time, approximately 6.5 second stage window, 10 second request timeout. The generator used approximately 38 MB RSS. These short local runs are directional measurements, not production capacity claims.

| Concurrent VUs | Requests | RPS | p50 | p95 | p99 | Failure rate | Result |
|---:|---:|---:|---:|---:|---:|---:|---|
| 5 | 83 | 12.12 | 5.58 ms | 75.10 ms | 156.60 ms | 0% | Pass |
| 25 | 400 | 58.05 | 6.55 ms | 113.99 ms | 307.99 ms | 0% | Pass |
| 50 | 488 | 60.14 | 112.72 ms | 917.13 ms | 1,490.18 ms | 0% | Pass |
| 100, run 1 | 331 | 34.37 | 1,255.37 ms | 4,991.87 ms | 5,562.77 ms | 0% | Fail latency objective |
| 100, run 2 | 272 | 19.46 | 1,463.16 ms | 10,001.31 ms | 10,002.44 ms | 11.76% | Fail; 32 notifications timeouts |
| 150 | 362 | 31.09 | 1,036.67 ms | 7,779.33 ms | 8,155.22 ms | 20.72% | Fail; escalation stopped |
| 200 | Not run | — | — | — | — | — | Not run after severe saturation |

No performance optimization is claimed: there is no paired post-fix benchmark. The test uses one shared synthetic authenticated session rather than 100–150 independent sessions and does not include writes, event registration contention, Google OAuth or provider mail. It proves local route saturation under this workload, not a definitive production root cause. The `/api/member/notifications` endpoint was the timeout hotspot in the second 100-user run and needs profiling before onboarding at the requested concurrency.

## Email capacity planning

The effective current application email budget in local SQL is 100 accepted messages/hour and 400/day; dispatch is sequential with a bounded batch and retries. Approximate application-message scenarios for 600 members over 14 days (not including Auth confirmation) are:

| Messages/member | Total | Average/day |
|---:|---:|---:|
| 2 | 1,200 | 86 |
| 3 | 1,800 | 129 |
| 5 | 3,000 | 214 |

These averages fit the local application cap, but a concentrated burst beyond 100/hour or 400/day can queue and delay messages. The separate Auth confirmation adds approximately 600 messages if every account confirms. The current configured production provider/account and combined sender limits are unverified. No exact queue-delay promise is supported. Vercel's existing once-daily recovery cron is a recovery mechanism, not a real-time delivery SLA; user-triggered dispatch is attempted after the action when the runtime permits.

Vercel documents Hobby cron as once per day with up to ±59 minutes scheduling variance ([cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)). The configured `0 2 * * *` therefore targets about 07:30 IST, but is not precise delivery. Supabase currently lists Free quotas including 500 MB database size per project, 1 GB Storage, 50,000 monthly active users and 5 GB egress (the billing page gives plan quotas; the bandwidth page breaks egress into cached/uncached allowances) ([billing quotas](https://supabase.com/docs/guides/platform/billing-on-supabase), [database size](https://supabase.com/docs/guides/platform/database-size), [bandwidth and storage egress](https://supabase.com/docs/guides/storage/serving/bandwidth)). Hitting the database quota can put a Free project into read-only mode. These are published limits, not measured remaining capacity for CSC's production project. Gmail consumer accounts have a published sending limit of more than 500 messages/day before a sending restriction may apply ([Gmail sending limits](https://support.google.com/mail/answer/22839?Hl=en)); the current CSC sender account type and effective production quota are unknown.

## Migrations

Local-only migrations applied and tested in local Supabase:

1. `20261021163000_preserve_membership_notification_history.sql` — restores eligible membership notification history and safer delivery replay semantics.
2. `20261023100000_collaboration_4_3_images_and_logos.sql` — collaboration save-function constraints and private logo/media handling.
3. `20261023120000_persist_expired_admin_invitation_state.sql` — persists invitation expiry and adds a recent-sign-in check for privileged invitation acceptance.

The local history also contains the Phase 3 migrations. Production migration history was not queried. Therefore, pending production sequence, compatibility, lock impact and rollback plan remain to be reviewed before a separately approved migration. No production schema was changed.

## Remaining blockers and verification gaps

- Diagnose and resolve notification-route saturation; rerun stepped load testing without escalation after instability.
- Repeat 100/150-user tests with distinct authenticated sessions and representative read/write mix, including event seat contention, against isolated infrastructure sized to represent target deployment.
- Verify production Vercel/Supabase quotas, current storage/bandwidth/database usage and Hobby eligibility; none were measured here.
- Verify production Nodemailer and Supabase Auth configuration independently, and run a separately approved single-recipient delivery test after the domain mailbox/sender is acquired and DNS authentication is complete.
- Reconcile the 14 policy advisor warnings and the one remaining schema lint warning.
- Investigate and resolve or document the recurring Supabase SSR `Date.now()` prerender diagnostic without changing session verification behavior.
- Review and approve the three production migration operations, their dependencies and rollback plan.

No production database, authentication configuration, deployment, real email recipient, paid service, or unrelated LIT container was modified. The unrelated member-profile prompt and `public/posters/` assets were preserved.

## 2026-10-23 performance recovery addendum

This addendum supersedes the earlier NO-GO performance table for **local read-only route latency only**. The earlier 5–150 VU figures remain historical evidence, but they used a single shared session, aggressive think time, short stages, and synchronous Docker sampling; they are not comparable to the independent-session runs below. A pre-RPC independent-session run also produced a real intermittent 150-user tail-latency failure. It is preserved in this audit rather than hidden.

### Diagnosis and changes

- The member notification request verified claims, called a separate current-session/member-state RPC, then made two PostgREST reads for the inbox and unread count. Under the observed 150-user tail event, the session RPC and inbox calls each showed roughly 1.8–2.1 seconds p95. Local `EXPLAIN (ANALYZE, BUFFERS)` showed the existing `notifications_member_inbox` index was used; isolated query execution was about 0.13 ms for the page and 0.04 ms for unread count. This points to intermittent service/connection queueing across multiple PostgREST round trips, not a table scan.
- Added `csc_member_notification_inbox()` as a single `SECURITY INVOKER` RPC. It performs current session and membership validation and returns the user-scoped inbox and unread count in one request. RLS remains enabled and is still applied. The API continues to verify JWT claims, rejects stale/revoked sessions, and never uses a client-supplied identity.
- Member-page verification now uses verified JWT claims plus a database session/membership check instead of an extra Auth user lookup. The member layout removed a redundant full admin-context lookup and uses the existing self-read policy only for the convenience dashboard link; admin pages still perform their own server-side permission checks.
- Benchmark resource collection now calls Docker diagnostics asynchronously with bounded timeouts. The previous synchronous Docker sampler could block the load generator and distort timings. The current samples count full response bodies and use independent synthetic Auth sessions.
- Fixture cleanup now chunks notification/delivery cleanup in groups of 50 to avoid request-size limits. After load runs, zero benchmark identities, memberships, notifications, and fixture file remained.

### Independent-session route benchmark

Command: `CSC_LOCAL_BENCH_STAGES=100,150 CSC_LOCAL_BENCH_REPETITIONS=3 CSC_LOCAL_BENCH_DURATION_SECONDS=30 CSC_LOCAL_BENCH_RAMP_SECONDS=10 CSC_LOCAL_BENCH_THINK_MIN_MS=2000 CSC_LOCAL_BENCH_THINK_MAX_MS=4000 npm run benchmark:local`.

Environment: local production Next build at `127.0.0.1:3107`; local Supabase loopback endpoint and local Docker only; 100 or 150 distinct synthetic verified members; 30-second steady period and 10-second ramp; 2–4 second think time; one-third public browsing and two-thirds authenticated member routes (dashboard, profile, card, startups, notification inbox); read-only requests, RLS enabled. The sanitized build was scanned and contained no production Supabase hostname. The benchmark did not write business records or use real OAuth, email, or production services.

| Users / run | Requests | RPS | p50 | p95 | p99 | Failures | Notification p95 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 100 / 1 | 898 | 26.70 | 22.72 ms | 119.40 ms | 504.72 ms | 0 (0%) | 98.21 ms |
| 100 / 2 | 902 | 26.71 | 21.36 ms | 54.26 ms | 81.96 ms | 0 (0%) | 20.50 ms |
| 100 / 3 | 902 | 26.73 | 20.02 ms | 42.79 ms | 56.13 ms | 0 (0%) | 14.95 ms |
| 150 / 1 | 1,337 | 39.54 | 20.53 ms | 68.26 ms | 172.11 ms | 0 (0%) | 30.32 ms |
| 150 / 2 | 1,341 | 39.68 | 18.76 ms | 46.54 ms | 73.02 ms | 0 (0%) | 17.87 ms |
| 150 / 3 | 1,341 | 39.69 | 18.88 ms | 57.23 ms | 90.50 ms | 0 (0%) | 20.31 ms |

At 100 users, Next process peak CPU observations were 56–80% and RSS 297–335 MiB; PostgreSQL connections peaked at 22. Available container samples showed PostgreSQL up to 20.35%, Auth 0.10%, PostgREST 15.07%, and Kong 17.23% CPU. At 150 users, Next CPU was 63–78% and RSS 294–318 MiB; PostgreSQL stayed at or below 20.70%, PostgREST 17.77%, and Kong 28.51% where samples were available. Some container samples timed out and are marked unavailable; they were not inferred. Generator aggregate peak RSS was 36 MiB. Host hardware specs were not recorded.

One optional 200-user, 30-second read-only stretch run used 200 distinct synthetic sessions, 15-second ramp, and the same think-time range: 1,613 requests, 47.74 RPS, p50 20.70 ms, p95 75.06 ms, p99 146.35 ms, 0 failures; notification p95 23.36 ms. Next process peak was 87.2% CPU and 339 MiB RSS; Supabase containers peaked at 22.79% DB, 2.54% Auth, 15.87% PostgREST, and 6.22% Kong CPU; 22 database connections were observed. This was one stretch run, not a repeated acceptance stage.

These results pass the provisional **local read-only latency** targets in repeat runs at 100 and 150 users. They do not verify write contention, concurrent event-capacity enforcement, production Vercel/Supabase throughput, or a service-level guarantee. The previous pre-single-RPC 150-user tail failure demonstrates why repeat runs and the in-production platform gate remain necessary.

### Updated validation and remaining release gates

| Check | Updated result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 43 files passed, 1 skipped; 246 passed, 4 skipped (250 total) |
| `npm run test:e2e:local` | 46/46 passed with isolated local Supabase fixtures |
| `npm run test:email:local` | 4/4 passed using local Supabase and loopback Mailpit |
| Local migration/RLS suite | 41/41 PGlite tests passed; added session table fixture for function compilation |
| `supabase db lint --local --schema public,private` | One existing warning remains: unused `p_event_label` in `public.submit_rsvp` |
| `npm run security:scan` | 520 files scanned, no secret findings |
| `npm audit --omit=dev --audit-level=high` | Zero production dependency vulnerabilities |
| `git diff --check` | Passed |

New migration `20261023133000_member_notification_inbox_rpc.sql` was applied to local Supabase only. The migration introduces an authenticated-only invoker RPC; no production schema history was queried or changed. The three Phase 4 migrations, two optional Phase 3 migrations, and this new migration remain subject to production-history comparison, compatibility review, rollback planning, and separate approval before any production SQL. Fourteen prior multiple-permissive-policy advisories and the Supabase SSR `Date.now()` diagnostic remain unresolved and documented. E2E logs still show that Next.js diagnostic; it was not suppressed or “fixed” by relaxing authentication.

Production mail delivery (application SMTP and Supabase Auth), sender-domain alignment/inbox placement, current Vercel/Supabase free-tier quota headroom, production migration state, and production load capacity remain **NOT VERIFIED**. The release therefore remains **NO-GO — do not deploy**. No commit, push, migration to production, live email, deployment, paid resource, or unrelated LIT container change occurred.

## 2026-10-23 final release-gate continuation

This is the latest evidence for the current working tree and supersedes earlier statements in this file that production migration history had not been queried. It also narrows the prior read-performance results: the read-only benchmark is encouraging local evidence, not hosted capacity proof or write-safety evidence.

### Concurrent write and mixed-workload verification

All tests ran against loopback Supabase (`127.0.0.1`) with RLS enabled and distinct synthetic member accounts. The harness refuses non-local Supabase URLs. It created synthetic memberships, startups, event registrations and notification traffic, then removed the fixtures. No production user or record was used.

| Scenario | Result | Correctness outcome |
|---|---|---|
| 85 concurrent member claim submissions and profile updates | Passed | Five duplicate claims were rejected by the existing uniqueness constraint (`23505`); no duplicate claim was stored. |
| Event registration burst, 10 attempts, capacity 12 | Passed | 10 confirmed, 0 waitlisted; idempotent replay; no overbooking. |
| Event registration burst, 25 attempts, capacity 8 | Passed | 8 confirmed, 17 waitlisted; idempotent replay; no overbooking. |
| Event registration burst, 50 attempts, capacity 16 | Passed | 16 confirmed, 34 waitlisted; idempotent replay; no overbooking. |
| Startup submissions, 10/25/50 independent owners | Passed | Own writes and retries remained consistent; another member's pending startup stayed hidden by RLS. |
| Mixed 150-session activity | Passed, one run | 22 registration writes plus 128 notification/profile read journeys; 10-second arrival ramp with 2–4 second think time; p50 113.83 ms, p95 169.86 ms, p99 201.59 ms, 0% unexpected failures, 13.52 seconds total. New registrations correctly remained `pending_review` with no event pass until admin confirmation. |

The mixed-run throughput was 11.10 user journeys/second, not raw HTTP requests/second (a read journey includes multiple HTTP calls). Registration-capacity rejections were reported separately from infrastructure errors: 51 capacity rejections across the deliberately constrained 10/25/50 burst scenarios, 0 unexpected failures. This is one run per concurrent-write stage, not three repeated sustained runs. The harness reports `dbConnectionsAtEnd`, a single post-run sample, not peak connection use. Local Docker CPU/memory peak sampling and lock-wait sampling were not collected for these writes. The previous repeated 100/150-user **read-only** benchmark remains the accepted local latency baseline; no read path was rewritten in this continuation.

Fixture cleanup was corrected to remove owned business records and related member/admin notifications before synthetic accounts. The final cleanup check found zero benchmark accounts and zero stale synthetic admin-alert outbox jobs.

### Confirmed notification behavior correction

Review found that the existing database submission trigger queued email outbox jobs but did not create the expected member in-app inbox items for membership, startup and review submissions. Added local migration `20261023011513_dual_channel_submission_notifications.sql` to create recipient-scoped in-app items without exposing invitation secrets or private submission evidence. Event registration already creates its own in-app notification and was not duplicated. A membership deduplication key was aligned with the existing status-transition notification after a unit test caught the duplicate case. The migration was applied and tested only in local Supabase/PGlite; it has not been applied to production.

### Migration state and production compatibility

Local Supabase migration history is synchronized through `20261023133000`. The latest read-only production migration listing ends at `20261021114330_restrict_notification_worker_state_access`; the following eight migrations are absent in production:

1. `20261021153925_optimize_auth_rls_initplans.sql` — policy query optimization; not required by the new application API, but remains a pending database change for review.
2. `20261021154034_remove_unused_notification_return_value.sql` — changes the notification operation function's return contract; it must precede migration 3 because PostgreSQL cannot replace a function while changing its return type with `CREATE OR REPLACE`.
3. `20261021163000_preserve_membership_notification_history.sql` — membership notification history/replay behavior.
4. `20261023011513_dual_channel_submission_notifications.sql` — creates submission in-app inbox notifications.
5. `20261023100000_collaboration_4_3_images_and_logos.sql` — collaboration save constraints/media handling.
6. `20261023120000_persist_expired_admin_invitation_state.sql` — invitation expiry/acceptance state behavior.
7. `20261023130000_csc_validate_member_session_access.sql` — server-verified session validation required by the new inbox API.
8. `20261023133000_member_notification_inbox_rpc.sql` — consolidated inbox RPC called by the new application code.

At minimum, migrations 7 and 8 are application dependencies: deploying this branch against the current production schema would call functions that do not exist. The notification return-contract ordering above is also mandatory if both migrations are applied. Collaboration and invitation changes require their corresponding schema/function migration. The full sequence, backward compatibility and rollback need a reviewed production migration packet and separate approval. No production SQL was run.

All eight migration files use transactions or a transactional `DO` block and contain no `DROP TABLE`/`TRUNCATE`. However, migration 3 updates existing notification rows and can requeue eligible `MembershipMoreInformation` emails for later dispatch. Before production use, take a recoverable database backup, snapshot the affected notification IDs/statuses/attempt counts and verify the exact audience. Applying that data update does not itself send mail, but the subsequent application dispatcher may; production email delivery therefore needs a separately approved operational plan. Function and policy replacements can acquire locks; production lock duration was not measured, so run during a low-traffic window with a statement/lock timeout and monitor the migration. Use a forward corrective migration for rollback after data or mail state changes rather than blindly reversing notification rows.

### Production plan and delivery checks

Read-only Vercel inspection confirmed the existing `csc-circle` project under `coimbatore-startup-community`, Node.js `24.x`, and Hobby plan. The existing production deployment remains READY at deployment `dpl_G8v7yrzbFKg7Xmh3Tn1H1XXotua4`; no new deployment was created. Supabase production project `mmsrtfktwcrbyrucjmzo` is ACTIVE_HEALTHY on the Free plan. A point-in-time read-only snapshot reported approximately 14 MB database size and 7 database connections; this is not a quota/headroom report. Organization egress, storage quota use, Auth MAU, Vercel consumption and remaining monthly allowance were not available in this verification.

The production environment variable names were present in the existing Vercel Production configuration, but secret values and effective endpoint/provider behavior were not verified. Production Nodemailer acceptance, inbox/spam placement, Supabase Auth email delivery, sender-domain authentication and provider quotas remain **NOT VERIFIED**. No live email was sent. The old prose in `docs/GMAIL_NOTIFICATIONS.md` describing a prior Gmail test is historical only; a status notice now explicitly says it is not current Phase 4 delivery evidence. The 100/hour and 400/day application caps come from `20261020024739`, which is present in the production migration history. Dispatch is capped at 15 jobs per batch, and a user-triggered drain can make up to six rounds. These are not proof of provider capacity or successful inbox delivery.

Vercel Hobby remains active and no paid feature or resource was enabled. Vercel's published terms restrict Hobby to personal/non-commercial use; CSC Circle's eligibility as an organized community has not been confirmed by Vercel. Free-plan usage may pause or become limited at quota thresholds; no production stress test was run. Supabase's published Free quotas include 500 MB database size, 1 GB storage, 50,000 MAU and 5 GB egress, but project/organization remaining usage was not established ([Supabase billing and quotas](https://supabase.com/docs/guides/platform/billing-on-supabase)). Vercel states Hobby projects can be paused when included usage is exceeded and restricts Hobby to non-commercial personal use ([Vercel account plans](https://vercel.com/docs/plans), [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)). Confirm eligibility and actual usage before public rollout.

### Updated checks

| Check | Latest result |
|---|---|
| TypeScript | Passed |
| ESLint | Passed |
| Vitest | 246 passed, 4 skipped (250 total) |
| Authenticated Playwright | 46/46 passed against local Supabase |
| Local email/Auth capture | 4/4 passed with loopback Mailpit; not live delivery |
| Local concurrency harness | Passed the claim, startup, event-capacity and mixed 150-session assertions described above |
| Local migration history | Applied through `20261023133000` |
| PGlite/database tests | 41/41 passed |
| Local schema lint | One warning remains: unused `p_event_label` in `public.submit_rsvp`; the parameter is retained as an RPC compatibility surface and the function uses authoritative event data. |
| Secret scan | 522 files, no findings |
| Production dependency audit | 0 vulnerabilities |
| Local production build | Passed; 112 pages generated by the E2E wrapper |
| `git diff --check` | Passed after the final documentation and metric-label updates. |

The known Next.js/Supabase SSR `Date.now()` prerender diagnostic still appears in authenticated E2E request logs and remains unresolved. Production advisors previously showed 14 multiple-permissive-policy findings, 24 auth RLS initialization-plan findings, 21 unindexed foreign keys, four unused indexes, 15 executable `SECURITY DEFINER` function notices, four RLS-enabled tables without policies, and disabled leaked-password protection. These findings have not been cleared by local tests; they require individual production review. A prior pair of invalid-credential requests to production Auth returned errors during earlier testing; there was no successful production sign-in or data write. Current production diagnostics in this continuation were read-only.

### Release decision

**NO-GO — keep the existing production deployment unchanged.** The read-only local latency improvement and the passing local concurrency assertions are useful evidence, but the write suite has one run per stage and does not establish hosted capacity. More decisively, production lacks the new session-validation and notification-inbox RPC migrations required by this application, and separate migration approval has not been given. Production SMTP/Auth delivery and the approved sender configuration are unverified, Vercel Hobby eligibility is unresolved, and hosted quota headroom is unavailable. No commit, push, migration to production, real email, paid resource, deployment, or unrelated LIT container change occurred. The member-profile prompt and `public/posters/` remain unmodified.

### Final approved-continuation checks

The authenticated public-site header did not previously render the notification bell outside the member shell. `SiteHeader` now mounts the existing `MemberNotificationMenu` for authenticated accounts, continuing to use the existing authenticated notification endpoint/RPC. No second notification backend was introduced. New Playwright coverage signs in with a local Content Manager fixture and verifies the unread count, actionable startup link, in-viewport panel and route navigation at 375px and 1280px.

| Check rerun after header integration | Result |
|---|---|
| `npm run test:e2e:local` | 47/47 passed (includes the new public-header bell case) |
| `npm test` | 43 files passed, 1 skipped; 246 passed, 4 skipped (250 total) |
| `npm run test:email:local` | 4/4 passed against local Supabase and loopback Mailpit |
| `npm run typecheck` | Passed after the header change; E2E production build also compiled the updated header |
| `npm run lint` | Passed after the header change |
| `git diff --check` | Passed after the header/test additions |

The header browser case verifies the homepage at 320, 375, 430, 768, 1024 and 1280px, opens and bounds the panel at every width, checks no horizontal overflow and that opening the panel does not trigger another inbox request, checks the mobile menu remains available, then visits `/events` and activates a notification action. Guest tests verify the bell is absent on public pages. An initial expanded test design repeated logins with the same synthetic identity and tripped the application's intentional login throttle; I consolidated those width checks into one login session, after which the complete E2E suite passed 47/47. No authentication limit was changed.

The E2E process emitted the known Next.js/Supabase SSR `Date.now()` prerender diagnostic. It remains unresolved. The test environment also logs `CSC_NOTIFICATION_CONFIGURATION_ERROR` because outbound production SMTP is intentionally disabled there; this does not invalidate loopback Mailpit assertions.

### Read-only production email requeue review

Production was queried read-only before any migration decision. Under the exact predicate used by `20261021163000_preserve_membership_notification_history.sql`, **three** historical `MembershipMoreInformation` email jobs for **three distinct verified accounts** qualify for requeue. All three were previously superseded while the authoritative membership state is active; each has a unique dedupe key and one prior claim attempt, but no delivery receipt. The current delivery flow creates its receipt before attempting SMTP, so these rows show no evidence that SMTP was reached. Migration 3 resets the claim state; the new dispatcher considers active members current, so the three messages may be attempted after migration and deployment. They are under the existing application caps (100/hour, 400/day), but are still real historical-member emails and require a reviewed release-day dispatch decision. No rows were changed and no messages were sent or drained.

The same migration restores **four** in-app `claim.pending_verification` history items for four distinct active accounts. These do not themselves send email. Production currently has no queued/processing/retry-pending email jobs in the queried aggregate; previously accepted/sent outbox states are not independent proof of inbox delivery.

### Current release decision

**NO-GO — production remains unchanged.** The global header notification bell is implemented and verified locally. The eight pending production migrations have not been applied; at least the session-validation and notification-inbox RPC migrations are direct code dependencies. Production SMTP/Auth inbox receipt, sender-domain SPF/DKIM/DMARC, exact remaining free-plan quota headroom, and Vercel Hobby eligibility for the organized community are not verified. Separate approval is still required for production migrations and a bounded real-mail test with a designated recipient. No commit, push, migration, email or deployment was performed. The existing Vercel deployment remains the production version.
