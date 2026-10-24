# CSC Circle CMS implementation and release audit

**Audit date:** 2026-10-24
**Repository:** `coimbatorestartupcommunity-hub/csc-circle`
**Branch:** `phase4/local-email-notifications-collaboration`
**Starting HEAD:** `8577bcfbce34aab937b17823f9e0e36c79dda37a`

## Executive summary

Resources and Opportunities were completed as record-driven public sections, and an Updates & Highlights CMS was added. Each section independently switches between an empty state and published content. Drafts remain private through published-only public queries and database policies. Resource PDFs use short-lived signed Storage upload/download URLs so files do not pass through Vercel Functions' request/response body limits.

Local source validation passed: TypeScript, ESLint, Vitest/PGlite, security scan, and the production build. Browser E2E did not run because the local Supabase/Docker stack could not start. The npm advisory service was unreachable, so a fresh dependency audit could not be completed.

**Production release is blocked pending explicit approval of two reviewed migrations and confirmation of recoverable database plus Storage backups.** Both migrations are local only. Production has none of the three CMS tables. No production SQL, GitHub push, or Vercel deployment was performed.

## Recovered repository state

- Local HEAD and the fetched GitHub branch both resolve to `8577bcfbce34aab937b17823f9e0e36c79dda37a`.
- The checkout already contained uncommitted CMS work. That work was preserved and extended.
- The unrelated local member-profile prompt and `public/posters/` assets remain untouched and are excluded from this implementation report/release scope.
- No open PR was returned for the development branch.

## Implemented changes

### Resources and Opportunities

- Public pages now query their own published data and render Coming Soon only for a successful query with zero eligible rows. A database/configuration failure produces a temporary-unavailable message instead of masquerading as an empty collection.
- Public detail pages, private administrator previews, edit/create routes, status actions, and database-backed administration lists are present.
- Resource and Opportunity publishing is guarded in the server action and PostgreSQL trigger. No second public-launch flag is used.
- Opportunities with past deadlines are excluded from application queries and the anonymous RLS policy.
- PDF upload uses an administrator-authorized short-lived signed upload token. Publish validation downloads the object server-side and checks the PDF signature. Public and private preview downloads are issued as short-lived signed Storage redirects after checking current record visibility.
- Images remain in the existing private bucket. Public delivery checks that the path is currently referenced by an eligible published record; administrator previews require `content.manage`.

### Updates & Highlights

- Added public `/updates` and `/updates/[slug]` routes, featured/latest listing, publication metadata, image galleries, credits/alt text, and a homepage preview that is absent when no real published content exists.
- Added administrator list, create, edit, private preview, image upload, publish, unpublish, and archive paths using the existing `content.manage` authorization.
- Update article content is rendered as text with paragraph breaks; the system does not render administrator-provided raw HTML.

### Admin integration and sitemap

- Added Updates to the existing permission-aware admin navigation and dashboard.
- Sitemap now includes Updates and only the published CMS detail routes returned by public queries.

## Public and administrator routes added or completed

| Section | Public routes | Administrator routes |
|---|---|---|
| Resources | `/resources`, `/resources/[slug]` | `/admin/resources`, `/admin/resources/new`, `/admin/resources/[id]`, `/admin/resources/[id]/edit`, `/admin/resources/[id]/preview` |
| Opportunities | `/opportunities`, `/opportunities/[slug]` | `/admin/opportunities`, `/admin/opportunities/new`, `/admin/opportunities/[id]`, `/admin/opportunities/[id]/edit`, `/admin/opportunities/[id]/preview` |
| Updates | `/updates`, `/updates/[slug]` | `/admin/updates`, `/admin/updates/new`, `/admin/updates/[id]`, `/admin/updates/[id]/edit`, `/admin/updates/[id]/preview` |

Related APIs include `/api/admin/resources`, `/api/admin/opportunities`, `/api/admin/updates`, `/api/admin/cms/upload`, `/api/admin/cms/upload-ticket`, `/api/admin/cms/media`, `/api/cms/image`, and `/api/resources/[slug]/download`.

## Database and Storage review

Remote migration history was checked. The most recent applied migration is `20261023140000`; the following are local-only:

1. `supabase/migrations/20261024120000_resources_opportunities_cms.sql`
   - Creates `resources` and `opportunities`, indexes and publication validation triggers.
   - Adds published-only public reads and `content.manage` administration policies/grants.
   - Updates the existing private `member-portraits` bucket MIME allowlist to include PDF while retaining its 8 MiB limit.
   - Enforces active (non-expired) Opportunities in RLS.
2. `supabase/migrations/20261024130000_community_updates_cms.sql`
   - Creates `community_updates`, publication constraints/trigger, indexes, published-only public reads, and `content.manage` administration policies/grants.

Read-only production checks confirmed:

- `resources`, `opportunities`, and `community_updates` do not currently exist.
- `member-portraits` is private, has an 8 MiB size limit, and currently allows JPEG, PNG, and WebP.
- No policies for the three CMS tables currently exist.

