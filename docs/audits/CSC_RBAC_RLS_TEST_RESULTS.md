# CSC Circle RBAC/RLS Test Results — 2026-10-21

## Results

- TypeScript permission source contains seven roles and eighteen permissions; role nav checks pass for all seven synthetic roles.
- Check-In Staff's server service guard denies `payments.verify`; direct GET displays a safe denied-data message and returns no payment rows. Admin route shell itself does not block by per-page permission, so route-level denial is not complete even though data service enforcement is effective.
- Ordinary active synthetic member cannot load `/admin` and can reach core member routes.
- `tests/supabase/rls-smoke.sql` ran against local Supabase in a single transaction and rolled back successfully: two synthetic ordinary identities were isolated, member self-activation and role escalation were rejected, notification worker access denied, and provisioned Super Admin permission/read assertions passed.
- Fresh local DB: 28/28 public tables have RLS enabled; 63 public policies; 15 tables have more than one permissive policy (requires per-policy semantic assessment; count is not proof of vulnerability).
- Local PostgreSQL catalog: 17 public SECURITY DEFINER functions, 15 executable by `authenticated`; all inspected entries used an explicit search_path (`search_path=""` on exposed RPCs; two internal functions had `search_path=public`); `anon` had no execute on these functions.
- Final unit suite passed: 214 tests across 40 files. The two additional tests exercise local E2E target and secret isolation guards.
- Advisor count reconciliation: 15 public tables contain multiple permissive policies when grouped only by table; Supabase Advisor reports 14 duplicate-permissive groups when grouped by exact role/action, spanning 14 relations. It also reports 24 auth-initplan performance findings across 13 relations. No RLS policy was changed based on these advisory counts.

## Not complete

This is not a complete 17-RPC and 63-policy manual review, and not all 7×18 permission combinations were exercised against live PostgreSQL. Nested admin detail/export endpoints, API mutation denial, multi-role union, revocation propagation, last-Super-Admin safety, invitation token replay, and each role's relevant SQL data-minimization behavior remain to be tested in a separate cloud staging environment. Do not infer that broad route-page access is denied: a non-permitted route may render a shell/header while its guarded service denies sensitive data.
