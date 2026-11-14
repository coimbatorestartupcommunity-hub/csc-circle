-- Migration: 20261114190000_csc_automatic_utr_verification_and_meet.sql
-- Enables automated UTR-to-email reconciliation, exact UTR matching,
-- group attendee pass notification outbox enqueuing, and inserts the
-- Coimbatore Startup Community First Online Google Meet event.

begin;

-- ============================================================================
-- 1. Extend Attribution Methods to Include 'utr_exact_match'
-- ============================================================================
alter table public.event_payment_attributions
  drop constraint if exists event_payment_attributions_attribution_method_check;

alter table public.event_payment_attributions
  add constraint event_payment_attributions_attribution_method_check
  check (attribution_method in ('bank_order_reference', 'admin_bank_record_review', 'utr_exact_match'));

alter table public.event_payment_attributions
  drop constraint if exists event_payment_attributions_check;

alter table public.event_payment_attributions
  add constraint event_payment_attributions_check
  check (
    (attribution_method = 'bank_order_reference' and bank_order_reference is not null)
    or attribution_method in ('admin_bank_record_review', 'utr_exact_match')
  );

-- ============================================================================
-- 2. Extend csc_fulfill_confirmed_payment for Automated UTR Verification
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
  v_has_memo_match boolean := false;
  v_has_utr_match boolean := false;
  v_pass_record record;