Local PGlite tests apply the complete migration chain and check draft isolation, authorized publishing, expired Opportunity visibility, independent section behavior, and unpublish behavior. Production backup readiness—including the contents of Storage objects—has **not** been verified. Applying migrations requires explicit approval and a confirmed recovery plan.

No launch switch exists in the new public query logic. No release-time SQL was applied.

## Verification results

| Check | Result | Evidence / limit |
|---|---|---|
| `npm run typecheck` | PASS | Next route type generation and `tsc --noEmit` completed. |
| `npm run lint` | PASS | ESLint completed without findings. |
| `npm test -- --reporter=dot` | PASS | 43 files passed, 1 skipped; 262 tests passed, 4 skipped. |
| `npm run security:scan` | PASS | 572 files scanned; no secret findings. |
| `npm run build` | PASS | Next.js 16.4.2 production build completed and emitted the CMS routes. |
| `npm run test:e2e` | BLOCKED | Requires explicit isolated Supabase URL/key; no production endpoint was used. |
| `npm run test:e2e:local` | BLOCKED | Local Supabase unavailable. `supabase start` failed with `DockerRemoveAllStopError`; no browser tests ran. |
| `npm audit` / `npm audit --omit=dev` | NOT VERIFIED | npm registry DNS (`ENOTFOUND registry.npmjs.org`) failed inside the sandbox and on the permitted retry. No dependency changes were made. |
| `git diff --check` | PASS | No whitespace errors in tracked diff. |
| Production CMS behavior | NOT TESTED | Required schema is absent in production and no production test content was created. |

Responsive visual and keyboard checks across the full requested viewport matrix were not completed; browser E2E was unavailable. Existing member, event, startup, collaboration, notification, and email workflows were not exhaustively re-exercised as end-to-end scenarios during this continuation.

## Hosting and GitHub

- Vercel project inspection resolved the intended `coimbatore-startup-community/csc-circle` project (`prj_jshFiKM0EPujiCBdocQal0snPD52`), Next.js framework, and Node.js 24.x.
- The latest deployment listed is READY for Production, deployment ID `dpl_6KMBofsmMDGs8Jgi3bGCMHefxEe8`, with alias `csc.logicintelligencetechnologies.in`. This is the existing deployment; it does not contain this local implementation.
- No new Vercel deployment was created or promoted.
- GitHub remote was fetched; local and remote development branch commit match at the starting HEAD. The reviewed implementation is committed locally as `006d920` but not pushed.
- The production-target migration gate was not passed, so the branch was not pushed. No force push or merge was performed.

## Changed implementation files

- `src/app/(marketing)/resources/page.tsx`
- `src/app/(marketing)/resources/[slug]/page.tsx`
- `src/app/(marketing)/opportunities/page.tsx`
- `src/app/(marketing)/opportunities/[slug]/page.tsx`
- `src/app/(marketing)/updates/page.tsx`
- `src/app/(marketing)/updates/[slug]/page.tsx`
- `src/app/(marketing)/page.tsx`
- `src/app/sitemap.ts`
- `src/app/admin/(workspace)/page.tsx`
- `src/app/admin/(workspace)/updates/**`
- `src/app/api/admin/cms/**`
- `src/app/api/admin/resources/**`
- `src/app/api/admin/opportunities/**`
- `src/app/api/admin/updates/**`
- `src/app/api/cms/image/route.ts`
- `src/app/api/resources/[slug]/download/route.ts`
- `src/components/admin/admin-shell.tsx`
- `src/components/admin/cms-preview.tsx`
- `src/components/admin/resource-editor.tsx`
- `src/components/admin/update-editor.tsx`
- `src/components/home/latest-updates.tsx`
- `src/lib/admin/cms.ts`
- `src/lib/services/cms-public.ts`
- `src/lib/validations/cms.ts`
- `src/types/cms.ts`
- `tests/database.test.ts`
- `tests/validations.test.ts`
- `supabase/migrations/20261024120000_resources_opportunities_cms.sql`
- `supabase/migrations/20261024130000_community_updates_cms.sql`

## Required release gates

1. Explicitly approve the exact two migration files listed above for production application.
2. Confirm a recoverable production database backup and Storage-object recovery procedure.
3. Apply the approved migrations and verify their resulting policies, grants, table/function state, and bucket configuration.
4. Re-run the release checks and isolated browser tests when local Supabase/Docker is available.
5. Confirm the deployment source and Git-trigger behavior. The active production deployment includes a phase4 branch alias, so pushing the current branch before migration approval could trigger a deployment with missing tables.
6. Push the reviewed commit, stage/verify the production-target Vercel build, promote it, then test the live domain.

**Current classification: BLOCKED — NOT DEPLOYED.** Local implementation and automated checks are complete for this change set; production migration authorization, backup verification, browser E2E, npm advisory scan, GitHub release synchronization, and live verification remain outstanding.
