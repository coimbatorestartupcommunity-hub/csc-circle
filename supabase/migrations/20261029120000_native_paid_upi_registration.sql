-- Native, public UPI registrations are separate from member ticket rows.
-- Payment proof lives in a private bucket and is never exposed via a public URL.
begin;

do $$ begin
  create type public.event_registration_mode as enum ('rsvp','paid_upi');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.paid_registration_status as enum ('pending_verification','confirmed','rejected','cancelled');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.paid_registration_role as enum ('Startup Founder / Co-Founder','Entrepreneur / Business Owner','Working Professional','Student','Freelancer / Creator','Aspiring Entrepreneur','Other');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.paid_registration_referral as enum ('Instagram','WhatsApp','LinkedIn','Friends / Referral','CSC Community','Other');
exception when duplicate_object then null;
end $$;

alter table public.events
  add column if not exists summary text not null default '',
  add column if not exists organizer text not null default '',
  add column if not exists registration_mode public.event_registration_mode not null default 'rsvp',
  add column if not exists price_per_attendee numeric(10,2),
  add column if not exists max_attendees_per_registration integer not null default 10 check (max_attendees_per_registration between 1 and 10),
  add column if not exists upi_vpa text,
  add column if not exists upi_payee_name text,
  add column if not exists upi_qr_path text,
  add column if not exists payment_note text,
  add column if not exists format text not null default 'offline' check (format in ('offline','online','hybrid')),
  add column if not exists maps_url text,
  add column if not exists approval_mode text not null default 'automatic' check (approval_mode in ('automatic','manual')),
  add column if not exists cover_image_alt text;

alter table public.event_registrations
  add column if not exists source text not null default 'platform' check (source in ('platform','google_form_import')),
  add column if not exists source_email text,
  add column if not exists source_timestamp timestamptz,
  add column if not exists source_parent_registration_id uuid references public.event_registrations(id) on delete cascade;
