-- CSC authorization repair. No records are deleted or re-keyed.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create or replace function private.account_allowed() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
 and not exists(select 1 from public.memberships where user_id=auth.uid() and status in ('suspended','revoked','rejected'));
$$;
revoke all on function private.account_allowed() from public;
grant execute on function private.account_allowed() to anon, authenticated;
create or replace function private.has_permission(permission text) returns boolean
language sql stable security definer set search_path = '' as $$
 select private.account_allowed() and exists (
  select 1 from public.admin_roles a where a.user_id=auth.uid() and (
   a.role='super_admin' or case a.role
    when 'community_admin' then permission=any(array['members.read','members.approve','members.suspend','directory.manage','consultations.manage','reviews.moderate','registrations.read'])
    when 'event_manager' then permission=any(array['events.create','events.update','events.publish','registrations.read','registrations.approve','attendance.scan'])
    when 'checkin_staff' then permission='attendance.scan'
    when 'finance_reviewer' then permission=any(array['payments.verify','registrations.read'])
    when 'content_manager' then permission=any(array['content.manage','media.manage','reviews.moderate'])
    when 'tech_admin' then permission=any(array['audit.read','settings.manage'])
    else false end));
$$;
revoke all on function private.has_permission(text) from public;
grant execute on function private.has_permission(text) to anon, authenticated;
alter policy claims_insert_own on public.membership_claims with check
 (auth.uid()=user_id and status='claim_submitted' and declaration_accurate);
drop policy if exists reg_insert_own on public.event_registrations;
drop policy if exists reg_update_own on public.event_registrations;
alter policy reviews_insert_own on public.reviews with check
 (auth.uid()=user_id and moderation in ('draft','submitted'));
alter policy reviews_update_own on public.reviews with check
 (auth.uid()=user_id and moderation in ('draft','submitted'));
alter policy dir_insert_own on public.directory_startups with check
 (auth.uid()=user_id and status in ('draft','pending'));
alter policy dir_update_own on public.directory_startups using
 (auth.uid()=user_id and status in ('draft','pending')) with check
 (auth.uid()=user_id and status in ('draft','pending'));
alter policy consult_insert_own on public.consultations with check
 (auth.uid()=user_id and status='submitted' and assigned_rep is null and scheduled_at is null);
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles for select to authenticated using (private.has_permission('members.read'));
drop policy if exists memberships_admin_read on public.memberships;
create policy memberships_admin_read on public.memberships for select to authenticated using (private.has_permission('members.read'));
drop policy if exists memberships_admin_write on public.memberships;
drop policy if exists claims_admin_read on public.membership_claims;
create policy claims_admin_read on public.membership_claims for select to authenticated using (private.has_permission('members.read'));
drop policy if exists claims_admin_write on public.membership_claims;
drop policy if exists reg_admin_read on public.event_registrations;
create policy reg_admin_read on public.event_registrations for select to authenticated using (private.has_permission('registrations.read'));
drop policy if exists reg_admin_write on public.event_registrations;
drop policy if exists consult_admin_read on public.consultations;
create policy consult_admin_read on public.consultations for select to authenticated using (private.has_permission('consultations.manage'));
drop policy if exists consult_admin_write on public.consultations;
create policy consult_admin_write on public.consultations for update to authenticated using (private.has_permission('consultations.manage')) with check (private.has_permission('consultations.manage'));
drop policy if exists reviews_admin_read on public.reviews;
create policy reviews_admin_read on public.reviews for select to authenticated using (private.has_permission('reviews.moderate'));
drop policy if exists reviews_admin_write on public.reviews;
create policy reviews_admin_write on public.reviews for update to authenticated using (private.has_permission('reviews.moderate')) with check (private.has_permission('reviews.moderate'));
drop policy if exists dir_admin_write on public.directory_startups;
create policy dir_admin_write on public.directory_startups for update to authenticated using (private.has_permission('directory.manage')) with check (private.has_permission('directory.manage'));
drop policy if exists consub_admin_read on public.consultation_submissions;
create policy consub_admin_read on public.consultation_submissions for select to authenticated using (private.has_permission('consultations.manage'));
drop policy if exists consub_admin_update on public.consultation_submissions;
create policy consub_admin_update on public.consultation_submissions for update to authenticated using (private.has_permission('consultations.manage')) with check (private.has_permission('consultations.manage'));
drop policy if exists rsvpsub_admin_read on public.rsvp_submissions;
create policy rsvpsub_admin_read on public.rsvp_submissions for select to authenticated using (private.has_permission('registrations.read'));
drop policy if exists rsvpsub_admin_update on public.rsvp_submissions;
create policy rsvpsub_admin_update on public.rsvp_submissions for update to authenticated using (private.has_permission('registrations.approve')) with check (private.has_permission('registrations.approve'));
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select to authenticated using (private.has_permission('audit.read'));
drop policy if exists content_admin_read on public.content_blocks;
create policy content_admin_read on public.content_blocks for select to authenticated using (private.has_permission('content.manage'));
drop policy if exists media_admin_read on public.media_assets;
create policy media_admin_read on public.media_assets for select to authenticated using (private.has_permission('media.manage'));
drop policy if exists notif_admin_read on public.notifications;
create policy notif_admin_read on public.notifications for select to authenticated using (private.has_permission('settings.manage'));

