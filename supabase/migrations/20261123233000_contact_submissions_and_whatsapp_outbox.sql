-- Migration: 20261123233000_contact_submissions_and_whatsapp_outbox.sql
-- Description: Creates contact_submissions and whatsapp_message_outbox tables,
-- transactional outbox RPC functions, row-locking batch claiming, and strict RLS policies.

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  phone_chat_id text,
  inquiry text,
  whatsapp_consent boolean not null default false,
  consent_timestamp timestamptz,
  consent_notice_version text not null default '1.0',
  source text not null default 'website_contact_form',
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_submissions_name_len check (char_length(trim(name)) >= 2 and char_length(name) <= 100),
  constraint contact_submissions_phone_len check (char_length(trim(phone)) >= 5 and char_length(phone) <= 30),
  constraint contact_submissions_inquiry_len check (inquiry is null or char_length(inquiry) <= 3000)
);

create table if not exists public.whatsapp_message_outbox (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contact_submissions(id) on delete cascade,
  recipient_phone text not null,
  recipient_chat_id text not null,
  message_type text not null default 'contact_acknowledgement',
  message_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'queued', 'processing', 'accepted_by_gateway', 'delivered', 'failed', 'cancelled')),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  idempotency_key text not null unique,
  available_at timestamptz not null default now(),
  queued_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  openwa_message_id text,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Operational indexes for high-throughput outbox dispatching and contact auditing
create index if not exists idx_contact_submissions_created_at
  on public.contact_submissions (created_at desc);

create index if not exists idx_whatsapp_outbox_dispatch
  on public.whatsapp_message_outbox (status, available_at, attempts)
  where status in ('pending', 'queued', 'processing');

create index if not exists idx_whatsapp_outbox_contact_id
  on public.whatsapp_message_outbox (contact_id);

-- Enable Row Level Security (RLS)
alter table public.contact_submissions enable row level security;
alter table public.whatsapp_message_outbox enable row level security;

-- Strictly deny direct public and anonymous access; all interaction occurs
-- through trusted server-side service role client or verified security definer RPCs.
drop policy if exists "contact_submissions_service_role_all" on public.contact_submissions;
create policy "contact_submissions_service_role_all"
  on public.contact_submissions
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "whatsapp_outbox_service_role_all" on public.whatsapp_message_outbox;
create policy "whatsapp_outbox_service_role_all"
  on public.whatsapp_message_outbox
  for all
  to service_role
  using (true)
  with check (true);

