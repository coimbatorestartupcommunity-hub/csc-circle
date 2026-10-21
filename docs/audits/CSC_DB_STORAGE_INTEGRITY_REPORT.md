# CSC Circle Database & Storage Integrity Report — 2026-10-21

## Local database

- A fresh local Supabase PostgreSQL 17 instance applied all 36 checked-in migrations successfully. No production migration or database was touched.
- `supabase db lint --local --fail-on error` found no errors; two existing warning-level findings remain: unused `notification_id` in `private.record_operation` and unused `p_event_label` in `public.submit_rsvp`.
- 28 public tables, all with RLS enabled; 63 public policies. A direct `pg_policies` count finds 15 public tables with more than one permissive policy of any operation/role combination. The Supabase Performance Advisor reports 14 exact same-role/same-action policy groups across 14 relations. These counts use different grouping criteria and are consistent; neither alone indicates an authorization bypass. Policy semantics still need manual review.
- Performance Advisor separately reports 24 `auth_rls_initplan` findings across 13 relations. These are per-policy performance recommendations, not policy-count or security-defect counts.
- Local `member-portraits` bucket is private, 8 MiB maximum, and allows JPEG, PNG and WebP. No startup/profile image objects were uploaded or copied.
- No table data from production was imported. The RLS smoke transaction inserted synthetic IDs and rolled back.
- Local migration ledger contains the 36 migrations in source. This is not a fresh remote/prod ledger comparison.

## Remaining integrity work

Storage owner/path/content-type checks, missing media detection, upload/replacement, signed URL expiry, profile/startup consent and approved-vs-pending media publication need dedicated authenticated staging data. Production Storage objects, Auth settings, and migration state were not queried or altered in this phase.
