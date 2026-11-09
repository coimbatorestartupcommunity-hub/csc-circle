-- CSC Circle — Resource publishing metadata. Additive and history-safe:
-- every new column is nullable (or an empty array default) so existing
-- published resources keep rendering exactly as before.
begin;

alter table public.resources
  add column if not exists language text,
  add column if not exists page_count integer
    constraint resources_page_count_positive check (page_count is null or page_count > 0),
  add column if not exists publication_date date,
  add column if not exists topics jsonb not null default '[]';

-- Topics must stay an array of {title, body} blocks; element shape is
-- validated by the application schema before writes.
alter table public.resources
  drop constraint if exists resources_topics_is_array;
alter table public.resources
  add constraint resources_topics_is_array check (jsonb_typeof(topics) = 'array');

comment on column public.resources.language is
  'Resource language as entered by the publisher (e.g. English). Displayed only when present; never fabricated.';
comment on column public.resources.page_count is
  'Page count for document-style resources. Displayed only when present.';
comment on column public.resources.publication_date is
  'Original publication date of the resource itself, distinct from the CSC Circle publish timestamp.';
comment on column public.resources.topics is
  'Explicit structured topic/learning-outcome blocks ({title, body}) chosen by the publisher for What You Will Learn cards.';

-- Anonymous readers may see the new metadata on published rows only; the
-- existing RLS policy (publication_status = 'published') still applies.
grant select (language, page_count, publication_date, topics) on public.resources to anon;

commit;
