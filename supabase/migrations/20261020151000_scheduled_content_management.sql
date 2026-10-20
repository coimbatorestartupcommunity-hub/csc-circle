-- Managed website content can be published immediately or within an explicit
-- Asia/Kolkata schedule. Soft deletion preserves moderation/audit history.
alter table public.content_blocks
  add column if not exists visible_from timestamptz,
  add column if not exists visible_until timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.content_blocks drop constraint if exists content_blocks_visibility_window;
alter table public.content_blocks add constraint content_blocks_visibility_window
  check (visible_from is null or visible_until is null or visible_from < visible_until);

drop policy if exists content_public_read on public.content_blocks;
create policy content_public_read on public.content_blocks for select
  using (
    status = 'published'
    and deleted_at is null
    and (visible_from is null or visible_from <= now())
    and (visible_until is null or visible_until > now())
  );

create or replace function private.manage_content(
  action text,
  content_key text,
  content_value text,
  visible_from timestamptz,
  visible_until timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare old_row public.content_blocks; new_row public.content_blocks;
begin
  if not private.has_permission('content.manage') then raise exception 'forbidden' using errcode='42501'; end if;
  if content_key not in ('homepage.announcement','community.introduction','about.mission','about.vision','homepage.event_notice') then raise exception 'invalid content key' using errcode='22023'; end if;
  select * into old_row from public.content_blocks where key=content_key for update;

  if action='unpublish' then
    if not found or old_row.deleted_at is not null then raise exception 'content not found'; end if;
    update public.content_blocks set status='draft',updated_at=now(),updated_by=auth.uid() where key=content_key returning * into new_row;
    insert into public.audit_logs(action,actor_id,actor_role,target_type,target_id,before,after,correlation_id)
      values('content.unpublished',auth.uid(),(select role from public.admin_roles where user_id=auth.uid() order by role limit 1),'content',content_key,to_jsonb(old_row),to_jsonb(new_row),gen_random_uuid()::text);
    return jsonb_build_object('ok',true,'status','draft');
  elsif action='delete' then
    if not found or old_row.deleted_at is not null then raise exception 'content not found'; end if;
    update public.content_blocks set status='archived',deleted_at=now(),updated_at=now(),updated_by=auth.uid() where key=content_key returning * into new_row;
    insert into public.audit_logs(action,actor_id,actor_role,target_type,target_id,before,after,correlation_id)
      values('content.deleted',auth.uid(),(select role from public.admin_roles where user_id=auth.uid() order by role limit 1),'content',content_key,to_jsonb(old_row),jsonb_build_object('status','archived','deleted_at',new_row.deleted_at),gen_random_uuid()::text);
    return jsonb_build_object('ok',true,'status','deleted');
  elsif action not in ('save','publish') then
    raise exception 'invalid content action' using errcode='22023';
  end if;

  if length(trim(coalesce(content_value,'')))=0 or length(content_value)>4000 then raise exception 'invalid content value' using errcode='22023'; end if;
  if visible_from is not null and visible_until is not null and visible_from >= visible_until then raise exception 'invalid visibility window' using errcode='22023'; end if;
  insert into public.content_blocks(key,label,value,status,visible_from,visible_until,created_by,updated_by,deleted_at)
    values(content_key,content_key,content_value,case when action='publish' then 'published'::public.publication_status else 'draft'::public.publication_status end,visible_from,visible_until,auth.uid(),auth.uid(),null)
  on conflict(key) do update set
    value=excluded.value,
    status=excluded.status,
    visible_from=excluded.visible_from,
    visible_until=excluded.visible_until,
    deleted_at=null,
    updated_by=auth.uid(),
    updated_at=now()
  returning * into new_row;
  insert into public.audit_logs(action,actor_id,actor_role,target_type,target_id,before,after,correlation_id)
    values(case when action='publish' then 'content.published' else 'content.saved' end,auth.uid(),(select role from public.admin_roles where user_id=auth.uid() order by role limit 1),'content',content_key,to_jsonb(old_row),to_jsonb(new_row),gen_random_uuid()::text);
  return jsonb_build_object('ok',true,'status',new_row.status,'visible_from',new_row.visible_from,'visible_until',new_row.visible_until);
end;
$$;
revoke all on function private.manage_content(text,text,text,timestamptz,timestamptz) from public;
grant execute on function private.manage_content(text,text,text,timestamptz,timestamptz) to authenticated;

create or replace function public.csc_manage_content(action text,content_key text,content_value text,visible_from timestamptz default null,visible_until timestamptz default null)
returns jsonb language sql security invoker set search_path='' as $$
  select private.manage_content(action,content_key,content_value,visible_from,visible_until)
$$;
revoke all on function public.csc_manage_content(text,text,text,timestamptz,timestamptz) from public,anon;
grant execute on function public.csc_manage_content(text,text,text,timestamptz,timestamptz) to authenticated;
