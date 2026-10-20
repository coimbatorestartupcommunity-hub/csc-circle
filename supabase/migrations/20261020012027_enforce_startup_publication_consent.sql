-- Keep approval publication-gated at the database boundary as well as in the
-- interface: no path can move a listing to Published without recorded consent.
create or replace function private.require_startup_publication_consent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'published' and new.publication_consent is not true then
    raise exception 'explicit startup publication consent is required'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.require_startup_publication_consent() from public, anon, authenticated;

drop trigger if exists require_startup_publication_consent on public.directory_startups;
create trigger require_startup_publication_consent
  before insert or update of status on public.directory_startups
  for each row execute function private.require_startup_publication_consent();