-- Queue RPCs are server-only: clients cannot skip validation or set approved status.
revoke insert on public.consultation_submissions, public.rsvp_submissions from anon, authenticated;
grant select,insert on public.consultation_submissions,public.rsvp_submissions to service_role;
grant select on public.events to service_role;
drop policy if exists consub_insert_public on public.consultation_submissions;
drop policy if exists rsvpsub_insert_public on public.rsvp_submissions;
alter function public.submit_consultation(text,text,text,text,text) security invoker;
alter function public.submit_rsvp(uuid,text,text,text,text,text,text) security invoker;
revoke all on function public.submit_consultation(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.submit_rsvp(uuid,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_consultation(text,text,text,text,text) to service_role;
grant execute on function public.submit_rsvp(uuid,text,text,text,text,text,text) to service_role;
alter function public.set_updated_at() set search_path=public;
alter function public.next_member_number() set search_path=public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.next_member_number() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon, authenticated;
-- is_admin is no longer used by policies; role checks use private.has_permission.

-- Read-only public projection: no access to underlying private profiles.
create or replace function private.testimonials() returns table (
 id uuid, rating integer, review text, created_at timestamptz,
 name text, avatar_url text, designation text
) language sql stable security definer set search_path='' as $$
 select r.id,r.rating,r.review,r.created_at,
 case when coalesce((p.consent->>'displayNamePublicly')::boolean,false)
 then coalesce(p.display_name,'CSC Member') else 'CSC Member' end,
 case when coalesce((p.consent->>'displayPhotoPublicly')::boolean,false)
 then p.avatar_url else null end,
 coalesce(p.designations[1]::text,'Community Member')
 from public.reviews r join public.profiles p on p.id=r.user_id
 where r.moderation='approved' and r.kind='general';
$$;
revoke all on function private.testimonials() from public;
grant execute on function private.testimonials() to anon, authenticated;
create or replace view public.public_testimonials with (security_invoker=true)
 as select * from private.testimonials();
grant select on public.public_testimonials to anon, authenticated;
create policy account_state_guard on public.profiles as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.membership_claims as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.events as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.event_registrations as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.consultations as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.reviews as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.directory_startups as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.admin_roles as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.audit_logs as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.content_blocks as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.media_assets as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.notifications as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.consultation_submissions as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());
create policy account_state_guard on public.rsvp_submissions as restrictive for all to authenticated using (private.account_allowed()) with check (private.account_allowed());

-- Operational records: keep the existing canonical tables and UUID relationships.
alter table public.memberships add column verification_token text unique
 default replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
alter table public.event_registrations add column pass_token text unique;
alter table public.events add column price_minor integer not null default 0 check(price_minor>=0);
alter table public.events add column settings jsonb not null default '{}';
create table public.attendance_checkins(
 id uuid primary key default gen_random_uuid(),
 registration_id uuid not null unique references public.event_registrations(id),
 event_id uuid not null references public.events(id),
 staff_id uuid not null references auth.users(id),
 checked_in_at timestamptz not null default now()
);
create table public.event_staff(
 event_id uuid not null references public.events(id), user_id uuid not null references auth.users(id),
 primary key(event_id,user_id)
);
create table public.payments(
 id uuid primary key default gen_random_uuid(), registration_id uuid not null unique references public.event_registrations(id),
 amount_minor integer not null check(amount_minor>0), currency text not null default 'INR' check(currency='INR'),
 status text not null default 'awaiting_payment' check(status in ('awaiting_payment','pending_verification','verified','rejected','refunded')),
 reference text, evidence_path text, reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.attendance_checkins enable row level security;
alter table public.event_staff enable row level security;
alter table public.payments enable row level security;
grant select on public.attendance_checkins,public.event_staff,public.payments to authenticated;
create policy attendance_read on public.attendance_checkins for select to authenticated using
 (private.has_permission('registrations.read') or (private.has_permission('attendance.scan') and exists(select 1 from public.event_staff s where s.event_id=attendance_checkins.event_id and s.user_id=auth.uid())));
create policy event_staff_read on public.event_staff for select to authenticated using(user_id=auth.uid() or private.has_permission('events.update'));
create policy payments_read on public.payments for select to authenticated using(private.has_permission('payments.verify') or exists(select 1 from public.event_registrations r where r.id=payments.registration_id and r.user_id=auth.uid()));
create index registrations_event_status on public.event_registrations(event_id,status);
create index claims_user_status on public.membership_claims(user_id,status);
create index audit_target on public.audit_logs(target_type,target_id,created_at);
-- Notifications is the durable outbox, reusing its existing admin interface.
alter table public.notifications add column dedupe_key text unique;
alter table public.notifications add column attempts integer not null default 0;
alter table public.notifications add column available_at timestamptz not null default now();
alter table public.notifications add column locked_until timestamptz;
alter table public.notifications add column last_error text;

create or replace function private.record_operation(action text,kind text,target uuid,before_data jsonb,after_data jsonb,recipient uuid default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(action,actor_id,actor_role,target_type,target_id,before,after,correlation_id)
 values(action,auth.uid(),(select role from public.admin_roles where user_id=auth.uid() order by role limit 1),kind,target::text,jsonb_build_object('status',coalesce(before_data->>'status',before_data->>'moderation')),after_data,gen_random_uuid()::text);
 insert into public.notifications(type,channel,recipient,payload,dedupe_key)
 select action,'in_app',recipient::text,jsonb_build_object('target',target,'kind',kind),action||':'||target||':'||coalesce(after_data->>'status',after_data->>'moderation','')
 where recipient is not null on conflict(dedupe_key) do nothing;
end $$;
revoke all on function private.record_operation(text,text,uuid,jsonb,jsonb,uuid) from public,anon,authenticated;

create or replace function private.register_event(event uuid,objective text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.events; r public.event_registrations; m public.memberships;
begin
 if not private.account_allowed() then raise exception 'forbidden' using errcode='42501'; end if;
 select * into m from public.memberships where user_id=auth.uid();
 if m.status is distinct from 'active' or (m.expires_at is not null and m.expires_at<=now()) then raise exception 'active membership required' using errcode='42501'; end if;
 select * into e from public.events where id=event for update;
 if not found or e.status<>'published' or e.starts_at<=now() or e.registration_state<>'open' or (e.registration_deadline is not null and e.registration_deadline<=now()) then raise exception 'registration closed'; end if;
 if length(trim(objective))<2 or length(objective)>500 then raise exception 'invalid objective'; end if;
 select * into r from public.event_registrations where event_id=event and user_id=auth.uid();
 if found then return jsonb_build_object('id',r.id,'reference',r.reference,'status',r.status); end if;
 insert into public.event_registrations(user_id,event_id,reference,status,payment,goal)
 values(auth.uid(),event,'REG-'||gen_random_uuid()::text,case when e.admission='paid' then 'pending_payment'::public.registration_status else 'pending_review'::public.registration_status end,case when e.admission='paid' then 'pending'::public.payment_status else 'not_required'::public.payment_status end,objective) returning * into r;
 if e.admission='paid' then
  if e.price_minor<=0 then raise exception 'event price unavailable'; end if;
  insert into public.payments(registration_id,amount_minor) values(r.id,e.price_minor);
 end if;
 perform private.record_operation('registration.submitted','registration',r.id,null,jsonb_build_object('status',r.status),auth.uid());
 return jsonb_build_object('id',r.id,'reference',r.reference,'status',r.status);
end $$;
revoke all on function private.register_event(uuid,text) from public;
grant execute on function private.register_event(uuid,text) to authenticated;
create function public.csc_register_event(event uuid,objective text) returns jsonb language sql security invoker set search_path='' as $$ select private.register_event(event,objective) $$;
revoke all on function public.csc_register_event(uuid,text) from public;
grant execute on function public.csc_register_event(uuid,text) to authenticated;

create or replace function private.admin_action(kind text,target uuid,decision text,reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old_data jsonb; new_data jsonb; recipient uuid; r public.event_registrations; e public.events; c public.membership_claims; p public.payments; n integer;
begin
 if not private.account_allowed() then raise exception 'forbidden' using errcode='42501'; end if;
 if length(coalesce(reason,''))>1000 then raise exception 'invalid reason'; end if;
 if decision in ('rejected','suspended','revoked','cancelled') and length(trim(coalesce(reason,'')))<5 then raise exception 'reason required'; end if;
 case kind
 when 'claim' then
  if not private.has_permission('members.approve') then raise exception 'forbidden' using errcode='42501'; end if;
  select * into c from public.membership_claims where id=target for update;
  if not found then raise exception 'not found'; end if;
  if decision not in ('pending_verification','active','rejected') then raise exception 'invalid transition'; end if;
  if c.status not in ('claim_submitted','pending_verification','approved') then raise exception 'claim already decided'; end if;
  if decision='active' and c.status not in ('pending_verification','approved') then raise exception 'verify claim first'; end if;
  old_data=to_jsonb(c); recipient=c.user_id;
  update public.membership_claims set status=decision::public.membership_status where id=target;
  if decision='active' then
   if not exists(select 1 from auth.users where id=c.user_id and email_confirmed_at is not null) then raise exception 'unverified account'; end if;
   update public.memberships set status='active',member_number=coalesce(member_number,public.next_member_number()),issued_at=coalesce(issued_at,now()) where user_id=c.user_id and status not in ('suspended','revoked');
   if not found then raise exception 'membership unavailable'; end if;
  end if;
  new_data=jsonb_build_object('status',decision,'reason',reason);
 when 'member' then
  if not private.has_permission('members.suspend') then raise exception 'forbidden' using errcode='42501'; end if;
  if decision not in ('suspended','revoked','active') then raise exception 'invalid transition'; end if;
  select to_jsonb(m) into old_data from public.memberships m where user_id=target for update;
  if old_data is null then raise exception 'not found'; end if;
  if decision='active' and (old_data->>'status'<>'suspended' or old_data->>'member_number' is null) then raise exception 'not eligible for reactivation'; end if;
  update public.memberships set status=decision::public.membership_status,verification_token=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','') where user_id=target;
  recipient=target; new_data=jsonb_build_object('status',decision,'reason',reason);
 when 'registration' then
  if not private.has_permission('registrations.approve') then raise exception 'forbidden' using errcode='42501'; end if;
  -- All approvals serialize on the event before locking a registration.
  select * into e from public.events where id=(select event_id from public.event_registrations where id=target) for update;
  select * into r from public.event_registrations where id=target for update;
  if not found then raise exception 'not found'; end if;
  if decision not in ('confirmed','waitlisted','cancelled') then raise exception 'invalid transition'; end if;
  if r.status::text=decision then return jsonb_build_object('ok',true,'status',decision); end if;
  if r.status in ('cancelled','refunded','checked_in') then raise exception 'registration closed'; end if;
  if decision='confirmed' then
   if e.status<>'published' or e.ends_at<=now() then raise exception 'event unavailable'; end if;
   if not exists(select 1 from public.memberships where user_id=r.user_id and status='active' and (expires_at is null or expires_at>now())) then raise exception 'membership ineligible'; end if;
   if e.admission='paid' and not exists(select 1 from public.payments where registration_id=r.id and status='verified' and amount_minor=e.price_minor) then raise exception 'payment not verified'; end if;
   select count(*) into n from public.event_registrations where event_id=e.id and status in ('confirmed','checked_in');
   if e.capacity is not null and n>=e.capacity then raise exception 'event full'; end if;
  end if;
  old_data=jsonb_build_object('status',r.status); recipient=r.user_id;
  update public.event_registrations set status=decision::public.registration_status,pass_token=case when decision='confirmed' then replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','') else null end where id=target;
  new_data=jsonb_build_object('status',decision,'reason',reason);
 when 'payment' then
  if not private.has_permission('payments.verify') then raise exception 'forbidden' using errcode='42501'; end if;
  if decision not in ('verified','rejected','refunded') or length(trim(coalesce(reason,'')))<5 then raise exception 'independent settlement reference required'; end if;
  select * into p from public.payments where id=target for update;
  if not found then raise exception 'not found'; end if;
  if p.status=decision then return jsonb_build_object('ok',true,'status',decision); end if;
  if p.status='refunded' or (decision='refunded' and p.status<>'verified') then raise exception 'invalid transition'; end if;
  old_data=jsonb_build_object('status',p.status);
  update public.payments set status=decision,reference=reason,reviewed_by=auth.uid(),reviewed_at=now() where id=target;
  update public.event_registrations set payment=case when decision='verified' then 'paid'::public.payment_status when decision='refunded' then 'refunded'::public.payment_status else 'pending'::public.payment_status end, pass_token=case when decision='verified' then pass_token else null end where id=p.registration_id returning user_id into recipient;
  new_data=jsonb_build_object('status',decision);
 when 'review' then
  if not private.has_permission('reviews.moderate') then raise exception 'forbidden' using errcode='42501'; end if;
  if decision not in ('approved','rejected','under_review') then raise exception 'invalid transition'; end if;
  select to_jsonb(v),v.user_id into old_data,recipient from public.reviews v where id=target for update;
  if old_data is null then raise exception 'not found'; end if;
  update public.reviews set moderation=decision::public.review_moderation_status where id=target;
  new_data=jsonb_build_object('moderation',decision,'reason',reason);
 when 'startup' then
  if not private.has_permission('directory.manage') then raise exception 'forbidden' using errcode='42501'; end if;
  if decision not in ('published','archived','pending') then raise exception 'invalid transition'; end if;
  select to_jsonb(d),d.user_id into old_data,recipient from public.directory_startups d where id=target for update;
  if old_data is null then raise exception 'not found'; end if;
  if decision='published' and not exists(select 1 from public.profiles where id=recipient and consent->>'directoryParticipation'='true') then raise exception 'directory consent required'; end if;
  update public.directory_startups set status=decision::public.publication_status where id=target;
  new_data=jsonb_build_object('status',decision,'reason',reason);
 when 'consultation' then
  if not private.has_permission('consultations.manage') then raise exception 'forbidden' using errcode='42501'; end if;
  select to_jsonb(q) into old_data from public.consultation_submissions q where id=target for update;
  if old_data is null then raise exception 'not found'; end if;
  if not ((old_data->>'status'='submitted' and decision in ('under_review','declined','cancelled')) or (old_data->>'status'='under_review' and decision in ('approved','more_info_required','declined','cancelled')) or (old_data->>'status'='more_info_required' and decision in ('under_review','cancelled')) or (old_data->>'status'='approved' and decision in ('scheduled','cancelled')) or (old_data->>'status'='scheduled' and decision in ('completed','cancelled'))) then raise exception 'invalid transition'; end if;
  update public.consultation_submissions set status=decision::public.consultation_status where id=target;
  new_data=jsonb_build_object('status',decision,'reason',reason);
 else raise exception 'unsupported operation'; end case;
 perform private.record_operation(kind||'.'||decision,kind,target,old_data,new_data,recipient);
 return jsonb_build_object('ok',true,'status',decision);
end $$;
revoke all on function private.admin_action(text,uuid,text,text) from public;
grant execute on function private.admin_action(text,uuid,text,text) to authenticated;
create function public.csc_admin_action(kind text,target uuid,decision text,reason text) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_action(kind,target,decision,reason) $$;
revoke all on function public.csc_admin_action(text,uuid,text,text) from public;
grant execute on function public.csc_admin_action(text,uuid,text,text) to authenticated;

create or replace function private.check_in(event uuid,token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.event_registrations; e public.events; previous timestamptz;
begin
 if not private.has_permission('attendance.scan') then raise exception 'forbidden' using errcode='42501'; end if;
 if not private.has_permission('events.update') and not exists(select 1 from public.event_staff where event_id=event and user_id=auth.uid()) then raise exception 'event assignment required' using errcode='42501'; end if;
 if length(token)<>64 then return jsonb_build_object('status','invalid'); end if;
 select * into e from public.events where id=event for update;
 select * into r from public.event_registrations where pass_token=token for update;
 if not found then return jsonb_build_object('status','invalid'); end if;
 if r.event_id<>event then return jsonb_build_object('status','wrong_event'); end if;
 if e.status<>'published' or now()<e.starts_at-interval '2 hours' or now()>e.ends_at then return jsonb_build_object('status','revoked'); end if;
 if not exists(select 1 from public.memberships where user_id=r.user_id and status='active' and (expires_at is null or expires_at>now())) then return jsonb_build_object('status','revoked'); end if;
 select checked_in_at into previous from public.attendance_checkins where registration_id=r.id;
 if found then return jsonb_build_object('status','already','checkedInAt',previous); end if;
 if r.status<>'confirmed' then return jsonb_build_object('status','pending'); end if;
 if e.admission='paid' and not exists(select 1 from public.payments where registration_id=r.id and status='verified' and amount_minor=e.price_minor) then return jsonb_build_object('status','payment'); end if;
 insert into public.attendance_checkins(registration_id,event_id,staff_id) values(r.id,event,auth.uid());
 update public.event_registrations set status='checked_in',attendance='checked_in' where id=r.id;
 perform private.record_operation('attendance.checked_in','registration',r.id,jsonb_build_object('status',r.status),jsonb_build_object('status','checked_in'),r.user_id);
 return jsonb_build_object('status','valid','reference',r.reference,'name',(select display_name from public.profiles where id=r.user_id));
end $$;
revoke all on function private.check_in(uuid,text) from public;
grant execute on function private.check_in(uuid,text) to authenticated;
create function public.csc_check_in(event uuid,token text) returns jsonb language sql security invoker set search_path='' as $$ select private.check_in(event,token) $$;
revoke all on function public.csc_check_in(uuid,text) from public;
grant execute on function public.csc_check_in(uuid,text) to authenticated;
-- All administrative changes use audited transaction RPCs, never broad row updates.
drop policy if exists consult_admin_write on public.consultations;
drop policy if exists reviews_admin_write on public.reviews;
drop policy if exists dir_admin_write on public.directory_startups;
drop policy if exists consub_admin_update on public.consultation_submissions;
drop policy if exists rsvpsub_admin_update on public.rsvp_submissions;

create or replace function private.save_event(payload jsonb,target uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare e public.events; out_id uuid; start_at timestamptz; end_at timestamptz; capacity integer; price integer;
begin
 if not private.has_permission(case when target is null then 'events.create' else 'events.update' end) then raise exception 'forbidden' using errcode='42501'; end if;
 if payload->>'status'='published' and not private.has_permission('events.publish') then raise exception 'forbidden' using errcode='42501'; end if;
 if length(trim(payload->>'title')) not between 3 and 140 or payload->>'slug'!~'^[a-z0-9-]{3,160}$' or length(payload->>'description') not between 10 and 4000 or payload->>'category' not in ('meetup','pitch-session','workshop','networking','consultation') then raise exception 'invalid event'; end if;
 if payload->>'status' not in ('draft','published') or payload->>'admission' not in ('free','paid') then raise exception 'invalid event'; end if;
 start_at=(payload->>'date'||'T'||payload->>'startTime'||':00+05:30')::timestamptz;
 end_at=(payload->>'date'||'T'||payload->>'endTime'||':00+05:30')::timestamptz;
 if end_at<=start_at then raise exception 'invalid event times'; end if;
 capacity=nullif(payload->>'capacity','')::integer;
 if capacity is not null and capacity<1 then raise exception 'invalid capacity'; end if;
 price=case when payload->>'admission'='paid' then round((payload->>'price')::numeric*100)::integer else 0 end;
 if payload->>'admission'='paid' and (price is null or price<=0) then raise exception 'invalid price'; end if;
 if coalesce(payload->>'currency','INR')<>'INR' then raise exception 'unsupported currency'; end if;
 if target is not null then
  select * into e from public.events where id=target for update;
  if not found then raise exception 'not found'; end if;
  if exists(select 1 from public.event_registrations where event_id=target and status in ('confirmed','checked_in')) and (e.price_minor<>price or e.admission<>payload->>'admission') then raise exception 'cannot change confirmed ticket pricing'; end if;
  if capacity is not null and capacity<(select count(*) from public.event_registrations where event_id=target and status in ('confirmed','checked_in')) then raise exception 'capacity below confirmed count'; end if;
 end if;
 insert into public.events(id,slug,title,category,description,cover_image,starts_at,ends_at,location,venue,capacity,registration_deadline,status,admission,registration_state,price_minor,settings)
 values(coalesce(target,gen_random_uuid()),payload->>'slug',payload->>'title',payload->>'category',payload->>'description',nullif(payload->>'coverImage',''),start_at,end_at,coalesce(nullif(payload->>'venueAddress',''),'Coimbatore'),nullif(payload->>'venueName',''),capacity,nullif(payload->>'registrationDeadline','')::timestamptz,(payload->>'status')::public.publication_status,payload->>'admission',case when payload->>'status'='published' then 'open' else 'coming-soon' end,price,payload)
 on conflict(id) do update set slug=excluded.slug,title=excluded.title,category=excluded.category,description=excluded.description,cover_image=excluded.cover_image,starts_at=excluded.starts_at,ends_at=excluded.ends_at,location=excluded.location,venue=excluded.venue,capacity=excluded.capacity,registration_deadline=excluded.registration_deadline,status=excluded.status,admission=excluded.admission,registration_state=excluded.registration_state,price_minor=excluded.price_minor,settings=excluded.settings
 returning id into out_id;
 perform private.record_operation('event.'||(payload->>'status'),'event',out_id,jsonb_build_object('status',e.status),jsonb_build_object('status',payload->>'status'),null);
 return out_id;
end $$;
revoke all on function private.save_event(jsonb,uuid) from public;
grant execute on function private.save_event(jsonb,uuid) to authenticated;
create function public.csc_save_event(payload jsonb,target uuid default null) returns uuid language sql security invoker set search_path='' as $$ select private.save_event(payload,target) $$;
revoke all on function public.csc_save_event(jsonb,uuid) from public;
grant execute on function public.csc_save_event(jsonb,uuid) to authenticated;
create policy events_admin_read on public.events for select to authenticated using(private.has_permission('events.update'));
create policy directory_admin_read on public.directory_startups for select to authenticated using(private.has_permission('directory.manage'));

create function private.verify_membership(token text) returns boolean language sql stable security definer set search_path='' as $$
 select length(token)=64 and exists(select 1 from public.memberships where verification_token=token and status='active' and (expires_at is null or expires_at>now()));
$$;
revoke all on function private.verify_membership(text) from public;
grant execute on function private.verify_membership(text) to anon,authenticated;
create function public.csc_verify_membership(token text) returns boolean language sql security invoker set search_path='' as $$select private.verify_membership(token)$$;
revoke all on function public.csc_verify_membership(text) from public;
grant execute on function public.csc_verify_membership(text) to anon,authenticated;

-- Idempotent profile repair for accounts predating the signup trigger.
create function private.ensure_profile() returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'forbidden' using errcode='42501'; end if;
 insert into public.profiles(id,email,full_name,display_name)
 select id,email,coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),coalesce(raw_user_meta_data->>'name','') from auth.users where id=auth.uid() on conflict(id) do nothing;
 insert into public.memberships(user_id,status) values(auth.uid(),'not_started') on conflict(user_id) do nothing;
end $$;
revoke all on function private.ensure_profile() from public;
grant execute on function private.ensure_profile() to authenticated;
create function public.csc_ensure_profile() returns void language sql security invoker set search_path='' as $$select private.ensure_profile()$$;
revoke all on function public.csc_ensure_profile() from public;
grant execute on function public.csc_ensure_profile() to authenticated;

-- Queue notifications in the same transaction as a successful submission.
create function private.submission_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb=to_jsonb(new); recipient text; channel text;
begin
 recipient=coalesce(row_data->>'user_id',row_data->>'email');
 channel=case when row_data->>'user_id' is null then 'email' else 'in_app' end;
 insert into public.notifications(type,channel,recipient,payload,dedupe_key)
 values(tg_table_name||'.submitted',channel,recipient,jsonb_build_object('target',new.id,'kind',tg_table_name),tg_table_name||':'||new.id) on conflict(dedupe_key) do nothing;
 return new;
end $$;
revoke all on function private.submission_notification() from public,anon,authenticated;
create trigger consultation_outbox after insert on public.consultation_submissions for each row execute function private.submission_notification();
create trigger rsvp_outbox after insert on public.rsvp_submissions for each row execute function private.submission_notification();
create trigger claim_outbox after insert on public.membership_claims for each row execute function private.submission_notification();
create trigger review_outbox after insert on public.reviews for each row execute function private.submission_notification();

create or replace function public.submit_consultation(p_full_name text,p_startup text,p_whatsapp text,p_email text,p_challenge text) returns text
language plpgsql security invoker set search_path='' as $$
declare ref uuid;
begin
 if length(trim(p_full_name)) not between 2 and 80 or length(trim(p_startup)) not between 2 and 120 or p_email!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or p_whatsapp!~'^\+?[0-9][0-9 -]{7,16}$' or length(p_challenge) not between 20 and 1200 then raise exception 'invalid submission'; end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_email))||p_challenge,0));
 select id into ref from public.consultation_submissions where lower(email)=lower(trim(p_email)) and challenge=p_challenge and created_at>now()-interval '1 day' order by created_at limit 1;
 if ref is null then
 insert into public.consultation_submissions(full_name,startup,whatsapp,email,challenge,consent) values(trim(p_full_name),trim(p_startup),regexp_replace(p_whatsapp,'[ -]','','g'),lower(trim(p_email)),p_challenge,true) returning id into ref;
 end if;
 return 'CON-'||ref;
end $$;
create or replace function public.submit_rsvp(p_event_id uuid,p_event_label text,p_full_name text,p_startup text,p_whatsapp text,p_email text,p_goal text) returns text
language plpgsql security invoker set search_path='' as $$
declare ref uuid; e public.events;
begin
 if length(trim(p_full_name)) not between 2 and 80 or length(trim(p_startup)) not between 2 and 120 or p_email!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or p_whatsapp!~'^\+?[0-9][0-9 -]{7,16}$' or length(p_goal) not between 2 and 100 then raise exception 'invalid submission'; end if;
 select * into e from public.events where id=p_event_id for update;
 if not found or e.status<>'published' or e.starts_at<=now() or e.registration_state<>'open' or (e.registration_deadline is not null and e.registration_deadline<=now()) then raise exception 'event unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_email))||p_event_id,0));
 select id into ref from public.rsvp_submissions where event_id=p_event_id and lower(email)=lower(trim(p_email)) limit 1;
 if ref is null then
 insert into public.rsvp_submissions(event_id,event_label,full_name,startup,whatsapp,email,goal,consent) values(e.id,e.title,trim(p_full_name),trim(p_startup),regexp_replace(p_whatsapp,'[ -]','','g'),lower(trim(p_email)),p_goal,true) returning id into ref;
 end if;
 return 'RSVP-'||ref;
end $$;

-- Honor revocation of directory consent on every public read.
create function private.directory_visible(owner_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=owner_id and consent->>'directoryParticipation'='true');
$$;
revoke all on function private.directory_visible(uuid) from public;
grant execute on function private.directory_visible(uuid) to anon,authenticated;
alter policy dir_select_published on public.directory_startups using
 ((status='published' and private.directory_visible(user_id)) or auth.uid()=user_id);

-- Serialize duplicate submissions without deleting or modifying historic duplicates.
create function private.prevent_duplicate_member_submission() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(tg_table_name||new.user_id::text,0));
 if tg_table_name='membership_claims' and exists(select 1 from public.membership_claims where user_id=new.user_id and status in ('claim_submitted','pending_verification','approved')) then raise exception 'pending claim exists' using errcode='23505'; end if;
 return new;
end $$;
revoke all on function private.prevent_duplicate_member_submission() from public,anon,authenticated;
create trigger claim_dedup before insert on public.membership_claims for each row execute function private.prevent_duplicate_member_submission();
-- A separate review trigger avoids referring to a non-existent kind column on claims.
create function private.prevent_duplicate_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('review'||new.user_id::text,0));
 if new.kind='general' and exists(select 1 from public.reviews where user_id=new.user_id and kind='general') then raise exception 'review exists' using errcode='23505'; end if;
 return new;
