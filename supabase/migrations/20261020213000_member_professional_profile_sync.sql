begin;

create or replace function private.save_member_resume(p_resume_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_updated timestamptz;
  v_skills text[];
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if jsonb_typeof(p_resume_data)<>'object' or pg_column_size(p_resume_data)>1048576 then
    raise exception 'invalid resume data' using errcode='22023';
  end if;
  if p_resume_data ? 'aboutMe' and (jsonb_typeof(p_resume_data->'aboutMe')<>'string' or length(p_resume_data->>'aboutMe')>1200) then
    raise exception 'invalid profile biography' using errcode='22023';
  end if;
  if p_resume_data ? 'skills' and jsonb_typeof(p_resume_data->'skills')<>'array' then
    raise exception 'invalid skills list' using errcode='22023';
  end if;
  if p_resume_data ? 'skills' and jsonb_array_length(p_resume_data->'skills')>20 then
    raise exception 'invalid skills list' using errcode='22023';
  end if;
  if p_resume_data ? 'skills' and exists (
    select 1
    from jsonb_array_elements(p_resume_data->'skills') as category(value)
    where jsonb_typeof(value)<>'object'
      or jsonb_typeof(value->'category')<>'string'
      or length(trim(value->>'category')) not between 1 and 100
      or jsonb_typeof(value->'items')<>'array'
      or jsonb_array_length(value->'items')>40
      or exists (
        select 1 from jsonb_array_elements(value->'items') as item(value)
        where jsonb_typeof(item.value)<>'string'
          or length(trim(item.value #>> '{}')) not between 1 and 80
      )
  ) then
    raise exception 'invalid skills list' using errcode='22023';
  end if;

  if p_resume_data ? 'skills' then
    select coalesce(array_agg(distinct trim(skill) order by trim(skill)),array[]::text[])
      into v_skills
      from jsonb_array_elements(coalesce(p_resume_data->'skills','[]'::jsonb)) as categories(category)
    cross join lateral jsonb_array_elements_text(category->'items') as item(skill)
    where length(trim(skill)) between 1 and 80;
  end if;

  update public.profiles
    set about_me=case when p_resume_data ? 'aboutMe' then p_resume_data->>'aboutMe' else about_me end,
        skills=case when p_resume_data ? 'skills' then coalesce(v_skills,array[]::text[]) else skills end
    where id=v_user;
  if not found then raise exception 'member profile not found' using errcode='P0002'; end if;

  insert into private.member_resumes(user_id,resume_data,updated_at)
    values(v_user,p_resume_data,now())
    on conflict(user_id) do update set resume_data=excluded.resume_data,updated_at=now()
    returning updated_at into v_updated;

  perform private.record_operation('member.resume.saved','member_resume',v_user,null,
    jsonb_build_object('updated_at',v_updated,'section_count',(select count(*) from jsonb_object_keys(p_resume_data))),v_user);
  return v_updated;
end;
$$;

revoke all on function private.save_member_resume(jsonb) from public,anon;
grant execute on function private.save_member_resume(jsonb) to authenticated;

create or replace function public.save_member_resume(p_resume_data jsonb)
returns timestamptz
language sql
security invoker
set search_path=''
as $$ select private.save_member_resume(p_resume_data) $$;
revoke all on function public.save_member_resume(jsonb) from public,anon;
grant execute on function public.save_member_resume(jsonb) to authenticated;

commit;
