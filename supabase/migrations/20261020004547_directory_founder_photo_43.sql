-- Store a private, separately cropped 4:3 directory image while retaining the
-- existing 4:5 identity portrait. Both variants remain in the private bucket.
alter table public.profiles
  add column if not exists directory_photo_path text;

-- Members cannot forge a Storage object path through the public Data API. The
-- trusted upload handler writes this field only after validating both crops.
revoke update (directory_photo_path) on public.profiles from authenticated;

-- A published founder listing is visible only while the member has opted in
-- to directory participation, name display, and photo display, and has a
-- validated 4:5 identity portrait plus a separate 4:3 directory crop.
create or replace function private.directory_visible(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = owner_id
      and p.consent ->> 'directoryParticipation' = 'true'
      and p.consent ->> 'displayNamePublicly' = 'true'
      and p.consent ->> 'displayPhotoPublicly' = 'true'
      and p.portrait_path is not null
      and p.directory_photo_path is not null
      and nullif(btrim(p.display_name), '') is not null
  );
$$;

revoke all on function private.directory_visible(uuid) from public;
grant execute on function private.directory_visible(uuid) to anon, authenticated;

-- Defense in depth: the application/API and the database both enforce the
-- image and consent requirements before an administrator can publish.
create or replace function private.require_directory_profile_for_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if new.user_id is null or not private.directory_visible(new.user_id) then
      raise exception 'directory profile, name, photo consent, and validated image crops are required'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.require_directory_profile_for_publish() from public, anon, authenticated;
drop trigger if exists directory_startup_publish_requirements on public.directory_startups;
create trigger directory_startup_publish_requirements
  before insert or update of status on public.directory_startups
  for each row execute function private.require_directory_profile_for_publish();
