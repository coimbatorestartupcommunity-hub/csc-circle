# CSC Circle Phase 2 Performance Baseline — 2026-10-21

## Result: PARTIAL — local diagnostic timings collected; not a before/after performance study

The only new performance-relevant browser run used a locally built Next.js 16.4.2 production server and synthetic users; the test suite records pass/fail, not navigation timing distributions. No controlled before/after comparison, network shaping, device/browser matrix, Core Web Vitals (LCP/INP/CLS), image waterfall, or production-like authenticated dataset was captured. Historical anonymous five-sample results in `CSC_PERFORMANCE_BASELINE.md` are stale context and are not used as a current baseline.

No database/index/RLS performance migration or application query optimization was made based on insufficient evidence. A localhost test cannot represent Vercel/Supabase region latency.

## Local authenticated navigation diagnostic — 2026-10-21

Measured against the local production build and local Supabase, with a synthetic active member, on loopback Chromium. Each route was loaded five times with `waitUntil: load`; p50/p95 are the sorted full `page.goto()` duration (with five samples, p95 is the maximum). These are a local smoke diagnostic, not a user-facing performance SLO or cloud/mobile benchmark.

| Route | Samples | p50 | p95 |
|---|---:|---:|---:|
| `/member` | 5 | 174 ms | 451 ms |
| `/member/profile` | 5 | 112 ms | 156 ms |
| `/member/id-card` | 5 | 122 ms | 145 ms |
| `/member/startups` | 5 | 111 ms | 322 ms |
| `/members` | 5 | 90 ms | 136 ms |

## Local authenticated navigation recheck — 2026-10-21

Repeated the same loopback Chromium/production-build smoke benchmark using a newly-created synthetic member and five full document navigations per route. This was a remeasurement of the existing branch, not a controlled code before/after experiment; run-to-run deltas below must not be interpreted as proven improvements or regressions.

| Route | Samples | p50 | p95 | Observed p50 delta vs first run |
|---|---|---:|---:|---:|
| `/member` | 138, 187, 120, 156, 85 ms | 138 ms | 187 ms | -36 ms (-20.7%) |
| `/member/profile` | 202, 124, 100, 82, 125 ms | 124 ms | 202 ms | +12 ms (+10.7%) |
| `/member/id-card` | 126, 82, 108, 88, 186 ms | 108 ms | 186 ms | -14 ms (-11.5%) |
| `/member/startups` | 180, 155, 90, 90, 86 ms | 90 ms | 180 ms | -21 ms (-18.9%) |
| `/members` | 92, 84, 85, 68, 120 ms | 85 ms | 120 ms | -5 ms (-5.6%) |

Both runs used only localhost and synthetic local Supabase identities. Five samples and an unthrottled local machine are insufficient to claim a performance win; p95 varies materially between runs. No source-level query, index, image or rendering optimization was justified by this benchmark alone.

Observed first-load transfer sizes were 10.7–17.4 KB for the sampled HTML document responses. No admin timing distribution, throttled network, LCP/INP/CLS, mobile device, image waterfall, before/after comparison, or production/staging navigation result is claimed. One initial diagnostic attempt used `127.0.0.1` while the app's configured canonical local origin was `localhost`, and the same-origin login guard correctly rejected it; rerunning on the configured `localhost` origin succeeded. This was a test-harness host mismatch, not an application defect.

## Required next benchmark

At zero cloud cost, a future local benchmark can collect at least 30 cold and 30 warm samples using synthetic data, plus Web Vitals and request counts in throttled desktop/mobile Chromium. Cloud-region latency, real storage and provider behavior remain NOT VERIFIED under the owner's local-only budget constraint.
