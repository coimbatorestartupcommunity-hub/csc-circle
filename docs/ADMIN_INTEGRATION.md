# CSC Circle — Admin (Phase 4) Integration Contracts

## Release follow-up — 19 October 2026

The current consolidated source is PR #6, including every commit from PRs #1–#5. Database baseline history has been reconciled; security, notification and platform-helper permission migrations are now applied to `mmsrtfktwcrbyrucjmzo`. Schema/data backups were restored and migrations rehearsed on isolated PostgreSQL 17 first. Live RLS smoke assertions passed with all synthetic rows rolled back. Separate-connection staging tests protected the final event seat and rejected duplicate simultaneous check-ins. Live security advisors now report no findings.

Current local validation: 95 automated tests, 13 Chromium smoke tests, TypeScript, ESLint and production build pass. CI-only missing-environment and homepage horizontal-motion issues were repaired. Gmail delivery, leases, retries, templates, protected dispatch and authorized retry UI are implemented; actual inbox receipt and live identity flows remain unverified. See `GMAIL_NOTIFICATIONS.md` for current notification scope and limits.

Repository owner type is `User`, not `Organization`; an earlier private-organization plan diagnosis was incorrect. The verified Vercel failure is the contributor author's deployment access. No paid upgrade has been performed. A legitimate owner-authenticated merge/release is the next controlled path. The earlier report below is historical evidence, superseded where this follow-up records newer results.

## Initial verified integration status — 19 October 2026

This section supersedes the deferred-service descriptions below. The release is **not activated in production**. All changes are reviewable in PR #5 on `feature/csc-password-auth`.

### Release evidence

- Latest complete source was `eafc168` on `feature/csc-complete-integration`, including Phases 2–4. It is an ancestor of the password-auth branch; no cherry-picking or history replacement was needed.
- Local clean install, TypeScript, ESLint, production build, 84 unit/API/isolated PostgreSQL tests and 11 Chromium smoke tests passed. PostgreSQL tests use a disposable PGlite database, not production member records. They do not prove multi-connection production concurrency.
- Production dependency audit: zero advisories. Full audit: five high development-tooling advisories through the Next ESLint glob dependency chain. Critical Vitest/Tinypool findings were removed by the supported Vitest upgrade. No forced audit downgrade was used.
- Secret-pattern scan covered local source and reachable Git history, with no matching secrets. This is a scoped scan, not proof that every credential has been rotated.
- GitHub account: `coimbatorestartupcommunity-hub`, repository permission ADMIN, private repository. Git author remains Vikash Saravanan (`vikashsaravanann`); no author impersonation or history rewriting was used.
- Vercel account: `coimbatorestartupcommunity-5110`; team `coimbatore-startup-community` (Hobby); project `prj_jshFiKM0EPujiCBdocQal0snPD52`; repository and production branch `main` confirmed.
- Latest CLI attempt `dpl_5qTJ2L1WBAsebKeCRiCQJBMAmPQp` was **BLOCKED before compilation** because the commit author lacks deployment permission. Preview URL existence is not deployment success.
- Actual production address `https://csc-circle-lake.vercel.app/` resolves to the older READY deployment `dpl_GJUJpXaZUVWxgHofM5vir1YB4XuD`, commit `d1ecd8c`, and serves **Create Next App**, not CSC Circle.
- Fresh Vercel and Supabase browser/CLI logins succeeded. Revocation of all previously exposed platform tokens is still owner-confirmed work; Render was not accessed.

### Implemented connections

