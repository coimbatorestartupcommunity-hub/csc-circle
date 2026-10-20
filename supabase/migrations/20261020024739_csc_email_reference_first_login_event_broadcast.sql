-- CSC transactional mail reliability, first-login welcome, and event broadcasts.
-- All messages remain in the existing durable outbox; this migration does not
-- send, backfill, or re-send any existing notification.
begin;

-- Stay below the documented consumer Gmail daily limit while leaving enough
-- headroom for both transaction receipts and one-to-one event messages.
create or replace function public.csc_email_budget_available()
returns boolean language sql security invoker set search_path=''
as $$
  select
    (select count(*) from public.notification_deliveries where accepted_at > now() - interval '1 hour') < 100
    and
    (select count(*) from public.notification_deliveries where accepted_at > now() - interval '1 day') < 400
$$;

-- Claim larger bounded batches so the after-response worker can drain a useful
-- portion of a publication fan-out without holding a database lock per email.
create or replace function public.csc_claim_notifications(batch integer default 15,worker uuid default gen_random_uuid())
returns setof public.notifications
language plpgsql security invoker set search_path='' as $$
begin
  update public.notification_worker_state
  set worker_id=worker,locked_until=now()+interval '5 minutes'
  where singleton and (locked_until is null or locked_until<now());
  if not found then return; end if;

  update public.notifications n
  set status=case when exists(
      select 1 from public.notification_deliveries d
      where d.notification_id=n.id and d.status in ('attempting','ambiguous')
    ) then 'failed_permanent' else 'failed_retryable' end,
    last_error=case when exists(
      select 1 from public.notification_deliveries d
      where d.notification_id=n.id and d.status in ('attempting','ambiguous')
    ) then 'AMBIGUOUS_DELIVERY' else 'LEASE_EXPIRED_BEFORE_SEND' end,
    lease_id=null,locked_until=null
  where n.status='processing' and n.locked_until<now();

  return query
  with due as (
    select id from public.notifications
    where channel='email' and template_key is not null
      and status in ('queued','failed_retryable') and attempts<max_attempts and available_at<=now()
    order by available_at,created_at
    for update skip locked limit least(greatest(batch,1),15)
  )
  update public.notifications n
  set status='processing',attempts=n.attempts+1,lease_id=gen_random_uuid(),
      locked_until=now()+interval '5 minutes',updated_at=now()
  from due where n.id=due.id returning n.*;
end $$;

-- Capture the complete submitted context needed for truthful member receipts
-- and authorized admin notices. Never copy payment credentials or QR tokens.
create or replace function private.submission_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  r jsonb=to_jsonb(new);
  template text;
  alert text;
  recipient uuid;
  address text;
  details jsonb;
  e public.events;
  profile_name text;
begin
  case tg_table_name
    when 'membership_claims' then template='MembershipApplicationReceived'; alert='MembershipAdminAlert';
    when 'rsvp_submissions' then template='EventRSVPReceived'; alert='EventRSVPAdminAlert';
    when 'consultation_submissions' then template='ConsultationReceived'; alert='ConsultationAdminAlert';
    when 'reviews' then template='CommunityReviewReceived'; alert='ReviewAdminAlert';
    when 'directory_startups' then template='StartupSubmissionReceived'; alert='StartupAdminAlert';
    when 'event_registrations' then template='EventRSVPReceived'; alert='EventRSVPAdminAlert';
    else return new;
  end case;

  recipient=nullif(r->>'user_id','')::uuid;
  address=coalesce(r->>'linked_account_email',r->>'email');
  select coalesce(p.display_name,p.full_name) into profile_name
    from public.profiles p where p.id=recipient;

  details=jsonb_strip_nulls(jsonb_build_object(
    'name',coalesce(r->>'full_name',profile_name),
    'email',address,
    'reference',coalesce(r->>'reference',new.id::text),
    'status',coalesce(r->>'status',r->>'moderation'),
    'applicantType',r->>'applicant_type',
    'designation',r->>'designation',
    'startupAffiliation',r->>'startup_affiliation',
    'startupName',r->>'name',
    'slug',r->>'slug',
    'industry',r->>'industry',
    'startupStage',r->>'stage',
    'website',r->>'website',
    'description',r->>'description',
    'goal',coalesce(r->>'goal',r->>'challenge'),
    'rating',r->>'rating',
    'review',r->>'review'
  ));

  if r->>'event_id' is not null then
    select * into e from public.events where id=(r->>'event_id')::uuid;
    if found then
      details=details||jsonb_strip_nulls(jsonb_build_object(
        'eventTitle',coalesce(r->>'event_label',e.title),
        'eventCategory',e.category,
        'slug',e.slug,
        'startsAt',e.starts_at,
        'endsAt',e.ends_at,
        'venue',e.venue,
        'location',e.location,
        'admission',e.admission,
        'priceMinor',e.price_minor,
        'registrationState',e.registration_state,
        'registrationDeadline',e.registration_deadline
      ));
    end if;
  elsif tg_table_name='rsvp_submissions' and r->>'event_label' is not null then
    details=details||jsonb_build_object('eventTitle',r->>'event_label');
  end if;

  if tg_table_name='consultation_submissions' then
    details=details||jsonb_strip_nulls(jsonb_build_object('startupName',r->>'startup','goal',r->>'challenge'));
  end if;

  perform private.enqueue_email(template,tg_table_name,new.id,recipient,address,details,false);
  perform private.enqueue_email(alert,tg_table_name,new.id,null,null,details,true);
  return new;
