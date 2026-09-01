-- =====================================================================
-- 0007 — Row Level Security
-- =====================================================================
-- RLS is the actual authorization boundary of this application. The
-- middleware and the Server Actions produce good error messages; this
-- file is what stops an attacker.
--
-- Threat model: assume the attacker holds a valid anon key. They do —
-- it ships to every browser. Every policy below is written on that
-- assumption.
--
-- Notes on style:
--  * auth.uid() is wrapped as (select auth.uid()) so Postgres evaluates
--    it once per statement (InitPlan) rather than once per row.
--  * Multiple PERMISSIVE policies on the same command are OR'd together.
--  * Privileges are revoked to a deny-by-default baseline first, then
--    granted narrowly. Supabase's stock grants are broader than we want.
-- =====================================================================

alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.listings       enable row level security;
alter table public.listing_images enable row level security;
alter table public.inquiries      enable row level security;

-- Force RLS even for the table owner, so a mistaken owner-context query
-- cannot silently bypass policies. (service_role uses BYPASSRLS.)
alter table public.profiles       force row level security;
alter table public.inquiries      force row level security;

-- ---------------------------------------------------------------------
-- Baseline: deny by default
-- ---------------------------------------------------------------------

revoke all on public.profiles       from anon, authenticated;
revoke all on public.categories     from anon, authenticated;
revoke all on public.listings       from anon, authenticated;
revoke all on public.listing_images from anon, authenticated;
revoke all on public.inquiries      from anon, authenticated;

-- Public read surface.
grant select on public.categories     to anon, authenticated;
grant select on public.listings       to anon, authenticated;
grant select on public.listing_images to anon, authenticated;

-- Staff write surface. RLS narrows these to owned rows.
grant select, update                 on public.profiles       to authenticated;
grant insert, update, delete         on public.listings       to authenticated;
grant insert, update, delete         on public.listing_images to authenticated;
grant select, update, delete         on public.inquiries      to authenticated;
grant insert, update, delete         on public.categories     to authenticated;

-- anon gets NOTHING on profiles and inquiries — not even select.

-- =====================================================================
-- profiles
-- =====================================================================
-- Staff records are never public. Public listing pages read contact
-- details from denormalized columns on `listings` instead.

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- A user may edit their own name / phone / location. The
-- guard_profile_privileges trigger from 0002 blocks role and is_active
-- changes here; triggers are not bypassed by RLS, so that is the right
-- layer for it.
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- No INSERT or DELETE policy: rows arrive via the on_auth_user_created
-- trigger and leave via the auth.users cascade.

-- =====================================================================
-- categories
-- =====================================================================

drop policy if exists categories_select_public on public.categories;
create policy categories_select_public
  on public.categories for select
  to anon, authenticated
  using (is_active);

-- Staff (including sellers) must see inactive categories too, otherwise
-- an existing listing on a deactivated category renders a blank field.
drop policy if exists categories_select_staff on public.categories;
create policy categories_select_staff
  on public.categories for select
  to authenticated
  using (public.is_active_staff());

drop policy if exists categories_write_admin on public.categories;
create policy categories_write_admin
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- listings
-- =====================================================================

-- Anyone, including anon, may read PUBLISHED listings — active or sold.
-- This is the entire public surface of the application.
--
-- Sold listings stay readable on purpose. A link shared to a buyer, or
-- an indexed URL, must not turn into a 404 the moment the seller marks
-- the item sold; the page shows a "Prodato" badge, a struck-through
-- price and SoldOut in its JSON-LD instead. They are still kept out of
-- browsing: search_listings() and the sitemap query filter to 'aktivan'
-- on their own, and the page emits noindex once it is no longer active.
--
-- DRAFTS remain completely invisible here, which is the part that
-- matters for security.
drop policy if exists listings_select_active on public.listings;
drop policy if exists listings_select_public on public.listings;
create policy listings_select_public
  on public.listings for select
  to anon, authenticated
  using (status in ('aktivan', 'prodato'));

