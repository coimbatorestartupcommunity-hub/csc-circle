# CSC Circle Staging Isolation Verification — 2026-10-21

## Result: PARTIAL — isolated local stack verified; cloud staging is intentionally out of scope

- Repository base SHA: `e562a3402090234d7f4d3882e369db12279241d0` (`main`).
- Working branch: `phase2/local-staging-e2e-security`.
- Production Supabase ref is explicitly blocked by the E2E guard. Tests also reject non-loopback cloud URLs until separately reviewed.
- Local Supabase API/DB/Mailpit endpoints are bound to loopback ports 54321/54322/54324. The local stack used this repo's `project_id = "csc-circle"` configuration and checked-in 36 migrations.
- `scripts/run-local-e2e.mjs` validates loopback API/DB/Mailpit endpoints, overrides the app URL/key with local values, strips inherited database/provider/platform secrets, shadows sensitive variable names from Next dotenv files, removes SMTP/mail settings, disables transactional email, and deletes synthetic identities after tests.
- `.env.local` contains a public Supabase URL/key and Vercel OIDC variable; the runner shadows those values with loopback/local credentials or empty values before Next build/runtime. Tests do not target the `.env.local` Supabase URL.
- Playwright refuses to reuse a server already listening on its port, preventing attachment to an app started with a different environment.
- Synthetic test accounts use `@example.test`; no production member data or photos were copied.
- Local Auth-generated messages are not delivered externally. The app's transactional mail path was intentionally left unconfigured; notification tests are not claimed.
- The local Supabase stack was stopped/restarted for local config only. No linked Supabase command or remote mutation was performed.
- Final local authenticated E2E run on 2026-10-21: 41/41 passed after a fresh local build. A second synthetic member was used for local route timing. Both fixture sets were removed. Auth SMTP delivery was not exercised; the runner disabled transactional email and supplied only loopback Mailpit configuration. The local CSC Supabase stack is stopped after verification.
- Owner direction is local Docker/Supabase only. No paid cloud staging branch/project was requested or created.
- Owner direction on 2026-10-21 is to continue with local Supabase and Docker only; no paid cloud branch is authorized for this phase.
- Vercel project inspection confirmed the existing `csc-circle` project belongs to the CSC Hobby team. The current Preview Supabase environment has not been changed and is not used for authenticated tests.

## NOT VERIFIED / constraints

The existing Vercel Preview environment was previously reported to use production Supabase. It was not changed or used for authenticated tests. Cloud-equivalent provider, external storage, email delivery and region-latency checks are NOT VERIFIED and remain intentionally unavailable under the zero-cost instruction. Production was not used as a substitute. No paid cloud resource was created, and no production data or deployment was changed.
