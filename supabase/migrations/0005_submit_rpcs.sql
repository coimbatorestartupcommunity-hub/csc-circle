-- Public submission RPCs. SECURITY DEFINER so an anonymous caller can enqueue a
-- submission and receive a reference, without being able to read the queue back
-- (admin-only SELECT stays enforced). The function only inserts into the queue.

create or replace function submit_consultation(
  p_full_name text,
  p_startup text,
  p_whatsapp text,
  p_email text,
  p_challenge text
) returns text
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into consultation_submissions (full_name, startup, whatsapp, email, challenge, consent)
  values (trim(p_full_name), trim(p_startup), trim(p_whatsapp), trim(p_email), trim(p_challenge), true)
  returning id into v_id;
  return 'CON-' || upper(substr(v_id::text, 1, 8));
end $$;

create or replace function submit_rsvp(
  p_event_id uuid,
  p_event_label text,
  p_full_name text,
  p_startup text,
  p_whatsapp text,
  p_email text,
  p_goal text
) returns text
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into rsvp_submissions (event_id, event_label, full_name, startup, whatsapp, email, goal, consent)
  values (p_event_id, nullif(trim(p_event_label), ''), trim(p_full_name), trim(p_startup),
          trim(p_whatsapp), trim(p_email), p_goal, true)
  returning id into v_id;
  return 'RSVP-' || upper(substr(v_id::text, 1, 8));
end $$;

grant execute on function submit_consultation(text, text, text, text, text) to anon, authenticated;
grant execute on function submit_rsvp(uuid, text, text, text, text, text, text) to anon, authenticated;
