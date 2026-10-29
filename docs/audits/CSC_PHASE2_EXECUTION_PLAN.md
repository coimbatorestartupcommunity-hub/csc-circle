# CSC Circle Phase 2 Execution Plan — 2026-10-21

## Safety boundary

This work is on branch `phase2/local-staging-e2e-security`, based on `main` at `e562a3402090234d7f4d3882e369db12279241d0`. The live Supabase project, production Auth configuration, production email transport, and Vercel production deployment were not changed. No production migration was applied. Local-only Supabase containers and synthetic `example.test` identities were used.

## Status

| Gate | Status | Evidence / next action |
|---|---|---|
| A — Inventory and baseline | PARTIAL | Existing Phase 1 reports reviewed; local baseline and current tree captured. Historical prod findings remain historical unless freshly measured. |
| B — Isolated staging | PASS (local only) | Fresh local Supabase stack applied 36 migrations; E2E target guard refuses cloud targets and production. No cloud staging was created, per the local-only instruction. |
| C — Synthetic identities | PASS (local) | Seven synthetic admin roles plus one active member provisioned; account cleanup verified after test run. |
| D — Authenticated E2E | PARTIAL | 41 local browser tests pass for role navigation, active-member core pages, route denial, anonymous smoke and login viewports. Startup, invitation, payment, media and other business workflows listed in the master prompt are not all exercised. |
| E — Security | PARTIAL | Local RLS smoke transaction passes; app security scan and dependency audit pass. Full 15+ RPC/policy-by-policy and Auth provider checks remain. |
| F — Database/Storage | PARTIAL | Fresh migrations, local schema lint, bucket settings and RLS metadata inspected. No real file upload lifecycle or production data access tested. |
| G — Notifications | BLOCKED | Real mail disabled; app notification worker not configured to local SMTP. Mailpit is local, but no worker delivery/idempotency/retry test was run. |
| H — Performance | PARTIAL | Existing loopback route timing baseline is recorded; no controlled before/after comparison, production-like staging, mobile-device or Core Web Vitals run. No performance improvement is claimed. |
| I — Recovery | BLOCKED | Local DB reset/replay was not treated as a backup-restore drill; production backup/PITR was not inspected. |
| J — Release candidate | PARTIAL | Code checks pass; no PR, push, cloud Preview validation, or production deployment was performed. |
| K — Production rollout | STOP | Requires separate owner approvals and safe cloud staging evidence. |

## Safe code changes

- Removed the production Supabase URL fallback from Playwright and require an explicit guarded local endpoint.
- Added a local-only runner that uses loopback Supabase credentials, strips/blocks inherited and dotenv secrets, disables outbound email, provisions synthetic identities and cleans them up.
- Replaced the Proxy's duplicated `getSession()` + `getClaims()` with verified `getClaims()` and added request-time boundaries before standalone/layout authentication reads. A Next/Supabase `Date.now()` instrumentation warning remains from Proxy session loading; authenticated pages are dynamic and no-store.
- Added seven-role navigation checks, member-core-route checks and a forbidden finance-route check.
- Made GitHub Actions browser smoke use an explicit loopback Supabase URL and non-secret placeholder.

## Remaining owner actions

1. If broader workflow coverage is later required, provision an isolated non-production test environment and approved synthetic identities, Auth provider setup, and a non-delivering transactional email sink.
2. Production migrations, production Auth changes, live email, and production deployment require separate explicit approvals.