| Feature | UI / handler | Canonical storage / authority | Verification and activation status |
| --- | --- | --- | --- |
| Password signup/login | `/signup`, `/login`, `/api/auth/[action]` | Supabase Auth, existing Auth UUID | Server validation and generic-error tests pass; live verification and identity-linking tests pending |
| Google OAuth | Google button, `/auth/callback`, `/auth/complete` | Supabase Auth PKCE | Provider enabled; real browser Google journey remains untested |
| Email verification | `/auth/confirm` | Supabase `verifyOtp` token hash | Invalid-token and recovery-handler tests pass; new templates intentionally not activated before deployment |
| Recovery/change password | `/forgot-password`, `/reset-password`, member settings | Supabase Auth, HMAC recovery marker, reauthentication code | API denial/update tests pass; real old/new-password and email journeys pending |
| Onboarding/profile/privacy | `/api/member/[action]` | Existing `profiles`, owner RLS | Full server validation, explicit affected-row confirmation, authenticated UUID |
| Membership claims | Member claim and admin queue/actions | `membership_claims`, `memberships`, audited transaction | Self-approval denied; issuance requires prior verification and verified Auth email |
| Digital membership card | Existing CSC card/export UI | Random membership token, active status and expiry | Predictable token removed; verifier checks current status; new migration pending |
| Member event registration | RSVP when authenticated, `/api/registrations` | `event_registrations`, `events`, `payments` | Idempotency and approval/payment/capacity rules tested in isolated PostgreSQL |
| Visitor RSVP | `/api/rsvp`, visitor queue in admin registrations | `rsvp_submissions` | Server-only validated RPC; published/open event required; not an official pass |
| Consultations | Public form and admin detail/action | `consultation_submissions` | Persisted queue and guarded transitions; new migration pending |
| Reviews/testimonials | Member review, admin moderation, public carousel | `reviews`, narrow public projection | Self-publication denied; real approved data only; no opinion editing in moderation RPC |
| Startup directory | `/member/startup`, admin startup actions | `directory_startups`, profile consent | Pending submissions and explicit publication approval; live consent revocation honored by RLS |
| Event editing | Existing editor, `/api/admin/events` | Existing `events`, structured settings | Permission-checked save/publish transaction and public cache invalidation; migration pending |
| QR attendance | Existing scanner, `/api/admin/check-in` | Random pass token, unique `attendance_checkins` | Forged/replayed/suspended/payment-ineligible checks tested; real multi-connection load test pending |
| Content | Admin structured editor, public announcement/introduction/mission/vision | `content_blocks` | Escaped text and permission-checked, audited save; migration pending |
| Media | Admin upload and image sanitizer | User-scoped private Storage + `media_assets` | MIME/content/size/pixel tests pass; bucket inspection, bucket policies and `CSC_PRIVATE_MEDIA_BUCKET` still required |
| Notifications | Durable inserts from successful database transactions | Existing `notifications` outbox | Queued transactionally; automated dispatcher, retry reconciliation and delivery monitoring remain incomplete |

### Email configuration actually performed

Gmail sender `coimbatorestartupcommunity@gmail.com` is configured in Supabase SMTP (`smtp.gmail.com`, TLS port 465, sender name CSC Circle). Read-back confirmed SMTP enabled and these non-secret fields. Email confirmation remained enabled. One SMTP test to the CSC sender mailbox was authenticated and accepted by Gmail; inbox receipt has not been independently checked.

Vercel Production and Preview now contain `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_FROM`, and sensitive `SMTP_PASSWORD`. No password was written into source or command-line arguments. `AUTH_RECOVERY_SECRET` is a separate server-only secret. Preview public Supabase configuration targets only `mmsrtfktwcrbyrucjmzo`.

The desired canonical URL, stronger password controls, secure password change and new token-hash templates are versioned in `supabase/auth-production.toml`; they remain unapplied until the new application can serve those callback routes. CAPTCHA credentials are not configured. Breached-password protection has not been verified or claimed.

### Security findings and repairs in the pending migration

| Finding | Impact | Repair | Evidence / remaining gate |
| --- | --- | --- | --- |
| Owner registration writes controlled approval/payment/attendance fields | Member could forge eligibility | Remove direct owner writes; authorized transaction RPCs | Isolated RLS regression passes |
| Review and directory owner policies allowed publication | Unmoderated material could become public | Constrain new states; explicit moderation; directory consent predicate | Isolated policy regressions pass |
| Broad any-admin policies ignored specific roles | Low-privilege staff could query unrelated data | Controlled private permission lookup and scoped policies | Role/revocation regressions pass |
| Scanner marked locally decoded QR valid | Client could indicate entry without a server decision | Final result only from authorized atomic check-in | Forged/replay tests pass; production migration not applied |
| Membership/pass references were predictable | Guessable verification references | Random 256-bit references plus current-state verification | Isolated checks pass |
| Auth recovery accepted any signed-in user | Normal session could enter reset screen | Verified recovery-only HMAC marker plus server validation | API regression passes |
| Anonymous RPC/direct inserts bypassed API validation | Queue/status tampering and unrestricted submissions | Server-only submission RPC grants, validation, deduplication | Anonymous execution denial tested |
| Public testimonials used definer view | Privileged public projection required review | Invoker view over fixed, narrow non-exposed function | Isolated migration passes; live advisors must run after approval |
| Mutable function search paths / publicly callable internal functions | Unnecessary privileged API surface | Fixed paths and revoked execution grants | Pending live advisor read-back |

### Pending activation gates

1. Vercel owner resolves commit-author deployment eligibility through supported team/account/plan rules. No paid upgrade, public visibility change, project duplication or ownership transfer was performed.
2. GitHub `verify` jobs were queued at the last inspection; Vercel commit check failed. PR is not merged and `main` is unchanged.
3. Review and approve `20261019153828_security_hardening.sql`, establish database recovery, run migration preflight, then apply and re-run live advisors/RLS checks. It has only been run in isolated PostgreSQL.
4. Provision exact approved administrator identities/roles and event staff assignments. No real admin was granted authority.
5. Activate reviewed Auth URL/password/template settings after deployment; verify actual signup, email delivery, confirmation, recovery, password replacement, Google linking and session behavior with approved test accounts.
6. Inspect and configure private Storage policies and media bucket; implement authorized signed previews/member portrait workflow and payment evidence handling as approved.
7. Finish notification delivery worker/retry reconciliation, approved recipient settings, consultation scheduling/assignment/notes, role-management UI, authorized exports, event cancellation lifecycle, and full multi-connection concurrency tests. Existing unavailable controls report no saved change.
8. Obtain/check the missing approved leadership/reference assets before claiming reference-matched visual verification.

