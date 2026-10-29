alter table public.event_registrations add column if not exists attendee_name text;

-- Every event registration, including imports and administrative inserts, gets
-- a durable human-readable UID before the NOT NULL constraint is evaluated.
create or replace function private.ensure_event_registration_reference()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if nullif(btrim(new.reference), '') is null then
    new.reference := 'CSC-EVT-' || upper(replace(gen_random_uuid()::text, '-', ''));
  end if;
  if nullif(btrim(new.attendee_name), '') is null and new.user_id is not null then
    select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.display_name), ''))
      into new.attendee_name
      from public.profiles p
      where p.id = new.user_id;
  end if;
  return new;
end;
$$;

revoke all on function private.ensure_event_registration_reference() from public, anon, authenticated;

drop trigger if exists ensure_event_registration_reference on public.event_registrations;
create trigger ensure_event_registration_reference
before insert or update of reference on public.event_registrations
for each row execute function private.ensure_event_registration_reference();

-- Repair historical blank references if an older deployment allowed them.
update public.event_registrations
set reference = 'CSC-EVT-' || upper(replace(gen_random_uuid()::text, '-', ''))
where nullif(btrim(reference), '') is null;

update public.event_registrations r
set attendee_name = coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.display_name), ''))
from public.profiles p
where r.user_id = p.id and nullif(btrim(r.attendee_name), '') is null;
