-- Private member portrait assets and an owned resume document.
-- No public bucket or cross-user policies are created here.

alter table public.profiles
  add column if not exists portrait_path text,
  add column if not exists portrait_original_path text,
  add column if not exists portrait_public boolean not null default false;

-- Keep member-editable fields writable, while preventing clients from assigning
-- a forged portrait path. The validated server upload service is the writer.
revoke update on public.profiles from authenticated;
grant update (full_name, display_name, whatsapp, city, avatar_url, designations,
  startup, goals, skills, consent, profile_completion) on public.profiles to authenticated;

create table if not exists public.member_resumes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  resume_data jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1 check (schema_version = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_resumes_data_object check (jsonb_typeof(resume_data) = 'object')
);

drop trigger if exists trg_member_resumes_updated on public.member_resumes;
create trigger trg_member_resumes_updated before update on public.member_resumes
  for each row execute function public.set_updated_at();

alter table public.member_resumes enable row level security;
revoke all on public.member_resumes from anon;
grant select, insert, update on public.member_resumes to authenticated;
drop policy if exists member_resumes_select_own on public.member_resumes;
create policy member_resumes_select_own on public.member_resumes
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists member_resumes_insert_own on public.member_resumes;
create policy member_resumes_insert_own on public.member_resumes
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists member_resumes_update_own on public.member_resumes;
create policy member_resumes_update_own on public.member_resumes
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-portraits', 'member-portraits', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists member_portraits_select_own on storage.objects;
create policy member_portraits_select_own on storage.objects
  for select to authenticated using (
    bucket_id = 'member-portraits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists member_portraits_insert_own on storage.objects;
-- Uploads are performed by the authenticated, server-side image validator via
-- the service role after checking the caller's Supabase session.
drop policy if exists member_portraits_update_own on storage.objects;
-- The same trusted upload service performs replacement and cleanup.
drop policy if exists member_portraits_delete_own on storage.objects;
-- There is intentionally no client DELETE policy.
