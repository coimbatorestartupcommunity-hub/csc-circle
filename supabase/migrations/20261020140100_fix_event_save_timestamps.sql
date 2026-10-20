begin;

-- Explicitly group each JSON extraction before concatenating event date/time
-- strings. The previous function body parsed `->>` against a text expression
-- and failed schema lint (and event writes) at the timestamp assignments.
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

  insert into public.events(
    id,slug,title,category,description,cover_image,starts_at,ends_at,location,venue,
    capacity,registration_deadline,status,admission,registration_state,price_minor,settings
  ) values (
    coalesce(target,gen_random_uuid()),payload->>'slug',payload->>'title',payload->>'category',
    payload->>'description',nullif(payload->>'coverImage',''),start_at,end_at,
    coalesce(nullif(payload->>'venueAddress',''),'Coimbatore'),nullif(payload->>'venueName',''),
    capacity,nullif(payload->>'registrationDeadline','')::timestamptz,
    (payload->>'status')::public.publication_status,payload->>'admission',
    case when payload->>'status'='published' then 'open' else 'coming-soon' end,price,payload
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
