begin;

-- 0. Alter existing tables to support authenticated bank-alert payments and guest orders
alter table public.event_registrations
  alter column user_id drop not null;

alter table public.paid_event_registrations
  alter column payment_screenshot_path drop not null;

alter table public.paid_event_registrations
  drop constraint if exists paid_reg_proof_path;

alter table public.paid_event_registrations
  add column if not exists payment_evidence_type text
  check (payment_evidence_type in ('manual_screenshot', 'authenticated_bank_alert', 'bank_transaction_feed', 'admin_verified_external_evidence'))
  default 'manual_screenshot';

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
  guest_token_hash text,
  consent_contact boolean not null default true,
  consent_payment_terms boolean not null default true,
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

-- Add payment_evidence_id and conditional constraint to paid_event_registrations
alter table public.paid_event_registrations
  add column if not exists payment_evidence_id uuid references public.event_payment_evidence(id) on delete set null;

alter table public.paid_event_registrations
  add constraint paid_reg_proof_path check (
    (payment_evidence_type = 'manual_screenshot' and payment_screenshot_path ~ '^payment-proofs/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$')
    or (payment_evidence_type != 'manual_screenshot')
  );

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
  mailbox_name text not null default 'INBOX',
  uid_validity bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.payment_worker_state (id) values ('primary')
on conflict (id) do nothing;

-- Indexes
create index if not exists event_payment_orders_status_idx on public.event_payment_orders(status);
create index if not exists event_payment_orders_event_email_idx on public.event_payment_orders(event_id, lower(email));
create index if not exists event_payment_orders_claimed_utr_idx on public.event_payment_orders(claimed_utr) where claimed_utr is not null;
create index if not exists event_payment_orders_guest_token_hash_idx on public.event_payment_orders(guest_token_hash) where guest_token_hash is not null;
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
  p_error text default null,
  p_uid_validity bigint default null,
  p_mailbox_name text default null
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
      uid_validity = coalesce(p_uid_validity, uid_validity),
      mailbox_name = coalesce(p_mailbox_name, mailbox_name),
      updated_at = v_now
  where id = 'primary'
    and (lease_holder = p_lease_holder or lease_expires_at < v_now);

  return found;
end $$;

revoke all on function public.csc_acquire_payment_worker_lease(text, integer) from public, anon;
grant execute on function public.csc_acquire_payment_worker_lease(text, integer) to service_role;

revoke all on function public.csc_release_payment_worker_lease(text, text, integer, integer, bigint, text, bigint, text) from public, anon;
grant execute on function public.csc_release_payment_worker_lease(text, text, integer, integer, bigint, text, bigint, text) to service_role;

-- 6. Atomic Fulfillment RPC function
create or replace function public.csc_fulfill_confirmed_payment(
  p_order_id uuid,
  p_evidence_id uuid,
  p_matched_by text default 'automated_worker',
  p_notes text default null,
  p_user_id uuid default null
)
returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_order record;
  v_evidence record;
  v_user_id uuid;
  v_paid_reg_id uuid;
  v_first_pass_id uuid;
  v_reg_ref text;
  v_pass_ref text;
  v_pass_token text;
  v_extra_name text;
  v_idx integer;
