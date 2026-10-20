-- Explicit community-profile sharing and moderated revisions for published
-- startups. Approved directory rows/media remain unchanged until moderation.
begin;

alter table public.directory_startups
  add column if not exists revision_version integer not null default 1
    check (revision_version > 0);

create table if not exists public.directory_startup_revisions (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.directory_startups(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft','pending','approved','rejected','withdrawn','superseded')),
  base_version integer not null check (base_version > 0),
  proposed_data jsonb not null check (jsonb_typeof(proposed_data) = 'object'),
  proposed_private_details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(proposed_private_details) = 'object'),
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_open_startup_revision_per_startup
  on public.directory_startup_revisions(startup_id)
  where status in ('draft','pending');
create index if not exists startup_revisions_pending_idx
  on public.directory_startup_revisions(submitted_at desc)
  where status='pending';

alter table public.directory_startup_revisions enable row level security;
revoke all on public.directory_startup_revisions from public, anon;
grant select on public.directory_startup_revisions to authenticated;
drop policy if exists startup_revision_select_owner_or_admin on public.directory_startup_revisions;
create policy startup_revision_select_owner_or_admin
  on public.directory_startup_revisions for select to authenticated
  using (submitted_by = (select auth.uid()) or private.has_permission('directory.manage'));
revoke insert, update, delete on public.directory_startup_revisions from authenticated;
grant all on public.directory_startup_revisions to service_role;

create or replace function private.member_directory_eligible(p_user_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id=u.id
    join public.memberships m on m.user_id=u.id
    where u.id=p_user_id and u.email_confirmed_at is not null
      and m.status='active' and m.member_number is not null and m.issued_at is not null
      and length(coalesce(m.verification_token,''))=64
      and (m.expires_at is null or m.expires_at>now())
      and not exists (select 1 from public.memberships x where x.user_id=u.id and x.status in ('suspended','revoked','rejected'))
  );
$$;
revoke all on function private.member_directory_eligible(uuid) from public,anon,authenticated;

create or replace function public.get_member_profile_sharing_state()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_profile public.profiles%rowtype; v_membership public.memberships%rowtype; v_eligible boolean; v_reason text;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into v_profile from public.profiles where id=v_user;
  select * into v_membership from public.memberships where user_id=v_user;
  if not found or v_profile.id is null then raise exception 'member profile unavailable' using errcode='P0002'; end if;
  v_eligible:=private.member_directory_eligible(v_user);
  v_reason:=case
    when not exists(select 1 from auth.users u where u.id=v_user and u.email_confirmed_at is not null) then 'Verify your account email before sharing a CSC community profile.'
    when v_membership.status in ('claim_submitted','pending_verification','approved') then 'Your CSC membership is awaiting administrator approval.'
    when v_membership.status='expired' or (v_membership.expires_at is not null and v_membership.expires_at<=now()) then 'Your CSC membership has expired.'
    when v_membership.status='revoked' then 'Your CSC membership has been revoked.'
    when v_membership.status='suspended' then 'Your CSC account is restricted from community discovery.'
    when v_membership.status<>'active' then 'Your CSC membership must be active before your profile can be shared.'
    when v_membership.member_number is null or v_membership.issued_at is null or length(coalesce(v_membership.verification_token,''))<>64 then 'Your official CSC Digital ID must be issued before profile sharing is available.'
    when coalesce(nullif(btrim(v_profile.display_name),''),nullif(btrim(v_profile.full_name),'')) is null then 'Complete your profile name before sharing it.'
    else null end;
  return jsonb_build_object(
    'eligible',v_eligible,'reason',v_reason,
    'membershipStatus',v_membership.status::text,
    'digitalIdIssued',v_membership.member_number is not null and v_membership.issued_at is not null and length(coalesce(v_membership.verification_token,''))=64,
    'sharingEnabled',coalesce((v_profile.consent->>'communityProfileVisible')::boolean,false),
    'shareWhatsapp',coalesce((v_profile.consent->>'shareWhatsappWithMembers')::boolean,false),
    'showPhoto',coalesce((v_profile.consent->>'showProfilePhotoToMembers')::boolean,false),
    'showCity',coalesce((v_profile.consent->>'showCityToMembers')::boolean,false),
    'showRole',coalesce((v_profile.consent->>'showProfessionalRoleToMembers')::boolean,false),
    'showAbout',coalesce((v_profile.consent->>'showAboutMeToMembers')::boolean,false),
    'showSkills',coalesce((v_profile.consent->>'showSkillsToMembers')::boolean,false),
    'showStartups',coalesce((v_profile.consent->>'showStartupAffiliationsToMembers')::boolean,false),
    'displayName',coalesce(nullif(v_profile.display_name,''),v_profile.full_name),
    'city',v_profile.city,'designation',v_profile.designations[1]::text,
    'aboutMe',v_profile.about_me,'skills',v_profile.skills,
    'hasPhoto',v_profile.portrait_path is not null
  );
end;
$$;
revoke all on function public.get_member_profile_sharing_state() from public,anon;
grant execute on function public.get_member_profile_sharing_state() to authenticated;

create or replace function public.set_member_profile_sharing(p_enabled boolean,p_preferences jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_profile public.profiles%rowtype; v_preferences jsonb; v_consent jsonb;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if jsonb_typeof(coalesce(p_preferences,'{}'::jsonb))<>'object' then raise exception 'invalid preferences' using errcode='22023'; end if;
  select * into v_profile from public.profiles where id=v_user for update;
  if not found then raise exception 'member profile unavailable' using errcode='P0002'; end if;
  if p_enabled and not private.member_directory_eligible(v_user) then raise exception 'active CSC membership and a valid Digital ID are required' using errcode='42501'; end if;
  if p_enabled and coalesce(nullif(btrim(v_profile.display_name),''),nullif(btrim(v_profile.full_name),'')) is null then raise exception 'complete your profile name before sharing' using errcode='23514'; end if;
  v_preferences:=jsonb_build_object(
    'showProfilePhotoToMembers',coalesce((p_preferences->>'showPhoto')::boolean,false),
    'showCityToMembers',coalesce((p_preferences->>'showCity')::boolean,false),
    'showProfessionalRoleToMembers',coalesce((p_preferences->>'showRole')::boolean,false),
    'showAboutMeToMembers',coalesce((p_preferences->>'showAbout')::boolean,false),
    'showSkillsToMembers',coalesce((p_preferences->>'showSkills')::boolean,false),
    'showStartupAffiliationsToMembers',coalesce((p_preferences->>'showStartups')::boolean,false),
    'shareWhatsappWithMembers',coalesce((p_preferences->>'shareWhatsapp')::boolean,false)
  );
  v_consent:=coalesce(v_profile.consent,'{}'::jsonb) || v_preferences || jsonb_build_object(
    'communityProfileVisible',p_enabled,
    'communityProfileConsentVersion',case when p_enabled then 'csc-community-profile-v1' else coalesce(v_profile.consent->>'communityProfileConsentVersion','csc-community-profile-v1') end,
    'communityProfileConsentAt',case when p_enabled then to_jsonb(now()) else coalesce(v_profile.consent->'communityProfileConsentAt','null'::jsonb) end,
    'communityProfileDisabledAt',case when p_enabled then 'null'::jsonb else to_jsonb(now()) end
  );
  update public.profiles set consent=v_consent,updated_at=now() where id=v_user;
  perform private.record_operation(case when p_enabled then 'profile_sharing.enabled' else 'profile_sharing.disabled' end,'profile',v_user,
    jsonb_build_object('communityProfileVisible',coalesce((v_profile.consent->>'communityProfileVisible')::boolean,false)),
    jsonb_build_object('communityProfileVisible',p_enabled,'preferences',v_preferences),null);
  return jsonb_build_object('ok',true,'sharingEnabled',p_enabled);
end;
$$;
revoke all on function public.set_member_profile_sharing(boolean,jsonb) from public,anon;
grant execute on function public.set_member_profile_sharing(boolean,jsonb) to authenticated;

-- Ordinary privacy settings may not set CSC-directory sharing flags directly.
create or replace function public.update_member_profile_preferences(p_consent jsonb)
returns void language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_old jsonb; v_next jsonb;
begin
  if v_user is null or jsonb_typeof(p_consent)<>'object' then raise exception 'invalid preferences' using errcode='42501'; end if;
  if coalesce((p_consent->>'membershipTerms')::boolean,false) is not true then raise exception 'membership terms must remain accepted' using errcode='23514'; end if;
  select consent into v_old from public.profiles where id=v_user for update;
  if not found then raise exception 'member profile unavailable' using errcode='P0002'; end if;
  v_next:=coalesce(v_old,'{}'::jsonb) || jsonb_build_object(
    'membershipTerms',true,
    'operationalEmail',coalesce((p_consent->>'operationalEmail')::boolean,false),
    'marketingEmail',coalesce((p_consent->>'marketingEmail')::boolean,false),
    'directoryParticipation',coalesce((p_consent->>'directoryParticipation')::boolean,false),
    'displayNamePublicly',coalesce((p_consent->>'displayNamePublicly')::boolean,false),
    'displayPhotoPublicly',coalesce((p_consent->>'displayPhotoPublicly')::boolean,false)
  );
  update public.profiles set consent=v_next,updated_at=now() where id=v_user;
end;
$$;
revoke all on function public.update_member_profile_preferences(jsonb) from public,anon;
grant execute on function public.update_member_profile_preferences(jsonb) to authenticated;
revoke update (consent) on public.profiles from authenticated;

-- Directory listing/detail eligibility checks include credential issuance and
-- expiry, so stale consent cannot keep an inactive member discoverable.
create or replace function public.list_discoverable_members(p_search text default '',p_limit integer default 30,p_offset integer default 0)
returns table(member_id uuid,display_name text,city text,designation text,about_me text,skills text[],startup_name text,whatsapp text,has_photo boolean)
language plpgsql stable security definer set search_path=''
as $$
declare v_viewer uuid:=auth.uid(); v_query text:=left(trim(coalesce(p_search,'')),80);
begin
  if v_viewer is null or not private.member_directory_eligible(v_viewer) then raise exception 'active CSC membership and a valid Digital ID are required' using errcode='42501'; end if;
  return query select p.id,coalesce(nullif(p.display_name,''),p.full_name),
    case when coalesce((p.consent->>'showCityToMembers')::boolean,false) then p.city end,
    case when coalesce((p.consent->>'showProfessionalRoleToMembers')::boolean,false) then coalesce(p.designations[1]::text,'') end,
    case when coalesce((p.consent->>'showAboutMeToMembers')::boolean,false) then p.about_me end,
    case when coalesce((p.consent->>'showSkillsToMembers')::boolean,false) then p.skills else '{}'::text[] end,
    case when coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) then (select d.name from public.directory_startups d where d.user_id=p.id and d.status='published' order by d.updated_at desc limit 1) end,
    case when coalesce((p.consent->>'shareWhatsappWithMembers')::boolean,false) then p.whatsapp end,
    coalesce((p.consent->>'showProfilePhotoToMembers')::boolean,false) and p.portrait_path is not null
  from public.profiles p join public.memberships m on m.user_id=p.id and m.status='active'
  where p.id<>v_viewer and private.member_directory_eligible(p.id)
    and coalesce((p.consent->>'communityProfileVisible')::boolean,false)
    and coalesce(nullif(p.display_name,''),nullif(p.full_name,'')) is not null
    and (v_query='' or p.display_name ilike '%'||v_query||'%' or p.full_name ilike '%'||v_query||'%'
      or (coalesce((p.consent->>'showCityToMembers')::boolean,false) and p.city ilike '%'||v_query||'%')
      or (coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) and exists(select 1 from public.directory_startups d where d.user_id=p.id and d.status='published' and d.name ilike '%'||v_query||'%'))
      or (coalesce((p.consent->>'showProfessionalRoleToMembers')::boolean,false) and exists(select 1 from unnest(p.designations) d where d::text ilike '%'||v_query||'%'))
      or (coalesce((p.consent->>'showSkillsToMembers')::boolean,false) and exists(select 1 from unnest(p.skills) s where s ilike '%'||v_query||'%'))
      or (coalesce((p.consent->>'showAboutMeToMembers')::boolean,false) and p.about_me ilike '%'||v_query||'%')
      or (coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) and exists(select 1 from public.directory_startups d where d.user_id=p.id and d.status='published' and d.name ilike '%'||v_query||'%'))
      or (coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) and exists(select 1 from public.directory_startups d where d.user_id=p.id and d.status='published' and d.industry ilike '%'||v_query||'%')))
  order by coalesce(nullif(p.display_name,''),p.full_name)
  limit greatest(1,least(coalesce(p_limit,30),50)) offset greatest(0,least(coalesce(p_offset,0),10000));