begin
  -- =========================================================================
  -- 1. TOTAL LOCK ORDERING STEP 1: Lock order and validate lifecycle state
  -- =========================================================================
  select * into v_order
  from public.event_payment_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found: %', p_order_id;
  end if;

  -- 1.1 Idempotency Fast-Path: Order already confirmed
  if v_order.status in ('reconciled', 'verified') then
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

  -- 1.2 Enforce Affirmative Terms Consent Invariant
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

  -- 3.4 Order Expiry Verification (grace window: 10 minutes)
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
  v_has_memo_match := (v_evidence.transaction_info_raw ~* (
    '(^|[^A-Z0-9-])' || v_order.order_reference || '([^A-Z0-9-]|$)'
  ));

  v_has_utr_match := (
    v_order.claimed_utr is not null
    and trim(v_order.claimed_utr) <> ''
    and lower(trim(v_order.claimed_utr)) = lower(trim(v_evidence.utr))
  );

  if p_matched_by in ('automated_worker', 'user_utr_claim') then
    -- Both automated pathways require authenticated evidence
    if v_evidence.auth_status <> 'authenticated' then
      if p_matched_by = 'user_utr_claim' then
        raise exception 'User UTR claim settlement requires authenticated evidence (status: %)', v_evidence.auth_status;
      else
        raise exception 'Evidence % failed authentication (status: %)', v_evidence.id, v_evidence.auth_status;
      end if;
    end if;

    if p_matched_by = 'user_utr_claim' and not v_has_utr_match then
      raise exception 'User UTR claim settlement requires verified matching claimed UTR';
    end if;

    if p_matched_by = 'automated_worker' and not (v_has_memo_match or v_has_utr_match) then
      raise exception 'Automated worker settlement requires verifiable order reference % in transaction note', v_order.order_reference;
    end if;

    -- If memo lacks order reference, enforce attribution record requirement (or create it if user_utr_claim)
    if not v_has_memo_match then
      if v_attribution.id is null then
        -- If attribution is missing but exact UTR matches, check if attribution table allows it
        raise exception 'Settlement requires an eligible, unconsumed verified attribution';
      end if;

      if not coalesce(v_attribution.eligible_for_settlement, false) or v_attribution.consumed_at is not null then
        raise exception 'Settlement requires an eligible, unconsumed verified attribution';
      end if;

      if v_attribution.attribution_method not in ('bank_order_reference', 'admin_bank_record_review', 'utr_exact_match') then
        raise exception 'User UTR claim settlement requires a verified attribution decision';
      end if;
    else
      -- Memo matches order reference: verify pre-existing attribution if present
      if v_attribution.id is not null then
        if not coalesce(v_attribution.eligible_for_settlement, false) or v_attribution.consumed_at is not null then
          raise exception 'Settlement requires an eligible, unconsumed verified attribution';
        end if;
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
              coalesce(
                case when jsonb_typeof(v_attendee_item) = 'object' then nullif(trim(v_attendee_item->>'email'), '') else null end,
                lower(v_order.email)
              )
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
      case
        when p_matched_by = 'admin_manual' then 'admin_bank_record_review'
        when v_has_memo_match then 'bank_order_reference'
        else 'utr_exact_match'
      end,
      case
        when p_matched_by = 'admin_manual' then null
        when v_has_memo_match then v_order.order_reference
        else null
      end,
      case
        when p_matched_by = 'admin_manual' then 'admin_manual_settlement'
        else 'automated_reconciler'
      end,
      'csc-settlement-v2',
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
  -- 8. TRANSACTIONAL OUTBOX ENQUEUING: Pass emails
  -- =========================================================================
  perform private.enqueue_email(
    'EventConfirmed',
    'event_registrations',
    v_first_pass_id,
    v_user_id,
    lower(v_order.email),
    jsonb_build_object(
      'status', 'confirmed',
      'reference', (select reference from public.event_registrations where id = v_first_pass_id),
      'eventTitle', v_event.title,
      'name', v_order.full_name,
      'attendeeCount', v_order.attendee_count,
      'totalAmountPaid', round(v_order.amount_paise::numeric / 100.0, 2)
    ),
    false,
    'order:' || v_order.id
  );

  for v_pass_record in
    select id, reference, attendee_name, source_email
    from public.event_registrations
    where paid_registration_id = v_paid_reg_id
      and id <> v_first_pass_id
      and source_email is not null
      and lower(source_email) <> lower(v_order.email)
  loop
    perform private.enqueue_email(
      'EventConfirmed',
      'event_registrations',
      v_pass_record.id,
      v_user_id,
      lower(v_pass_record.source_email),
      jsonb_build_object(
        'status', 'confirmed',
        'reference', v_pass_record.reference,
        'eventTitle', v_event.title,
        'name', v_pass_record.attendee_name,
        'attendeeCount', 1,
        'totalAmountPaid', round(v_order.amount_paise::numeric / 100.0, 2)
      ),
      false,
      'pass:' || v_pass_record.id
    );
  end loop;

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
-- 3. Upsert Event: "Coimbatore Startup Community (CSC) - Joint Online Meeting"
-- ============================================================================
insert into public.events (
  slug, title, category, description, summary, organizer,
  cover_image, cover_image_alt,
  starts_at, ends_at, location, venue, maps_url,
  registration_deadline, status, admission, registration_state,
  price_minor, settings, registration_mode,
  price_per_attendee, max_attendees_per_registration,
  upi_vpa, upi_payee_name, payment_note, format, approval_mode
) values (
  'csc-joint-online-meeting',
  'Coimbatore Startup Community (CSC) - Joint Online Meeting',
  'networking',
  E'Welcome to the official registration page for the Coimbatore Startup Community (CSC) Joint Online Meeting, proudly powered by our Technical Partner, Logic Intelligence Technologies.\n\nThis exclusive online gathering is designed to bring together Coimbatore’s most driven founders, tech entrepreneurs, innovators, and ecosystem builders. Whether you are scaling a startup, developing new tech, or looking for the right co-founders and collaborators, this meeting is your platform to connect and grow.\n\n🗓 Event Details:\n• Date: Sunday, November 22, 2026\n• Time: To Be Announced (Will be updated via email and the CSC WhatsApp Group)\n• Mode: Online via Google Meet\n\n📋 Meeting Agenda:\n• Welcome & Community Updates: Discover the latest initiatives, resources, and platform updates within the CSC ecosystem.\n• Founder Introductions & Networking: Connect directly with fellow builders, share what you are working on, and discover potential synergies.\n• Open Floor: A collaborative session to discuss current startup challenges, share opportunities, and seek technical or business advice from peers.\n\nWhy Register?\nBy registering, you ensure your spot in the meeting and help us tailor the discussion to the attendees. Registered participants will receive the official Google Meet link and a calendar invitation directly to their inbox.\n\nPlease fill out your details below accurately so we can add you to the attendee roster and send the meeting credentials.',
  'Welcome to the official registration page for the Coimbatore Startup Community (CSC) Joint Online Meeting, proudly powered by our Technical Partner, Logic Intelligence Technologies.',
  'Coimbatore Startup Community',
  '/events/csc-joint-online-meeting-cover.webp',
  'Coimbatore Startup Community (CSC) - Joint Online Meeting Cover',
  '2026-11-22 10:00:00+05:30',
  '2026-11-22 11:30:00+05:30',
  'Online via Google Meet',
  'Google Meet Virtual Room',
  'https://meet.google.com/vwg-hmsh-mrx',
  '2026-11-22 09:30:00+05:30',
  'published',
  'paid',
  'open',
  1000,
  jsonb_build_object(
    'title', 'Coimbatore Startup Community (CSC) - Joint Online Meeting',
    'slug', 'csc-joint-online-meeting',
    'category', 'networking',
    'date', '2026-11-22',
    'timeNote', 'To Be Announced (Will be updated via email and the CSC WhatsApp Group)',
    'format', 'online',
    'isOnline', true,
    'platform', 'Google Meet',
    'onlineInfo', 'https://meet.google.com/vwg-hmsh-mrx',
    'googleMeetUrl', 'https://meet.google.com/vwg-hmsh-mrx',
    'calendarUrl', 'https://calendar.app.google/rHJCNakcSJ8HALCa7',
    'meetingCode', 'vwg-hmsh-mrx',
    'coverImage', '/events/csc-joint-online-meeting-cover.webp',
    'bannerImage', '/events/csc-joint-online-meeting-banner.webp',
    'posterImage', '/events/csc-joint-online-meeting-poster.webp',
    'admission', 'paid',
    'price', '10',
    'currency', 'INR',
    'pricePerAttendee', '10',
    'maxAttendeesPerRegistration', 10,
    'upiVpa', '9342877474@ptyes',
    'upiPayeeName', 'S VIKASH',
    'googleMeet', jsonb_build_object(
      'platform', 'Google Meet',
      'meetingUri', 'https://meet.google.com/vwg-hmsh-mrx',
      'calendarUri', 'https://calendar.app.google/rHJCNakcSJ8HALCa7',
      'meetingCode', 'vwg-hmsh-mrx',
      'isConfigured', true,
      'mode', 'host_verified'
    )
  ),
  'paid_upi',
  10,
  10,
  '9342877474@ptyes',
  'S VIKASH',
  'Pay ₹10 per attendee by UPI. Enter your 12-digit UTR for automatic verification.',
  'online',
  'automatic'
) on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  summary = excluded.summary,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  status = 'published',
  registration_state = 'open',
  admission = 'paid',
  price_minor = excluded.price_minor,
  price_per_attendee = excluded.price_per_attendee,
  format = 'online',
  location = 'Online via Google Meet',
  maps_url = excluded.maps_url,
  registration_mode = 'paid_upi',
  settings = events.settings || excluded.settings;

