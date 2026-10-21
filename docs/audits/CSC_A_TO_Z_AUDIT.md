# CSC Circle A-to-Z Audit

Audit date: 2026-10-21 (Asia/Kolkata)
Repository: `coimbatorestartupcommunity-hub/csc-circle`
Audited source SHA: `75ef2414bf8d52e98dc789a80cc1d2671fadd22d`
Production SHA: `75ef2414bf8d52e98dc789a80cc1d2671fadd22d`

## Scope and safety

This audit followed the project master prompt. Repository state, deployed release, live Supabase project, migration history, selected security metadata, production route response timing, and configured quality checks were inspected. No production database writes, migration application, Vercel deployment, email, user-data mutation, or destructive action was performed. Two unrelated pre-existing untracked items (`CSC_Circle_Complete_Member_Profile_Resume_Header_Master_Prompt.md` and `public/posters/`) were preserved.

## Environment snapshot

- Worktree: `/Users/vikash/Projects/csc-circle`, branch `main`; origin main was fetched and matched the local audited SHA.
- Runtime/tooling: Node `v24.12.0`, npm `11.6.2`, Next `16.4.2`, Vercel CLI `63.1.0`.
- Vercel: existing project `csc-circle`; production deployment `dpl_3pmZeDYuNFmN62tGc9KXASaMcuUB`, Ready, source SHA matches audited SHA.
- Supabase: project `mmsrtfktwcrbyrucjmzo`, `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.003`, region `ap-northeast-2`.
- Local migration files: 36 after adding the prepared, unapplied security migration. Live applied history has the prior 35 migrations and matches the pre-audit local history exactly.
- Public-schema tables: RLS was enabled for every inspected table. One internal worker-state table had broad API-role grants despite no policies; a narrow migration was prepared but intentionally not applied.

## Changes implemented locally

1. Added request-scoped React caching to authenticated user, member context, admin context, and membership-access reads. The member shell previously repeated the same verified-auth and membership reads in layout/profile/admin-context composition; the new memoization shares them only within one Server Component request, never across users or requests. This reduces the member-layout path from up to three `getUser` and three membership lookups to one each when these functions are called in that render; the admin-role lookup remains separate and current for that request.
2. Prepared `supabase/migrations/20261021140000_restrict_notification_worker_state_access.sql`, revoking `PUBLIC`, `anon`, and `authenticated` table privileges from the internal worker lease state and retaining `service_role` select/update. This is not applied to production and requires owner approval.
3. Recorded route, integration, security, migration, performance, and release findings in the companion audit documents.

## Issue ledger

| ID | Severity | Finding | Status | Evidence / action |
|---|---|---|---|---|
| PERF-01 | P2 | Duplicate verified-identity and membership reads within member Server Component rendering | PASS (local fix) | React request cache added; typecheck, lint, unit suite and build re-run. Deterministic same-render call path reduced from up to 3 identity + 3 membership calls to 1 + 1. |
| SEC-01 | P2 | Internal `notification_worker_state` has no RLS policies but live grants to `anon` and `authenticated` include all table privileges, including TRUNCATE | BLOCKED (approval required) | Live catalog query confirmed grants. Prepared targeted revoke migration. Existing RLS denies row operations, and worker functions are service-role-only; explicit privilege removal still required. |
| SEC-02 | P2 | Supabase Auth leaked-password protection is disabled | BLOCKED (dashboard owner action) | Security Advisor warning. Requires an Auth configuration change, not a code/migration action; left unchanged pending approval. |
| SEC-03 | P2 | 15 authenticated-executable `SECURITY DEFINER` RPCs are flagged | REVIEWED / WATCH | Live catalog confirms no `anon` execute, `search_path=""` for all, and identity/permission checks in the application RPCs reviewed. Keep function-by-function tests and least-privilege review in release gates. |
| DB-01 | P2 | 24 RLS policies are flagged for per-row auth initplan evaluation | BLOCKED (migration approval) | Performance Advisor recommends `(select auth.uid())` style. No production policy changed; review dependencies and benchmark before a single reviewed migration. |
| DB-02 | P2 | 21 foreign keys lack covering indexes | NOT TESTED FOR WORKLOAD | Advisor info-level finding. Need query frequency/plan evidence before index changes; avoid indiscriminate indexes on low-volume production. |
| DB-03 | P3 | Five indexes are currently reported unused | NOT ACTIONED | Short observation window is insufficient to safely remove indexes. |
| DB-04 | P2 | 14 tables have multiple permissive policies | REVIEW REQUIRED | Advisor warning; permissive combination may be intentional. Policy semantics need table-by-table review and negative-role tests. |
| AUTH-01 | P2 | Full authenticated field performance and account-specific UX are not measured in this environment | NOT TESTED | Browser/Playwright tests in this run are unauthenticated smoke checks; no production user credentials/data were used. |
| WEB-01 | P2 | Production response lacks CSP and Permissions-Policy | REVIEW REQUIRED | HTTPS response inspection confirms HSTS, nosniff, Referrer-Policy, and X-Frame-Options; CSP/Permissions-Policy absent. Add report-only policy in preview after enumerating required sources. |