end $$;
revoke all on function private.prevent_duplicate_review() from public,anon,authenticated;
create trigger review_dedup before insert on public.reviews for each row execute function private.prevent_duplicate_review();
create function private.save_content(content_key text,content_value text,publish boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.has_permission('content.manage') then raise exception 'forbidden' using errcode='42501'; end if;
 if content_key not in ('homepage.announcement','community.introduction','about.mission','about.vision') or length(content_value)>4000 then raise exception 'invalid content'; end if;
 insert into public.content_blocks(key,label,value,status) values(content_key,content_key,content_value,case when publish then 'published'::public.publication_status else 'draft'::public.publication_status end)
 on conflict(key) do update set value=excluded.value,status=excluded.status,updated_at=now();
 insert into public.audit_logs(action,actor_id,target_type,target_id,after,correlation_id) values('content.saved',auth.uid(),'content',content_key,jsonb_build_object('published',publish),gen_random_uuid()::text);
end $$;
revoke all on function private.save_content(text,text,boolean) from public;
grant execute on function private.save_content(text,text,boolean) to authenticated;
create function public.csc_save_content(content_key text,content_value text,publish boolean) returns void language sql security invoker set search_path='' as $$select private.save_content(content_key,content_value,publish)$$;
revoke all on function public.csc_save_content(text,text,boolean) from public;
grant execute on function public.csc_save_content(text,text,boolean) to authenticated;

create policy media_admin_insert on public.media_assets for insert to authenticated with check(private.has_permission('media.manage') and visibility='private');
grant insert on public.media_assets to authenticated;
create function private.media_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.record_operation('media.uploaded','media',new.id,null,jsonb_build_object('visibility',new.visibility),null); return new;
end $$;
revoke all on function private.media_audit() from public,anon,authenticated;
create trigger media_audit after insert on public.media_assets for each row execute function private.media_audit();
commit;
