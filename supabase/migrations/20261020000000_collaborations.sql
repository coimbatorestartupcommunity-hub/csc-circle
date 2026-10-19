-- CSC Circle — Collaborations module (reusable community partnerships / joint
-- events). Additive. Public reads only PUBLISHED records; admins manage via
-- is_admin(). Seeds the first collaboration (CSC × Outlier) idempotently.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists collaboration_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  organization_type text not null default 'community',
  description text,
  logo_path text,
  website_url text,
  approved_social_urls jsonb not null default '[]',
  publication_status publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_collab_org_updated on collaboration_organizations;
create trigger trg_collab_org_updated before update on collaboration_organizations
  for each row execute function set_updated_at();

create table if not exists collaborations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  tagline text,
  summary text,
  story text,
  category text not null default 'Community Meetup & Networking',
  status text not null default 'completed'
    check (status in ('upcoming','ongoing','completed','cancelled')),
  publication_status publication_status not null default 'draft',
  featured_image_path text,
  highlights jsonb not null default '[]',
  event_id uuid references events(id) on delete set null,
  event_date timestamptz,
  venue_name text,
  venue_address text,
  seo_title text,
  meta_description text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_collab_updated on collaborations;
create trigger trg_collab_updated before update on collaborations
  for each row execute function set_updated_at();

create table if not exists collaboration_partners (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references collaborations(id) on delete cascade,
  organization_id uuid not null references collaboration_organizations(id) on delete cascade,
  participation_role text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (collaboration_id, organization_id)
);

create table if not exists collaboration_media (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references collaborations(id) on delete cascade,
  media_path text not null,
  media_type text not null default 'image',
  alt_text text,
  caption text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (collaboration_id, media_path)
);

create index if not exists idx_collab_published on collaborations (publication_status, status);
create index if not exists idx_collab_partners_collab on collaboration_partners (collaboration_id);
create index if not exists idx_collab_media_collab on collaboration_media (collaboration_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table collaboration_organizations enable row level security;
alter table collaborations              enable row level security;
alter table collaboration_partners      enable row level security;
alter table collaboration_media         enable row level security;

grant select on collaboration_organizations, collaborations, collaboration_partners, collaboration_media to anon, authenticated;
grant insert, update, delete on collaboration_organizations, collaborations, collaboration_partners, collaboration_media to authenticated;

-- Public: read published collaborations + their partners/media/orgs.
drop policy if exists collab_public_read on collaborations;
create policy collab_public_read on collaborations for select
  using (publication_status = 'published');
drop policy if exists collab_admin_all on collaborations;
create policy collab_admin_all on collaborations for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists collab_org_public_read on collaboration_organizations;
create policy collab_org_public_read on collaboration_organizations for select
  using (publication_status = 'published');
drop policy if exists collab_org_admin_all on collaboration_organizations;
create policy collab_org_admin_all on collaboration_organizations for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists collab_partners_public_read on collaboration_partners;
create policy collab_partners_public_read on collaboration_partners for select
  using (exists (select 1 from collaborations c where c.id = collaboration_id and c.publication_status = 'published'));
drop policy if exists collab_partners_admin_all on collaboration_partners;
create policy collab_partners_admin_all on collaboration_partners for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists collab_media_public_read on collaboration_media;
create policy collab_media_public_read on collaboration_media for select
  using (exists (select 1 from collaborations c where c.id = collaboration_id and c.publication_status = 'published'));
drop policy if exists collab_media_admin_all on collaboration_media;
create policy collab_media_admin_all on collaboration_media for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Seed: CSC × Outlier (idempotent)
-- ---------------------------------------------------------------------------
insert into collaboration_organizations (name, slug, organization_type, description, logo_path, publication_status)
values
  ('Coimbatore Startup Community', 'csc-circle', 'community',
   'Coimbatore''s founder-focused startup community — Connect. Build. Grow.',
   '/brand/csc-logo.png', 'published'),
  ('Outlier', 'outlier', 'community',
   'A community partner for the CSC × Outlier meetup.',
   '/brand/outlier-logo.png', 'published')
on conflict (slug) do nothing;

insert into collaborations (slug, title, tagline, summary, story, category, status, publication_status, featured_image_path, highlights, seo_title, meta_description, published_at)
values (
  'csc-outlier',
  'CSC × Outlier',
  'One Meetup. Countless Connections.',
  'CSC Circle and Outlier came together for a community meetup focused on meaningful conversations, new connections, shared ideas, and the joy of building together.',
  'Great communities are built through meaningful connections. CSC Circle and Outlier came together for a meetup filled with conversations, new ideas, networking, and shared enthusiasm for building something together.' || chr(10) || chr(10) ||
  'The meetup brought people together through interactive ice-breaking activities, open conversations, and opportunities to connect with others in the community. It created space to exchange perspectives, discover common interests, and strengthen relationships.' || chr(10) || chr(10) ||
  'Thank you to everyone who participated and helped make this gathering memorable. We look forward to more opportunities to connect, collaborate, and grow together.',
  'Community Meetup & Networking',
  'completed',
  'published',
  '/images/community-outlier.png',
  '[
    {"icon":"Users","title":"New connections","body":"New connections and networking across the community."},
    {"icon":"Sparkles","title":"Ice-breaking activities","body":"Interactive ice-breaking activities to get everyone talking."},
    {"icon":"MessagesSquare","title":"Meaningful conversations","body":"Open, meaningful conversations between participants."},
    {"icon":"Lightbulb","title":"Sharing ideas","body":"Sharing ideas and perspectives with one another."},
    {"icon":"Handshake","title":"Stronger community","body":"Building a stronger, more connected community."}
  ]'::jsonb,
  'CSC × Outlier Meetup | CSC Circle Collaborations',
  'Explore the CSC × Outlier community meetup, featuring networking, shared ideas, meaningful conversations, and community connections.',
  now()
)
on conflict (slug) do nothing;

insert into collaboration_partners (collaboration_id, organization_id, participation_role, display_order)
select c.id, o.id, 'Host', case when o.slug = 'csc-circle' then 0 else 1 end
from collaborations c
join collaboration_organizations o on o.slug in ('csc-circle', 'outlier')
where c.slug = 'csc-outlier'
on conflict (collaboration_id, organization_id) do nothing;

insert into collaboration_media (collaboration_id, media_path, media_type, alt_text, caption, display_order)
select c.id, '/images/community-outlier.png', 'image',
  'Community moments from the CSC × Outlier meetup.',
  'Community moments from the CSC × Outlier meetup.', 0
from collaborations c where c.slug = 'csc-outlier'
on conflict (collaboration_id, media_path) do nothing;
