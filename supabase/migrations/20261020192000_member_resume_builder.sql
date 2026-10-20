begin;

create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to authenticated,service_role;

create table if not exists private.member_resumes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  resume_data jsonb not null default '{}'::jsonb check (jsonb_typeof(resume_data)='object'),
  updated_at timestamptz not null default now()
);
alter table private.member_resumes enable row level security;
revoke all on private.member_resumes from public,anon,authenticated;
grant all on private.member_resumes to service_role;

create or replace function public.get_member_resume()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_data jsonb;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  select resume_data into v_data from private.member_resumes where user_id=v_user;
  return coalesce(v_data,'{}'::jsonb);
end;
$$;
revoke all on function public.get_member_resume() from public,anon;
grant execute on function public.get_member_resume() to authenticated;

create or replace function public.save_member_resume(p_resume_data jsonb)
returns timestamptz language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_updated timestamptz;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if jsonb_typeof(p_resume_data)<>'object' or pg_column_size(p_resume_data)>1048576 then raise exception 'invalid resume data' using errcode='22023'; end if;
  insert into private.member_resumes(user_id,resume_data,updated_at) values(v_user,p_resume_data,now())
  on conflict(user_id) do update set resume_data=excluded.resume_data,updated_at=now()
  returning updated_at into v_updated;
  perform private.record_operation('member.resume.saved','member_resume',v_user,null,
    jsonb_build_object('updated_at',v_updated,'section_count',(select count(*) from jsonb_object_keys(p_resume_data))),v_user);
  return v_updated;
end;
$$;
revoke all on function public.save_member_resume(jsonb) from public,anon;
grant execute on function public.save_member_resume(jsonb) to authenticated;

commit;
