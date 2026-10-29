begin;

-- An attendee may have one active native paid registration per event. Rejected
-- or cancelled submissions may be replaced, while pending/confirmed rows are
-- protected against duplicate clicks and concurrent requests.
create unique index if not exists paid_event_registrations_active_event_email_uq
  on public.paid_event_registrations(event_id, lower(email))
  where status not in ('rejected', 'cancelled');

commit;
