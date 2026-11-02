-- ============================================================================
-- Migration: 20261102020000_settlement_security_hardening.sql
-- Milestone M2: Database Settlement Security Hardening, Attribution Enforcement,
-- Partial Active Order Index, Guest Email Verification & Rate Limiting
-- ============================================================================

begin;

-- ============================================================================
-- 1. Evidence Table Ingestion Security: Default auth_status to 'needs_review'
-- ============================================================================
alter table public.event_payment_evidence
  alter column auth_status set default 'needs_review';

-- Verify check constraint presence idempotently
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.event_payment_evidence'::regclass
      and contype = 'c'
      and conname = 'event_payment_evidence_auth_status_check'
  ) then
    alter table public.event_payment_evidence
      add constraint event_payment_evidence_auth_status_check
      check (auth_status in ('authenticated', 'needs_review', 'untrusted', 'forged'));
  end if;
end $$;

-- ============================================================================
-- 2. Concurrency Hardening: Partial Unique Index on Active Orders
-- ============================================================================
drop index if exists public.idx_active_orders_per_email;
create unique index idx_active_orders_per_email
  on public.event_payment_orders(event_id, lower(email))
  where status in ('pending', 'processing', 'verified', 'needs_review', 'unmatched', 'underpaid');

create unique index if not exists event_payment_orders_guest_token_hash_unique
  on public.event_payment_orders(guest_token_hash)
  where guest_token_hash is not null;
create unique index if not exists event_payment_orders_claimed_utr_unique
  on public.event_payment_orders(lower(trim(claimed_utr)))
  where claimed_utr is not null;

create unique index if not exists event_payment_reconciliation_order_unique
  on public.event_payment_reconciliation(order_id);
create unique index if not exists event_payment_reconciliation_evidence_unique
  on public.event_payment_reconciliation(evidence_id);
create unique index if not exists event_payment_orders_matched_evidence_unique
  on public.event_payment_orders(matched_evidence_id)
  where matched_evidence_id is not null;
create unique index if not exists event_payment_evidence_matched_order_unique
  on public.event_payment_evidence(matched_order_id)
  where matched_order_id is not null;

-- ============================================================================
-- 3. Guest Email Ownership Verification Table (R3 Support)
-- ============================================================================
create table if not exists public.guest_email_verifications (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  code_hash text not null,
  token_hash text,
  event_id uuid references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  verified_at timestamptz,
  consumed_at timestamptz,
  attempts integer not null default 0 check (attempts between 0 and 10),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_guest_email_verifications_email
  on public.guest_email_verifications(lower(email), created_at desc);

create unique index if not exists idx_guest_email_verifications_token_hash
  on public.guest_email_verifications(token_hash)
  where token_hash is not null;

create unique index if not exists idx_guest_email_verifications_code_hash
  on public.guest_email_verifications(code_hash);

create index if not exists idx_guest_email_verifications_event
  on public.guest_email_verifications(event_id);

alter table public.guest_email_verifications enable row level security;
revoke all on public.guest_email_verifications from anon, authenticated;
grant select, insert, update, delete on public.guest_email_verifications to service_role;

-- A customer-supplied UTR is only a claim. Settlement authorization is an
-- independent, immutable order/evidence attribution decision.
create table if not exists public.event_payment_attributions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.event_payment_orders(id) on delete restrict,
  evidence_id uuid not null unique references public.event_payment_evidence(id) on delete restrict,
  attribution_method text not null check (attribution_method in ('bank_order_reference', 'admin_bank_record_review')),
  bank_order_reference text,
  verification_source text not null,
  policy_version text not null,
  verified_by uuid references auth.users(id) on delete restrict,
  verified_at timestamptz not null default now(),
  supporting_evidence jsonb not null default '{}'::jsonb,
  eligible_for_settlement boolean not null default false,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (attribution_method = 'bank_order_reference' and bank_order_reference is not null)
    or attribution_method = 'admin_bank_record_review'
  )
);

alter table public.event_payment_attributions enable row level security;
revoke all on public.event_payment_attributions from public, anon, authenticated;
grant select, insert, update, delete on public.event_payment_attributions to service_role;
grant select on public.event_payment_attributions to authenticated;

