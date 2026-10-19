-- Reuse notifications as the authoritative outbox. No credentials or SMTP responses stored.
begin;
alter table public.notifications drop constraint if exists notifications_status_check;
alter table public.notifications add constraint notifications_status_check check(status in ('queued','processing','sent','failed_retryable','failed_permanent','failed','retrying'));
alter table public.notifications add column template_key text;
alter table public.notifications add column template_version integer not null default 1;
alter table public.notifications add column recipient_user_id uuid references auth.users(id);
alter table public.notifications add column audience text not null default 'member' check(audience in ('member','admin'));
alter table public.notifications add column related_record_type text;
alter table public.notifications add column related_record_id uuid;
alter table public.notifications add column max_attempts integer not null default 5 check(max_attempts between 1 and 10);
alter table public.notifications add column lease_id uuid;
alter table public.notifications add column accepted_at timestamptz;
alter table public.notifications add column updated_at timestamptz not null default now();
create index notification_due on public.notifications(available_at,created_at) where channel='email' and status in ('queued','failed_retryable');
create table public.notification_deliveries(
 notification_id uuid not null references public.notifications(id), recipient_digest text not null,
 status text not null check(status in ('attempting','accepted','failed_retryable','failed_permanent','ambiguous')),
 error_code text, accepted_at timestamptz, updated_at timestamptz not null default now(),
 primary key(notification_id,recipient_digest)
);
alter table public.notification_deliveries enable row level security;
grant select on public.notification_deliveries to authenticated;
create policy notification_delivery_admin_read on public.notification_deliveries for select to authenticated using(private.has_permission('settings.manage'));
grant select,insert,update on public.notification_deliveries,public.notifications to service_role;

create function private.enqueue_email(template text,kind text,target uuid,member uuid,address text,details jsonb,admin boolean default false,version text default '') returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into public.notifications(type,template_key,channel,recipient,recipient_user_id,audience,related_record_type,related_record_id,payload,dedupe_key)
 values(template,template,'email',address,member,case when admin then 'admin' else 'member' end,kind,target,details,
 template||':'||target||':'||case when admin then 'admin' else coalesce(member::text,lower(address),'member') end||':'||version)
 on conflict(dedupe_key) do nothing;
end $$;
revoke all on function private.enqueue_email(text,text,uuid,uuid,text,jsonb,boolean,text) from public,anon,authenticated;

-- New business rows create receipts and administrative alerts atomically.
create or replace function private.submission_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb=to_jsonb(new); template text; alert text; recipient uuid; address text; details jsonb; e public.events;
begin
 case tg_table_name
 when 'membership_claims' then template='MembershipApplicationReceived';alert='MembershipAdminAlert';
 when 'rsvp_submissions' then template='EventRSVPReceived';alert='EventRSVPAdminAlert';
 when 'consultation_submissions' then template='ConsultationReceived';alert='ConsultationAdminAlert';
 when 'reviews' then template='CommunityReviewReceived';alert='ReviewAdminAlert';
 when 'directory_startups' then template='StartupSubmissionReceived';alert='StartupAdminAlert';
 when 'event_registrations' then template='EventRSVPReceived';alert='EventRSVPAdminAlert';
 else return new; end case;
 recipient=nullif(r->>'user_id','')::uuid; address=r->>'email';
 details=jsonb_build_object('reference',new.id,'name',coalesce(r->>'full_name',(select display_name from public.profiles where id=recipient)),'status',coalesce(r->>'status',r->>'moderation'),'category',r->>'applicant_type','goal',r->>'goal');
 if r->>'event_id' is not null then
 select * into e from public.events where id=(r->>'event_id')::uuid;
 details=details||jsonb_build_object('eventTitle',e.title,'startsAt',e.starts_at,'venue',e.venue);
 end if;
 perform private.enqueue_email(template,tg_table_name,new.id,recipient,address,details,false);
 perform private.enqueue_email(alert,tg_table_name,new.id,null,null,details,true);
 return new;
