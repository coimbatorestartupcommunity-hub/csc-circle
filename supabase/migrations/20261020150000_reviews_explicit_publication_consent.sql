-- Store the member's explicit review-publication consent and require it in the
-- public testimonial projection. Existing general reviews came through the
-- prior member form, which required this consent before submission; record a
-- legacy marker so queued reviews can still be approved normally.
alter table public.reviews
  add column if not exists publication_consent boolean not null default false,
  add column if not exists publication_consent_at timestamptz,
  add column if not exists publication_consent_version text;

update public.reviews
set publication_consent = true,
    publication_consent_at = coalesce(publication_consent_at, updated_at, created_at),
    publication_consent_version = coalesce(publication_consent_version, 'legacy-approved-review-consent')
where kind = 'general' and publication_consent = false;

create or replace function private.prevent_self_approval_of_review()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.moderation = 'approved'
    and old.moderation is distinct from new.moderation
    and new.user_id = auth.uid() then
    raise exception 'review authors cannot approve their own review' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_self_approval_of_review() from public, anon, authenticated;
drop trigger if exists prevent_self_approval_of_review on public.reviews;
create trigger prevent_self_approval_of_review
  before update of moderation on public.reviews
  for each row execute function private.prevent_self_approval_of_review();

create or replace function private.testimonials() returns table (
  id uuid,
  rating integer,
  review text,
  created_at timestamptz,
  name text,
  avatar_url text,
  designation text
) language sql stable security definer set search_path='' as $$
  select r.id, r.rating, r.review, r.created_at,
    case when coalesce((p.consent->>'displayNamePublicly')::boolean, false)
      then coalesce(p.display_name, 'CSC Member') else 'CSC Member' end,
    case when coalesce((p.consent->>'displayPhotoPublicly')::boolean, false)
      then p.avatar_url else null end,
    case when coalesce((p.consent->>'showProfessionalRoleToMembers')::boolean, false)
      then coalesce((p.designations)[1]::text, 'Community Member') else 'Community Member' end
  from public.reviews r
  join public.profiles p on p.id = r.user_id
  where r.moderation = 'approved'
    and r.kind = 'general'
    and r.publication_consent is true;
$$;

revoke all on function private.testimonials() from public;
grant execute on function private.testimonials() to anon, authenticated;

create or replace view public.public_testimonials with (security_invoker=true)
  as select * from private.testimonials();
grant select on public.public_testimonials to anon, authenticated;

comment on column public.reviews.publication_consent is
  'Member consent for public testimonial display, captured with review submission.';
