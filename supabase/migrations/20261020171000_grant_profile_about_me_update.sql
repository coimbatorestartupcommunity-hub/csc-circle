-- Profile editing sends about_me with the rest of the editable profile fields.
-- Keep the existing column-level allowlist and owner-only RLS policy intact.
grant update (about_me) on public.profiles to authenticated;
