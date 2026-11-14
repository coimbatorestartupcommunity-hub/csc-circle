-- Migration: 20261114200000_csc_qr_checkin_and_join_sessions.sql
-- Implements individual attendee self check-in, secure join sessions for Google Meet,
-- and identity verification challenges.

begin;

-- ============================================================================
-- 1. Extend attendance_checkins for attendee self check-in
-- ============================================================================
alter table public.attendance_checkins
  alter column staff_id drop not null;

alter table public.attendance_checkins
  add column if not exists checkin_method text default 'admin_scanner';

alter table public.attendance_checkins
  drop constraint if exists attendance_checkins_checkin_method_check;

alter table public.attendance_checkins
  add constraint attendance_checkins_checkin_method_check
  check (checkin_method in ('admin_scanner', 'admin_manual', 'attendee_self_qr_upload', 'attendee_camera_scan'));

alter table public.attendance_checkins
  add column if not exists attendee_email text;

alter table public.attendance_checkins
  add column if not exists ip_address text;

alter table public.attendance_checkins
  add column if not exists user_agent text;

-- ============================================================================
-- 2. Create event_join_sessions for short-lived Google Meet authorization
-- ============================================================================
create table if not exists public.event_join_sessions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.event_registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  token_hash text not null unique,
  meeting_url text not null,
  attendee_email text not null,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '15 minutes'),
  redeemed_at timestamptz,
  is_revoked boolean not null default false,
  ip_address text,
  user_agent text
);

create index if not exists idx_event_join_sessions_token_hash
  on public.event_join_sessions(token_hash);

create index if not exists idx_event_join_sessions_reg_active
  on public.event_join_sessions(registration_id, is_revoked);

alter table public.event_join_sessions enable row level security;

create policy event_join_sessions_service_role
  on public.event_join_sessions
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 3. Create event_checkin_challenges for attendee identity protection (Option C)
-- ============================================================================
create table if not exists public.event_checkin_challenges (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.event_registrations(id) on delete cascade,
  otp_hash text not null,
  recipient_email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists idx_event_checkin_challenges_lookup
  on public.event_checkin_challenges(id, token_hash);

alter table public.event_checkin_challenges enable row level security;

create policy event_checkin_challenges_service_role
  on public.event_checkin_challenges
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 4. Atomic Stored Procedure: csc_attendee_self_check_in
-- ============================================================================
create or replace function public.csc_attendee_self_check_in(
  p_pass_token text,
  p_verified_email text default null,
  p_method text default 'attendee_self_qr_upload',
  p_ip text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_reg public.event_registrations;
  v_event public.events;
  v_existing_checkin public.attendance_checkins;
  v_checkin_id uuid;
  v_already_checked_in boolean := false;
begin
  if p_pass_token is null or length(trim(p_pass_token)) < 16 then
    return jsonb_build_object('ok', false, 'status', 'invalid', 'error', 'Invalid pass token provided.');
  end if;

  -- 1. Lock and validate registration row
  select * into v_reg
  from public.event_registrations
  where pass_token = trim(p_pass_token)
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid', 'error', 'Invalid event pass.');
  end if;

  -- 2. Validate event
  select * into v_event
  from public.events
  where id = v_reg.event_id;

  if not found or v_event.status <> 'published' then
    return jsonb_build_object('ok', false, 'status', 'revoked', 'error', 'Event is not published or active.');
  end if;

  if v_event.ends_at is not null and now() > v_event.ends_at then
    return jsonb_build_object('ok', false, 'status', 'expired', 'error', 'Event has already concluded.');
  end if;

  -- 3. Validate payment and confirmation
  if v_event.admission = 'paid' and v_reg.payment <> 'paid' then
    return jsonb_build_object('ok', false, 'status', 'payment', 'error', 'Payment incomplete for this registration.');
  end if;

  if v_reg.status not in ('confirmed', 'checked_in') then
    return jsonb_build_object('ok', false, 'status', 'pending', 'error', 'Registration is pending confirmation.');
  end if;

  -- 4. Check for existing attendance checkin (idempotency)
  select * into v_existing_checkin
  from public.attendance_checkins
  where registration_id = v_reg.id;

  if found then
    v_already_checked_in := true;
    v_checkin_id := v_existing_checkin.id;
  else
    -- 5. Record new atomic check-in
    insert into public.attendance_checkins (
      registration_id,
      event_id,
      staff_id,
      checkin_method,
      attendee_email,
      ip_address,
      user_agent,
      checked_in_at
    ) values (
      v_reg.id,
      v_reg.event_id,
      null,
      coalesce(p_method, 'attendee_self_qr_upload'),
      coalesce(p_verified_email, v_reg.source_email),
      p_ip,
      p_user_agent,
      clock_timestamp()
    )
    returning id into v_checkin_id;

    -- Update registration status to checked_in
    update public.event_registrations
    set status = 'checked_in',
        attendance = 'checked_in'
    where id = v_reg.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', 'valid',
    'registration_id', v_reg.id,
    'event_id', v_reg.event_id,
    'event_title', v_event.title,
    'attendee_name', v_reg.attendee_name,
    'reference', v_reg.reference,
    'source_email', v_reg.source_email,
    'already_checked_in', v_already_checked_in,
    'checkin_id', v_checkin_id
  );
end $function$;

revoke all on function public.csc_attendee_self_check_in(text, text, text, text, text) from public;
grant execute on function public.csc_attendee_self_check_in(text, text, text, text, text) to authenticated;
grant execute on function public.csc_attendee_self_check_in(text, text, text, text, text) to service_role;
grant execute on function public.csc_attendee_self_check_in(text, text, text, text, text) to anon;

commit;
