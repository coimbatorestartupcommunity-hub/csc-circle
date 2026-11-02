-- Migration: 20261103020000_universal_cms_editing_and_event_completion.sql
-- Universal CMS Editing & Event Completion Preservation

begin;

-- 1. Add completed_at columns to opportunities and resources
alter table public.opportunities add column if not exists completed_at timestamptz;
alter table public.resources add column if not exists completed_at timestamptz;
grant select(completed_at) on public.opportunities to anon, authenticated;
grant select(completed_at) on public.resources to anon, authenticated;

-- 2. Update csc_complete_content to support all content kinds
create or replace function public.csc_complete_content(content_kind text, target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if not private.has_permission(case when content_kind in ('event', 'notice') then 'events.publish' else 'content.manage' end) then
    raise exception 'Permission denied';
  end if;

  if content_kind = 'event' then
    update public.events
    set settings = coalesce(settings, '{}'::jsonb) || '{"completed":true}'::jsonb,
        registration_state = 'completed'
    where id = target and status = 'published';
    get diagnostics affected = row_count;

    update public.event_notices
    set completed_at = now(), visible_until = null
    where event_id = target and status = 'published';

    update public.community_updates
    set completed_at = now()
    where related_event_id = target and publication_status = 'published';

  elsif content_kind = 'notice' then
    update public.event_notices
    set completed_at = now(), visible_until = null
    where id = target and status = 'published';
    get diagnostics affected = row_count;

  elsif content_kind = 'update' then
    update public.community_updates
    set completed_at = now()
    where id = target and publication_status = 'published';
    get diagnostics affected = row_count;

  elsif content_kind = 'collaboration' then
    update public.collaborations
    set status = 'completed'
    where id = target and publication_status = 'published';
    get diagnostics affected = row_count;

  elsif content_kind = 'opportunity' then
    update public.opportunities
    set completed_at = now()
    where id = target and publication_status = 'published';
    get diagnostics affected = row_count;

  elsif content_kind = 'resource' then
    update public.resources
    set completed_at = now()
    where id = target and publication_status = 'published';
    get diagnostics affected = row_count;

  else
    raise exception 'Invalid content';
  end if;

  if affected = 0 then
    raise exception 'Published content not found';
  end if;

  insert into public.audit_logs(actor_id, action, target_type, target_id)
  values (auth.uid(), 'content.completed', content_kind, target);
end $$;

revoke all on function public.csc_complete_content(text, uuid) from public, anon;
grant execute on function public.csc_complete_content(text, uuid) to authenticated;

-- 3. Enhance private.save_event to preserve completed registration state and merge settings
create or replace function private.save_event(payload jsonb, target uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.events;
  out_id uuid;
  start_at timestamptz;
  end_at timestamptz;
  capacity integer;
  price integer;
  target_state text;
begin
  if not private.has_permission(case when target is null then 'events.create' else 'events.update' end) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if payload->>'status' = 'published' and not private.has_permission('events.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if length(trim(payload->>'title')) not between 3 and 140
    or payload->>'slug' !~ '^[a-z0-9-]{3,160}$'
    or length(payload->>'description') not between 10 and 4000
    or payload->>'category' not in ('meetup','pitch-session','workshop','networking','consultation') then
    raise exception 'invalid event';
  end if;
  if payload->>'status' not in ('draft','published') or payload->>'admission' not in ('free','paid') then
    raise exception 'invalid event';
  end if;

  start_at = ((payload->>'date') || 'T' || (payload->>'startTime') || ':00+05:30')::timestamptz;
  end_at = ((payload->>'date') || 'T' || (payload->>'endTime') || ':00+05:30')::timestamptz;
  if end_at <= start_at then raise exception 'invalid event times'; end if;
  capacity = nullif(payload->>'capacity','')::integer;
  if capacity is not null and capacity < 1 then raise exception 'invalid capacity'; end if;
  price = case when payload->>'admission' = 'paid' then round((payload->>'price')::numeric*100)::integer else 0 end;
  if payload->>'admission' = 'paid' and (price is null or price <= 0) then raise exception 'invalid price'; end if;
  if coalesce(payload->>'currency','INR') <> 'INR' then raise exception 'unsupported currency'; end if;

  if target is not null then
    select * into e from public.events where id=target for update;
    if not found then raise exception 'not found'; end if;
    if exists(select 1 from public.event_registrations where event_id=target and status in ('confirmed','checked_in'))
      and (e.price_minor<>price or e.admission<>payload->>'admission') then
      raise exception 'cannot change confirmed ticket pricing';
    end if;
    if capacity is not null and capacity < (select count(*) from public.event_registrations where event_id=target and status in ('confirmed','checked_in')) then
      raise exception 'capacity below confirmed count';
    end if;
  end if;

  -- Determine registration_state:
  -- If completed, preserve completed unless explicitly reopened
  -- If payload explicitly says completed, mark completed
  -- Otherwise, published events default to open, drafts to coming-soon
  target_state := case
    when (payload->>'completed')::boolean is true then 'completed'
    when e.registration_state = 'completed' and coalesce((payload->>'reopen')::boolean, false) is not true then 'completed'
    when payload->>'status' = 'published' then coalesce(e.registration_state, 'open')
    else 'coming-soon'
  end;

  insert into public.events(
    id,slug,title,category,description,cover_image,starts_at,ends_at,location,venue,
    capacity,registration_deadline,status,admission,registration_state,price_minor,settings
  ) values (
    coalesce(target,gen_random_uuid()),payload->>'slug',payload->>'title',payload->>'category',
    payload->>'description',nullif(payload->>'coverImage',''),start_at,end_at,
    coalesce(nullif(payload->>'venueAddress',''),'Coimbatore'),nullif(payload->>'venueName',''),
    capacity,nullif(payload->>'registrationDeadline','')::timestamptz,
    (payload->>'status')::public.publication_status,payload->>'admission',
    target_state,
    price,
    case when e.settings is not null then e.settings || payload else payload end
  )
  on conflict(id) do update set
    slug=excluded.slug,title=excluded.title,category=excluded.category,description=excluded.description,
    cover_image=excluded.cover_image,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
    location=excluded.location,venue=excluded.venue,capacity=excluded.capacity,
    registration_deadline=excluded.registration_deadline,status=excluded.status,
    admission=excluded.admission,registration_state=excluded.registration_state,
    price_minor=excluded.price_minor,settings=excluded.settings
  returning id into out_id;

  perform private.record_operation('event.'||(payload->>'status'),'event',out_id,
    jsonb_build_object('status',e.status),jsonb_build_object('status',payload->>'status'),null);
  return out_id;
end;
$$;

revoke all on function private.save_event(jsonb,uuid) from public;
grant execute on function private.save_event(jsonb,uuid) to authenticated;

commit;
