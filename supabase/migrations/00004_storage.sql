-- Storage buckets for logos, avatars, and product images.

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('avatars', 'avatars', true),
  ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_auth_write" on storage.objects;
create policy "product_images_auth_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "product_images_auth_update" on storage.objects;
create policy "product_images_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_auth_write" on storage.objects;
create policy "avatars_auth_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "avatars_auth_update" on storage.objects;
create policy "avatars_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "logos_public_read" on storage.objects;
create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'business-logos');

drop policy if exists "logos_auth_write" on storage.objects;
create policy "logos_auth_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'business-logos');

drop policy if exists "logos_auth_update" on storage.objects;
create policy "logos_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'business-logos');