## Coverage summary

- App Router inventory: 65 page files, including dynamic routes and nested admin/member pages.
- Route handlers: 51, including auth, member, admin, directory, event, collaboration, notification and verification APIs.
- Tests: 39 Vitest files / 208 tests; Playwright 32/32 unauthenticated smoke tests.
- Public route benchmark: 11 routes, five samples each. It measures response-to-headers for anonymous requests and redirects, not authenticated page usability.
- Database: read-only migration history, table/RLS catalog, advisor notices and targeted function/grant metadata inspected.
- Not fully exercised: real-account Google/email authentication, startup edit/admin approval, payment events, mail delivery, camera scanner, storage upload/download, invitation acceptance and all seven privileged role workflows. These need approved test accounts or staging fixtures.
- Production backup/PITR restoration was not initiated or verified; obtain an owner-confirmed backup/recovery point before any production migration.

## Route inventory

See the complete generated page/API registry below. The page route tree is derived from `src/app`, with route groups omitted and dynamic segments normalized.

### App Router pages (65)

- `/`
- `/about`
- `/access-denied`
- `/admin`
- `/admin/accept-invitation`
- `/admin/attendance`
- `/admin/audit-logs`
- `/admin/check-in`
- `/admin/collaborations`
- `/admin/collaborations/<id>/edit`
- `/admin/collaborations/new`
- `/admin/consultations`
- `/admin/consultations/<consultationId>`
- `/admin/content`
- `/admin/events`
- `/admin/events/<eventId>`
- `/admin/events/<eventId>/edit`
- `/admin/events/new`
- `/admin/invitations`
- `/admin/media`
- `/admin/members`
- `/admin/members/<memberId>`
- `/admin/membership-claims`
- `/admin/notifications`
- `/admin/payments`
- `/admin/registrations`
- `/admin/registrations/<registrationId>`
- `/admin/reviews`
- `/admin/roles`
- `/admin/settings`
- `/admin/startups`
- `/admin/startups/<startupId>`
- `/admin/startups/revisions`
- `/admin/startups/revisions/<revisionId>`
- `/auth/success`
- `/collaborations`
- `/collaborations/<slug>`
- `/directory`
- `/directory/<slug>`
- `/events`
- `/events/<slug>`
- `/forgot-password`
- `/login`
- `/member`
- `/member/claim`
- `/member/consultations`
- `/member/events`
- `/member/events/<registrationId>`
- `/member/id-card`
- `/member/onboarding`
- `/member/profile`
- `/member/resume`
- `/member/reviews`
- `/member/settings`
- `/member/startup`
- `/member/startups`
- `/member/startups/<startupId>/edit`
- `/member/startups/new`
- `/members`
- `/members/<slug>`
- `/privacy`
- `/reset-password`
- `/security`
- `/signup`
- `/terms`

### Route handlers (51)

- `/api/admin/actions`
- `/api/admin/announcement`
- `/api/admin/announcement/banner`
- `/api/admin/attendance/export`
- `/api/admin/check-in`
- `/api/admin/collaboration-organizations`
- `/api/admin/collaborations`
- `/api/admin/collaborations/featured-image`
- `/api/admin/content`
- `/api/admin/event-notices`
- `/api/admin/events`
- `/api/admin/events/cover`
- `/api/admin/invitations`
- `/api/admin/invitations/<invitationId>`
- `/api/admin/invitations/accept`
- `/api/admin/invitations/exchange`
- `/api/admin/media`
- `/api/admin/members/invite`
- `/api/admin/notifications`
- `/api/admin/notifications/verify`
- `/api/admin/roles`
- `/api/admin/startup-revisions`
- `/api/admin/startups/<startupId>/photo`
- `/api/announcements/active`
- `/api/announcements/banner`
- `/api/auth/<action>`
- `/api/auth/recovery-status`
- `/api/collaborations/media/<assetId>`
- `/api/consultations`
- `/api/directory/startups/<startupId>/logo`
- `/api/directory/startups/<startupId>/photo`
- `/api/internal/notifications`
- `/api/member/<action>`
- `/api/member/community-sharing`
- `/api/member/directory-photo`
- `/api/member/header`
- `/api/member/notifications`
- `/api/member/portrait`
- `/api/member/resume`
- `/api/member/resume/pdf`
- `/api/member/startup-assets`
- `/api/members`
- `/api/members/<memberId>`
- `/api/members/<memberId>/portrait`
- `/api/registrations`
- `/api/rsvp`
- `/api/verify/member`
- `/auth/callback`
- `/auth/complete`
- `/auth/confirm`
- `/auth/signout`
