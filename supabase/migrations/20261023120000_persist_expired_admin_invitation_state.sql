-- An exception aborts its PostgreSQL transaction, including any status update
-- immediately before it. Return an explicit non-success result after persisting
-- expiration so the caller can report expiry without leaving a stale pending row.
begin;

create or replace function public.csc_accept_admin_role_invitation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.admin_role_invitations;
  verified_email text;
  last_sign_in_epoch bigint;
  assignment_inserted boolean := false;
  assignment_rows integer := 0;
begin
  if auth.uid() is null or not private.account_allowed() then raise exception 'invitation acceptance unavailable' using errcode = '42501'; end if;
  select lower(u.email) into verified_email from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;
  if verified_email is null then raise exception 'verified email required' using errcode = '42501'; end if;
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invitation invalid or unavailable' using errcode = '22023'; end if;

  select * into invitation from public.admin_role_invitations i
  where i.token_hash = p_token_hash and i.status = 'pending' for update;
  if not found or invitation.delivery_status <> 'smtp_accepted' or invitation.normalized_email <> verified_email then
    raise exception 'invitation invalid or unavailable' using errcode = '42501';
  end if;
  if invitation.expires_at <= now() then
    update public.admin_role_invitations set status = 'expired', updated_at = now() where id = invitation.id and status = 'pending';
    insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, after, correlation_id)
    values ('admin.invitation.expired', null, 'system', 'admin_role_invitation', invitation.id::text,
      jsonb_build_object('role', invitation.role, 'status', 'expired', 'channel', 'email'), invitation.correlation_id::text);
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if invitation.role = 'super_admin' and coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    select extract(epoch from u.last_sign_in_at)::bigint into last_sign_in_epoch from auth.users u where u.id = auth.uid();
    if coalesce(last_sign_in_epoch, 0) < extract(epoch from now() - interval '10 minutes')::bigint then
      raise exception 'recent authentication required for Super Admin' using errcode = '42501';
    end if;
  end if;

  insert into public.admin_roles(user_id, role) values (auth.uid(), invitation.role) on conflict (user_id, role) do nothing;
  get diagnostics assignment_rows = row_count;
  assignment_inserted := assignment_rows > 0;
  update public.admin_role_invitations set status = 'accepted', accepted_at = now(), accepted_by = auth.uid(), updated_at = now()
  where id = invitation.id and status = 'pending';
  if not found then raise exception 'invitation invalid or unavailable' using errcode = '42501'; end if;
  insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, after, correlation_id)
  values ('admin.invitation.accepted', auth.uid(), invitation.role, 'admin_role_invitation', invitation.id::text,
    jsonb_build_object('role', invitation.role, 'assignmentCreated', assignment_inserted), invitation.correlation_id::text);
  insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, after, correlation_id)
  values ('admin.role.assigned', auth.uid(), invitation.role, 'admin_role', auth.uid()::text,
    jsonb_build_object('role', invitation.role, 'invitationId', invitation.id), invitation.correlation_id::text);
  return jsonb_build_object('ok', true, 'role', invitation.role, 'acceptedAt', now(), 'assignmentCreated', assignment_inserted);
end;
$$;
revoke all on function public.csc_accept_admin_role_invitation(text) from public, anon;
grant execute on function public.csc_accept_admin_role_invitation(text) to authenticated;

create or replace function public.csc_accept_admin_role_invitation_in_app(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.admin_role_invitations;
  verified_email text;
  last_sign_in_epoch bigint;
  assignment_inserted boolean := false;
  assignment_rows integer := 0;
begin
  if auth.uid() is null or not private.account_allowed() then
    raise exception 'invitation acceptance unavailable' using errcode = '42501';
  end if;
  select lower(u.email) into verified_email
  from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
  if verified_email is null then raise exception 'verified email required' using errcode = '42501'; end if;
  if p_invitation_id is null then raise exception 'invitation invalid or unavailable' using errcode = '22023'; end if;

  select * into invitation from public.admin_role_invitations i
  where i.id = p_invitation_id and i.status = 'pending' for update;
  if not found then raise exception 'invitation invalid or unavailable' using errcode = '42501'; end if;
  if invitation.expires_at <= now() then
    update public.admin_role_invitations set status = 'expired', updated_at = now()
    where id = invitation.id and status = 'pending';
    insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, after, correlation_id)
    values ('admin.invitation.expired', null, 'system', 'admin_role_invitation', invitation.id::text,
      jsonb_build_object('role', invitation.role, 'status', 'expired', 'channel', 'in_app'), invitation.correlation_id::text);
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if invitation.normalized_email <> verified_email then
    raise exception 'invitation invalid or unavailable' using errcode = '42501';
  end if;
  if invitation.role = 'super_admin' and coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    select extract(epoch from u.last_sign_in_at)::bigint into last_sign_in_epoch from auth.users u where u.id = auth.uid();
    if coalesce(last_sign_in_epoch, 0) < extract(epoch from now() - interval '10 minutes')::bigint then
      raise exception 'recent authentication required for Super Admin' using errcode = '42501';
    end if;
  end if;

  insert into public.admin_roles(user_id, role) values (auth.uid(), invitation.role)
  on conflict (user_id, role) do nothing;
  get diagnostics assignment_rows = row_count;
  assignment_inserted := assignment_rows > 0;
  update public.admin_role_invitations
  set status = 'accepted', accepted_at = now(), accepted_by = auth.uid(), updated_at = now()
  where id = invitation.id and status = 'pending';
  if not found then raise exception 'invitation invalid or unavailable' using errcode = '42501'; end if;
  insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, after, correlation_id)
  values ('admin.invitation.accepted', auth.uid(), invitation.role, 'admin_role_invitation', invitation.id::text,
    jsonb_build_object('role', invitation.role, 'assignmentCreated', assignment_inserted, 'channel', 'in_app'), invitation.correlation_id::text);
  insert into public.audit_logs(action, actor_id, actor_role, target_type, target_id, after, correlation_id)
  values ('admin.role.assigned', auth.uid(), invitation.role, 'admin_role', auth.uid()::text,
    jsonb_build_object('role', invitation.role, 'invitationId', invitation.id, 'channel', 'in_app'), invitation.correlation_id::text);
  return jsonb_build_object('ok', true, 'role', invitation.role, 'acceptedAt', now(), 'assignmentCreated', assignment_inserted);
end;
$$;

revoke all on function public.csc_accept_admin_role_invitation_in_app(uuid) from public, anon;
grant execute on function public.csc_accept_admin_role_invitation_in_app(uuid) to authenticated;

commit;