-- Atomic RPC: submit_contact_inquiry
-- Inserts contact record and transactionally creates outbox entry if consent is given.
create or replace function public.submit_contact_inquiry(
  p_name text,
  p_phone text,
  p_phone_chat_id text,
  p_inquiry text default null,
  p_whatsapp_consent boolean default false,
  p_consent_notice_version text default '1.0',
  p_source text default 'website_contact_form',
  p_ip_hash text default null,
  p_idempotency_key text default null,
  p_message_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
  v_outbox_id uuid;
  v_existing_outbox record;
  v_idempotency_key text;
  v_consent_timestamp timestamptz;
  v_whatsapp_status text;
begin
  -- Idempotency check: if key already exists, return existing outcome
  if p_idempotency_key is not null and trim(p_idempotency_key) <> '' then
    select id, contact_id, status into v_existing_outbox
    from public.whatsapp_message_outbox
    where idempotency_key = trim(p_idempotency_key);

    if found then
      return jsonb_build_object(
        'contact_id', v_existing_outbox.contact_id,
        'outbox_id', v_existing_outbox.id,
        'whatsapp_status', v_existing_outbox.status,
        'existing', true
      );
    end if;
  end if;

  if p_whatsapp_consent then
    v_consent_timestamp := now();
  else
    v_consent_timestamp := null;
  end if;

  -- Insert contact record
  insert into public.contact_submissions (
    name,
    phone,
    phone_chat_id,
    inquiry,
    whatsapp_consent,
    consent_timestamp,
    consent_notice_version,
    source,
    ip_hash,
    created_at,
    updated_at
  ) values (
    trim(p_name),
    trim(p_phone),
    nullif(trim(p_phone_chat_id), ''),
    nullif(trim(p_inquiry), ''),
    p_whatsapp_consent,
    v_consent_timestamp,
    trim(p_consent_notice_version),
    coalesce(nullif(trim(p_source), ''), 'website_contact_form'),
    p_ip_hash,
    now(),
    now()
  )
  returning id into v_contact_id;

  -- Create outbox record if consent is given
  if p_whatsapp_consent then
    v_idempotency_key := coalesce(nullif(trim(p_idempotency_key), ''), 'contact-' || v_contact_id::text);

    insert into public.whatsapp_message_outbox (
      contact_id,
      recipient_phone,
      recipient_chat_id,
      message_type,
      message_payload,
      status,
      attempts,
      max_attempts,
      idempotency_key,
      available_at,
      created_at,
      updated_at
    ) values (
      v_contact_id,
      trim(p_phone),
      coalesce(nullif(trim(p_phone_chat_id), ''), trim(p_phone) || '@c.us'),
      'contact_acknowledgement',
      coalesce(p_message_payload, '{}'::jsonb),
      'pending',
      0,
      5,
      v_idempotency_key,
      now(),
      now(),
      now()
    )
    returning id into v_outbox_id;

    v_whatsapp_status := 'queued';
  else
    v_outbox_id := null;
    v_whatsapp_status := 'skipped_no_consent';
  end if;

  return jsonb_build_object(
    'contact_id', v_contact_id,
    'outbox_id', v_outbox_id,
    'whatsapp_status', v_whatsapp_status,
    'existing', false
  );
end;
$$;

-- Atomic RPC: claim_whatsapp_outbox_batch
-- Concurrency-safe outbox claiming using row locking with SKIP LOCKED.
-- Claims pending items or stale processing items that timed out.
create or replace function public.claim_whatsapp_outbox_batch(
  p_batch_size int default 10,
  p_lock_duration_seconds int default 300
)
returns table (
  id uuid,
  contact_id uuid,
  recipient_phone text,
  recipient_chat_id text,
  message_type text,
  message_payload jsonb,
  attempts integer,
  max_attempts integer,
  idempotency_key text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_limit int := least(greatest(coalesce(p_batch_size, 10), 1), 50);
  v_stale_threshold interval := (coalesce(p_lock_duration_seconds, 300) || ' seconds')::interval;
begin
  return query
  with candidate_rows as (
    select o.id
    from public.whatsapp_message_outbox o
    where (
      (o.status = 'pending' and o.available_at <= now() and o.attempts < o.max_attempts)
      or
      (o.status in ('queued', 'processing') and o.updated_at < (now() - v_stale_threshold) and o.attempts < o.max_attempts)
    )
    order by o.available_at asc, o.created_at asc
    limit v_batch_limit
    for update skip locked
  )
  update public.whatsapp_message_outbox target
  set
    status = 'processing',
    attempts = target.attempts + 1,
    updated_at = now()
  from candidate_rows
  where target.id = candidate_rows.id
  returning
    target.id,
    target.contact_id,
    target.recipient_phone,
    target.recipient_chat_id,
    target.message_type,
    target.message_payload,
    target.attempts,
    target.max_attempts,
    target.idempotency_key;
end;
$$;

-- Atomic RPC: update_whatsapp_outbox_status
create or replace function public.update_whatsapp_outbox_status(
  p_outbox_id uuid,
  p_status text,
  p_openwa_message_id text default null,
  p_error_code text default null,
  p_error_message text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.whatsapp_message_outbox
  set
    status = p_status,
    openwa_message_id = coalesce(p_openwa_message_id, openwa_message_id),
    sent_at = case when p_status in ('accepted_by_gateway', 'delivered') then coalesce(sent_at, now()) else sent_at end,
    failed_at = case when p_status = 'failed' then now() else failed_at end,
    last_error_code = coalesce(p_error_code, last_error_code),
    last_error_message = coalesce(p_error_message, last_error_message),
    updated_at = now()
  where id = p_outbox_id;

  return found;
end;
$$;