begin
  -- 1. Lock and validate order
  select * into v_order
  from public.event_payment_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found: %', p_order_id;
  end if;

  if v_order.status in ('reconciled', 'verified') then
    return jsonb_build_object(
      'ok', true,
      'already_fulfilled', true,
      'order_id', v_order.id,
      'paid_registration_id', v_order.paid_registration_id
    );
  end if;

  if v_order.status not in ('pending', 'processing') then
    raise exception 'Order % is in invalid status for fulfillment: %', p_order_id, v_order.status;
  end if;

  -- 2. Lock and validate evidence
  select * into v_evidence
  from public.event_payment_evidence
  where id = p_evidence_id
  for update;

  if not found then
    raise exception 'Evidence not found: %', p_evidence_id;
  end if;

  if v_evidence.direction != 'CREDIT' then
    raise exception 'Evidence % direction is not CREDIT: %', p_evidence_id, v_evidence.direction;
  end if;

  if v_evidence.amount_paise != v_order.amount_paise then
    raise exception 'Evidence amount % paise does not match order amount % paise', v_evidence.amount_paise, v_order.amount_paise;
  end if;

  if v_evidence.currency != v_order.currency then
    raise exception 'Evidence currency % does not match order currency %', v_evidence.currency, v_order.currency;
  end if;

  if v_evidence.reconciliation_state = 'matched' and v_evidence.matched_order_id is not null and v_evidence.matched_order_id != v_order.id then
    raise exception 'Evidence % is already matched to another order: %', p_evidence_id, v_evidence.matched_order_id;
  end if;

  v_user_id := coalesce(p_user_id, v_order.user_id);
  v_paid_reg_id := coalesce(v_order.paid_registration_id, gen_random_uuid());
  v_reg_ref := 'CSC-EVT-' || upper(replace(gen_random_uuid()::text, '-', ''));

  -- 3. Upsert paid_event_registrations
  insert into public.paid_event_registrations (
    id,
    event_id,
    user_id,
    reference,
    status,
    full_name,
    email,
    whatsapp,
    organization,
    role,
    attendee_count,
    additional_attendee_names,
    referral_source,
    dietary_accessibility_notes,
    total_amount_paid,
    upi_transaction_ref,
    payment_evidence_type,
    payment_evidence_id,
    payment_screenshot_path,
    consent_contact,
    consent_payment_terms,
    reviewed_at,
    review_note
  ) values (
    v_paid_reg_id,
    v_order.event_id,
    v_user_id,
    v_reg_ref,
    'confirmed',
    v_order.full_name,
    lower(v_order.email),
    v_order.whatsapp,
    v_order.organization,
    v_order.role,
    v_order.attendee_count,
    v_order.additional_attendee_names,
    v_order.referral_source,
    v_order.dietary_accessibility_notes,
    round(v_order.amount_paise::numeric / 100.0, 2),
    v_evidence.utr,
    'authenticated_bank_alert',
    v_evidence.id,
    null,
    coalesce(v_order.consent_contact, true),
    coalesce(v_order.consent_payment_terms, true),
    clock_timestamp(),
    coalesce(p_notes, 'Automated Axis Bank reconciliation: UTR ' || v_evidence.utr)
  )
  on conflict (id) do update set
    status = 'confirmed',
    user_id = coalesce(excluded.user_id, paid_event_registrations.user_id),
    payment_evidence_type = 'authenticated_bank_alert',
    payment_evidence_id = v_evidence.id,
    upi_transaction_ref = v_evidence.utr,
    reviewed_at = clock_timestamp(),
    review_note = coalesce(p_notes, paid_event_registrations.review_note);

  -- 4. Check or create event passes in event_registrations
  select id into v_first_pass_id
  from public.event_registrations
  where paid_registration_id = v_paid_reg_id
  order by created_at asc
  limit 1;

  if v_first_pass_id is null then
    -- Primary pass
    v_pass_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    v_pass_ref := 'CSC-EVT-' || upper(replace(gen_random_uuid()::text, '-', ''));

    insert into public.event_registrations (
      event_id,
      user_id,
      attendee_name,
      reference,
      pass_token,
      status,
      payment,
      paid_registration_id,
      source,
      source_email
    ) values (
      v_order.event_id,
      v_user_id,
      v_order.full_name,
      v_pass_ref,
      v_pass_token,
      'confirmed',
      'paid',
      v_paid_reg_id,
      'platform',
      lower(v_order.email)
    ) returning id into v_first_pass_id;

    -- Additional passes if attendee_count > 1
    if v_order.attendee_count > 1 and v_order.additional_attendee_names is not null and trim(v_order.additional_attendee_names) != '' then
      v_idx := 1;
      for v_extra_name in
        select trim(elem) from regexp_split_to_table(v_order.additional_attendee_names, E'[\r\n;]+') as elem where trim(elem) != ''
      loop
        v_idx := v_idx + 1;
        exit when v_idx > v_order.attendee_count;
        v_pass_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
        v_pass_ref := 'CSC-EVT-' || upper(replace(gen_random_uuid()::text, '-', ''));

        insert into public.event_registrations (
          event_id,
          user_id,
          attendee_name,
          reference,
          pass_token,
          status,
          payment,
          paid_registration_id,
          source,
          source_email
        ) values (
          v_order.event_id,
          v_user_id,
          v_extra_name,
          v_pass_ref,
          v_pass_token,
          'confirmed',
          'paid',
          v_paid_reg_id,
          'platform',
          lower(v_order.email)
        );
      end loop;
    end if;
  end if;

  -- 5. Link primary pass to paid_event_registrations
  update public.paid_event_registrations
  set member_registration_id = v_first_pass_id
  where id = v_paid_reg_id;

  -- 6. Update order status
  update public.event_payment_orders
  set status = 'reconciled',
      matched_evidence_id = v_evidence.id,
      matched_at = clock_timestamp(),
      paid_registration_id = v_paid_reg_id,
      user_id = coalesce(v_user_id, user_id),
      updated_at = clock_timestamp()
  where id = v_order.id;

  -- 7. Update evidence state
  update public.event_payment_evidence
  set reconciliation_state = 'matched',
      matched_order_id = v_order.id
  where id = v_evidence.id;

  -- 8. Record payment reconciliation mapping
  insert into public.event_payment_reconciliation (
    order_id,
    evidence_id,
    matched_by,
    notes,
    reconciled_at
  ) values (
    v_order.id,
    v_evidence.id,
    p_matched_by,
    p_notes,
    clock_timestamp()
  );

  -- 9. Record audit event
  insert into public.event_payment_events (
    order_id,
    event_type,
    details
  ) values (
    v_order.id,
    'payment_reconciled',
    jsonb_build_object(
      'evidence_id', v_evidence.id,
      'utr', v_evidence.utr,
      'matched_by', p_matched_by,
      'amount_paise', v_evidence.amount_paise,
      'paid_registration_id', v_paid_reg_id,
      'primary_pass_id', v_first_pass_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'evidence_id', v_evidence.id,
    'paid_registration_id', v_paid_reg_id,
    'primary_pass_id', v_first_pass_id
  );
end $$;

revoke all on function public.csc_fulfill_confirmed_payment(uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.csc_fulfill_confirmed_payment(uuid, uuid, text, text, uuid) to service_role;

commit;
