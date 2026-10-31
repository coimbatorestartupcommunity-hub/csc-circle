begin;
alter table public.community_updates add column completed_at timestamptz;
alter table public.event_notices add column completed_at timestamptz;
grant select(completed_at) on public.community_updates to anon;

create function public.csc_complete_content(content_kind text,target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
  if not private.has_permission(case when content_kind in ('event','notice') then 'events.publish' else 'content.manage' end) then raise exception 'Permission denied'; end if;
  if content_kind='event' then
    update public.events set settings=settings||'{"completed":true}'::jsonb,registration_state='completed' where id=target and status='published';
    get diagnostics affected=row_count;
    update public.event_notices set completed_at=now(),visible_until=null where event_id=target and status='published';
    update public.community_updates set completed_at=now() where related_event_id=target and publication_status='published';
  elsif content_kind='notice' then
    update public.event_notices set completed_at=now(),visible_until=null where id=target and status='published';
    get diagnostics affected=row_count;
  elsif content_kind='update' then
    update public.community_updates set completed_at=now() where id=target and publication_status='published';
    get diagnostics affected=row_count;
  elsif content_kind='collaboration' then
    update public.collaborations set status='completed' where id=target and publication_status='published';
    get diagnostics affected=row_count;
  else raise exception 'Invalid content'; end if;
  if affected=0 then raise exception 'Published content not found'; end if;
  insert into public.audit_logs(actor_id,action,target_type,target_id) values(auth.uid(),'content.completed',content_kind,target);
end $$;
revoke all on function public.csc_complete_content(text,uuid) from public,anon;
grant execute on function public.csc_complete_content(text,uuid) to authenticated;

drop policy event_notices_public_active_read on public.event_notices;
create policy event_notices_public_active_read on public.event_notices for select to anon,authenticated using (
  status='published' and deleted_at is null and (visible_from is null or visible_from<=now())
  and (completed_at is not null or visible_until is null or visible_until>now())
  and exists(select 1 from public.events e where e.id=event_id and e.status='published' and (event_notices.completed_at is not null or e.ends_at>now()))
);
alter table public.reviews add column collaboration_id uuid references public.collaborations(id);
alter table public.reviews drop constraint reviews_kind_check;
alter table public.reviews add constraint reviews_kind_check check (kind in ('general','event','collaboration'));
create unique index reviews_collaboration_unique on public.reviews(user_id,collaboration_id) where kind='collaboration';

-- Completion is independent of publication. Edits preserve completed state.
create or replace function private.apply_event_completion() returns trigger
language plpgsql set search_path='' as $$
begin
  if coalesce((new.settings->>'completed')::boolean,false) then
    new.registration_state := 'completed';
  end if;
  return new;
end $$;
create trigger zz_event_completion before insert or update on public.events
for each row execute function private.apply_event_completion();

-- Enforce attendance and completion even for direct authenticated REST writes.
create or replace function private.validate_event_review() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.kind='collaboration' and not exists(select 1 from public.collaborations c where c.id=new.collaboration_id and c.status='completed' and c.publication_status='published') then
    raise exception 'Collaboration is not available for review' using errcode='23514';
  end if;
  if new.kind='event' and not exists (
    select 1 from public.events e join public.event_registrations r on r.event_id=e.id
    where e.id=new.event_id and e.status='published'
      and (e.ends_at<=now() or e.registration_state='completed')
      and r.user_id=new.user_id and r.attendance='checked_in'
  ) then raise exception 'Only checked-in attendees can review concluded events' using errcode='23514'; end if;
  return new;
end $$;
create trigger event_review_eligibility before insert or update on public.reviews
for each row execute function private.validate_event_review();

-- One invitation per attendee and event; a repeated cron run is idempotent.
create or replace function public.csc_schedule_event_review_requests() returns integer
language plpgsql security invoker set search_path='' as $$
declare affected integer;
begin
  insert into public.notifications(type,template_key,channel,recipient_user_id,audience,related_record_type,related_record_id,payload,dedupe_key)
  select distinct on (r.user_id,e.id) 'EventReviewRequest','EventReviewRequest','email',r.user_id,'member','events',e.id,
    jsonb_build_object('eventTitle',e.title,'endsAt',e.ends_at),
    'EventReviewRequest:'||e.id||':'||r.user_id
  from public.events e join public.event_registrations r on r.event_id=e.id
  where e.status='published' and e.ends_at<=now() and e.ends_at>=now()-interval '7 days'
    and r.attendance='checked_in' and r.user_id is not null
    and not exists(select 1 from public.reviews v where v.event_id=e.id and v.user_id=r.user_id)
  order by r.user_id,e.id,r.created_at
  on conflict(dedupe_key) do nothing;
  get diagnostics affected=row_count;
  return affected;
end $$;
revoke all on function public.csc_schedule_event_review_requests() from public,anon,authenticated;
grant execute on function public.csc_schedule_event_review_requests() to service_role;
commit;