end $$;
create trigger startup_email_outbox after insert on public.directory_startups for each row execute function private.submission_notification();
create trigger registration_email_outbox after insert on public.event_registrations for each row execute function private.submission_notification();

-- Status notifications originate from committed, authorized rows, not browser content.
create function private.status_email() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb=to_jsonb(new); o jsonb=to_jsonb(old); template text; recipient uuid; details jsonb; state text; previous text; e public.events;
begin
 state=coalesce(r->>'status',r->>'moderation');previous=coalesce(o->>'status',o->>'moderation');
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
 else return new;end case;
 if template is null then return new;end if;
 details=jsonb_build_object('reference',new.id,'name',coalesce(r->>'full_name',(select display_name from public.profiles where id=recipient)),'status',state,'scheduledAt',r->>'scheduled_at');
 if r->>'event_id' is not null then select * into e from public.events where id=(r->>'event_id')::uuid;details=details||jsonb_build_object('eventTitle',e.title,'startsAt',e.starts_at,'venue',e.venue);end if;
 perform private.enqueue_email(template,tg_table_name,new.id,recipient,r->>'email',details,false,md5((r-'verification_token'-'pass_token')::text));
 return new;
end $$;
revoke all on function private.status_email() from public,anon,authenticated;
create trigger membership_status_email after update on public.memberships for each row execute function private.status_email();
create trigger claim_status_email after update on public.membership_claims for each row execute function private.status_email();
create trigger registration_status_email after update on public.event_registrations for each row execute function private.status_email();
create trigger consultation_status_email after update on public.consultation_submissions for each row execute function private.status_email();
create trigger payment_status_email after update on public.payments for each row execute function private.status_email();
create trigger startup_status_email after update on public.directory_startups for each row execute function private.status_email();
create trigger review_status_email after update on public.reviews for each row execute function private.status_email();

create function private.event_change_email() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.event_registrations; template text; version text;
begin
 if new.starts_at=old.starts_at and new.ends_at=old.ends_at and new.venue is not distinct from old.venue and new.status=old.status then return new;end if;
 template=case when new.status='archived' then 'EventCancelled' else 'EventUpdated' end;
 version=md5(jsonb_build_array(new.starts_at,new.ends_at,new.venue,new.status)::text);
 for r in select * from public.event_registrations where event_id=new.id and status in ('confirmed','waitlisted','pending_review','pending_payment') loop
 perform private.enqueue_email(template,'event',new.id,r.user_id,null,jsonb_build_object('reference',r.reference,'eventTitle',new.title,'startsAt',new.starts_at,'previousStartsAt',old.starts_at,'venue',new.venue,'status',new.status),false,version);
 end loop;return new;
end $$;
revoke all on function private.event_change_email() from public,anon,authenticated;
create trigger event_change_email after update on public.events for each row execute function private.event_change_email();

-- Only the trusted service can claim jobs. Leases and durable per-recipient receipts
-- prevent a restart from silently resending an email with an unknown SMTP outcome.
create table public.notification_worker_state(singleton boolean primary key default true check(singleton),worker_id uuid,locked_until timestamptz);
alter table public.notification_worker_state enable row level security;
insert into public.notification_worker_state(singleton) values(true);
grant select,update on public.notification_worker_state to service_role;
create function public.csc_claim_notifications(batch integer default 3,worker uuid default gen_random_uuid()) returns setof public.notifications
language plpgsql security invoker set search_path='' as $$
begin
 update public.notification_worker_state set worker_id=worker,locked_until=now()+interval '5 minutes' where singleton and (locked_until is null or locked_until<now());
 if not found then return;end if;
 update public.notifications n set status=case when exists(select 1 from public.notification_deliveries d where d.notification_id=n.id and d.status in ('attempting','ambiguous')) then 'failed_permanent' else 'failed_retryable' end,last_error=case when exists(select 1 from public.notification_deliveries d where d.notification_id=n.id and d.status in ('attempting','ambiguous')) then 'AMBIGUOUS_DELIVERY' else 'LEASE_EXPIRED_BEFORE_SEND' end,lease_id=null,locked_until=null where n.status='processing' and n.locked_until<now();
 return query with due as(select id from public.notifications where channel='email' and template_key is not null and status in ('queued','failed_retryable') and attempts<max_attempts and available_at<=now() order by available_at,created_at for update skip locked limit least(greatest(batch,1),5))
 update public.notifications n set status='processing',attempts=n.attempts+1,lease_id=gen_random_uuid(),locked_until=now()+interval '5 minutes',updated_at=now() from due where n.id=due.id returning n.*;
