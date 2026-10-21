# CSC Circle Performance Baseline and Before/After

Date: 2026-10-21. These measurements are point-in-time diagnostics, not field Core Web Vitals.

## Production anonymous HTTP baseline

Method: Node `fetch` against the production canonical domain; 5 requests per route; redirects were not followed. Reported values are milliseconds from request start until response headers (TTFB-ish), with cold/warm requests mixed. Percentiles use nearest-rank quantile on five samples. This does **not** represent authenticated page rendering, browser LCP, SPA navigation, Supabase query latency, or field data. Protected paths mostly return a 307 to `/login`; timing their redirect is not proof that the underlying page is fast.

| Route | Status behavior | p50 ms | p75 ms | p95 ms |
|---|---|---:|---:|---:|
| `/` | 200 | 234 | 259 | 994 |
| `/login` | 200 | 227 | 300 | 331 |
| `/about` | 200 | 224 | 286 | 313 |
| `/events` | 200 | 217 | 221 | 225 |
| `/directory` | 200 | 216 | 236 | 4236 |
| `/members` | 307 to login | 211 | 216 | 286 |
| `/member` | 307 to login | 220 | 227 | 847 |
| `/member/profile` | 307 to login | 220 | 251 | 345 |
| `/member/id-card` | 307 to login | 192 | 209 | 215 |
| `/admin` | 307 to login | 224 | 237 | 239 |

`/directory` has a slow outlier at 4.236 s and warrants repeat sampling with Vercel request logs and an authenticated browser trace before attribution. Five samples are too few for a reliable production p95.

## Local change and expected impact

The redundant server-render access path was established from source. Before: member layout calls `getMemberContext`, profile loading calls it again, and admin context separately validates identity and membership: up to 3 `auth.getUser()` and 3 `memberships` reads within one render. After the change: React `cache` deduplicates verified identity, member context, admin context and membership-access reads in a single Server Component request; the same path should issue 1 auth lookup and 1 membership lookup, plus the separate admin-role lookup. New requests resolve authorization again. No cross-request cache or profile-data cache was added.

| Measure | Before | After | Evidence |
|---|---:|---:|---|
| Identity reads in member-layout composition | up to 3/request render | 1/request render | Call graph + request-scoped cached functions |
| Membership reads in member-layout composition | up to 3/request render | 1/request render | Call graph + shared cached membership function |
| Protected route HTTP latency | See baseline | Not compared | No production deployment or authenticated user was used |
| Browser LCP/INP/CLS | Not captured | Not captured | No field RUM or authenticated lab device profile available |

## Validation performance

- `npm run build`: baseline 16.88 s wall time; post-change measurement recorded in release verification.
- Unit suite: baseline 39 files / 208 tests, 7.35 s Vitest duration.
- Playwright: baseline 32/32, 7.8 s.
- These durations vary by host load and are not user-perceived route timings.

## Instrumentation needed for a full before/after

Use a designated test account and the preview deployment to capture cold/warm route traces at representative desktop broadband and throttled mobile 4G, including LCP/CLS, console/network failures, and role-specific data access. Production logs and real user PII were intentionally not used. The production deploy is approval-gated.
