# CSC Circle Release Verification

## Release identity

- Base `main` SHA: `75ef2414bf8d52e98dc789a80cc1d2671fadd22d`
- Reviewed PR: [#48](https://github.com/coimbatorestartupcommunity-hub/csc-circle/pull/48)
- Merged `main` SHA: `7765db1588f7261e369cccc7fd737191ed07727b`
- Preview deployment: `dpl_3iCj4PS1XdVNpC6ZHXM4FhGy7gqQ`, Ready, built from candidate SHA `c04e25e78dcbfddad06700134842d13d364ba773`
- Production deployment: `dpl_BKkcFwJW3xxaJEUG3evTKwPosZgg`, Ready, built from merge SHA `7765db1588f7261e369cccc7fd737191ed07727b`
- Production host: `https://csc.logicintelligencetechnologies.in`
- Applied production migration: `20261021114330_restrict_notification_worker_state_access`

## Baseline checks before change

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test -- --reporter=dot` | PASS — 39 files, 208 tests |
| `npm run security:scan` | PASS — 473 files, 0 heuristic secret findings |
| `npm run build` | PASS — 16.88 s measured wall time |
| `npm run test:e2e` | PASS — 32/32 unauthenticated smoke tests, 7.8 s |
| `npm audit --omit=dev` | PASS — 0 reported production dependency vulnerabilities |

## Checks after code change

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test -- --reporter=dot` | PASS — 39 files, 208 tests |
| `npm run security:scan` | PASS — 481 files, 0 heuristic secret findings |
| `npm audit --omit=dev` | PASS — 0 reported production dependency vulnerabilities |
| `npm run build` | PASS — 19.00 s measured wall time; 112 static pages generated |
| `npm run test:e2e` | PASS — 32/32 unauthenticated smoke tests, 6.8 s |
| GitHub Actions `verify` | PASS — typecheck, lint, unit tests, security scan, dependency audit, production build, Playwright |
| Preview deploy | PASS — Vercel Ready; protected request accessed with linked CLI |
| Supabase migration | PASS — production applied and role grants verified |

The single local build comparison (16.88 s baseline vs 19.00 s after) is noisy and not evidence of a user-facing regression or improvement. The unit suite emits existing jsdom canvas, test DOM-prop, Base UI semantics, and deliberate missing-image diagnostic messages; no test failed.

## Production smoke verification

The production deployment is Ready, aliases the official custom domain, and was built from the merged SHA. Authenticated Vercel CLI requests returned:

- `/login`: 200, rendered by the CSC deployment.
- `/`: 307 to `/login?next=%2F`.
- `/directory`: 307 to `/login?next=%2Fdirectory`.

These redirects match the pre-release production behavior and are the application's sign-in flow, not Vercel deployment protection. This was an anonymous smoke test only; no account was used and no production business data was mutated.

## Scope and remaining verification

The release reduces repeated auth/member-context lookups within a single React server render and removes client-role privileges from the internal notification worker state table. It does not establish complete authenticated business-flow coverage. Preview environment variables include production Supabase configuration; therefore no authenticated writes, invitation emails, payment operations, or real notifications were exercised. Supabase Preview CI was skipped because an isolated preview database was not connected.

Outstanding security/performance work is recorded in `CSC_SECURITY_FINDINGS.md` and `CSC_PERFORMANCE_BASELINE.md`: leaked-password protection is disabled in Supabase Auth; CSP and Permissions-Policy are absent on the production host; RLS advisor findings need policy-by-policy review; and no authenticated LCP/interaction benchmark or isolated-preview business E2E run was performed. These findings were not changed speculatively in this release.