create policy payment_attributions_admin_read on public.event_payment_attributions
  for select to authenticated
  using (private.has_permission('payments.verify'));

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'guest_email_verifications'
      and policyname = 'guest_email_verifications_admin_read'
  ) then
    create policy guest_email_verifications_admin_read on public.guest_email_verifications
      for select to authenticated
      using (private.has_permission('registrations.read') or private.has_permission('payments.verify'));
  end if;
end $$;

-- ============================================================================
-- 4. Distributed Rate Limiting Table & Atomic RPC (R3 Support)
-- ============================================================================
create table if not exists public.distributed_rate_limits (
  key text primary key check (length(trim(key)) > 0),
  count integer not null default 1 check (count >= 0),
  window_start timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_distributed_rate_limits_expires_at
  on public.distributed_rate_limits(expires_at);

alter table public.distributed_rate_limits enable row level security;
revoke all on public.distributed_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.distributed_rate_limits to service_role;

-- Durable per-message IMAP processing ledger. The mailbox cursor advances only
-- after every fetched UID has a terminal result in this table.
create table if not exists public.payment_worker_messages (
  id uuid primary key default gen_random_uuid(),
  mailbox_name text not null,
  uid_validity bigint not null check (uid_validity >= 0),
  imap_uid bigint not null check (imap_uid > 0),
  message_id text,
  status text not null default 'received'
    check (status in ('received', 'parsing', 'processed', 'skipped', 'duplicate', 'failed')),
  retry_count integer not null default 0 check (retry_count >= 0),
  evidence_id uuid references public.event_payment_evidence(id) on delete restrict,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (mailbox_name, uid_validity, imap_uid)
);

create index if not exists payment_worker_messages_failed_idx
  on public.payment_worker_messages(updated_at)
  where status = 'failed';

alter table public.payment_worker_messages enable row level security;
revoke all on public.payment_worker_messages from public, anon, authenticated;
grant select, insert, update, delete on public.payment_worker_messages to service_role;
grant select on public.payment_worker_messages to authenticated;

create policy payment_worker_messages_admin_read on public.payment_worker_messages
  for select to authenticated
  using (private.has_permission('payments.verify'));

-- 4-parameter variant: (p_scope, p_key, p_limit, p_window_seconds)
create or replace function public.csc_check_rate_limit(
  p_scope text,
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_composite_key text;
  v_now timestamptz := clock_timestamp();
  v_window_seconds integer := greatest(1, p_window_seconds);
  v_window_interval interval := (v_window_seconds || ' seconds')::interval;
  v_row record;
  v_allowed boolean;
  v_remaining integer;
  v_reset_at timestamptz;
  v_retry_after integer := 0;
begin
  if p_key is null or trim(p_key) = '' then
    raise exception 'Rate limit key cannot be null or empty';
  end if;

  if p_limit <= 0 then
    raise exception 'Rate limit must be greater than zero';
  end if;

  v_composite_key := case
    when p_scope is not null and trim(p_scope) <> '' then trim(p_scope) || ':' || trim(p_key)
    else trim(p_key)
  end;

  -- One atomic upsert covers both the first request and concurrent requests.
  insert into public.distributed_rate_limits as limits (key, count, window_start, expires_at)
  values (v_composite_key, 1, v_now, v_now + v_window_interval)
  on conflict (key) do update
  set count = case
        when limits.expires_at <= v_now then 1
        else least(limits.count + 1, p_limit + 1)
      end,
      window_start = case when limits.expires_at <= v_now then v_now else limits.window_start end,
      expires_at = case when limits.expires_at <= v_now then v_now + v_window_interval else limits.expires_at end
  returning * into v_row;

  v_reset_at := v_row.expires_at;
  v_allowed := v_row.count <= p_limit;
  v_remaining := greatest(0, p_limit - v_row.count);
  if not v_allowed then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_reset_at - v_now))))::integer;
  end if;
  return jsonb_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'reset_at', v_reset_at,
    'retry_after', v_retry_after
  );
end $func$;