end $$;
create function public.csc_begin_email_delivery(job uuid,lease uuid,digest text) returns boolean language plpgsql security invoker set search_path='' as $$
declare state text;
begin
 perform 1 from public.notifications where id=job and lease_id=lease and status='processing' and locked_until>now() for update;
 if not found then return false;end if;
 select status into state from public.notification_deliveries where notification_id=job and recipient_digest=digest for update;
 if state in ('accepted','attempting','ambiguous','failed_permanent') then return false;end if;
 insert into public.notification_deliveries(notification_id,recipient_digest,status) values(job,digest,'attempting') on conflict(notification_id,recipient_digest) do update set status='attempting',error_code=null,updated_at=now();
 return true;
end $$;
create function public.csc_finish_email_delivery(job uuid,lease uuid,digest text,outcome text,code text) returns void language plpgsql security invoker set search_path='' as $$
begin
 if outcome not in ('accepted','failed_retryable','failed_permanent','ambiguous') or length(coalesce(code,''))>80 then raise exception 'invalid outcome';end if;
 perform 1 from public.notifications where id=job and lease_id=lease and status='processing' for update;
 if not found then raise exception 'lease expired';end if;
 update public.notification_deliveries set status=outcome,error_code=code,accepted_at=case when outcome='accepted' then now() else null end,updated_at=now() where notification_id=job and recipient_digest=digest and status='attempting';
 if not found then raise exception 'attempt unavailable';end if;
end $$;
create function public.csc_finish_notification(job uuid,lease uuid,outcome text,code text) returns void language plpgsql security invoker set search_path='' as $$
begin
 if outcome not in ('sent','failed_retryable','failed_permanent') or length(coalesce(code,''))>80 then raise exception 'invalid outcome';end if;
 update public.notifications set attempts=case when code='EMAIL_RATE_DEFERRED' then greatest(attempts-1,0) else attempts end,status=case when outcome='failed_retryable' and code<>'EMAIL_RATE_DEFERRED' and attempts>=max_attempts then 'failed_permanent' else outcome end,last_error=code,available_at=now()+make_interval(secs=>least(3600,60*power(2,least(attempts,6))::integer)),sent_at=case when outcome='sent' then now() else sent_at end,accepted_at=case when outcome='sent' then now() else accepted_at end,lease_id=null,locked_until=null,updated_at=now() where id=job and lease_id=lease and status='processing';
 if not found then raise exception 'lease expired';end if;
end $$;
create function public.csc_release_notification_dispatch(worker uuid) returns void language sql security invoker set search_path='' as $$update public.notification_worker_state set locked_until=null,worker_id=null where worker_id=worker$$;
create function public.csc_email_budget_available() returns boolean language sql security invoker set search_path='' as $$select (select count(*) from public.notification_deliveries where accepted_at>now()-interval '1 hour')<20 and (select count(*) from public.notification_deliveries where accepted_at>now()-interval '1 day')<100$$;
revoke all on function public.csc_release_notification_dispatch(uuid),public.csc_email_budget_available() from public,anon,authenticated;
grant execute on function public.csc_release_notification_dispatch(uuid),public.csc_email_budget_available() to service_role;
create function public.csc_notification_recipient(member uuid) returns text language sql security invoker set search_path='' as $$select email from auth.users where id=member and email_confirmed_at is not null$$;
-- Explicit service-only grants; no public queue or mail-sending endpoint.
revoke all on function public.csc_claim_notifications(integer,uuid),public.csc_begin_email_delivery(uuid,uuid,text),public.csc_finish_email_delivery(uuid,uuid,text,text,text),public.csc_finish_notification(uuid,uuid,text,text),public.csc_notification_recipient(uuid) from public,anon,authenticated;
grant execute on function public.csc_claim_notifications(integer,uuid),public.csc_begin_email_delivery(uuid,uuid,text),public.csc_finish_email_delivery(uuid,uuid,text,text,text),public.csc_finish_notification(uuid,uuid,text,text),public.csc_notification_recipient(uuid) to service_role;
grant usage on schema auth to service_role;
grant select(id,email,email_confirmed_at) on auth.users to service_role;

