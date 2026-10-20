-- Permit only server-generated UUID WebP featured images in the private collaboration bucket.
begin;

create or replace function public.csc_save_collaboration(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text;
  v_title text;
  v_status text;
  v_publication text;
  v_before jsonb;
  v_partners jsonb;
  v_media jsonb;
begin
  if not private.has_permission('content.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if jsonb_typeof(payload) <> 'object'
    or length(coalesce(payload->>'title','')) not between 2 and 160
    or length(coalesce(payload->>'slug','')) not between 2 and 100
    or (payload->>'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(coalesce(payload->>'summary','')) > 500
    or length(coalesce(payload->>'story','')) > 12000
    or length(coalesce(payload->>'tagline','')) > 160
  then
    raise exception 'invalid collaboration' using errcode = '22023';
  end if;

  v_slug := payload->>'slug';
  v_title := trim(payload->>'title');
  v_status := coalesce(payload->>'status','completed');
  v_publication := coalesce(payload->>'publication_status','draft');
  if v_status not in ('upcoming','ongoing','completed','cancelled')
    or v_publication not in ('draft','pending','published','archived') then
    raise exception 'invalid collaboration state' using errcode = '22023';
  end if;

  v_partners := coalesce(payload->'partner_ids','[]'::jsonb);
  v_media := coalesce(payload->'media','[]'::jsonb);
  if jsonb_typeof(v_partners) <> 'array' or jsonb_array_length(v_partners) < 2
    or jsonb_array_length(v_partners) > 8
    or jsonb_typeof(v_media) <> 'array' or jsonb_array_length(v_media) > 20
    or jsonb_typeof(coalesce(payload->'highlights','[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(payload->'highlights','[]'::jsonb)) > 12 then
    raise exception 'invalid collaboration relationships' using errcode = '22023';
  end if;
  if nullif(payload->>'featured_image_path','') is not null
    and (
      ((payload->>'featured_image_path') !~ '^/(images|brand)/[A-Za-z0-9._/-]+$'
        or (payload->>'featured_image_path') like '%..%')
      and (payload->>'featured_image_path') !~ '^collaboration-featured/[0-9a-fA-F-]{36}\.webp$'
    ) then
    raise exception 'invalid featured image path' using errcode = '22023';
  end if;

  if nullif(payload->>'id','') is not null then
    v_id := (payload->>'id')::uuid;
    select to_jsonb(c) into v_before from public.collaborations c where c.id=v_id for update;
    if v_before is null then raise exception 'collaboration not found' using errcode = 'P0002'; end if;
    update public.collaborations set
      slug=v_slug, title=v_title, tagline=nullif(trim(payload->>'tagline'),''),
      summary=nullif(trim(payload->>'summary'),''), story=nullif(trim(payload->>'story'),''),
      category=coalesce(nullif(trim(payload->>'category'),''),'Community Collaboration'),
      status=v_status, publication_status=v_publication::public.publication_status,
      featured_image_path=nullif(payload->>'featured_image_path',''),
      highlights=coalesce(payload->'highlights','[]'::jsonb),
      event_id=nullif(payload->>'event_id','')::uuid,
      event_date=nullif(payload->>'event_date','')::timestamptz,
      venue_name=nullif(trim(payload->>'venue_name'),''),
      venue_address=nullif(trim(payload->>'venue_address'),''),
      seo_title=nullif(trim(payload->>'seo_title'),''),
      meta_description=nullif(trim(payload->>'meta_description'),''),
      published_at=case when v_publication='published' then coalesce(published_at,now()) else null end,
      updated_by=auth.uid(), updated_at=now()
    where id=v_id;
  else
    insert into public.collaborations(
      slug,title,tagline,summary,story,category,status,publication_status,
      featured_image_path,highlights,event_id,event_date,venue_name,venue_address,
      seo_title,meta_description,published_at,created_by,updated_by
    ) values (
      v_slug,v_title,nullif(trim(payload->>'tagline'),''),nullif(trim(payload->>'summary'),''),
      nullif(trim(payload->>'story'),''),coalesce(nullif(trim(payload->>'category'),''),'Community Collaboration'),
      v_status,v_publication::public.publication_status,nullif(payload->>'featured_image_path',''),
      coalesce(payload->'highlights','[]'::jsonb),nullif(payload->>'event_id','')::uuid,
      nullif(payload->>'event_date','')::timestamptz,nullif(trim(payload->>'venue_name'),''),
      nullif(trim(payload->>'venue_address'),''),nullif(trim(payload->>'seo_title'),''),
      nullif(trim(payload->>'meta_description'),''),case when v_publication='published' then now() else null end,
      auth.uid(),auth.uid()
    ) returning id into v_id;
    v_before := null;
  end if;

  delete from public.collaboration_partners where collaboration_id=v_id;
  insert into public.collaboration_partners(collaboration_id,organization_id,display_order)
    select v_id, value::uuid, ordinality::integer-1
    from jsonb_array_elements_text(v_partners) with ordinality;

  delete from public.collaboration_media where collaboration_id=v_id;
  insert into public.collaboration_media(collaboration_id,media_path,media_type,alt_text,caption,display_order)
    select v_id, media_path, 'image', alt_text, caption, display_order
    from jsonb_to_recordset(v_media) as m(media_path text,alt_text text,caption text,display_order integer)
    where coalesce(media_path,'') <> '';

  perform private.record_operation(
    'collaboration.saved','collaboration',v_id,v_before,
    jsonb_build_object('slug',v_slug,'title',v_title,'status',v_status,'publication_status',v_publication),null
  );
  return v_id;
end;
$$;

revoke all on function public.csc_save_collaboration(jsonb) from public, anon;
grant execute on function public.csc_save_collaboration(jsonb) to authenticated;

commit;