-- 3-parameter overload: (p_key, p_limit, p_window_seconds)
create or replace function public.csc_check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $func$
begin
  return public.csc_check_rate_limit('default', p_key, p_limit, p_window_seconds);
end $func$;

revoke all on function public.csc_check_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.csc_check_rate_limit(text, text, integer, integer) to service_role;

revoke all on function public.csc_check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.csc_check_rate_limit(text, integer, integer) to service_role;

-- ============================================================================
-- 5. Atomic Fulfillment RPC: Attribution Hardening, Lock Ordering, Group Passes
-- ============================================================================
create or replace function public.csc_fulfill_confirmed_payment(
  p_order_id uuid,
  p_evidence_id uuid,
  p_matched_by text default 'automated_worker',
  p_notes text default null,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_order record;
  v_event record;
  v_evidence record;
  v_attribution record;
  v_user_id uuid;
  v_paid_reg_id uuid;
  v_first_pass_id uuid;
  v_reg_ref text;
  v_pass_ref text;
  v_pass_token text;
  v_extra_name text;
  v_confirmed_seats integer;
  v_existing_pass_count integer;
  v_passes_created integer := 0;
  v_attendee_item jsonb;
  v_has_memo_match boolean;
begin
  -- =========================================================================
  -- 1. TOTAL LOCK ORDERING STEP 1: Lock and validate payment order
  -- =========================================================================
  select * into v_order
  from public.event_payment_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found: %', p_order_id;
  end if;

  -- 1.1 Strict Idempotency: Return existing settlement state without duplicate side-effects
  if v_order.status = 'reconciled' then
    select id into v_first_pass_id
    from public.event_registrations
    where paid_registration_id = v_order.paid_registration_id
    order by created_at asc
    limit 1;

    select count(*)::integer into v_existing_pass_count
    from public.event_registrations
    where paid_registration_id = v_order.paid_registration_id;

    if v_order.paid_registration_id is null
       or v_order.matched_evidence_id is distinct from p_evidence_id
       or v_first_pass_id is null
       or v_existing_pass_count <> v_order.attendee_count then
      raise exception 'Reconciled order % has inconsistent fulfillment state', p_order_id;
    end if;

    return jsonb_build_object(
      'ok', true,
      'already_fulfilled', true,
      'order_id', v_order.id,
      'paid_registration_id', v_order.paid_registration_id,
      'primary_pass_id', v_first_pass_id,
      'attendee_count', v_order.attendee_count
    );
  end if;

  if v_order.status not in ('pending', 'processing') then
    raise exception 'Order % is in invalid status for fulfillment: %', p_order_id, v_order.status;
  end if;

  -- 1.2 Enforce Affirmative Terms Consent Invariant (no fallback to true)
  if not coalesce(v_order.consent_payment_terms, false) then
    raise exception 'Order % lacks required affirmative payment terms consent', p_order_id;
  end if;

  -- =========================================================================
  -- 2. TOTAL LOCK ORDERING STEP 2: Lock event and validate capacity
  -- =========================================================================
  select * into v_event
  from public.events
  where id = v_order.event_id
  for update;

  if not found then
    raise exception 'Event not found: %', v_order.event_id;
  end if;

  if v_event.status != 'published' then
    raise exception 'Event % is not published (status: %)', v_event.id, v_event.status;
  end if;

  if p_matched_by <> 'admin_manual' and (
    v_event.registration_state <> 'open'
    or v_event.starts_at <= now()
    or (v_event.registration_deadline is not null and v_event.registration_deadline <= now())
  ) then
    raise exception 'Event % is no longer eligible for automatic fulfillment', v_event.id;
  end if;

  if v_event.capacity is not null then
    select coalesce(count(*), 0) into v_confirmed_seats
    from public.event_registrations
    where event_id = v_order.event_id and status in ('confirmed', 'checked_in');

    if (v_confirmed_seats + v_order.attendee_count) > v_event.capacity then
      raise exception 'Event % capacity exceeded: confirmed % + requested % > capacity %',
        v_event.id, v_confirmed_seats, v_order.attendee_count, v_event.capacity;
    end if;
  end if;

  -- =========================================================================
  -- 3. TOTAL LOCK ORDERING STEP 3: Lock and validate payment evidence
  -- =========================================================================
  select * into v_evidence
  from public.event_payment_evidence
  where id = p_evidence_id
  for update;

  if not found then
    raise exception 'Evidence not found: %', p_evidence_id;
  end if;

  -- 3.1 Double-Spend Prevention & Evidence Idempotency
  if (v_evidence.matched_order_id is not null and v_evidence.matched_order_id <> v_order.id)
     or (v_evidence.reconciliation_state = 'matched' and v_evidence.matched_order_id is not null and v_evidence.matched_order_id <> v_order.id) then
    raise exception 'Evidence % is already matched to another order: %', p_evidence_id, v_evidence.matched_order_id;
  end if;

  -- 3.2 Direction & Currency Checks
  if v_evidence.direction <> 'CREDIT' then
    raise exception 'Evidence % direction is not CREDIT: %', p_evidence_id, v_evidence.direction;
  end if;

  if v_evidence.currency <> v_order.currency then
    raise exception 'Evidence currency % does not match order currency %', v_evidence.currency, v_order.currency;
  end if;

  -- 3.3 Receiving Account Suffix & Amount Match
  if v_evidence.receiving_account_suffix <> v_order.expected_account_suffix then
    raise exception 'Evidence account suffix % does not match expected suffix %',
      v_evidence.receiving_account_suffix, v_order.expected_account_suffix;
  end if;

  if v_evidence.amount_paise <> v_order.amount_paise then
    raise exception 'Evidence amount % paise does not match order amount % paise', v_evidence.amount_paise, v_order.amount_paise;
  end if;

  -- 3.4 Order Expiry Verification (strictly matches /has expired/)
  if p_matched_by <> 'admin_manual'
     and v_order.expires_at is not null
     and coalesce(v_evidence.transaction_time, clock_timestamp()) > (v_order.expires_at + interval '10 minutes') then
    raise exception 'Order % has expired: payment evidence transaction occurred after order expiry and requires manual review', p_order_id;
  end if;

  -- 3.5 Reject Untrusted / Forged Authentication States Across All Pathways
  if v_evidence.auth_status in ('untrusted', 'forged') then
    raise exception 'Evidence % failed authentication with untrusted status: %', p_evidence_id, v_evidence.auth_status;
  end if;

  -- Optional attribution lookup: lock attribution record if one was pre-created
  select * into v_attribution
  from public.event_payment_attributions
  where order_id = v_order.id
    and evidence_id = v_evidence.id
  for update;

  -- =========================================================================
  -- 4. VALIDATED ATTRIBUTION ENFORCEMENT BY SETTLEMENT PATHWAY
  -- =========================================================================
  if p_matched_by = 'automated_worker' then
    -- Automated worker settlement requires authenticated evidence
    if v_evidence.auth_status <> 'authenticated' then
      raise exception 'Evidence % failed authentication (status: %)', p_evidence_id, v_evidence.auth_status;
    end if;

    -- Automated worker settlement requires verifiable order reference on word boundaries in bank note
    if not (v_evidence.transaction_info_raw ~* (
      '(^|[^A-Z0-9-])' || v_order.order_reference || '([^A-Z0-9-]|$)'
    )) then
      raise exception 'Automated worker settlement requires verifiable order reference % in transaction note', v_order.order_reference;
    end if;

    -- If an attribution record was pre-created, verify it is eligible and unconsumed
    if v_attribution.id is not null then
      if not coalesce(v_attribution.eligible_for_settlement, false) or v_attribution.consumed_at is not null then
        raise exception 'Settlement requires an eligible, unconsumed verified attribution';
      end if;
    end if;

  elsif p_matched_by = 'user_utr_claim' then
    -- User UTR claim requires authenticated evidence
    if v_evidence.auth_status <> 'authenticated' then
      raise exception 'User UTR claim settlement requires authenticated evidence (status: %)', v_evidence.auth_status;
    end if;

    -- Order must have claimed UTR
    if v_order.claimed_utr is null or trim(v_order.claimed_utr) = '' then
      raise exception 'User UTR claim settlement requires claimed UTR on order %', p_order_id;
    end if;

    -- Claimed UTR must match evidence UTR exactly
    if lower(trim(v_order.claimed_utr)) <> lower(trim(v_evidence.utr)) then
      raise exception 'User UTR claim settlement requires verified matching claimed UTR (claimed: %, evidence: %)',
        v_order.claimed_utr, v_evidence.utr;
    end if;

    -- Check if memo contains order reference on word boundaries
    v_has_memo_match := (v_evidence.transaction_info_raw ~* (
      '(^|[^A-Z0-9-])' || v_order.order_reference || '([^A-Z0-9-]|$)'
    ));

    -- If memo lacks order reference, an eligible unconsumed attribution is mandatory
    if not v_has_memo_match then
      if v_attribution.id is null
         or not coalesce(v_attribution.eligible_for_settlement, false)
         or v_attribution.consumed_at is not null then
        raise exception 'Settlement requires an eligible, unconsumed verified attribution';
      end if;

      if v_attribution.attribution_method not in ('bank_order_reference', 'admin_bank_record_review') then
        raise exception 'User UTR claim settlement requires a verified attribution decision';
      end if;
    end if;

  elsif p_matched_by = 'admin_manual' then
    if not (
      current_user in ('postgres', 'service_role', 'supabase_admin')
      or private.has_permission('payments.verify')
      or private.has_permission('registrations.approve')
      or (p_user_id is not null and exists (
        select 1 from public.admin_roles a
        where a.user_id = p_user_id
          and (
            a.role = 'super_admin'
            or a.role = 'finance_reviewer'
            or a.role = 'event_manager'
          )
      ))
    ) then
      raise exception 'Admin manual settlement requires an authorized administrator';
    end if;

    if p_notes is null or length(trim(p_notes)) < 5 then
      raise exception 'Manual settlement requires audit notes of at least 5 characters';
    end if;

  else
    raise exception 'Invalid matched_by settlement method: %', p_matched_by;
  end if;

  -- =========================================================================
  -- 5. UPSERT PAID_EVENT_REGISTRATIONS
  -- =========================================================================
  v_user_id := v_order.user_id;
  v_paid_reg_id := coalesce(v_order.paid_registration_id, gen_random_uuid());
  v_reg_ref := 'CSC-EVT-' || upper(replace(gen_random_uuid()::text, '-', ''));

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
    reviewed_by,
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
    case when p_matched_by = 'admin_manual'
      then 'admin_verified_external_evidence'
      else 'authenticated_bank_alert'
    end,
    v_evidence.id,
    null,
    coalesce(v_order.consent_contact, false),
    v_order.consent_payment_terms,
    clock_timestamp(),
    case when p_matched_by = 'admin_manual' then p_user_id else null end,
    coalesce(p_notes, 'Automated Axis Bank reconciliation: UTR ' || v_evidence.utr)
  )
  on conflict (id) do update set
    status = 'confirmed',
    user_id = coalesce(excluded.user_id, paid_event_registrations.user_id),
    payment_evidence_type = excluded.payment_evidence_type,
    payment_evidence_id = v_evidence.id,
    upi_transaction_ref = v_evidence.utr,
    reviewed_at = clock_timestamp(),
    reviewed_by = coalesce(excluded.reviewed_by, paid_event_registrations.reviewed_by),
    review_note = coalesce(p_notes, paid_event_registrations.review_note);

  -- =========================================================================
  -- 6. EXACT ATTENDEE GROUP PASS GENERATION
  -- =========================================================================
  select count(*)::integer into v_existing_pass_count
  from public.event_registrations
  where paid_registration_id = v_paid_reg_id;

  if v_existing_pass_count = 0 then
    -- 6.1 Primary Attendee Pass
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
      btrim(v_order.full_name, E' \t\r\n'),
      v_pass_ref,
      v_pass_token,
      'confirmed',
      'paid',
      v_paid_reg_id,
      'platform',
      lower(v_order.email)
    ) returning id into v_first_pass_id;

    v_passes_created := 1;

    -- 6.2 Additional Attendee Passes (if attendee_count > 1)
    if v_order.attendee_count > 1 then
      -- Priority A: Inspect attendees JSONB array if present on the order
      if to_jsonb(v_order) ? 'attendees' and jsonb_typeof(to_jsonb(v_order)->'attendees') = 'array' then
        for v_attendee_item in select * from jsonb_array_elements(to_jsonb(v_order)->'attendees') loop
          exit when v_passes_created >= v_order.attendee_count;
          v_extra_name := case
            when jsonb_typeof(v_attendee_item) = 'string' then btrim(trim(both '"' from v_attendee_item::text), E' \t\r\n')
            when jsonb_typeof(v_attendee_item) = 'object' then btrim(coalesce(v_attendee_item->>'name', v_attendee_item->>'full_name', ''), E' \t\r\n')
            else ''
          end;
          if v_extra_name <> '' and lower(v_extra_name) <> lower(btrim(v_order.full_name, E' \t\r\n')) then
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
            v_passes_created := v_passes_created + 1;
          end if;
        end loop;
      end if;

      -- Priority B: Parse additional_attendee_names text if more passes needed
      if v_passes_created < v_order.attendee_count
         and v_order.additional_attendee_names is not null
         and btrim(v_order.additional_attendee_names, E' \t\r\n') <> '' then
        for v_extra_name in
          select btrim(elem, E' \t\r\n')
          from regexp_split_to_table(v_order.additional_attendee_names, E'[\r\n;]+') as elem
          where btrim(elem, E' \t\r\n') <> ''
        loop
          exit when v_passes_created >= v_order.attendee_count;
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
          v_passes_created := v_passes_created + 1;
        end loop;
      end if;
    end if;

    -- Strict Invariant: All attendee identities must be provided (no synthetic placeholder names)
    if v_passes_created <> v_order.attendee_count then
      raise exception 'Pass generation invariant violation: order % expected % attendees but only % verified names were provided',
        p_order_id, v_order.attendee_count, v_passes_created;
    end if;
  else
    select id into v_first_pass_id
    from public.event_registrations
    where paid_registration_id = v_paid_reg_id
    order by created_at asc
    limit 1;
  end if;

  select count(*)::integer into v_existing_pass_count
  from public.event_registrations
  where paid_registration_id = v_paid_reg_id;

  if v_existing_pass_count <> v_order.attendee_count then
    raise exception 'Pass generation invariant violation: order % expected % passes but has %',
      p_order_id, v_order.attendee_count, v_existing_pass_count;
  end if;

  if exists (
    select lower(btrim(attendee_name, E' \t\r\n'))
    from public.event_registrations
    where paid_registration_id = v_paid_reg_id
    group by lower(btrim(attendee_name, E' \t\r\n'))
    having count(*) > 1
  ) then
    raise exception 'Pass generation invariant violation: duplicate attendee identities';
  end if;

  -- =========================================================================
  -- 7. STATE TRANSITIONS & AUDIT LOGGING
  -- =========================================================================
  -- 7.1 Link primary pass to paid_event_registrations
  update public.paid_event_registrations
  set member_registration_id = v_first_pass_id
  where id = v_paid_reg_id;

  -- 7.2 Update order status to reconciled
  update public.event_payment_orders
  set status = 'reconciled',
      matched_evidence_id = v_evidence.id,
      matched_at = clock_timestamp(),
      paid_registration_id = v_paid_reg_id,
      user_id = coalesce(v_user_id, user_id),
      updated_at = clock_timestamp()
  where id = v_order.id;

  -- 7.3 Update evidence state to matched
  update public.event_payment_evidence
  set reconciliation_state = 'matched',
      matched_order_id = v_order.id
  where id = v_evidence.id;

  -- 7.4 Record payment reconciliation mapping
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
  )
  on conflict (order_id) do update set
    evidence_id = excluded.evidence_id,
    matched_by = excluded.matched_by,
    notes = excluded.notes,
    reconciled_at = excluded.reconciled_at;

  -- 7.5 Record audit event
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
      'primary_pass_id', v_first_pass_id,
      'attendee_count', v_order.attendee_count
    )
  );

  -- 7.6 Record and consume attribution
  if v_attribution.id is not null then
    update public.event_payment_attributions
    set consumed_at = clock_timestamp(),
        verified_by = coalesce(verified_by, case when p_matched_by = 'admin_manual' then p_user_id else null end)
    where id = v_attribution.id and consumed_at is null;
  else
    insert into public.event_payment_attributions (
      order_id,
      evidence_id,
      attribution_method,
      bank_order_reference,
      verification_source,
      policy_version,
      verified_by,
      eligible_for_settlement,
      consumed_at,
      supporting_evidence
    ) values (
      v_order.id,
      v_evidence.id,
      case when p_matched_by = 'admin_manual' then 'admin_bank_record_review' else 'bank_order_reference' end,
      case when p_matched_by = 'admin_manual' then null else v_order.order_reference end,
      case when p_matched_by = 'admin_manual' then 'admin_manual_settlement' else 'automated_reconciler' end,
      'csc-settlement-v1',
      case when p_matched_by = 'admin_manual' then p_user_id else null end,
      true,
      clock_timestamp(),
      jsonb_build_object(
        'matched_by', p_matched_by,
        'utr', v_evidence.utr,
        'memo', v_evidence.transaction_info_raw,
        'notes', p_notes
      )
    )
    on conflict (order_id) do update set
      consumed_at = clock_timestamp(),
      verified_by = coalesce(excluded.verified_by, public.event_payment_attributions.verified_by);
  end if;

  -- =========================================================================
  -- 8. TRANSACTIONAL OUTBOX ENQUEUING (Rolls back atomically if insert fails)
  -- =========================================================================
  perform private.enqueue_email(
    'EventConfirmed',
    'event_registrations',
    v_first_pass_id,
    v_user_id,
    lower(v_order.email),
    jsonb_build_object(
      'status', 'confirmed',
      'reference', v_reg_ref,
      'eventTitle', v_event.title,
      'name', v_order.full_name,
      'attendeeCount', v_order.attendee_count,
      'totalAmountPaid', round(v_order.amount_paise::numeric / 100.0, 2)
    ),
    false,
    'order:' || v_order.id
  );

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'evidence_id', v_evidence.id,
    'paid_registration_id', v_paid_reg_id,
    'primary_pass_id', v_first_pass_id,
    'attendee_count', v_order.attendee_count
  );
