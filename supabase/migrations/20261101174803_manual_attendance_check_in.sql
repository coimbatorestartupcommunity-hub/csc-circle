-- Allow authorised event staff to record attendance manually from the admin
-- attendance page when a QR scan is unavailable or a genuine arrival needs to
-- be recorded after the event. The same registration, payment, suspension,
-- assignment, duplicate and audit protections used by QR check-in still apply.

create or replace function private.manual_check_in(registration uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r public.event_registrations;
  e public.events;
  previous timestamptz;
begin
  if not private.has_permission('attendance.scan') then
    raise exception 'forbidden' using errcode='42501';
  end if;

  select * into r
  from public.event_registrations
  where id=registration
  for update;
  if not found then return jsonb_build_object('status','invalid'); end if;

  select * into e from public.events where id=r.event_id for update;
  if not found then return jsonb_build_object('status','invalid'); end if;

  if not private.has_permission('events.update') and not exists(
    select 1 from public.event_staff
    where event_id=r.event_id and user_id=auth.uid()
  ) then
    raise exception 'event assignment required' using errcode='42501';
  end if;

  if e.status<>'published' then return jsonb_build_object('status','revoked'); end if;
  if exists(
    select 1 from public.memberships
    where user_id=r.user_id and status in ('suspended','revoked')
  ) then return jsonb_build_object('status','revoked'); end if;

  select checked_in_at into previous
  from public.attendance_checkins
  where registration_id=r.id;
  if found then
    return jsonb_build_object('status','already','checkedInAt',previous);
  end if;

  if r.status<>'confirmed' then return jsonb_build_object('status','pending'); end if;
  if e.admission='paid' and r.payment<>'paid' then return jsonb_build_object('status','payment'); end if;

  insert into public.attendance_checkins(registration_id,event_id,staff_id)
  values(r.id,r.event_id,auth.uid());
  update public.event_registrations
  set status='checked_in',attendance='checked_in'
  where id=r.id;
  perform private.record_operation(
    'attendance.checked_in',
    'registration',
    r.id,
    jsonb_build_object('status',r.status,'attendance',r.attendance),
    jsonb_build_object('status','checked_in','attendance','checked_in','method','manual'),
    r.user_id
  );
  return jsonb_build_object(
    'status','valid',
    'reference',r.reference,
    'name',coalesce(r.attendee_name,(select display_name from public.profiles where id=r.user_id))
  );
end $function$;

revoke all on function private.manual_check_in(uuid) from public;
grant execute on function private.manual_check_in(uuid) to authenticated;

create or replace function public.csc_manual_check_in(registration uuid)
returns jsonb
language sql
security invoker
set search_path to ''
as $$ select private.manual_check_in(registration) $$;

revoke all on function public.csc_manual_check_in(uuid) from public;
grant execute on function public.csc_manual_check_in(uuid) to authenticated;
