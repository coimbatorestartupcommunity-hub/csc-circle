# CSC Circle Security Findings

Audit date: 2026-10-21. Database findings are read-only metadata from Supabase project `mmsrtfktwcrbyrucjmzo`; no security configuration was changed.

## Findings

### SEC-01 — Internal notification worker table has excessive client grants (P2, prepared)

Live catalog inspection found `public.notification_worker_state` has RLS enabled with zero policies, but both `anon` and `authenticated` retain table-level `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` grants. Row-level policies block normal API row reads/writes, but RLS does not govern `TRUNCATE`; these grants violate least privilege for an internal worker lease table. The two public worker RPCs that reference it, `csc_claim_notifications` and `csc_release_notification_dispatch`, are `SECURITY INVOKER` and executable only by `service_role` (not `anon`/`authenticated`).

Prepared additive migration: `supabase/migrations/20261021140000_restrict_notification_worker_state_access.sql`. It revokes all table grants from `PUBLIC`, `anon`, and `authenticated` and retains `SELECT, UPDATE` for `service_role`. It has not been applied to production; owner approval is required. This is the only concrete live privilege-boundary defect found in the targeted database catalog review.

### SEC-02 — Leaked-password protection disabled (P2, owner configuration)

Supabase Security Advisor reports Auth compromised-password checks disabled. Enable via Supabase Auth project settings after owner approval and verify sign-in/signup behavior. This is a hosted Auth configuration change; no SQL migration can safely enable it.

Reference: [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### SEC-03 — Authenticated-executable SECURITY DEFINER functions (P2, reviewed/watch)

Security Advisor lists 15 functions in the exposed `public` schema as callable by `authenticated`. A live catalog query found, for each, `anon_exec=false` and `search_path=""`. Functions include invitation acceptance, check-in event lookup, role revocation, collaboration saves, profile discovery/sharing, resume retrieval, and startup revision actions. Reviewed metadata showed identity checks in each user-facing function and `has_permission` checks for admin operations; invitation acceptance additionally checks verified email and takes a row lock. These functions are intentionally user/API-facing and were not disabled. Maintain function-specific positive/negative authorization tests, especially where helper authorization is indirect.

Reference: [Supabase database linter 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

### SEC-04 — RLS-enabled relations with no policies (informational, verify grants)

Security Advisor lists four RLS-enabled relations without policies:

| Relation | Client grants | Assessment |
|---|---|---|
| `private.member_resumes` | None to `anon`/`authenticated` | Private schema, no API-role table grants |
| `public.admin_role_invitations` | None to `anon`/`authenticated` | Access through authorized server/service operations only |
| `public.directory_startup_private_details` | None to `anon`/`authenticated` | Access through approved RPC/server boundary |
| `public.notification_worker_state` | Excessive client grants | See SEC-01 |

The first three have no direct API-role grants and no row policies by design. The notification worker table needs the prepared grant revocation.

### SEC-05 — Database performance/security posture warnings (P2, approval-gated)

The Performance Advisor reports 24 RLS policies with per-row auth initplan evaluation and 14 tables with multiple permissive policies. These are optimization/review signals, not proof of a bypass. No policy edits were made because broad changes can alter access semantics; table-by-table policy comparison and negative tests are required before a production migration.

Reference: [Supabase RLS performance guidance](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).

### SEC-06 — Production response headers (follow-up)

Live HTTPS response inspection confirmed HSTS (`max-age=63072000`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Frame-Options: DENY`. `Content-Security-Policy` and `Permissions-Policy` were not present on the sampled response. Do not add a restrictive CSP blindly: first inventory required Next.js inline/runtime scripts, Supabase Auth redirects, image hosts, and font sources, then validate a report-only policy in preview before enforcement.

## Checks completed

- Public tables inspected: RLS enabled on all inspected public tables.
- No-policy relations: grants checked directly in PostgreSQL metadata.
- Security-definer functions: execution grants, `proconfig`, identity/permission markers checked; none of the 15 is executable by `anon`.
- `npm run security:scan`: passed, 473 scanned files, zero heuristic secret findings.
- `npm audit --omit=dev`: zero reported production dependency vulnerabilities at audit time (95 production dependencies).
- No Supabase service key or SMTP secret was printed or added to a client bundle by this audit.

## Limits

This is not a penetration test or legal compliance certification. No live unauthenticated/authenticated adversarial requests were sent to production data. Storage object policies, all role-specific RLS read/write combinations, CSP compatibility, recovery drills, compromised account scenarios and rate limits across every endpoint require dedicated staging identities and further testing.
