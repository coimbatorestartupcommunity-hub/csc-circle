-- A lead Google Form row is unique per event and normalized email. Guest pass
-- rows retain the same source email but are linked through source_parent_registration_id.
create unique index if not exists event_registrations_import_lead_email_uidx
  on public.event_registrations(event_id, lower(source_email))
  where source = 'google_form_import'
    and source_email is not null
    and source_parent_registration_id is null;