end;
$$;
revoke all on function public.list_discoverable_members(text,integer,integer) from public,anon;
grant execute on function public.list_discoverable_members(text,integer,integer) to authenticated;

create or replace function public.get_discoverable_member(p_member_id uuid)
returns table(member_id uuid,display_name text,city text,designation text,about_me text,skills text[],startup_name text,whatsapp text,has_photo boolean,startup_website text)
language plpgsql stable security definer set search_path=''
as $$
declare v_viewer uuid:=auth.uid();
begin
  if v_viewer is null or not private.member_directory_eligible(v_viewer) then raise exception 'active CSC membership and a valid Digital ID are required' using errcode='42501'; end if;
  return query select p.id,coalesce(nullif(p.display_name,''),p.full_name),
    case when coalesce((p.consent->>'showCityToMembers')::boolean,false) then p.city end,
    case when coalesce((p.consent->>'showProfessionalRoleToMembers')::boolean,false) then coalesce(p.designations[1]::text,'') end,
    case when coalesce((p.consent->>'showAboutMeToMembers')::boolean,false) then p.about_me end,
    case when coalesce((p.consent->>'showSkillsToMembers')::boolean,false) then p.skills else '{}'::text[] end,
    case when coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) then (select d.name from public.directory_startups d where d.user_id=p.id and d.status='published' order by d.updated_at desc limit 1) end,
    case when coalesce((p.consent->>'shareWhatsappWithMembers')::boolean,false) then p.whatsapp end,
    coalesce((p.consent->>'showProfilePhotoToMembers')::boolean,false) and p.portrait_path is not null,
    case when coalesce((p.consent->>'showStartupAffiliationsToMembers')::boolean,false) then (select d.website from public.directory_startups d where d.user_id=p.id and d.status='published' order by d.updated_at desc limit 1) end
  from public.profiles p where p.id=p_member_id
    and private.member_directory_eligible(p.id)
    and coalesce((p.consent->>'communityProfileVisible')::boolean,false)
    and coalesce(nullif(p.display_name,''),nullif(p.full_name,'')) is not null;