### Architecture decision: no Render provisioning

Current interactive workloads are short validated requests and PostgreSQL transactions. A separate FastAPI CRUD/auth service would duplicate the existing identity and mutation boundaries. No measured traffic, long-duration job or persistent-worker requirement has established a need for Render. Keep Supabase Auth as the sole identity provider and PostgreSQL as the authoritative state. Notifications already have a durable outbox; decide its dispatcher after delivery/retry requirements are confirmed. Execution durations and traffic have not been measured, so no capacity or pricing estimate is asserted. No Render project, service, paid plan or second database was created. Render authentication is **not verified**.

---


How the Phase 4 admin UI connects to trusted backend services in Phase 1. The
dashboard ships **fail-closed**: in production, with no provisioned admin, every
`/admin/**` route renders the unavailable page and no admin data is exposed. The
dev preview (DEMO) is server-gated and never active in production.

## Shared models (one source of truth)

The public site, member portal and admin dashboard use the SAME models/status
unions: `src/types/member.ts` (membership, registration, consultation, review
statuses) and `src/types/admin.ts` (admin row shapes). No duplicate definitions.

## Access model

- Roles & permissions: `src/lib/admin/permissions.ts` (7 roles, 18 permissions).
- Server gate: `src/lib/admin/gate.ts` (`getAdminContext`) — reads the verified
  Supabase session, then the `admin_roles` rows for that user. Modes:
  `live` (provisioned admin) · `preview` (dev DEMO) · `forbidden` (signed-in
  non-admin) · `closed` (prod, no session).
- The frontend only SHOWS actions the permission contract allows; the backend
  MUST enforce every permission via RLS + privileged operations. A matching
  email or any client value is never authority.

## Tables (migrations applied: `supabase/migrations/`)

Core (0001/0002): `profiles`, `memberships`, `membership_claims`, `events`,
`event_registrations`, `consultations`, `reviews`, `directory_startups`,
`public_testimonials` view. RLS on all; member-number generator; signup trigger.

Admin (0003): `admin_roles`, `audit_logs`, `content_blocks`, `media_assets`,
`notifications`. RLS fails closed (admin-only reads via `is_admin()`); NO client
write policies — privileged writes run through service-role operations in Phase 1.

## Provisioning the first admin (Phase 1, DBA-only)

Insert a row into `admin_roles(user_id, role)` for a verified `auth.users.id`
(e.g. `super_admin`) through a restricted operation. Never derive admin access
from an email string or UI input.

## Workflow contracts

**A — Member application:** member submits claim (`membership_claims`) → admin
reviews (`members.approve`) → approve transitions membership
`claim_submitted → pending_verification → approved → active` and issues a unique
`member_number` (server) → member ID becomes valid. Audit each step.

**B — Event creation:** admin creates/edits (`events.create/update`) → save draft
→ publish (`events.publish`) transactional → `events.status='published'` → public
queries return it → Home/Events update via cache revalidation → audit who changed.

**C — Free registration:** user submits → server validates → capacity checked →
confirmed or pending → event pass issued ONLY when `status ∈ {confirmed, checked_in}`.

**D — Paid registration:** user registers → payment required → manual verification
(`payments.verify`) against securely-stored evidence → confirm → pass available.
A screenshot alone is never settlement; no gateway without approval.

**E — Attendance:** authorized staff scan (`attendance.scan`) → server verifies
staff permission + event match + eligibility + payment + revocation, prevents
duplicate check-ins, records attendance atomically → attendance dashboard updates.

**F — Consultation:** user submits → admin receives → assign → status updates →
member notified. Internal notes never appear in member views.

**G — Ratings:** member submits review (`reviews`, moderation=`submitted`) →
moderation queue (`reviews.moderate`) → approve → public carousel shows the
genuine review; aggregate computed from real records. Admins cannot edit opinions.

## Controls awaiting Phase 1

Server-side authorization/RLS enforcement for writes; privileged role
provisioning; atomic capacity + payment + check-in transactions (Postgres RPCs);
Supabase Storage for media (public/private buckets, type/size/dimension
validation); notification outbox delivery (email/WhatsApp + consent); CSV export
via authorized server access; rate limiting; audit immutability. The UI, typed
contracts, DEMO provider and fail-closed gate are complete now.
