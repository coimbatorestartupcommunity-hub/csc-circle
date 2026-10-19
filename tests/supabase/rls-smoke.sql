-- Authorized smoke test: synthetic identities and rows exist only in this
-- transaction. Never commit it; no SMTP dispatcher is invoked.
begin;
set local lock_timeout='5s';
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('f0000000-0000-4000-8000-000000000001','csc-rls-a@example.invalid',now(),'{}'),
 ('f0000000-0000-4000-8000-000000000002','csc-rls-b@example.invalid',now(),'{}'),
 ('f0000000-0000-4000-8000-000000000003','csc-rls-admin@example.invalid',now(),'{}');
insert into public.admin_roles(user_id,role) values('f0000000-0000-4000-8000-000000000003','super_admin');
set local role authenticated;
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
do $$begin
 if (select count(*) from public.profiles where id in ('f0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002'))<>1 then raise exception 'cross-account profile isolation failed';end if;
 if private.has_permission('roles.manage') then raise exception 'ordinary member has admin permission';end if;
 update public.memberships set status='active' where user_id=auth.uid();
 if found then raise exception 'member self-activation succeeded';end if;
 begin
  insert into public.admin_roles(user_id,role) values(auth.uid(),'super_admin');
  raise exception 'member role escalation succeeded';
 exception when insufficient_privilege then null;end;
 begin
  perform public.csc_claim_notifications();
  raise exception 'member gained dispatcher access';
 exception when insufficient_privilege then null;end;
 if exists(select 1 from public.notifications) then raise exception 'ordinary member can inspect queue';end if;
end $$;
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000003',true);
do $$begin
 if not private.has_permission('roles.manage') then raise exception 'provisioned admin permission failed';end if;
 if (select count(*) from public.profiles where id in ('f0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002'))<>2 then raise exception 'authorized admin read failed';end if;
end $$;
reset role;
select 'CSC RLS smoke assertions passed; synthetic transaction rolled back' as result;
rollback;
