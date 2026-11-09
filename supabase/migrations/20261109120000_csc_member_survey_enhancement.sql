-- Additive CSC Circle member-survey enhancement.
-- Extends public.csc_members with city, industry, stage, support-need,
-- discovery and per-category detail columns. Every new column is NULLABLE so
-- historic rows stay valid, and every CHECK below passes for NULL values.
-- Existing records, RLS posture and grants are intentionally untouched.

alter table public.csc_members
  add column if not exists city text null,
  add column if not exists industry_sector text null,
  add column if not exists industry_other text null,
  add column if not exists current_stage text null,
  add column if not exists support_needed text[] null,
  add column if not exists support_needed_other text null,
  add column if not exists biggest_challenge text null,
  add column if not exists website_url text null,
  add column if not exists discovery_source text null,
  add column if not exists discovery_source_other text null,
  add column if not exists preferred_contact_method text null,
  add column if not exists established_year smallint null,
  add column if not exists business_team_size text null,
  add column if not exists business_connections text[] null,
  add column if not exists business_connections_other text null,
  add column if not exists startup_team_structure text null,
  add column if not exists startup_support text[] null,
  add column if not exists startup_support_other text null,
  add column if not exists startup_current_focus text null,
  add column if not exists seeking_cofounder text null,
  add column if not exists idea_support text[] null,
  add column if not exists idea_support_other text null,
  add column if not exists idea_problem_statement text null;

