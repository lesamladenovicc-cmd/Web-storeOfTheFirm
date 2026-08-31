-- =====================================================================
-- 0008 — Storage bucket and policies
-- =====================================================================
-- Bucket `listings`, public-read.
--
-- Public read is required, not merely convenient: OG cards are fetched
-- by crawlers with no session, and next/image optimises from a plain
-- URL. Product photos are not sensitive — but staff must be told not to
-- upload anything that is, because a bucket URL is world-readable.
--
-- Size and MIME limits are set on the BUCKET, which means Supabase
-- enforces them server-side. The client-side checks in ImageUploader
-- are a UX nicety on top of this, not the control.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listings',
  'listings',
  true,
  5242880,                                              -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- Object policies
-- ---------------------------------------------------------------------
-- Path convention: {seller_id}/{listing_id}/{uuid}.webp
--
-- storage.foldername(name) splits the object key into segments, so
-- segment [1] is the owning user's uuid. Keying the policy off that
-- prefix is what lets the browser upload BEFORE the listing row exists:
-- the client generates the listing uuid, uploads, then inserts.

drop policy if exists listings_objects_public_read on storage.objects;
create policy listings_objects_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'listings');

drop policy if exists listings_objects_insert_own on storage.objects;
create policy listings_objects_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listings'
    and (
      (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and public.is_active_staff()
      )
      or public.is_admin()
    )
  );

drop policy if exists listings_objects_update_own on storage.objects;
create policy listings_objects_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listings'
    and (
      (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and public.is_active_staff()
      )
      or public.is_admin()
    )
  )
  with check (
    bucket_id = 'listings'
    and (
      (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and public.is_active_staff()
      )
      or public.is_admin()
    )
  );

drop policy if exists listings_objects_delete_own on storage.objects;
create policy listings_objects_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listings'
    and (
      (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and public.is_active_staff()
      )
      or public.is_admin()
    )
  );
