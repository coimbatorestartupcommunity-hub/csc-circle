-- In-app (bell) notification when an event registration becomes confirmed.
--
-- Complements the EventConfirmed email (registration_status_email trigger).
-- Fires on every confirmation path that lands an event_registrations row on
-- status = 'confirmed' — admin RSVP approval (private.admin_action), imported
-- Google Form approval, and native paid-UPI approval — so the member always
-- gets the same "pass approved" bell item with a View Event Pass action.
--
-- Deduped per (member, event) so group registrations and re-issued passes
-- produce exactly one notice. The body is wrapped so a notification failure
-- can never roll back the confirmation itself.

create or replace function private.event_registration_inapp()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  ev public.events;
  addr text;
begin
  if new.status = 'confirmed'
     and new.user_id is not null
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    begin
      select * into ev from public.events where id = new.event_id;
      if ev.id is null or ev.status <> 'published' or ev.ends_at <= now() then
        return new;
      end if;
      addr := (select email from auth.users where id = new.user_id);
      insert into public.notifications(
        type, channel, recipient, recipient_user_id, audience,
        related_record_type, related_record_id, title, message, action_url,
        payload, dedupe_key, status, delivered_at
      ) values (
        'EventConfirmed', 'in_app', coalesce(addr, ''), new.user_id, 'member',
        'event_registrations', new.id,
        'You''re registered — event pass approved',
        'Your registration for ' || coalesce(ev.title, 'your CSC event')
          || ' is confirmed and your event pass is approved. '
          || 'Open your event pass to view the QR and download it.',
        '/member/events/' || new.id::text,
        jsonb_build_object('eventId', new.event_id, 'reference', new.reference),
        'event.confirmed.inapp:' || new.user_id::text || ':' || new.event_id::text,
        'available', now()
      )
      on conflict (dedupe_key) do nothing;
    exception when others then
      -- Never let a notification failure roll back the registration confirmation.
      return new;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists registration_confirmed_inapp on public.event_registrations;
create trigger registration_confirmed_inapp
after insert or update on public.event_registrations
for each row execute function private.event_registration_inapp();
