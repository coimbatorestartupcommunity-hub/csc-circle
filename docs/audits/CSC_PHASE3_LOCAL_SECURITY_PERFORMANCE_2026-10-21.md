# CSC Circle Phase 3 — Local Security, Integration and Performance Review

Date: 2026-10-21
Branch: `phase2/local-staging-e2e-security`
Scope: local repository, local Supabase and synthetic test identities only. No production database, hosted authentication, production email or deployment was used.

## Admin route authorization

- Added `requireAdminPagePermission()` and `requireAdminPage()` in `src/lib/admin/gate.ts`. All 29 restricted admin workspace pages now check current server-loaded permissions before querying module data or rendering page content. The shared overview remains accessible to any active admin and loads only metrics allowed by the role's permission set.
- Direct-URL Playwright checks cover allowed and denied page routes across all seven roles. Unauthorized requests render the generic Next not-found UI without the restricted page heading or data. With a streamed shared admin shell, Next can finish the HTTP response with status 200 even though the route body is the 404 boundary; tests assert both the generic 404 UI and absence of the restricted module. A stream-time status code is therefore not treated as authorization evidence.
- A local transaction compared the live PostgreSQL `private.has_permission()` result against the approved role matrix for all 7 roles × 18 permissions (126 checks); all matched, and the transaction rolled back. E2E also checks the sidebar and protected routes. This does not replace an exhaustive audit of every API mutation, export or storage object.
- The existing `/admin/accept-invitation` remains a separate authenticated invitation-acceptance route; the workspace page guards do not block invite acceptance.

## Proxy authentication and cookies

- Cookie detection matches Supabase SSR's `sb-<project-ref>-auth-token` storage key and numeric chunk suffixes such as `.0` and `.1`. Requests with a recognized session cookie still call `auth.getClaims()`; this includes prefetched requests and session-bearing OAuth callback/confirmation/logout requests. No-cookie auth callback requests remain available to exchange their one-time verifier.
- The previous callback/confirmation early return skipped claim verification when a request already carried a session. Removed that bypass. Added tests for project-style chunk names, verified callback/logout requests, refreshed-cookie propagation, prefetch verification and no-cookie redirects. `auth/signout` continues to call Supabase `signOut()` and clear recovery state. An authenticated E2E logout test now verifies the browser session cookies are cleared and a subsequent member route redirects to login.
- Private redirects and authenticated responses remain `Cache-Control: private, no-store`. Claims remain checked; no `getSession()` substitution or weaker client-only gate was introduced.

## Local SQL changes and database findings

- `supabase/migrations/20261021153925_optimize_auth_rls_initplans.sql` updates the 24 named own/read/update RLS policy expressions that used row-by-row `auth.uid()` calls, wrapping identity reads as statement-level `(select auth.uid())`. Roles and predicate logic are preserved. Local catalog inspection confirmed all 24 targeted policies received the wrapper. The migration is applied in the local migration history only; zero auth-initplan advisor findings remain.
- `supabase/migrations/20261021154034_remove_unused_notification_return_value.sql` removes the unused `notification_id` capture from `private.record_operation`; notification insert, dedupe key, audit event and transaction behavior remain intact. The function remains `SECURITY DEFINER` with an empty `search_path` and retains its existing execute revokes. Local PGlite migration tests and database lint passed apart from the separate existing RSVP parameter warning.
- The 14 remaining `multiple_permissive_policies` warnings were individually inspected. The current pairs intentionally combine an admin-permission predicate with owner, published-content, or published-startup visibility. Their predicates retain distinct legitimate visibility rules, so they were not merged during this pass. The 14 performance warnings remain documented; inspection found no unauthorized policy predicate in those pairs.
- The local performance advisor also reports 21 unindexed foreign keys and 5 unused indexes (INFO). These were not changed without workload and query-plan evidence.
- The security advisor reports four INFO items for RLS-enabled tables without direct policies: `private.member_resumes`, `public.admin_role_invitations`, `public.directory_startup_private_details`, and `public.notification_worker_state`. Local ACL inspection found no direct `anon` or `authenticated` table grants for these relations; access is expected through authorized server functions/service paths. This is local evidence only.
- `supabase db lint --local --fail-on error` reports no SQL errors and one remaining warning: unused parameter `p_event_label` in `public.submit_rsvp`. The other unused-variable finding (`notification_id`) is removed. No production migration was applied.

## Responsive issues fixed

- The expanded E2E sweep found the admin top bar overflowed at 320 px and 1024 px. Reduced narrow-screen horizontal padding, allowed the header to shrink, and moved the full user/role text block to the 1280 px breakpoint.
- The event editor's visually hidden file input occupied layout width on a 320 px viewport. It is now `display: none` and remains triggered by the visible, accessible upload button.
- Responsive coverage checks public directory/events; member profile, ID card and startup form; admin dashboard, event list/new form, startups and payments; mobile menus; visible controls; loaded images; and document/body overflow at 320, 390, 768, 1024 and 1440 px. Existing login viewport checks cover 320 through 1920 px.

## Test and scan results