alter table public.csc_members
  add constraint csc_members_city_valid check (
    city = btrim(city)
    and char_length(city) between 2 and 120
  ),
  add constraint csc_members_industry_valid check (
    industry_sector in (
      'Technology / Software',
      'Healthcare / Life Sciences',
      'Education / EdTech',
      'Finance / FinTech',
      'E-commerce / Retail',
      'Manufacturing',
      'Agriculture / Food',
      'Hospitality / Travel',
      'Real Estate / Construction',
      'Media / Entertainment',
      'Logistics / Transportation',
      'Consulting / Professional Services',
      'Social Impact / Nonprofit',
      'Other'
    )
  ),
  add constraint csc_members_industry_other_format check (
    industry_other is null
    or (
      industry_other = btrim(industry_other)
      and char_length(industry_other) between 1 and 120
    )
  ),
  add constraint csc_members_industry_other_required check (
    industry_sector is distinct from 'Other'
    or (
      industry_other is not null
      and industry_other = btrim(industry_other)
      and char_length(industry_other) between 1 and 120
    )
  ),
  add constraint csc_members_current_stage_valid check (
    current_stage in (
      'Recently Established',
      'Operating / Established',
      'Revenue-Generating',
      'Growing / Expanding',
      'Scaling to New Markets',
      'Research & Validation',
      'Prototype / MVP',
      'Launched',
      'Growing / Scaling',
      'Not Yet',
      'Researching',
      'Validating the Idea',
      'Building a Prototype'
    )
  ),
  add constraint csc_members_support_needed_valid check (
    support_needed is null
    or (
      cardinality(support_needed) between 1 and 13
      and support_needed <@ array[
        'Funding / Investment',
        'Mentorship',
        'Networking Opportunities',
        'Marketing & Visibility',
        'Talent / Hiring',
        'Technology Support',
        'Legal & Compliance',
        'Financial Planning',
        'Business Strategy',
        'Product Development',
        'Market Access',
        'Workspace / Infrastructure',
        'Other'
      ]
    )
  ),
  add constraint csc_members_support_needed_other_valid check (
    support_needed_other is null
    or (
      support_needed_other = btrim(support_needed_other)
      and char_length(support_needed_other) between 1 and 200
    )
  ),
  add constraint csc_members_biggest_challenge_valid check (
    biggest_challenge is null
    or (
      biggest_challenge = btrim(biggest_challenge)
      and char_length(biggest_challenge) between 1 and 1000
    )
  ),
  add constraint csc_members_website_url_valid check (
    website_url is null
    or (
      website_url = btrim(website_url)
      and char_length(website_url) between 1 and 2048
      and website_url ~ '^https?://[^[:space:]]+$'
    )
  ),
  add constraint csc_members_discovery_source_valid check (
    discovery_source in (
      'Google Search',
      'Social Media',
      'Friend / Referral',
      'CSC Event',
      'WhatsApp Community',
      'College / Institution',
      'News / Media',
      'Partner Organization',
      'Other'
    )
  ),
  add constraint csc_members_discovery_source_other_valid check (
    discovery_source_other is null
    or (
      discovery_source_other = btrim(discovery_source_other)
      and char_length(discovery_source_other) between 1 and 200
    )
  ),
  add constraint csc_members_preferred_contact_valid check (
    preferred_contact_method in (
      'Phone Call',
      'WhatsApp',
      'Email',
      'Any'
    )
  ),
  add constraint csc_members_established_year_valid check (
    established_year between 1900 and 2100
  ),
  add constraint csc_members_business_team_size_valid check (
    business_team_size in (
      'Just me',
      '2-5',
      '6-10',
      '11-25',
      '26-50',
      '50+'
    )
  ),
  add constraint csc_members_business_connections_valid check (
    business_connections is null
    or (
      cardinality(business_connections) between 1 and 11
      and business_connections <@ array[
        'Investors',
        'Mentors',
        'Customers',
        'Distributors / Channel Partners',
        'Suppliers / Vendors',
        'Industry Peers',
        'Government / Policy Support',
        'Talent / Hiring',
        'Technology Partners',
        'Media / Visibility',
        'Other'
      ]
    )
  ),
  add constraint csc_members_business_connections_other_valid check (
    business_connections_other is null
    or (
      business_connections_other = btrim(business_connections_other)
      and char_length(business_connections_other) between 1 and 200
    )
  ),
  add constraint csc_members_startup_team_structure_valid check (
    startup_team_structure in (
      'Solo Founder',
      '2 Co-founders',
      'Small Team (3-5)',
      'Growing Team (6-15)',
      'Large Team (16+)'
    )
  ),
  add constraint csc_members_startup_support_valid check (
    startup_support is null
    or (
      cardinality(startup_support) between 1 and 12
      and startup_support <@ array[
        'Mentorship',
        'Funding / Investment',
        'Co-founder Matching',
        'Product Development',
        'Go-to-Market Strategy',
        'Hiring / Talent',
        'Legal / Incorporation',
        'Marketing / Branding',
        'Networking',
        'Technology / Tools',
        'Workspace',
        'Other'
      ]
    )
  ),
  add constraint csc_members_startup_support_other_valid check (
    startup_support_other is null
    or (
      startup_support_other = btrim(startup_support_other)
      and char_length(startup_support_other) between 1 and 200
    )
  ),
  add constraint csc_members_startup_current_focus_valid check (
    startup_current_focus is null
    or (
      startup_current_focus = btrim(startup_current_focus)
      and char_length(startup_current_focus) between 1 and 1000
    )
  ),
  add constraint csc_members_seeking_cofounder_valid check (
    seeking_cofounder in (
      'Yes, Actively Looking',
      'Yes, Open to It',
      'No, Have a Team',
      'No, Solo'
    )
  ),
  add constraint csc_members_idea_support_valid check (
    idea_support is null
    or (
      cardinality(idea_support) between 1 and 12
      and idea_support <@ array[
        'Idea Validation',
        'Mentorship',
        'Market Research',
        'Prototyping Support',
        'Technical Guidance',
        'Business Planning',
        'Funding Guidance',
        'Co-founder Matching',
        'Networking',
        'Skill Development',
        'Legal / IP Guidance',
        'Other'
      ]
    )
  ),
  add constraint csc_members_idea_support_other_valid check (
    idea_support_other is null
    or (
      idea_support_other = btrim(idea_support_other)
      and char_length(idea_support_other) between 1 and 200
    )
  ),
  add constraint csc_members_idea_problem_statement_valid check (
    idea_problem_statement is null
    or (
      idea_problem_statement = btrim(idea_problem_statement)
      and char_length(idea_problem_statement) between 1 and 1000
    )
  );

create index if not exists csc_members_city_search_idx
  on public.csc_members (lower(city));
create index if not exists csc_members_industry_created_idx
  on public.csc_members (industry_sector, created_at desc);
create index if not exists csc_members_stage_created_idx
  on public.csc_members (current_stage, created_at desc);
create index if not exists csc_members_support_needed_idx
  on public.csc_members using gin (support_needed);

comment on column public.csc_members.city is
  'Member city; normalized free text, NULL for submissions collected before the survey enhancement.';
comment on column public.csc_members.support_needed is
  'Support areas selected by the member; NULL for submissions collected before the survey enhancement.';
comment on column public.csc_members.current_stage is
  'Adaptive current-stage answer validated against the selected member category; NULL for legacy submissions.';

-- Rebuild the bounded admin search RPC with the new columns and filters.
-- Return-type changes require drop + create; grants are re-applied below so
-- only the trusted service_role can execute the function.
drop function if exists public.csc_list_member_survey_responses(text, text, text, integer, integer);

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
