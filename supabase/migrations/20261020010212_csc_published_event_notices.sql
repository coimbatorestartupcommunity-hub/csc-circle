-- Let authorized notification managers publish one structured event notice
-- through the existing audited content-block workflow. The JSON is plain data,
-- never rendered as HTML, and remains subject to the published-content RLS rule.
create or replace function private.save_content(content_key text, content_value text, publish boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('content.manage') and not private.has_permission('settings.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if content_key not in ('homepage.announcement','community.introduction','about.mission','about.vision','homepage.event_notice')
     or length(content_value) > 4000 then
    raise exception 'invalid content';
  end if;
  insert into public.content_blocks(key,label,value,status)
  values(content_key,content_key,content_value,case when publish then 'published'::public.publication_status else 'draft'::public.publication_status end)
  on conflict(key) do update set value=excluded.value,status=excluded.status,updated_at=now();
  insert into public.audit_logs(action,actor_id,target_type,target_id,after,correlation_id)
  values('content.saved',auth.uid(),'content',content_key,jsonb_build_object('published',publish),gen_random_uuid()::text);
end
$$;

create or replace function public.csc_save_content(content_key text,content_value text,publish boolean)
returns void language sql security invoker set search_path='' as $$
  select private.save_content(content_key,content_value,publish)
$$;
revoke all on function public.csc_save_content(text,text,boolean) from public;
grant execute on function public.csc_save_content(text,text,boolean) to authenticated;
