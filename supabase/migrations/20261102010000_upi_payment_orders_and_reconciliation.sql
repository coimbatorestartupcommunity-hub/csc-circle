begin;

-- 1. Payment Orders table
create table if not exists public.event_payment_orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique check (order_reference ~ '^CSC-ORD-[0-9A-Z]{8,32}$'),
  event_id uuid not null references public.events(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  paid_registration_id uuid references public.paid_event_registrations(id) on delete set null,
  full_name text not null check(length(trim(full_name)) between 2 and 100),
  email text not null check(email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  whatsapp text not null,
  organization text not null,
  role public.paid_registration_role not null,
  attendee_count integer not null check(attendee_count between 1 and 10),
  additional_attendee_names text,
  referral_source public.paid_registration_referral,
  dietary_accessibility_notes text,
  amount_paise bigint not null check(amount_paise > 0),
  currency text not null default 'INR' check(currency = 'INR'),
  payee_vpa text not null default '9342877474@ptyes',
  payee_name text not null default 'S VIKASH',
  expected_account_suffix text not null default '1995',
  upi_uri text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'verified', 'reconciled', 'underpaid', 'unmatched', 'needs_review', 'expired', 'failed', 'cancelled')),
  claimed_utr text check (claimed_utr is null or length(trim(claimed_utr)) between 6 and 30),
  matched_evidence_id uuid,
  matched_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Bank Alert Payment Evidence table
