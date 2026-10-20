-- Preserve the founder's explicit public-listing consent alongside the
-- startup submission so moderators can review it before publication.
alter table public.directory_startups
  add column if not exists publication_consent boolean not null default false,
  add column if not exists publication_consent_at timestamptz;
