-- =====================================================================
-- QarzDaftar | 0004_storage.sql | private buckets + path-based policies
-- Path convention (enforced): <store_id>/<anything>   e.g. 7c1e.../photo.jpg
-- Files are never public: the app uses signed URLs.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('customer-photos',     'customer-photos',     false,  2097152, array['image/jpeg','image/png','image/webp']),
  ('support-attachments', 'support-attachments', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('payment-proofs',      'payment-proofs',      false,  5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- customer photos: store owner only (read / upload / replace). Writes need an active subscription.
create policy "customer photos read" on storage.objects for select to authenticated
  using (bucket_id = 'customer-photos' and public.owns_store(public.storage_store_id(name)));
create policy "customer photos write" on storage.objects for insert to authenticated
  with check (bucket_id = 'customer-photos' and public.owns_store(public.storage_store_id(name))
              and public.store_can_write(public.storage_store_id(name)));
create policy "customer photos update" on storage.objects for update to authenticated
  using (bucket_id = 'customer-photos' and public.owns_store(public.storage_store_id(name))
         and public.store_can_write(public.storage_store_id(name)));

-- support attachments: owner of the store + admin, insert-only (no overwrite / delete)
create policy "support files read" on storage.objects for select to authenticated
  using (bucket_id = 'support-attachments'
         and (public.owns_store(public.storage_store_id(name)) or public.is_admin()));
create policy "support files write" on storage.objects for insert to authenticated
  with check (bucket_id = 'support-attachments'
              and (public.owns_store(public.storage_store_id(name)) or public.is_admin()));

-- payment proofs: owner uploads, admin + owner read, insert-only
create policy "proofs read" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs'
         and (public.owns_store(public.storage_store_id(name)) or public.is_admin()));
create policy "proofs write" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and public.owns_store(public.storage_store_id(name)));