-- OR'd with the above: staff additionally see their own drafts and sold
-- listings; admins see everything.
drop policy if exists listings_select_own_or_admin on public.listings;
create policy listings_select_own_or_admin
  on public.listings for select
  to authenticated
  using (seller_id = (select auth.uid()) or public.is_admin());

-- A seller may only create listings owned by themselves, and only while
-- their account is active. Deactivation therefore takes effect at the
-- database, not just in the UI.
drop policy if exists listings_insert_own on public.listings;
create policy listings_insert_own
  on public.listings for insert
  to authenticated
  with check (
    seller_id = (select auth.uid())
    and public.is_active_staff()
  );

-- WITH CHECK repeats the ownership test so a seller cannot reassign a
-- listing to another seller_id on update.
drop policy if exists listings_update_own_or_admin on public.listings;
create policy listings_update_own_or_admin
  on public.listings for update
  to authenticated
  using (
    (seller_id = (select auth.uid()) and public.is_active_staff())
    or public.is_admin()
  )
  with check (
    (seller_id = (select auth.uid()) and public.is_active_staff())
    or public.is_admin()
  );

drop policy if exists listings_delete_own_or_admin on public.listings;
create policy listings_delete_own_or_admin
  on public.listings for delete
  to authenticated
  using (
    (seller_id = (select auth.uid()) and public.is_active_staff())
    or public.is_admin()
  );

-- =====================================================================
-- listing_images
-- =====================================================================
-- Visibility follows the parent listing exactly.

drop policy if exists listing_images_select_active on public.listing_images;
drop policy if exists listing_images_select_public on public.listing_images;
create policy listing_images_select_public
  on public.listing_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.status in ('aktivan', 'prodato')
    )
  );

drop policy if exists listing_images_select_own_or_admin on public.listing_images;
create policy listing_images_select_own_or_admin
  on public.listing_images for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.seller_id = (select auth.uid()) or public.is_admin())
    )
  );

drop policy if exists listing_images_insert_own on public.listing_images;
create policy listing_images_insert_own
  on public.listing_images for insert
  to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (
          (l.seller_id = (select auth.uid()) and public.is_active_staff())
          or public.is_admin()
        )
    )
  );

drop policy if exists listing_images_update_own on public.listing_images;
create policy listing_images_update_own
  on public.listing_images for update
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (
          (l.seller_id = (select auth.uid()) and public.is_active_staff())
          or public.is_admin()
        )
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (
          (l.seller_id = (select auth.uid()) and public.is_active_staff())
          or public.is_admin()
        )
    )
  );

drop policy if exists listing_images_delete_own on public.listing_images;
create policy listing_images_delete_own
  on public.listing_images for delete
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (
          (l.seller_id = (select auth.uid()) and public.is_active_staff())
          or public.is_admin()
        )
    )
  );

-- =====================================================================
-- inquiries
-- =====================================================================
-- Deliberately NO anon policy. Inserts happen server-side on the
-- service-role client after validation + rate limiting. See the header
-- comment in 0006.

drop policy if exists inquiries_select_own_or_admin on public.inquiries;
create policy inquiries_select_own_or_admin
  on public.inquiries for select
  to authenticated
  using (seller_id = (select auth.uid()) or public.is_admin());

-- Sellers may only flip is_read; there is nothing else worth changing.
drop policy if exists inquiries_update_own_or_admin on public.inquiries;
create policy inquiries_update_own_or_admin
  on public.inquiries for update
  to authenticated
  using (seller_id = (select auth.uid()) or public.is_admin())
  with check (seller_id = (select auth.uid()) or public.is_admin());

drop policy if exists inquiries_delete_own_or_admin on public.inquiries;
create policy inquiries_delete_own_or_admin
  on public.inquiries for delete
  to authenticated
  using (seller_id = (select auth.uid()) or public.is_admin());
