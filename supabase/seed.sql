-- =====================================================================
-- seed.sql — categories (BG Building)
-- =====================================================================
-- Structural taxonomy only. No demo listings — production starts with
-- an empty catalogue; real units get added through /dashboard once the
-- company is actually operating.
--
-- Idempotent: every insert is guarded by ON CONFLICT, safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Categories — mirrors CATEGORY_SEED in src/config/taxonomy.ts
-- ---------------------------------------------------------------------

insert into public.categories (slug, name, description, sort_order) values
  ('stanovi',          'Stanovi',
   'Garsonjere, jednosobni i višesobni stanovi u zgradama koje BG Building gradi u Beogradu.', 10),
  ('lokali',           'Lokali',
   'Ulični lokali u prizemlju novogradnje, sa izlogom i sopstvenim ulazom.', 20),
  ('poslovni-prostor', 'Poslovni prostor',
   'Kancelarije i poslovne jedinice na višim etažama naših objekata.', 30),
  ('garaze-i-parking', 'Garaže i parking',
   'Garažna i parking mesta u podzemnim etažama, uz stanove ili zasebno.', 40),
  ('kuce',             'Kuće',
   'Samostojeći objekti i kuće u nizu iz naše gradnje.', 50),
  ('ostalo',           'Ostalo',
   'Ostave, magacinski prostor i ostale jedinice u objektima.', 99)
on conflict (slug) do update set
  name        = excluded.name,
  description = excluded.description,
  sort_order  = excluded.sort_order;

-- Retire the machine-era categories. Deactivated rather than deleted:
-- listings_category_id_fkey is ON DELETE RESTRICT, and a hard delete
-- would fail on any database that still holds old rows.
update public.categories
   set is_active = false
 where slug in (
   'gradjevinske-masine', 'poljoprivredne-masine', 'industrijske-masine',
   'viljuskari-i-transport', 'alati-i-oprema', 'rezervni-delovi'
 );
