# CSC Circle Security Hardening — 2026-10-21

## Local results

- E2E safety guard blocks the known CSC production project ref, all unverified cloud projects, non-loopback endpoints, URL credentials/query tokens, and authenticated runs without the local Mailpit endpoint.
- Test runner does not use `.env.local` values as a backend target; it forces local Supabase values, strips inherited database/provider/platform/email secrets, shadows sensitive dotenv variables, and refuses to reuse an already-running web server.
- `npm run security:scan`: PASS, 501 files scanned, 0 heuristic secret findings.
- `npm audit --omit=dev`: PASS, 0 production dependency vulnerabilities.
- Local RLS smoke transaction: PASS; synthetic identities removed; see `CSC_RBAC_RLS_TEST_RESULTS.md`.
- Fresh local catalog check: all 28 public tables have RLS enabled; zero public SECURITY DEFINER functions are executable by `anon`; 15 are executable by `authenticated`; all 17 expose an explicit `search_path`. No production credentials or data were used by E2E.
- Local Supabase advisors reported 24 `auth_rls_initplan` findings across 13 relations and 14 `multiple_permissive_policies` groups across 14 relations. Direct catalog counting finds 15 tables with multiple permissive policies under the broader any-role/any-action definition. The one-count difference is the grouping method, not contradictory database state. These are performance advisories; policy semantics and workload impact need review before changes.
- The fresh Next build passes. The authenticated runtime still logs Next's `Date.now()` diagnostic from the Supabase Auth request-time Proxy path; all affected pages are dynamic and `private, no-store`. The Proxy follows `getClaims()` verification and request-scoped rendering is preserved. See release readiness for details.
- HTTP response header review and CSP/Permissions-Policy report-only instrumentation were not performed in Phase 2. Historical Phase 1 absence finding is not freshly verified here.
- Leaked-password protection in hosted Auth was not read or changed. Production Auth setting remains untouched; staging setting requires an isolated project and owner approval.

## Next security work

Review staged response headers with authenticated and public pages, gather CSP violation reports, check QR scanner permissions before enforcement, and perform a policy-by-policy review of all current functions, API routes, storage policies, exports and RLS. Any production Auth or CSP enforcement change requires a separate approval.
