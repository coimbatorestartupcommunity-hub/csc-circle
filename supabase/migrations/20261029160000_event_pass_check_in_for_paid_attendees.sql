-- Make event-pass check-in work for paid Google Form attendees.
--
-- The previous private.check_in required the pass holder to be an ACTIVE CSC
-- member and to have a verified `payments` row. Imported (and other paid)
-- attendees are event-goers, not members, and their payment is recorded on the
-- registration itself (payment = 'paid' at admin approval) rather than a
-- payments row — so every valid imported pass returned "revoked"/"payment".
-- It also refused any scan more than 2 hours before the event start.
--
-- New rules: a pass is valid when the event is published and not yet over, the
-- registration is confirmed, and (for paid events) the registration is paid.
-- Membership is no longer required; the 2-hour early window is removed.

create or replace function private.check_in(event uuid, token text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare r public.event_registrations; e public.events; previous timestamptz;
begin
  if not private.has_permission('attendance.scan') then raise exception 'forbidden' using errcode='42501'; end if;
  if not private.has_permission('events.update') and not exists(select 1 from public.event_staff where event_id=event and user_id=auth.uid()) then raise exception 'event assignment required' using errcode='42501'; end if;
  if length(token)<>64 then return jsonb_build_object('status','invalid'); end if;
  select * into e from public.events where id=event for update;
  select * into r from public.event_registrations where pass_token=token for update;
  if not found then return jsonb_build_object('status','invalid'); end if;
  if r.event_id<>event then return jsonb_build_object('status','wrong_event'); end if;
  if e.status<>'published' or now()>e.ends_at then return jsonb_build_object('status','revoked'); end if;
  -- Non-members may hold paid event passes, but a member whose membership was
  -- suspended or revoked must still be refused entry.
  if exists(select 1 from public.memberships where user_id=r.user_id and status in ('suspended','revoked')) then return jsonb_build_object('status','revoked'); end if;
  select checked_in_at into previous from public.attendance_checkins where registration_id=r.id;
  if found then return jsonb_build_object('status','already','checkedInAt',previous); end if;
  if r.status<>'confirmed' then return jsonb_build_object('status','pending'); end if;
  if e.admission='paid' and r.payment<>'paid' then return jsonb_build_object('status','payment'); end if;
  insert into public.attendance_checkins(registration_id,event_id,staff_id) values(r.id,event,auth.uid());
  update public.event_registrations set status='checked_in',attendance='checked_in' where id=r.id;
  perform private.record_operation('attendance.checked_in','registration',r.id,jsonb_build_object('status',r.status),jsonb_build_object('status','checked_in'),r.user_id);
  return jsonb_build_object('status','valid','reference',r.reference,'name',(select display_name from public.profiles where id=r.user_id));
end $function$;