end $func$;

revoke all on function public.csc_fulfill_confirmed_payment(uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.csc_fulfill_confirmed_payment(uuid, uuid, text, text, uuid) to service_role;

-- ============================================================================
-- 6. Resend Event Pass RPC: Guest Recipient Resolution Fix
-- ============================================================================
create or replace function public.csc_resend_event_pass(p_registration_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.event_registrations;
  e public.events;
  v_email text;
  v_name text;
begin
  if not (
    current_user in ('postgres', 'service_role', 'supabase_admin')
    or private.has_permission('registrations.approve')
    or private.has_permission('payments.verify')
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into r from public.event_registrations where id = p_registration_id;
  if not found or r.status <> 'confirmed' or r.pass_token is null then
    return false;
  end if;

  select * into e from public.events where id = r.event_id;
  if not found or e.status <> 'published' then
    return false;
  end if;

  v_email := coalesce(
    r.source_email,
    (select email from public.paid_event_registrations where id = r.paid_registration_id),
    (select email from public.event_payment_orders where paid_registration_id = r.paid_registration_id)
  );

  v_name := coalesce(
    r.attendee_name,
    (select full_name from public.paid_event_registrations where id = r.paid_registration_id),
    'Attendee'
  );

  perform private.enqueue_email(
    'EventConfirmed',
    'event_registrations',
    r.id,
    r.user_id,
    v_email,
    jsonb_build_object(
      'status', 'confirmed',
      'reference', r.reference,
      'eventTitle', e.title,
      'name', v_name
    ),
    false,
    'resend:' || gen_random_uuid()::text
  );
  return true;
end $$;

revoke all on function public.csc_resend_event_pass(uuid) from public, anon;
grant execute on function public.csc_resend_event_pass(uuid) to authenticated, service_role;

commit;