-- Also maintain csc-first-online-google-meet alias slug
insert into public.events (
  slug, title, category, description, summary, organizer,
  cover_image, cover_image_alt,
  starts_at, ends_at, location, venue, maps_url,
  registration_deadline, status, admission, registration_state,
  price_minor, settings, registration_mode,
  price_per_attendee, max_attendees_per_registration,
  upi_vpa, upi_payee_name, payment_note, format, approval_mode
) values (
  'csc-first-online-google-meet',
  'Coimbatore Startup Community (CSC) - Joint Online Meeting',
  'networking',
  E'Welcome to the official registration page for the Coimbatore Startup Community (CSC) Joint Online Meeting, proudly powered by our Technical Partner, Logic Intelligence Technologies.\n\nThis exclusive online gathering is designed to bring together Coimbatore’s most driven founders, tech entrepreneurs, innovators, and ecosystem builders. Whether you are scaling a startup, developing new tech, or looking for the right co-founders and collaborators, this meeting is your platform to connect and grow.\n\n🗓 Event Details:\n• Date: Sunday, November 22, 2026\n• Time: To Be Announced (Will be updated via email and the CSC WhatsApp Group)\n• Mode: Online via Google Meet\n\n📋 Meeting Agenda:\n• Welcome & Community Updates: Discover the latest initiatives, resources, and platform updates within the CSC ecosystem.\n• Founder Introductions & Networking: Connect directly with fellow builders, share what you are working on, and discover potential synergies.\n• Open Floor: A collaborative session to discuss current startup challenges, share opportunities, and seek technical or business advice from peers.\n\nWhy Register?\nBy registering, you ensure your spot in the meeting and help us tailor the discussion to the attendees. Registered participants will receive the official Google Meet link and a calendar invitation directly to their inbox.\n\nPlease fill out your details below accurately so we can add you to the attendee roster and send the meeting credentials.',
  'Welcome to the official registration page for the Coimbatore Startup Community (CSC) Joint Online Meeting, proudly powered by our Technical Partner, Logic Intelligence Technologies.',
  'Coimbatore Startup Community',
  '/events/csc-joint-online-meeting-cover.webp',
  'Coimbatore Startup Community (CSC) - Joint Online Meeting Cover',
  '2026-11-22 10:00:00+05:30',
  '2026-11-22 11:30:00+05:30',
  'Online via Google Meet',
  'Google Meet Virtual Room',
  'https://meet.google.com/vwg-hmsh-mrx',
  '2026-11-22 09:30:00+05:30',
  'published',
  'paid',
  'open',
  1000,
  jsonb_build_object(
    'title', 'Coimbatore Startup Community (CSC) - Joint Online Meeting',
    'slug', 'csc-first-online-google-meet',
    'category', 'networking',
    'date', '2026-11-22',
    'timeNote', 'To Be Announced (Will be updated via email and the CSC WhatsApp Group)',
    'format', 'online',
    'isOnline', true,
    'platform', 'Google Meet',
    'onlineInfo', 'https://meet.google.com/vwg-hmsh-mrx',
    'googleMeetUrl', 'https://meet.google.com/vwg-hmsh-mrx',
    'calendarUrl', 'https://calendar.app.google/rHJCNakcSJ8HALCa7',
    'meetingCode', 'vwg-hmsh-mrx',
    'coverImage', '/events/csc-joint-online-meeting-cover.webp',
    'bannerImage', '/events/csc-joint-online-meeting-banner.webp',
    'posterImage', '/events/csc-joint-online-meeting-poster.webp',
    'admission', 'paid',
    'price', '10',
    'currency', 'INR',
    'pricePerAttendee', '10',
    'maxAttendeesPerRegistration', 10,
    'upiVpa', '9342877474@ptyes',
    'upiPayeeName', 'S VIKASH',
    'googleMeet', jsonb_build_object(
      'platform', 'Google Meet',
      'meetingUri', 'https://meet.google.com/vwg-hmsh-mrx',
      'calendarUri', 'https://calendar.app.google/rHJCNakcSJ8HALCa7',
      'meetingCode', 'vwg-hmsh-mrx',
      'isConfigured', true,
      'mode', 'host_verified'
    )
  ),
  'paid_upi',
  10,
  10,
  '9342877474@ptyes',
  'S VIKASH',
  'Pay ₹10 per attendee by UPI. Enter your 12-digit UTR for automatic verification.',
  'online',
  'automatic'
) on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  summary = excluded.summary,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  status = 'published',
  registration_state = 'open',
  admission = 'paid',
  price_minor = excluded.price_minor,
  price_per_attendee = excluded.price_per_attendee,
  format = 'online',
  location = 'Online via Google Meet',
  maps_url = excluded.maps_url,
  registration_mode = 'paid_upi',
  settings = events.settings || excluded.settings;

commit;
