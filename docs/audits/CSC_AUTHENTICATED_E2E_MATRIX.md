# CSC Circle Authenticated E2E Matrix — 2026-10-21

All tests ran against local Supabase with synthetic identities and a locally built Next.js production server, using a sanitized environment. No live email was sent. Final result: 41/41 browser tests passed after the final auth-boundary and Proxy updates; anonymous coverage is reused from the existing suite.

| Scenario | Identity | Result | Evidence / limitation |
|---|---|---|---|
| Admin dashboard login and role-specific desktop navigation | Each of seven synthetic admin roles | PASS | `e2e/admin-rbac.spec.ts`; checks visible/hidden links and page h1. |
| Restricted direct route | Check-In Staff | PASS | `/admin/payments` returns the service-level permission-denied message; no payment review data appears. Route title/shell remains viewable. |
| Member login and core routes | Synthetic active member | PASS | `/member/profile`, `/member/id-card`, `/member/startups`, `/member/reviews` show expected heading; `/admin` denies access. |
| Anonymous route protection | Anonymous browser | PASS | Existing smoke tests check redirects/protected API behavior. |
| Mobile viewport smoke | 320, 360, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920 px | PASS (login page only) | Existing viewport matrix does not cover each authenticated page at all widths. |
| OAuth callback missing-code safety | Anonymous browser | PASS | Verifies PKCE verifier cookie remains untouched. No external OAuth provider was exercised. |
| Startup upload/edit/approval, member profile save, ID download, events/payment, check-in camera, reviews, consultations, collaborations | Various | NOT TESTED | Requires workflow data, media fixtures, mail capture, and broader route-specific test setup. |
| Admin invitation issue/accept/revoke and account lifecycle | Admin/invitee | NOT TESTED | No SMTP-backed acceptance workflow E2E in this phase run. |

Synthetic identities are created by the local runner only, use random IDs/passwords, and are removed in cleanup. Local Auth cleanup removes only test-owned notification rows first because of the schema's restrictive recipient FK. A final local count verified zero leftover `csc-phase2-*` users after cleanup.

The final run emitted Next.js `Date.now()` diagnostics from Supabase Auth's cookie-session loading in Proxy during authenticated navigations (48 log instances; `/auth/success` no longer emitted one after the explicit request boundary). The affected admin/member pages are `ƒ` dynamic in the production build and responses are marked `private, no-store`; no build-time static auth content is produced. This is recorded as a framework instrumentation warning, not a passed warning-free check. The seven-role tests verify navigation and one prohibited direct route, not every page/API/RLS combination.
