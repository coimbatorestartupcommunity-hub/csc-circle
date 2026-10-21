# CSC Circle Backup & Recovery Runbook — 2026-10-21

## Phase 2 status: BLOCKED for backup restoration

No production backup metadata was accessed and no production restore was attempted. The local stack was initialized from migrations and used synthetic data; this validates schema replay, not backup/PITR recovery. No data-loss or recovery claims are made.

## Safe recovery rehearsal procedure

1. Obtain a separate staging Supabase project and document its region/ref.
2. Create a synthetic-only backup or staging snapshot and record its timestamp and checksum/metadata.
3. Restore to a second isolated staging project/branch, never over production.
4. Compare migration versions, row counts by synthetic fixture table, RLS, Storage object inventory and Auth settings.
5. Exercise member login, role access, directory media and notifications through non-delivering mail sink.
6. Document RTO/RPO measured values and teardown.

Owner actions: provide staging project permissions and approve cost. Any production backup policy change or restore remains separately approval-gated.
