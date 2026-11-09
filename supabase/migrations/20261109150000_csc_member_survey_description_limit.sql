-- CSC Circle — member survey: business/idea description limit 3000 -> 1000.
-- Application validation is the primary enforcer; this keeps the database
-- backstop consistent. No existing production rows exceed the new limit.
begin;

alter table public.csc_members
  drop constraint if exists csc_members_description_valid;
alter table public.csc_members
  add constraint csc_members_description_valid check (
    description = btrim(description)
    and char_length(description) between 10 and 1000
  );

commit;