end;
$$;
revoke all on function public.get_discoverable_member(uuid) from public,anon;
grant execute on function public.get_discoverable_member(uuid) to authenticated;

create or replace function public.submit_startup_revision(
  p_startup_id uuid,p_revision_id uuid,p_proposed jsonb,p_private_details jsonb,p_submit boolean default true
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_startup public.directory_startups%rowtype; v_profile public.profiles%rowtype; v_revision public.directory_startup_revisions%rowtype; v_name text; v_slug text; v_industry text; v_description text; v_path text; v_logo text; v_status text;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if jsonb_typeof(p_proposed)<>'object' or jsonb_typeof(coalesce(p_private_details,'{}'::jsonb))<>'object' then raise exception 'invalid revision data' using errcode='22023'; end if;
  select * into v_startup from public.directory_startups where id=p_startup_id and user_id=v_user for update;
  if not found or v_startup.status<>'published' then raise exception 'published startup ownership required' using errcode='42501'; end if;
  select * into v_profile from public.profiles where id=v_user;
  if v_profile.display_name is null or v_profile.consent->>'directoryParticipation'<>'true' or v_profile.consent->>'displayNamePublicly'<>'true' then raise exception 'directory consent required' using errcode='23514'; end if;
  v_name:=trim(coalesce(p_proposed->>'name','')); v_slug:=trim(coalesce(p_proposed->>'slug',''));
  v_industry:=trim(coalesce(p_proposed->>'industry','')); v_description:=trim(coalesce(p_proposed->>'description',''));
  v_path:=nullif(p_proposed->>'directory_image_path',''); v_logo:=nullif(p_proposed->>'logo_url','');
  if length(v_name) not between 2 and 120 or length(v_slug) not between 3 and 120 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(v_industry) not between 2 and 80 or length(v_description) not between 20 and 3000
    or jsonb_typeof(coalesce(p_proposed->'details','{}'::jsonb))<>'object' then raise exception 'invalid startup details' using errcode='22023'; end if;
  if exists(select 1 from public.directory_startups where slug=v_slug and id<>p_startup_id) then raise exception 'duplicate key value violates unique constraint' using errcode='23505'; end if;
  if v_path is distinct from v_user::text||'/'||p_startup_id::text||'-directory-startup.webp'
    and v_path !~ ('^'||v_user::text||'/'||p_startup_id::text||'-revision-'||p_revision_id::text||'-directory-startup\.webp$') then raise exception 'invalid revision image path' using errcode='23514'; end if;
  if not exists(select 1 from storage.objects where bucket_id='member-portraits' and name=v_path) then raise exception 'revision image missing' using errcode='23514'; end if;
  if v_logo is not null and v_logo is distinct from v_user::text||'/'||p_startup_id::text||'-startup-logo.webp'
    and v_logo !~ ('^'||v_user::text||'/'||p_startup_id::text||'-revision-'||p_revision_id::text||'-startup-logo\.webp$') then raise exception 'invalid revision logo path' using errcode='23514'; end if;
  if v_logo is not null and not exists(select 1 from storage.objects where bucket_id='member-portraits' and name=v_logo) then raise exception 'revision logo missing' using errcode='23514'; end if;
  if exists(select 1 from public.directory_startup_revisions r where r.startup_id=p_startup_id and r.id<>p_revision_id and r.status in ('draft','pending')) then raise exception 'startup revision already pending' using errcode='23514'; end if;
  select * into v_revision from public.directory_startup_revisions where id=p_revision_id and startup_id=p_startup_id and submitted_by=v_user for update;
  if found and v_revision.status not in ('draft') then raise exception 'revision is already submitted for review' using errcode='23514'; end if;
  v_status:=case when p_submit then 'pending' else 'draft' end;
  if v_revision.id is null then
    insert into public.directory_startup_revisions(id,startup_id,submitted_by,status,base_version,proposed_data,proposed_private_details,submitted_at)
    values(p_revision_id,p_startup_id,v_user,v_status,v_startup.revision_version,p_proposed,coalesce(p_private_details,'{}'::jsonb),case when p_submit then now() end);
  else
    update public.directory_startup_revisions set status=v_status,base_version=v_startup.revision_version,proposed_data=p_proposed,
      proposed_private_details=coalesce(p_private_details,'{}'::jsonb),submitted_at=case when p_submit then now() else null end,updated_at=now()
    where id=p_revision_id;
  end if;
  if p_submit then perform private.record_operation('startup.revision.submitted','directory_startup_revision',p_revision_id,
    jsonb_build_object('status',coalesce(v_revision.status,'new')),
    jsonb_build_object('status','pending','startup_id',p_startup_id,'startup_name',v_name),v_user); end if;
  return p_revision_id;
end;
$$;
revoke all on function public.submit_startup_revision(uuid,uuid,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.submit_startup_revision(uuid,uuid,jsonb,jsonb,boolean) to authenticated;

create or replace function public.review_startup_revision(p_revision_id uuid,p_decision text,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_revision public.directory_startup_revisions%rowtype; v_startup public.directory_startups%rowtype; v_data jsonb; v_private jsonb; v_user uuid;
begin
  if auth.uid() is null or not private.has_permission('directory.manage') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid decision' using errcode='22023'; end if;
  if p_decision='rejected' and length(trim(coalesce(p_reason,'')))<5 then raise exception 'review reason required' using errcode='22023'; end if;
  select * into v_revision from public.directory_startup_revisions where id=p_revision_id for update;
  if not found or v_revision.status<>'pending' then raise exception 'pending revision not found' using errcode='P0002'; end if;
  select * into v_startup from public.directory_startups where id=v_revision.startup_id for update;
  if not found or v_startup.status<>'published' then raise exception 'startup is no longer published' using errcode='23514'; end if;
  if v_startup.revision_version<>v_revision.base_version then raise exception 'startup changed since this revision was submitted' using errcode='40001'; end if;
  v_user:=v_startup.user_id;
  if p_decision='approved' then
    v_data:=v_revision.proposed_data; v_private:=v_revision.proposed_private_details;
    update public.directory_startups set name=v_data->>'name',slug=v_data->>'slug',industry=v_data->>'industry',description=v_data->>'description',
      website=nullif(v_data->>'website',''),logo_url=nullif(v_data->>'logo_url',''),directory_image_path=v_data->>'directory_image_path',
      founder=coalesce(v_data->'founder',founder),details=coalesce(v_data->'details','{}'::jsonb),
      collaboration=coalesce(array(select jsonb_array_elements_text(coalesce(v_data->'collaboration','[]'::jsonb))),'{}'::text[]),
      revision_version=revision_version+1,updated_at=now()
    where id=v_startup.id;
    insert into public.directory_startup_private_details(startup_id,user_id,details)
      values(v_startup.id,v_user,v_private)
      on conflict(startup_id) do update set details=excluded.details,updated_at=now() where public.directory_startup_private_details.user_id=v_user;
  end if;
  update public.directory_startup_revisions set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),review_reason=nullif(trim(coalesce(p_reason,'')),''),updated_at=now() where id=p_revision_id;
  perform private.record_operation('startup.revision.'||p_decision,'directory_startup_revision',p_revision_id,
    jsonb_build_object('status','pending','startup_id',v_startup.id),jsonb_build_object('status',p_decision,'reason',p_reason),v_user);
  return jsonb_build_object('ok',true,'status',p_decision,'startup_id',v_startup.id);
end;
$$;
revoke all on function public.review_startup_revision(uuid,text,text) from public,anon;
grant execute on function public.review_startup_revision(uuid,text,text) to authenticated;

create or replace function private.notification_copy(p_action text,p_kind text)
returns table(title text,message text,action_url text) language sql immutable set search_path=''
as $$
  select
    case p_action
      when 'claim.active' then 'CSC membership is active'
      when 'claim.pending_verification' then 'Membership application received'
      when 'review.approved' then 'Review approved'
      when 'review.rejected' then 'Review update'
      when 'startup.published' then 'Startup profile published'
      when 'startup.revision.approved' then 'Startup changes approved'
      when 'startup.revision.rejected' then 'Startup changes need an update'
      when 'startup.revision.submitted' then 'Startup changes submitted'
      when 'registration.submitted' then 'Event registration received'
      when 'attendance.checked_in' then 'Event check-in complete'
      else 'CSC account update' end,
    case p_action
      when 'claim.active' then 'Your CSC membership is now active.'
      when 'claim.pending_verification' then 'Your CSC membership application is awaiting verification.'
      when 'review.approved' then 'Your CSC community review has been approved.'
      when 'review.rejected' then 'There is an update to your CSC community review.'
      when 'startup.published' then 'Your startup profile is now published in the CSC directory.'
      when 'startup.revision.approved' then 'Your updated startup information is now published in the CSC directory.'
      when 'startup.revision.rejected' then 'Your startup changes were not approved. Review the administrator feedback in My Startups.'
      when 'startup.revision.submitted' then 'Your startup changes were submitted to CSC administrators for review. The current published listing remains visible until approval.'
      when 'registration.submitted' then 'Your event registration has been received.'
      when 'attendance.checked_in' then 'Your attendance has been recorded.'
      else 'There is an update to your CSC account.' end,
    case p_action
      when 'claim.active' then '/member/id-card'
      when 'claim.pending_verification' then '/member/claim'
      when 'review.approved' then '/member/reviews'
      when 'review.rejected' then '/member/reviews'
      when 'startup.published' then '/member/startups'
      when 'startup.revision.approved' then '/member/startups'
      when 'startup.revision.rejected' then '/member/startups'
      when 'startup.revision.submitted' then '/member/startups'
      when 'registration.submitted' then '/member/events'
      when 'attendance.checked_in' then '/member/events'
      else '/member' end
$$;
revoke all on function private.notification_copy(text,text) from public,anon,authenticated;

commit;