end $$;
revoke all on function private.submission_notification() from public,anon,authenticated;

-- Include accurate record details in post-review status notifications.
create or replace function private.status_email()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  r jsonb=to_jsonb(new);
  o jsonb=to_jsonb(old);
  template text;
  recipient uuid;
  details jsonb;
  state text;
  previous text;
  e public.events;
  profile_name text;
begin
  state=coalesce(r->>'status',r->>'moderation');
  previous=coalesce(o->>'status',o->>'moderation');
  if state is not distinct from previous and r->>'scheduled_at' is not distinct from o->>'scheduled_at' then return new; end if;
  recipient=nullif(r->>'user_id','')::uuid;
  case tg_table_name
    when 'memberships' then template=case state when 'active' then 'MembershipApproved' else 'MembershipStatusChanged' end;
    when 'membership_claims' then template=case state when 'rejected' then 'MembershipRejected' when 'pending_verification' then 'MembershipMoreInformation' else null end;
    when 'event_registrations' then template=case state when 'confirmed' then 'EventConfirmed' when 'waitlisted' then 'EventWaitlisted' when 'cancelled' then 'EventCancelled' when 'pending_payment' then 'PaymentPendingVerification' when 'payment_verification' then 'PaymentPendingVerification' else null end;
    when 'consultation_submissions' then template=case state when 'approved' then 'ConsultationApproved' when 'more_info_required' then 'ConsultationMoreInformation' when 'scheduled' then 'ConsultationScheduled' when 'cancelled' then 'ConsultationCancelled' when 'declined' then 'ConsultationCancelled' else null end;
    when 'payments' then
      select user_id into recipient from public.event_registrations where id=new.registration_id;
      template=case state when 'verified' then 'PaymentVerified' when 'rejected' then 'PaymentRejected' when 'refunded' then 'PaymentRefunded' when 'pending_verification' then 'PaymentPendingVerification' else null end;
    when 'directory_startups' then template=case state when 'published' then 'StartupApproved' else 'StartupStatusChanged' end;
    when 'reviews' then template='ReviewModerationResult';
    else return new;
  end case;
  if template is null then return new; end if;

  select coalesce(p.display_name,p.full_name) into profile_name from public.profiles p where p.id=recipient;
  details=jsonb_strip_nulls(jsonb_build_object(
    'name',coalesce(r->>'full_name',profile_name),
    'email',coalesce(r->>'linked_account_email',r->>'email'),
    'reference',coalesce(r->>'reference',new.id::text),
    'status',state,
    'startupName',r->>'name',
    'slug',r->>'slug',
    'industry',r->>'industry',
    'startupStage',r->>'stage',
    'website',r->>'website',
    'description',r->>'description',
    'goal',coalesce(r->>'goal',r->>'challenge'),
    'rating',r->>'rating',
    'review',r->>'review',
    'scheduledAt',r->>'scheduled_at',
    'mode',r->>'mode',
    'meetingLocation',coalesce(r->>'meeting_location',r->>'meeting_url'),
    'membershipNumber',r->>'member_number',
    'issuedAt',r->>'issued_at'
  ));
  if r->>'event_id' is not null then
    select * into e from public.events where id=(r->>'event_id')::uuid;
  elsif tg_table_name='payments' then
    select ev.* into e from public.events ev join public.event_registrations reg on reg.event_id=ev.id
      where reg.id=(r->>'registration_id')::uuid;
  end if;
  if e.id is not null then
    details=details||jsonb_strip_nulls(jsonb_build_object(
      'eventTitle',coalesce(r->>'event_label',e.title),'eventCategory',e.category,'slug',e.slug,
      'startsAt',e.starts_at,'endsAt',e.ends_at,'venue',e.venue,
      'location',e.location,'admission',e.admission,'priceMinor',e.price_minor,
      'registrationState',e.registration_state,'registrationDeadline',e.registration_deadline
    ));
  end if;
  if tg_table_name='consultation_submissions' then
    details=details||jsonb_strip_nulls(jsonb_build_object('startupName',r->>'startup','goal',r->>'challenge'));
  end if;
  perform private.enqueue_email(template,tg_table_name,new.id,recipient,r->>'email',details,false,md5((r-'verification_token'-'pass_token')::text));
  return new;
