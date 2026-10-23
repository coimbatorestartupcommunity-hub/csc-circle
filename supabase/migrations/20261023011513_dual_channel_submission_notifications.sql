-- Persist actionable member inbox records independently of email delivery.
-- The existing submission trigger queues transactional email, but membership
-- claims and startup/review submissions do not pass through record_operation.
begin;

create or replace function private.submission_in_app_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid;
  notification_type text;
  record_type text;
  notification_title text;
  notification_message text;
  destination text;
  dedupe text;
begin
  member_id := nullif(to_jsonb(new)->>'user_id', '')::uuid;
  if member_id is null then return new; end if;

  case tg_table_name
    when 'membership_claims' then
      notification_type := 'claim.pending_verification';
      record_type := 'claim';
      notification_title := 'Membership application received';
      notification_message := 'Your CSC Circle membership application has been submitted and is awaiting review.';
      destination := '/member/claim';
    when 'directory_startups' then
      notification_type := 'startup.submitted';
      record_type := 'directory_startup';
      notification_title := 'Startup submission received';
      notification_message := 'Your startup information has been submitted for CSC review.';
      destination := '/member/startups';
    when 'reviews' then
      notification_type := 'review.submitted';
      record_type := 'review';
      notification_title := 'Community review received';
      notification_message := 'Your CSC community review has been received and is awaiting moderation.';
      destination := '/member/reviews';
    else
      return new;
  end case;

  -- The direct-approval workflow records claim.pending_verification after
  -- claim insertion. Match record_operation's key so its transition cannot
  -- duplicate the submission receipt in the same inbox.
  dedupe := case
    when tg_table_name = 'membership_claims'
      then 'claim.pending_verification:' || new.id::text || ':pending_verification'
    else notification_type || ':' || new.id::text || ':submission:v1'
  end;
  insert into public.notifications(
    type, channel, recipient, recipient_user_id, audience,
    related_record_type, related_record_id, title, message, action_url,
    payload, dedupe_key, status, delivered_at
  ) values (
    notification_type, 'in_app', member_id::text, member_id, 'member',
    record_type, new.id, notification_title, notification_message, destination,
    jsonb_build_object('target', new.id, 'kind', record_type), dedupe, 'available', now()
  ) on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

revoke all on function private.submission_in_app_notification() from public, anon, authenticated;

create trigger membership_claim_in_app_notice
  after insert on public.membership_claims
  for each row execute function private.submission_in_app_notification();

create trigger startup_submission_in_app_notice
  after insert on public.directory_startups
  for each row execute function private.submission_in_app_notification();

create trigger member_review_in_app_notice
  after insert on public.reviews
  for each row execute function private.submission_in_app_notification();

commit;
