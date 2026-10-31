-- Preserve a member-entered category when they select "Other". The value is
-- deliberately short because it is rendered on the official membership ID.

alter table public.profiles
  add column if not exists designation_other text;

alter table public.membership_claims
  add column if not exists designation_other text;

alter table public.profiles
  drop constraint if exists profiles_designation_other_length,
  add constraint profiles_designation_other_length
    check (designation_other is null or char_length(btrim(designation_other)) between 2 and 30);

alter table public.membership_claims
  drop constraint if exists membership_claims_designation_other_length,
  add constraint membership_claims_designation_other_length
    check (designation_other is null or char_length(btrim(designation_other)) between 2 and 30);

grant update (designation_other) on public.profiles to authenticated;

comment on column public.profiles.designation_other is
  'Member-entered 2-30 character membership ID label used when Other is selected.';
comment on column public.membership_claims.designation_other is
  'Claimed 2-30 character membership ID label used when designation is Other.';