end $$;
revoke all on function private.status_email() from public,anon,authenticated;

-- Updating a scheduled event sends registrants the actual revised values.
create or replace function private.event_change_email()
returns trigger language plpgsql security definer set search_path='' as $$
declare r public.event_registrations; version text;
begin
  if new.starts_at=old.starts_at and new.ends_at=old.ends_at and new.venue is not distinct from old.venue
     and new.location is not distinct from old.location and new.title=old.title and new.status=old.status then return new; end if;
  version=md5(jsonb_build_array(new.title,new.starts_at,new.ends_at,new.venue,new.location,new.status,new.registration_state)::text);
  for r in select * from public.event_registrations where event_id=new.id and status in ('confirmed','waitlisted','pending_review','pending_payment','payment_verification') loop
    perform private.enqueue_email('EventUpdated','event_registrations',r.id,r.user_id,null,
      jsonb_build_object('reference',r.reference,'eventTitle',new.title,'eventCategory',new.category,
        'slug',new.slug,'startsAt',new.starts_at,'endsAt',new.ends_at,'previousStartsAt',old.starts_at,
        'venue',new.venue,'location',new.location,'admission',new.admission,
        'priceMinor',new.price_minor,'registrationState',new.registration_state),false,version);
  end loop;
  return new;
end $$;
revoke all on function private.event_change_email() from public,anon,authenticated;

-- Queue one private, idempotent welcome after the account's first verified sign-in.
create or replace function private.welcome_after_first_sign_in()
returns trigger language plpgsql security definer set search_path='' as $$
declare person_name text;
begin
  if new.last_sign_in_at is null or new.email_confirmed_at is null then return new; end if;
  if tg_op='UPDATE' and old.last_sign_in_at is not null then return new; end if;
  person_name=coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(new.email,'@',1));
  perform private.enqueue_email('FirstLoginWelcome','auth.users',new.id,new.id,null,
    jsonb_build_object('name',person_name),false,'first-verified-sign-in');
  return new;
end $$;
revoke all on function private.welcome_after_first_sign_in() from public,anon,authenticated;
drop trigger if exists csc_welcome_after_first_sign_in_insert on auth.users;
drop trigger if exists csc_welcome_after_first_sign_in_update on auth.users;
create trigger csc_welcome_after_first_sign_in_insert after insert on auth.users
  for each row execute function private.welcome_after_first_sign_in();
create trigger csc_welcome_after_first_sign_in_update after update of last_sign_in_at on auth.users
  for each row execute function private.welcome_after_first_sign_in();

-- A publish transition creates one queued message for each verified account
-- that has signed in and explicitly enabled operational email in its settings.
-- Fan-out is a single INSERT...SELECT; it can queue thousands without a loop.
create or replace function private.broadcast_published_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare version text;
begin
  if new.status<>'published' then return new; end if;
  if tg_op='UPDATE' and old.status='published' then return new; end if;
  version=md5(jsonb_build_array(new.title,new.description,new.category,new.starts_at,new.ends_at,
    new.location,new.venue,new.admission,new.registration_state,new.registration_deadline)::text);
  insert into public.notifications(
    type,template_key,channel,recipient_user_id,audience,related_record_type,related_record_id,
    payload,dedupe_key
  )
  select 'EventPublishedBroadcast','EventPublishedBroadcast','email',u.id,'member','events',new.id,
    jsonb_strip_nulls(jsonb_build_object(
      'eventTitle',new.title,'eventCategory',new.category,'slug',new.slug,
      'startsAt',new.starts_at,'endsAt',new.ends_at,'venue',new.venue,
      'location',new.location,'admission',new.admission,'priceMinor',new.price_minor,'registrationState',new.registration_state,
      'registrationDeadline',new.registration_deadline,'description',left(new.description,600)
    )),
    'EventPublishedBroadcast:'||new.id::text||':'||u.id::text||':'||version
  from auth.users u
  join public.profiles p on p.id=u.id
  where u.email_confirmed_at is not null
    and u.last_sign_in_at is not null
    and p.consent->>'operationalEmail'='true'
  on conflict(dedupe_key) do nothing;
  return new;
end $$;
revoke all on function private.broadcast_published_event() from public,anon,authenticated;
drop trigger if exists csc_event_publish_email_insert on public.events;
drop trigger if exists csc_event_publish_email_update on public.events;
create trigger csc_event_publish_email_insert after insert on public.events
  for each row execute function private.broadcast_published_event();
create trigger csc_event_publish_email_update after update of status on public.events
  for each row execute function private.broadcast_published_event();

commit;