create table if not exists public.event_payment_evidence (
  id uuid primary key default gen_random_uuid(),
  bank text not null default 'AXIS_BANK' check (bank in ('AXIS_BANK', 'OTHER')),
  direction text not null default 'CREDIT' check (direction in ('CREDIT', 'DEBIT')),
  currency text not null default 'INR' check (currency = 'INR'),
  amount_paise bigint not null check(amount_paise > 0),
  receiving_account_suffix text not null check(length(receiving_account_suffix) <= 10),
  utr text not null unique check(length(trim(utr)) >= 6),
  transaction_time timestamptz not null,
  transaction_info_raw text not null,
  payer_name text,
  sender_email text not null,
  message_id text not null unique,
  subject text not null,
  auth_status text not null default 'authenticated' check (auth_status in ('authenticated', 'needs_review', 'untrusted', 'forged')),
  auth_details jsonb not null default '{}'::jsonb,
  reconciliation_state text not null default 'unmatched' check (reconciliation_state in ('unmatched', 'matched', 'ambiguous', 'underpaid', 'ignored')),
  matched_order_id uuid references public.event_payment_orders(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Add foreign key constraint back to event_payment_evidence from event_payment_orders
alter table public.event_payment_orders
  add constraint event_payment_orders_matched_evidence_fkey
  foreign key (matched_evidence_id) references public.event_payment_evidence(id) on delete set null;

-- 3. Payment Reconciliation mapping table
create table if not exists public.event_payment_reconciliation (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.event_payment_orders(id) on delete restrict,
  evidence_id uuid not null references public.event_payment_evidence(id) on delete restrict,
  matched_by text not null default 'automated_worker' check (matched_by in ('automated_worker', 'admin_manual', 'user_utr_claim')),
  notes text,
  reconciled_at timestamptz not null default now()
);

-- 4. Payment events audit log
create table if not exists public.event_payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.event_payment_orders(id) on delete cascade,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 5. Payment worker sync state table
create table if not exists public.payment_worker_state (
  id text primary key default 'primary' check (id = 'primary'),
  lease_holder text,
  lease_expires_at timestamptz,
  last_sync_started_at timestamptz,
  last_sync_completed_at timestamptz,
  last_sync_message_count integer not null default 0,
  last_sync_matched_count integer not null default 0,
  last_sync_status text not null default 'idle' check (last_sync_status in ('idle', 'running', 'success', 'error')),
  last_error text,
  last_uid bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.payment_worker_state (id) values ('primary')
on conflict (id) do nothing;

-- Indexes
create index if not exists event_payment_orders_status_idx on public.event_payment_orders(status);
create index if not exists event_payment_orders_event_email_idx on public.event_payment_orders(event_id, lower(email));
create index if not exists event_payment_orders_claimed_utr_idx on public.event_payment_orders(claimed_utr) where claimed_utr is not null;
create index if not exists event_payment_orders_created_at_idx on public.event_payment_orders(created_at desc);

create index if not exists event_payment_evidence_utr_idx on public.event_payment_evidence(utr);
create index if not exists event_payment_evidence_amount_idx on public.event_payment_evidence(amount_paise, receiving_account_suffix);
create index if not exists event_payment_evidence_state_idx on public.event_payment_evidence(reconciliation_state);

create index if not exists event_payment_events_order_idx on public.event_payment_events(order_id, created_at desc);

-- RLS
alter table public.event_payment_orders enable row level security;
alter table public.event_payment_evidence enable row level security;
alter table public.event_payment_reconciliation enable row level security;
alter table public.event_payment_events enable row level security;
alter table public.payment_worker_state enable row level security;

-- Revoke & Grant
revoke all on public.event_payment_orders from anon, authenticated;
revoke all on public.event_payment_evidence from anon, authenticated;
revoke all on public.event_payment_reconciliation from anon, authenticated;
revoke all on public.event_payment_events from anon, authenticated;
revoke all on public.payment_worker_state from anon, authenticated;

grant select on public.event_payment_orders to authenticated;
grant select on public.event_payment_evidence to authenticated;
grant select on public.event_payment_reconciliation to authenticated;
grant select on public.event_payment_events to authenticated;
grant select on public.payment_worker_state to authenticated;

grant select, insert, update, delete on public.event_payment_orders to service_role;
grant select, insert, update, delete on public.event_payment_evidence to service_role;
grant select, insert, update, delete on public.event_payment_reconciliation to service_role;
grant select, insert, update, delete on public.event_payment_events to service_role;
grant select, insert, update, delete on public.payment_worker_state to service_role;

-- Policies
create policy payment_orders_admin_read on public.event_payment_orders
  for select to authenticated
  using (private.has_permission('payments.verify') or private.has_permission('registrations.read'));

create policy payment_orders_owner_read on public.event_payment_orders
  for select to authenticated
  using (auth.uid() = user_id);

create policy payment_evidence_admin_read on public.event_payment_evidence
  for select to authenticated
  using (private.has_permission('payments.verify'));

create policy payment_reconciliation_admin_read on public.event_payment_reconciliation
  for select to authenticated
  using (private.has_permission('payments.verify'));

create policy payment_events_admin_read on public.event_payment_events
  for select to authenticated
  using (private.has_permission('payments.verify'));

create policy payment_worker_admin_read on public.payment_worker_state
  for select to authenticated
  using (private.has_permission('payments.verify'));

-- Functions for worker locking
create or replace function public.csc_acquire_payment_worker_lease(p_lease_holder text, p_duration_seconds integer default 60)
returns boolean
language plpgsql security definer set search_path='' as $$
declare
  v_now timestamptz := now();
  v_acquired boolean := false;
begin
  update public.payment_worker_state
  set lease_holder = p_lease_holder,
      lease_expires_at = v_now + (p_duration_seconds || ' seconds')::interval,
      last_sync_started_at = v_now,
      last_sync_status = 'running',
      updated_at = v_now
  where id = 'primary'
    and (lease_expires_at is null or lease_expires_at < v_now or lease_holder = p_lease_holder);
  
  if found then
    v_acquired := true;
  end if;

  return v_acquired;
end $$;

create or replace function public.csc_release_payment_worker_lease(
  p_lease_holder text,
  p_status text default 'success',
  p_message_count integer default 0,
  p_matched_count integer default 0,
  p_last_uid bigint default null,
  p_error text default null
)
returns boolean
language plpgsql security definer set search_path='' as $$
declare
  v_now timestamptz := now();
begin
  update public.payment_worker_state
  set lease_holder = null,
      lease_expires_at = null,
      last_sync_completed_at = v_now,
      last_sync_status = case when p_status in ('success', 'error', 'idle') then p_status else 'idle' end,
      last_sync_message_count = p_message_count,
      last_sync_matched_count = p_matched_count,
      last_uid = coalesce(p_last_uid, last_uid),
      last_error = p_error,
      updated_at = v_now
  where id = 'primary'
    and (lease_holder = p_lease_holder or lease_expires_at < v_now);

  return found;
end $$;

revoke all on function public.csc_acquire_payment_worker_lease(text, integer) from public, anon;
grant execute on function public.csc_acquire_payment_worker_lease(text, integer) to service_role;

revoke all on function public.csc_release_payment_worker_lease(text, text, integer, integer, bigint, text) from public, anon;
grant execute on function public.csc_release_payment_worker_lease(text, text, integer, integer, bigint, text) to service_role;

commit;