create function private.retry_notification(job uuid,reason text,acknowledge_ambiguous boolean) returns void language plpgsql security definer set search_path='' as $$
declare n public.notifications;
begin
 if not private.has_permission('settings.manage') then raise exception 'forbidden' using errcode='42501';end if;
 if length(trim(reason)) not between 5 and 500 then raise exception 'reason required';end if;
 select * into n from public.notifications where id=job for update;
 if not found or n.status not in ('failed_retryable','failed_permanent') then raise exception 'not retryable';end if;
 if (n.last_error='AMBIGUOUS_DELIVERY' or exists(select 1 from public.notification_deliveries where notification_id=job and status in ('attempting','ambiguous'))) and not acknowledge_ambiguous then raise exception 'manual mailbox reconciliation required';end if;
 update public.notification_deliveries set status='failed_retryable' where notification_id=job and status<>'accepted';
 update public.notifications set status='queued',attempts=0,available_at=now(),last_error=null,lease_id=null,locked_until=null where id=job;
 insert into public.audit_logs(action,actor_id,target_type,target_id,after) values('notification.retry',auth.uid(),'notification',job::text,jsonb_build_object('reason',reason,'ambiguousAcknowledged',acknowledge_ambiguous));
end $$;
revoke all on function private.retry_notification(uuid,text,boolean) from public;
grant execute on function private.retry_notification(uuid,text,boolean) to authenticated;
create function public.csc_retry_notification(job uuid,reason text,acknowledge_ambiguous boolean default false) returns void language sql security invoker set search_path='' as $$select private.retry_notification(job,reason,acknowledge_ambiguous)$$;
revoke all on function public.csc_retry_notification(uuid,text,boolean) from public;
grant execute on function public.csc_retry_notification(uuid,text,boolean) to authenticated;

-- Daily catch-up schedules only valid upcoming confirmed registrations. Every
-- reminder has an event-schedule-specific key; stale reminders are checked at send.
create function public.csc_schedule_event_reminders() returns integer language plpgsql security invoker set search_path='' as $$
declare r record; count integer=0;
begin
 for r in select reg.id,reg.user_id,reg.reference,e.id event_id,e.title,e.starts_at,e.venue from public.event_registrations reg join public.events e on e.id=reg.event_id join public.memberships m on m.user_id=reg.user_id where reg.status='confirmed' and e.status='published' and e.starts_at>now() and e.starts_at<=now()+interval '25 hours' and m.status='active' and (m.expires_at is null or m.expires_at>now()) loop
 insert into public.notifications(type,template_key,channel,recipient_user_id,audience,related_record_type,related_record_id,payload,dedupe_key,available_at)
 values('EventReminder','EventReminder','email',r.user_id,'member','event_registrations',r.id,jsonb_build_object('reference',r.reference,'eventTitle',r.title,'startsAt',r.starts_at,'venue',r.venue),'EventReminder:'||r.id||':'||r.starts_at,greatest(now(),r.starts_at-interval '24 hours')) on conflict(dedupe_key) do nothing;count=count+1;
 end loop;return count;
end $$;
revoke all on function public.csc_schedule_event_reminders() from public,anon,authenticated;
grant execute on function public.csc_schedule_event_reminders() to service_role;
commit;
