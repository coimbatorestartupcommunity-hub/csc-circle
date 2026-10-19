-- Keep collaboration mutations on the permission-checked audited RPC only.
revoke insert, update, delete on public.collaborations,
  public.collaboration_organizations, public.collaboration_partners,
  public.collaboration_media from authenticated;