- TypeScript (`npm run typecheck`): pass.
- ESLint (`npm run lint`): pass.
- Vitest: 220 tests across 41 files passed.
- Authenticated local Playwright: 44/44 tests passed, including the final sign-out flow assertion, all seven admin role-navigation and direct-route checks, and responsive route sweeps. The local production build completed in the same runner and generated all 112 pages.
- Local production build inside the E2E runner: pass; 112 static pages generated. The app build still prints the Next/Supabase `Date.now()` diagnostic described below.
- Local RLS SQL smoke test: pass; synthetic users/rows and checks were inside a transaction that rolled back.
- Local role matrix regression: 126/126 live SQL permission checks passed inside a rollback transaction.
- Secret scan: 506 files scanned, zero findings.
- `npm audit --omit=dev --audit-level=moderate`: zero production dependency vulnerabilities.
- Full `npm audit --audit-level=moderate`: reports five high findings from development-only `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. The installed `braces@3.0.3` is affected and the advisory currently has no patched release; npm's `--force` proposal downgrades the Next ESLint config to v14, so no breaking downgrade or untrusted override was applied. Track GHSA-vfj7-8cjw-p6xm until upstream publishes a fix.
- Local Supabase migration versions through `20261021154034` are recorded. The environment safety guard verified API/DB loopback endpoints and local Mailpit before authenticated E2E. Synthetic fixture cleanup completed; no `csc-phase2-*@example.test` test accounts remain.
- `git diff --check`: pass at last review; rerun before proposing commit.

## Next.js/Supabase Auth warning

The full authenticated run logs repeated Next.js `unstable value Date.now()` diagnostics from Supabase Auth's `__loadSession` path (190 matching lines in the final captured run). The admin workspace layout already awaits Next 16's `connection()` before session-dependent rendering. A prior controlled local diagnostic that temporarily skipped Proxy verification still emitted this warning, so Proxy `getClaims()` is not its only source. The diagnostic bypass was removed. Session claims, refresh and cache privacy remain intact. The warning is unresolved and should be revisited with an upstream Next/Supabase SSR compatibility fix; it is not reported as fixed.

## Performance and hosted integration limits

- The advisor count changed from 38 performance findings (24 auth-initplan plus 14 multiple-permissive groups) to 14 multiple-permissive warnings. This is a database-advisor result, not measured query latency or a user-visible speed improvement.
- No controlled paired before/after route, bundle, query-latency or Core Web Vitals benchmark was produced. No production performance improvement is claimed.
- Real Google OAuth, hosted Supabase Storage signed URLs, SMTP inbox delivery, payment-provider behavior, hosted notification delivery, production RLS/migration state and real-device browser behavior remain **NOT VERIFIED**.

## Files proposed for a future local commit

- `e2e/admin-rbac.spec.ts`
- `e2e/responsive-routes.spec.ts`
- `scripts/local-e2e-fixtures.mjs`
- `src/app/admin/(workspace)/attendance/page.tsx`
- `src/app/admin/(workspace)/audit-logs/page.tsx`
- `src/app/admin/(workspace)/check-in/page.tsx`
- `src/app/admin/(workspace)/collaborations/[id]/edit/page.tsx`
- `src/app/admin/(workspace)/collaborations/new/page.tsx`
- `src/app/admin/(workspace)/collaborations/page.tsx`
- `src/app/admin/(workspace)/consultations/[consultationId]/page.tsx`
- `src/app/admin/(workspace)/consultations/page.tsx`
- `src/app/admin/(workspace)/content/page.tsx`
- `src/app/admin/(workspace)/events/[eventId]/edit/page.tsx`
- `src/app/admin/(workspace)/events/[eventId]/page.tsx`
- `src/app/admin/(workspace)/events/new/page.tsx`
- `src/app/admin/(workspace)/events/page.tsx`
- `src/app/admin/(workspace)/invitations/page.tsx`
- `src/app/admin/(workspace)/media/page.tsx`
- `src/app/admin/(workspace)/members/[memberId]/page.tsx`
- `src/app/admin/(workspace)/members/page.tsx`
- `src/app/admin/(workspace)/membership-claims/page.tsx`
- `src/app/admin/(workspace)/notifications/page.tsx`
- `src/app/admin/(workspace)/page.tsx`
- `src/app/admin/(workspace)/payments/page.tsx`
- `src/app/admin/(workspace)/registrations/[registrationId]/page.tsx`
- `src/app/admin/(workspace)/registrations/page.tsx`
- `src/app/admin/(workspace)/reviews/page.tsx`
- `src/app/admin/(workspace)/roles/page.tsx`
- `src/app/admin/(workspace)/settings/page.tsx`
- `src/app/admin/(workspace)/startups/[startupId]/page.tsx`
- `src/app/admin/(workspace)/startups/page.tsx`
- `src/app/admin/(workspace)/startups/revisions/[revisionId]/page.tsx`
- `src/app/admin/(workspace)/startups/revisions/page.tsx`
- `src/components/admin/admin-shell.tsx`
- `src/components/admin/event-editor-form.tsx`
- `src/lib/admin/gate.ts`
- `src/proxy.ts`
- `tests/proxy-auth.test.ts`
- `supabase/migrations/20261021153925_optimize_auth_rls_initplans.sql`
- `supabase/migrations/20261021154034_remove_unused_notification_return_value.sql`
- `docs/audits/CSC_PHASE3_LOCAL_SECURITY_PERFORMANCE_2026-10-21.md`

The unrelated untracked member-profile prompt and Instagram poster assets remain untouched and are excluded from the proposed Phase 3 commit. No commit, push, PR, merge, deployment, production migration, paid resource or production-data change has occurred.