alter table public.event_registrations drop constraint if exists event_registrations_user_id_event_id_key;
create index if not exists event_registrations_user_event_idx on public.event_registrations(user_id,event_id);
create index if not exists event_registrations_source_email_idx on public.event_registrations(event_id,lower(source_email)) where source_email is not null;
create table if not exists public.event_registration_import_metadata (
  registration_id uuid primary key references public.event_registrations(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.event_registration_import_metadata enable row level security;
revoke all on public.event_registration_import_metadata from anon,authenticated;
grant select on public.event_registration_import_metadata to authenticated;
grant select,insert,update,delete on public.event_registration_import_metadata to service_role;
drop policy if exists event_registration_import_metadata_admin_read on public.event_registration_import_metadata;
create policy event_registration_import_metadata_admin_read on public.event_registration_import_metadata for select to authenticated using(private.has_permission('registrations.read'));

create or replace function private.sync_event_registration_config() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  new.registration_mode=coalesce(new.settings->>'registrationMode','rsvp')::public.event_registration_mode;
  new.price_per_attendee=nullif(new.settings->>'pricePerAttendee','')::numeric;
  new.max_attendees_per_registration=coalesce(nullif(new.settings->>'maxAttendeesPerRegistration','')::integer,10);
  new.upi_vpa=nullif(trim(new.settings->>'upiVpa'),'');
  new.upi_payee_name=nullif(trim(new.settings->>'upiPayeeName'),'');
  new.upi_qr_path=nullif(trim(new.settings->>'upiQrPath'),'');
  new.payment_note=nullif(trim(new.settings->>'paymentNote'),'');
  new.summary=coalesce(new.settings->>'summary','');
  new.organizer=coalesce(new.settings->>'organizer','');
  new.format=coalesce(new.settings->>'format','offline');
  new.maps_url=nullif(trim(new.settings->>'mapsUrl'),'');
  new.approval_mode=coalesce(new.settings->>'approvalMode','automatic');
  new.cover_image_alt=nullif(trim(new.settings->>'imageAlt'),'');
  if new.registration_mode='paid_upi' then
    if new.admission<>'paid' or new.price_per_attendee is null or new.price_per_attendee<=0 then
      raise exception 'paid UPI registration requires a positive attendee price';
    end if;
    if new.status='published' and (nullif(trim(new.upi_vpa),'') is null or nullif(trim(new.upi_payee_name),'') is null or nullif(trim(new.upi_qr_path),'') is null) then
      raise exception 'UPI payee, VPA, and QR image are required before publishing';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists events_paid_upi_config_guard on public.events;
create trigger events_paid_upi_config_guard before insert or update on public.events
for each row execute function private.sync_event_registration_config();
revoke all on function private.sync_event_registration_config() from public,anon,authenticated;

create table if not exists public.paid_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  member_registration_id uuid references public.event_registrations(id) on delete set null,
  reference text not null unique default ('CSC-EVT-' || upper(replace(gen_random_uuid()::text,'-',''))),
  created_at timestamptz not null default now(),
  status public.paid_registration_status not null default 'pending_verification',
  full_name text not null check(length(trim(full_name)) between 2 and 100),
  email text not null,
  whatsapp text not null,
  organization text not null,
  role public.paid_registration_role not null,
  attendee_count integer not null check(attendee_count between 1 and 10),
  additional_attendee_names text,
  referral_source public.paid_registration_referral,
  dietary_accessibility_notes text,
  total_amount_paid numeric(10,2) not null check(total_amount_paid>0),
  upi_transaction_ref text not null,
  payment_screenshot_path text not null,
  consent_contact boolean not null check(consent_contact),
  consent_payment_terms boolean not null check(consent_payment_terms),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  constraint paid_reg_email_format check(email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint paid_reg_proof_path check(payment_screenshot_path ~ '^payment-proofs/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$')
);
alter table public.event_registrations add column if not exists paid_registration_id uuid references public.paid_event_registrations(id) on delete set null;
create index if not exists event_registrations_paid_registration_idx on public.event_registrations(paid_registration_id) where paid_registration_id is not null;
create index if not exists event_registrations_source_parent_idx on public.event_registrations(source_parent_registration_id) where source_parent_registration_id is not null;
drop policy if exists event_registration_import_source_guard on public.event_registrations;
create policy event_registration_import_source_guard on public.event_registrations as restrictive for insert to authenticated
with check (source='platform' and source_email is null and source_timestamp is null and source_parent_registration_id is null and paid_registration_id is null);
create index if not exists paid_event_registrations_event_created_idx on public.paid_event_registrations(event_id,created_at desc);
create index if not exists paid_event_registrations_status_idx on public.paid_event_registrations(status);
alter table public.paid_event_registrations enable row level security;
revoke all on public.paid_event_registrations from anon,authenticated;
grant select,update on public.paid_event_registrations to authenticated;
grant select,insert,update on public.paid_event_registrations to service_role;
drop policy if exists paid_reg_admin_read on public.paid_event_registrations;
create policy paid_reg_admin_read on public.paid_event_registrations for select to authenticated using(private.has_permission('registrations.read'));
drop policy if exists paid_reg_owner_read on public.paid_event_registrations;
create policy paid_reg_owner_read on public.paid_event_registrations for select to authenticated using(auth.uid()=user_id);
drop policy if exists paid_reg_admin_update on public.paid_event_registrations;
create policy paid_reg_admin_update on public.paid_event_registrations for update to authenticated using(private.has_permission('registrations.approve')) with check(private.has_permission('registrations.approve'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-proofs','payment-proofs',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists payment_proofs_admin_read on storage.objects;
create policy payment_proofs_admin_read on storage.objects for select to authenticated using(bucket_id='payment-proofs' and private.has_permission('registrations.read'));
drop policy if exists payment_proofs_admin_delete on storage.objects;
create policy payment_proofs_admin_delete on storage.objects for delete to authenticated using(bucket_id='payment-proofs' and private.has_permission('registrations.approve'));
-- Uploads are performed only by the validated server handler using the trusted server key.
-- Browser roles have no object INSERT/UPDATE or anonymous SELECT policy.

create or replace function private.notify_paid_event_registration() returns trigger
language plpgsql security definer set search_path='' as $$
declare e public.events;
begin
  select * into e from public.events where id=new.event_id;
  if tg_op='INSERT' then
    perform private.enqueue_email('PaidEventRegistrationReceived','paid_event_registrations',new.id,null,new.email,jsonb_build_object('name',new.full_name,'eventTitle',e.title,'reference',new.id,'status','pending_verification'),false);
  elsif new.status is distinct from old.status and new.status='rejected' then
    perform private.enqueue_email('PaidEventRegistrationNotConfirmed','paid_event_registrations',new.id,null,new.email,jsonb_build_object('name',new.full_name,'eventTitle',e.title,'reference',new.reference,'status',new.status,'reviewNote',coalesce(new.review_note,'')),false,coalesce(new.review_note,''));
  end if;
  return new;
end $$;
revoke all on function private.notify_paid_event_registration() from public,anon,authenticated;
drop trigger if exists paid_event_registration_email on public.paid_event_registrations;
create trigger paid_event_registration_email after insert or update of status on public.paid_event_registrations for each row execute function private.notify_paid_event_registration();

create or replace function public.csc_resend_event_pass(p_registration_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare r public.event_registrations; e public.events;
begin
  if not private.has_permission('registrations.approve') then raise exception 'forbidden' using errcode='42501'; end if;
  select * into r from public.event_registrations where id=p_registration_id;
  if not found or r.status<>'confirmed' or r.pass_token is null then return false; end if;
  select * into e from public.events where id=r.event_id;
  if not found or e.status<>'published' then return false; end if;
  perform private.enqueue_email('EventConfirmed','event_registrations',r.id,r.user_id,null,jsonb_build_object('status','confirmed'),false,'resend:'||gen_random_uuid()::text);
  return true;
end $$;
revoke all on function public.csc_resend_event_pass(uuid) from public,anon;
grant execute on function public.csc_resend_event_pass(uuid) to authenticated;

-- Create the requested event as a draft with the payment details intentionally unset.
-- It cannot be published until the organiser supplies a valid VPA and QR image.
insert into public.events(
  slug,title,category,description,summary,organizer,cover_image,cover_image_alt,starts_at,ends_at,location,venue,
  registration_deadline,status,admission,registration_state,price_minor,settings,registration_mode,
  price_per_attendee,max_attendees_per_registration,upi_vpa,upi_payee_name,upi_qr_path,payment_note,
  format,maps_url,approval_mode
) values (
  'csc-connect-edition-2','CSC CONNECT — Edition 2','networking',
  E'Edition 2 of CSC CONNECT — the Coimbatore Startup Community''s stranger-networking meetup. Meet new people, exchange ideas, and build real connections with founders, builders, students and professionals.\n\nWhat to expect:\n• Entrepreneurship & digital marketing awareness session\n• Networking and open conversations\n• Interactive activities, games and fun\n• Lunch and community connections\n\nEntry pass: ₹180 per attendee (lunch included).\n\nNew People. New Ideas. New Opportunities.\nCSC — Connect. Build. Grow.',
  'Socialise · Meet · Connect · Grow — Edition 2 of CSC''s stranger-networking meetup.',
  'Coimbatore Startup Community','/events/csc-connect-edition-2.jpg','CSC CONNECT — Edition 2 event banner',
  '2026-11-01 11:30:00+05:30','2026-11-01 14:30:00+05:30',
  '12th Floor, TICEL Bio Park, Near Anna University Campus, Coimbatore – 641046',
  'TICEL Bio Park (12th Floor)','2026-11-01 23:59:59+05:30','draft','paid','coming-soon',18000,
  jsonb_build_object('title','CSC CONNECT — Edition 2','slug','csc-connect-edition-2','category','networking','summary','Socialise · Meet · Connect · Grow — Edition 2 of CSC''s stranger-networking meetup.','description',E'Edition 2 of CSC CONNECT — the Coimbatore Startup Community''s stranger-networking meetup. Meet new people, exchange ideas, and build real connections with founders, builders, students and professionals.\n\nWhat to expect:\n• Entrepreneurship & digital marketing awareness session\n• Networking and open conversations\n• Interactive activities, games and fun\n• Lunch and community connections\n\nEntry pass: ₹180 per attendee (lunch included).\n\nNew People. New Ideas. New Opportunities.\nCSC — Connect. Build. Grow.','organizer','Coimbatore Startup Community','coverImage','/events/csc-connect-edition-2.jpg','imageAlt','CSC CONNECT — Edition 2 event banner','date','2026-11-01','startTime','11:30','endTime','14:30','registrationDeadline','2026-11-01','format','offline','venueName','TICEL Bio Park (12th Floor)','venueAddress','12th Floor, TICEL Bio Park, Near Anna University Campus, Coimbatore – 641046','mapsUrl','https://www.google.com/maps/search/?api=1&query=TICEL+Bio+Park+Coimbatore','onlineInfo','','capacity','','approvalMode','manual','allowWaitlist',false,'cancellationDeadline','','specialInstructions','','admission','paid','price','180','currency','INR','paymentInstructions','','registrationMode','paid_upi','pricePerAttendee','180','maxAttendeesPerRegistration',10,'upiVpa','','upiPayeeName','KISHORE C','upiQrPath','','paymentNote','Pay ₹180 per attendee including lunch. Pay the exact total by UPI, then submit your transaction reference and payment screenshot.','status','draft'),
  'paid_upi',180,10,null,'KISHORE C',null,'Pay ₹180 per attendee including lunch. Pay the exact total by UPI, then submit your transaction reference and payment screenshot.',
  'offline','https://www.google.com/maps/search/?api=1&query=TICEL+Bio+Park+Coimbatore','manual'
) on conflict(slug) do update set
  title=excluded.title,category=excluded.category,description=excluded.description,summary=excluded.summary,
  organizer=excluded.organizer,cover_image='/events/csc-connect-edition-2.jpg',cover_image_alt=excluded.cover_image_alt,
  starts_at=excluded.starts_at,ends_at=excluded.ends_at,location=excluded.location,venue=excluded.venue,
  registration_deadline=excluded.registration_deadline,status='draft',admission=excluded.admission,
  registration_state='coming-soon',price_minor=excluded.price_minor,settings=excluded.settings,
  registration_mode=excluded.registration_mode,price_per_attendee=excluded.price_per_attendee,
  max_attendees_per_registration=excluded.max_attendees_per_registration,upi_payee_name=excluded.upi_payee_name,
  upi_vpa=null,upi_qr_path=null,payment_note=excluded.payment_note,format=excluded.format,maps_url=excluded.maps_url,
  approval_mode=excluded.approval_mode;

commit;
