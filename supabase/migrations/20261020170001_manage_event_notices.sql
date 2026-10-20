create or replace function private.manage_event_notice(
  operation text,
  notice_id uuid,
  linked_event_id uuid default null,
  notice_title text default null,
  notice_message text default null,
  notice_button_label text default 'View Event',
  notice_banner_path text default null,
  starts_at timestamptz default null,
  stops_at timestamptz default null,
  priority integer default 0
) returns jsonb language plpgsql security definer set search_path='' as $$
declare old_row public.event_notices; new_row public.event_notices; linked_status public.publication_status; linked_end timestamptz;
begin
  if not private.has_permission('content.manage') and not private.has_permission('settings.manage') then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if operation not in ('save','publish','unpublish','delete') then raise exception 'invalid operation' using errcode='22023'; end if;
  select * into old_row from public.event_notices where id=notice_id for update;
  if operation in ('unpublish','delete') then
    if not found or old_row.deleted_at is not null then raise exception 'notice not found' using errcode='P0002'; end if;
    if operation='unpublish' then
      update public.event_notices set status='draft',unpublished_at=now(),updated_by=auth.uid() where id=notice_id returning * into new_row;
    else
      update public.event_notices set status='archived',deleted_at=now(),unpublished_at=now(),updated_by=auth.uid() where id=notice_id returning * into new_row;
    end if;
  else
    if linked_event_id is null or notice_title is null or notice_message is null or notice_button_label is null then raise exception 'incomplete notice' using errcode='22023'; end if;
    if char_length(btrim(notice_title)) not between 3 and 100 or char_length(btrim(notice_message)) not between 8 and 500 or char_length(btrim(notice_button_label)) not between 2 and 40 then raise exception 'invalid notice content' using errcode='22023'; end if;
    if priority not between 0 and 1000 or (starts_at is not null and stops_at is not null and starts_at >= stops_at) then raise exception 'invalid schedule' using errcode='22023'; end if;
    select status,ends_at into linked_status,linked_end from public.events where id=linked_event_id;
    if not found then raise exception 'event not found' using errcode='P0002'; end if;
    if operation='publish' and linked_status <> 'published' then raise exception 'event must be published first' using errcode='22023'; end if;
    if operation='publish' and linked_end <= now() then raise exception 'event has already ended' using errcode='22023'; end if;
    if old_row.id is null then
      insert into public.event_notices(id,event_id,title,message,button_label,banner_path,status,visible_from,visible_until,display_priority,created_by,updated_by,published_at)
        values(notice_id,linked_event_id,btrim(notice_title),btrim(notice_message),btrim(notice_button_label),notice_banner_path,
          case when operation='publish' then 'published' else 'draft' end,starts_at,stops_at,priority,auth.uid(),auth.uid(),case when operation='publish' then now() else null end)
        returning * into new_row;
    else
      update public.event_notices set event_id=linked_event_id,title=btrim(notice_title),message=btrim(notice_message),button_label=btrim(notice_button_label),banner_path=notice_banner_path,
        status=case when operation='publish' then 'published' else 'draft' end,visible_from=starts_at,visible_until=stops_at,display_priority=priority,
        updated_by=auth.uid(),deleted_at=null,published_at=case when operation='publish' then coalesce(published_at,now()) else published_at end,
        unpublished_at=case when operation='publish' then null else unpublished_at end
        where id=notice_id returning * into new_row;
    end if;
  end if;
  insert into public.audit_logs(action,actor_id,actor_role,target_type,target_id,before,after,correlation_id)
    values('event_notice.'||case when operation='save' then 'saved' when operation='publish' then 'published' when operation='unpublish' then 'unpublished' else 'deleted' end,
      auth.uid(),(select role from public.admin_roles where user_id=auth.uid() order by role limit 1),'event_notice',notice_id::text,
      case when old_row.id is null then null else to_jsonb(old_row) end,to_jsonb(new_row),gen_random_uuid()::text);
  return jsonb_build_object('ok',true,'id',new_row.id,'status',new_row.status);
end; $$;

revoke all on function private.manage_event_notice(text,uuid,uuid,text,text,text,text,timestamptz,timestamptz,integer) from public;
grant execute on function private.manage_event_notice(text,uuid,uuid,text,text,text,text,timestamptz,timestamptz,integer) to authenticated;

create or replace function public.csc_manage_event_notice(
  operation text, notice_id uuid, linked_event_id uuid default null, notice_title text default null,
  notice_message text default null, notice_button_label text default 'View Event', notice_banner_path text default null,
  starts_at timestamptz default null, stops_at timestamptz default null, priority integer default 0
) returns jsonb language sql security invoker set search_path='' as $$
  select private.manage_event_notice(operation,notice_id,linked_event_id,notice_title,notice_message,notice_button_label,notice_banner_path,starts_at,stops_at,priority)
$$;
revoke all on function public.csc_manage_event_notice(text,uuid,uuid,text,text,text,text,timestamptz,timestamptz,integer) from public,anon;
grant execute on function public.csc_manage_event_notice(text,uuid,uuid,text,text,text,text,timestamptz,timestamptz,integer) to authenticated;
