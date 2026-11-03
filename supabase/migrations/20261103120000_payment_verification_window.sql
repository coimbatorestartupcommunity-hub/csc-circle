begin;

-- Server-recorded start of the attendee five-minute UTR verification window.
-- Set exactly once by POST /api/payments/orders/[orderId]/start-verification
-- (guarded by `where verification_started_at is null`) and never overwritten.
-- This is distinct from expires_at, which governs overall order expiry, and
-- from bank reconciliation timeouts owned by the reconcile worker.
alter table public.event_payment_orders
  add column if not exists verification_started_at timestamptz;

comment on column public.event_payment_orders.verification_started_at is
  'Server-recorded start of the attendee five-minute UTR verification window. Set once via the start-verification endpoint; never overwritten. Distinct from expires_at (order expiry).';

commit;
