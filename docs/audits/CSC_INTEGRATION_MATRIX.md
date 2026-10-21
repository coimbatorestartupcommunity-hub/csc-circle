# CSC Circle Frontend / API / Supabase Integration Matrix

Status is based on source/config inspection, automated checks and read-only production metadata. “Source + smoke PASS” does not mean a live authenticated business transaction was performed.

| Workflow / surface | UI/routes | API / persistence boundary | Audit result |
|---|---|---|---|
| Public marketing and legal | `/`, `/about`, `/privacy`, `/security`, `/terms` | Content modules and public render | Source present; public HTTP probes pass (login-first exceptions remain configured) |
| Authentication | `/login`, `/signup`, recovery/reset, `/auth/*` | Supabase Auth callbacks and `/api/auth/*` | Source + unauthenticated e2e; real Google/email account flow not tested |
| Member shell/profile/settings | `/member/*` | `/api/member/*`, Supabase profiles/memberships and profile preference RPCs | Source reviewed; redundant request reads deduped; authenticated transaction not tested |
| Membership claim and approval | `/member/claim`, `/admin/membership-claims` | `/api/member/[action]`, admin actions, claim tables/RPC | Source + unit coverage; live submit/approve not tested |
| Digital ID / export | `/member/id-card` | `/api/verify/member`, membership record, client PNG/PDF export | Automated tests exist; current turn did not test physical device download/scanner |
| Startups and revisions | `/member/startups*`, `/admin/startups*` | startup-assets, member action API, revision and review RPCs, Storage | Prior source/test coverage present; no live edit, Storage upload or approval performed |
| Founder directory | `/directory*` | directory photo/logo routes and published startup records | Public route responds; one anonymous production outlier (p95 4.236 s) needs trace |
| Shared member profiles | `/members*` | `/api/members*`, profile sharing/discovery RPCs | Unit/source checks; no authenticated sharing transaction performed |
| Events and notices | `/events*`, admin event/notices | `/api/admin/events`, event-notices, cover, announcements | Source and suite only; no live mutation or recipient delivery |
| Registration / RSVP / check-in | member event pages; `/admin/registrations`, `/admin/check-in`, `/admin/attendance` | `/api/registrations`, `/api/rsvp`, check-in/export APIs, SQL RPCs | Source and tests only; no real ticket scan or check-in write |
| Payments | `/admin/payments` | admin actions / payment tables | Not live-tested; no real payment action attempted |
| Consultations / reviews | `/member/consultations`, `/member/reviews`, admin equivalents | `/api/consultations`, admin actions, review/consultation tables | Source/test coverage only; no production transaction |
| Content/media/collaborations | admin pages and public collaboration routes | `/api/admin/content`, media, collaboration APIs and media route | Source/test coverage; upload/publication not exercised live |
| Admin RBAC and invitations | `/admin/*`, `/admin/invitations`, `/admin/roles`, acceptance page | getAdminContext, `admin_roles`, invitation RPC/API | Permission code and live function metadata inspected; all-seven-role authenticated e2e not run |
| Notification/outbox worker | `/admin/notifications`, internal cron route | Vercel cron + service-role-only claim/release RPCs, worker-state table | Configuration/source inspected; delivery queue not processed in audit |
| Supabase Storage | `member-portraits` bucket | Private bucket, app routes and signed/access-controlled delivery | Live metadata: bucket exists, private, 8 MB max, JPEG/PNG/WebP. Object-level fixture access not tested |
| Vercel production | canonical domain | existing `csc-circle` project | Production Ready deployment SHA matches source; no new deployment made |

## Database/migration state

The remote migration history matched all 35 previously committed local migrations through `20261020222000_accept_verified_published_startup_media`. One new local migration was prepared after this reconciliation; it is not applied remotely. See `CSC_MIGRATION_RECONCILIATION.md`.

## Route handler registry

There are 51 route-handler files under `src/app`, inventoried in `CSC_A_TO_Z_AUDIT.md`. A static check found admin handlers generally route through `getAdminContext`/permission services; the unauthenticated legacy `/api/admin/announcement` returns HTTP 410 by design. Invitation exchange and acceptance use short-lived HTTP-only token-hash cookies, rate limiting on exchange, origin validation on POST, current verified `getAuthUser`, and a transactional acceptance RPC. `/api/member/header` separately authenticates and scopes profile/membership/role reads to the current user's UUID; it is a shell endpoint, not an unauthenticated member-data API.

## Production transaction boundary

No member/admin data mutation, email send, Storage upload, or database schema change was executed against production. Integration paths requiring real authenticated test identities are marked untested above, not passed.
