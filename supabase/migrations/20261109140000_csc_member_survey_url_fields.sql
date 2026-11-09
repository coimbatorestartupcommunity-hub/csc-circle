-- CSC Circle — member survey: separate LinkedIn and portfolio URL fields.
-- Additive and history-safe: both columns are nullable so legacy rows keep
-- working; the admin search RPC is rebuilt with the same filters and the
-- same service_role-only grant.
begin;

alter table public.csc_members
  add column if not exists linkedin_url text null,
  add column if not exists portfolio_url text null;

alter table public.csc_members
  drop constraint if exists csc_members_linkedin_url_valid;
alter table public.csc_members
  add constraint csc_members_linkedin_url_valid check (
    linkedin_url is null
    or (
      linkedin_url = btrim(linkedin_url)
      and char_length(linkedin_url) between 1 and 2048
      and linkedin_url ~ '^https?://[^[:space:]]+$'
    )
  );

alter table public.csc_members
  drop constraint if exists csc_members_portfolio_url_valid;
alter table public.csc_members
  add constraint csc_members_portfolio_url_valid check (
    portfolio_url is null
    or (
      portfolio_url = btrim(portfolio_url)
      and char_length(portfolio_url) between 1 and 2048
      and portfolio_url ~ '^https?://[^[:space:]]+$'
    )
  );

comment on column public.csc_members.linkedin_url is
  'Member LinkedIn profile URL; NULL when not provided or for legacy submissions.';
comment on column public.csc_members.portfolio_url is
  'Member portfolio website URL; NULL when not provided or for legacy submissions.';

-- Rebuild the bounded admin search RPC with the new columns.
-- Return-type changes require drop + create; grants are re-applied below so
-- only the trusted service_role can execute the function.
drop function if exists public.csc_list_member_survey_responses(text, text, text, integer, integer, text, text, text, text, date, date);

create function public.csc_list_member_survey_responses(
  p_category text default null,
  p_search text default null,
  p_sort text default 'newest',
  p_offset integer default 0,
  p_limit integer default 25,
  p_city text default null,
  p_industry text default null,
  p_stage text default null,
  p_support text default null,
  p_from date default null,
  p_to date default null
)
returns table (
  id uuid,
  full_name text,
  contact_number text,
  email text,
  city text,
  member_category text,
  business_or_idea_name text,
  industry_sector text,
  industry_other text,
  current_stage text,
  description text,
  support_needed text[],
  support_needed_other text,
  biggest_challenge text,
  website_url text,
  linkedin_url text,
  portfolio_url text,
  discovery_source text,
  discovery_source_other text,
  preferred_contact_method text,
  established_year smallint,
  business_team_size text,
  business_connections text[],
  business_connections_other text,
  startup_team_structure text,
  startup_support text[],
  startup_support_other text,
  startup_current_focus text,
  seeking_cofounder text,
  idea_support text[],
  idea_support_other text,
  idea_problem_statement text,
  consent_at timestamptz,
  submission_source text,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    members.id,
    members.full_name,
    members.contact_number,
    members.email,
    members.city,
    members.member_category,
    members.business_or_idea_name,
    members.industry_sector,
    members.industry_other,
    members.current_stage,
    members.description,
    members.support_needed,
    members.support_needed_other,
    members.biggest_challenge,
    members.website_url,
    members.linkedin_url,
    members.portfolio_url,
    members.discovery_source,
    members.discovery_source_other,
    members.preferred_contact_method,
    members.established_year,
    members.business_team_size,
    members.business_connections,
    members.business_connections_other,
    members.startup_team_structure,
    members.startup_support,
    members.startup_support_other,
    members.startup_current_focus,
    members.seeking_cofounder,
    members.idea_support,
    members.idea_support_other,
    members.idea_problem_statement,
    members.consent_at,
    members.submission_source,
    members.created_at,
    count(*) over () as total_count
  from public.csc_members as members
  where
    (p_category is null or members.member_category = p_category)
    and (
      nullif(btrim(coalesce(p_city, '')), '') is null
      or members.city ilike '%' || p_city || '%'
    )
    and (p_industry is null or members.industry_sector = p_industry)
    and (p_stage is null or members.current_stage = p_stage)
    and (p_support is null or p_support = any(members.support_needed))
    and (p_from is null or members.created_at >= p_from::timestamptz)
    and (p_to is null or members.created_at < (p_to + 1)::timestamptz)
    and (
      nullif(btrim(coalesce(p_search, '')), '') is null
      or members.full_name ilike '%' || p_search || '%'
      or members.email ilike '%' || p_search || '%'
      or members.business_or_idea_name ilike '%' || p_search || '%'
      or members.contact_number ilike '%' || p_search || '%'
      or members.city ilike '%' || p_search || '%'
    )
  order by
    case when p_sort = 'newest' then members.created_at end desc,
    case when p_sort = 'oldest' then members.created_at end asc,
    case when p_sort = 'name_asc' then lower(members.full_name) end asc,
    case when p_sort = 'name_desc' then lower(members.full_name) end desc,
    members.id asc
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 25), 1), 500);
$$;

revoke all on function public.csc_list_member_survey_responses(text, text, text, integer, integer, text, text, text, text, date, date)
  from public, anon, authenticated;
grant execute on function public.csc_list_member_survey_responses(text, text, text, integer, integer, text, text, text, text, date, date)
  to service_role;

commit;
