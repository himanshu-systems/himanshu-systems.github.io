-- Run once, after schema.sql and site_content.sql: Supabase dashboard ->
-- SQL Editor -> New query -> paste -> Run. Creates a public storage bucket
-- for photos uploaded from /admin, so the portrait, gallery images, and a
-- Tried entry's image can be a real upload instead of only a path to a
-- file already committed under static/images/. Safe to re-run.

insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

-- Anyone can view an uploaded image (it has to be, to show up on the
-- public site) -- only an admin can add, replace, or remove one. Membership
-- lives in public.admins; see supabase/admins.sql, run that first.
drop policy if exists "site_images_public_read" on storage.objects;
create policy "site_images_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'site-images');

drop policy if exists "site_images_owner_write" on storage.objects;
create policy "site_images_owner_write"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'site-images' and public.is_admin())
  with check (bucket_id = 'site-images' and public.is_admin());
