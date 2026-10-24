# CSC Circle — A–Z System Audit & CMS Release Readiness

**Date:** 2026-10-24 (Asia/Kolkata)
**Branch:** `phase4/local-email-notifications-collaboration`
**Audited commit:** `eb5ec83` (+ audit fix commit) · **Production tip before this release:** Vercel `dpl_2JStT…` (commit `ee53bba`), Supabase migration `20261023140000`
**Scope:** Full-platform audit plus readiness of the new data-driven CMS (Resources, Opportunities, Community Updates & Highlights). Local verification only; production migration + deploy are presented for approval, not applied in this document.

## A. Executive summary

The three CMS modules are implemented, committed, and internally consistent. Local gates pass: TypeScript, ESLint, 264 unit/integration tests (4 skipped), production build (144 routes), and secret scan (573 files, 0 findings). One real defect was found and fixed during this audit (see below). No existing feature or data is modified by the application code; the two new migrations are additive.

**Deployment readiness:** READY pending (1) explicit approval of the two additive migrations and (2) the production deploy — both gated behind the Claude Code "Production Deploy" classifier. The three historical held membership emails remain out of scope and must stay held.

### Defect found & fixed in this audit
- **`/updates` was missing from the proxy public allowlist** (`src/proxy.ts`). The Community Updates section is fully public, but unauthenticated requests to `/updates` and `/updates/[slug]` would have been redirected to `/login` in production (same class as the earlier `/help` issue). **Fixed:** added `"/updates"` to `isAuthPublic`; added `/updates` + `/updates/[slug]` to the `tests/proxy-auth.test.ts` public-route matrix (now 264 tests pass).

## B. Route inventory & verification matrix (representative)

Public marketing routes (proxy-allowlisted, data-driven where noted, in sitemap):

| Route | Access | Backend/DB dep | Behavior verified |
|---|---|---|---|
| `/`, `/about`, `/membership`, `/help`, `/contact`, `/community-guidelines`, `/privacy`, `/terms`, `/security` | public | content/site | Static/SSR, 200 (prod-verified earlier this session) |
| `/events`, `/directory`, `/collaborations`, `/members` | public | Supabase (published) | RLS published-only |
| `/resources`, `/resources/[slug]` | public | `resources` (RLS published) | 0 published ⇒ `ComingSoon`; else listing; detail `notFound()` if unpublished |
| `/opportunities`, `/opportunities/[slug]` | public | `opportunities` (RLS published, deadline≥today) | 0 active ⇒ `ComingSoon`; expired hidden at DB; detail `notFound()` |
| `/updates`, `/updates/[slug]` | public | `community_updates` (RLS published) | 0 published ⇒ empty card; else featured+grid; detail `notFound()` — **allowlist fixed** |

Admin workspace (`/admin/(workspace)/…`, gated by `requireAdminPagePermission("content.manage")` + layout admin gate): resources, opportunities, updates each expose `list / new / [id] / [id]/edit / [id]/preview`. Guests/non-admins are redirected by the proxy; non-content-managers get `AdminUnavailable forbidden`.

## C. API inventory (CMS)

All CMS write/upload routes enforce: origin check + `getAdminContext()` live + `can(ctx, "content.manage")` (+ rate limit on uploads). Verified by reading each route:

- `POST /api/admin/{resources,opportunities,updates}` (save), `POST /api/admin/{…}/[id]` (publish/unpublish/archive/delete) — content.manage gated; `revalidatePath` on mutation.
- `POST /api/admin/cms/upload` — server-side image sanitize (5:3 / square logo) → private bucket.
- `POST /api/admin/cms/upload-ticket` — PDF only, validates `application/pdf` + size, returns a `createSignedUploadUrl` for direct-to-storage upload (handles large PDFs above the 4.5 MB function body limit).
- `GET /api/admin/cms/media` — admin-only draft media preview.
- `GET /api/cms/image` — public image serving; **requires the path to belong to a published, publicly-eligible record** (resources cover, opportunities banner/logo honoring deadline, updates cover/gallery) before streaming from the private bucket; else 404.
- `GET /api/resources/[slug]/download` — public PDF download **only for published resources**; else 404; `Content-Disposition` attachment, `no-store`.

## D. Database / RLS / Storage / security

Two additive migrations (not yet applied to production):
- `20261024120000_resources_opportunities_cms.sql`: `resources` + `opportunities` tables; repurposes the existing **private** `member-portraits` bucket (public=false, 8 MiB, jpeg/png/webp/pdf); publication-guard triggers in `private` (enforce required fields/consent/attribution/valid document or URL before a row can become `published`); RLS: public read `published` only (opportunities also `deadline ≥ IST today`), admin-all via `private.has_permission('content.manage')`; **column-scoped** anon grants (audit/consent/private columns excluded).
- `20261024130000_community_updates_cms.sql`: `community_updates` table + guard trigger + same RLS pattern + grants + featured partial index.

RLS/isolation proven by PGlite tests (`tests/database.test.ts` → "resources & opportunities CMS"): anon sees only published rows across all three tables; `created_by` is not anon-readable; a role-less member cannot write; a content_manager can publish and unpublishing hides the row. No existing RLS/policy is altered. Service-role key is never shipped to the browser (public reads use the publishable key; writes use server routes). `get_advisors` to be re-run post-migration.

Storage security: drafts' images/PDFs are in a private bucket and are only served after a server-side published-check — no public bucket shortcut, no long-lived draft URLs.

## E. Functional audit (existing platform — unchanged)

Membership, digital cards, startups/directory, events + capacity/waitlist, collaborations (5:3 media), notifications inbox + header bell, admin RBAC (7 roles), invitations — all untouched by this release; their tests remain green within the 264-test suite. The 3 historical held emails remain held (to be re-confirmed read-only in Phase 3).

## F. Performance & responsive (honest)

Public CMS pages are dynamically rendered (via `await connection()` in the services) so published content appears without a redeploy; listings are bounded (`limit`), images are served `webp` through a cached public image route; detail pages lazy-load. No measured Lighthouse/CWV numbers are claimed here — to be sampled on the live deployment. Layouts reuse the existing responsive Tailwind system (single-column mobile → grid at `sm`/`lg`, `max-w-*` centering); the glassmorphism Coming Soon pages were verified live earlier this session.

## G. Test results (this audit)

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 264 passed, 4 skipped |
| `npm run build` | Passed; 144 routes |
| `npm run security:scan` | 573 files, 0 secret findings |

## H. Remaining blockers / limitations

1. **Production migration apply** (both files) — needs explicit approval (additive, backward-compatible; app code degrades to Coming Soon if tables are absent). **HARD GATE.**
2. **Production deploy** of the committed code — gated by the Production-Deploy classifier.
3. Production email **inbox delivery** remains not live-tested; **Vercel Hobby** commercial-use eligibility remains a user decision — neither blocks this content release.

Nothing in this release deletes/modifies production data, changes the domain, adds paid services, or releases held emails.
