-- =====================================================================
-- seed.sql — categories and Serbian mock listings
-- =====================================================================
-- Run AFTER the migrations, and AFTER creating the staff accounts.
--
-- Accounts cannot be created from SQL: Supabase Auth hashes passwords
-- and manages auth.users itself. Create them first, either through
--   Dashboard → Authentication → Add user, or
--   npm run seed:users   (scripts/seed-users.mjs, uses the service role)
-- then run this file. It resolves sellers by e-mail, so it is safe to
-- re-run and will simply skip if the accounts are missing.
--
-- Idempotent: every insert is guarded by ON CONFLICT.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Categories — mirrors CATEGORY_SEED in src/config/taxonomy.ts
-- ---------------------------------------------------------------------

insert into public.categories (slug, name, description, sort_order) values
  ('gradjevinske-masine',   'Građevinske mašine',
   'Bageri, utovarivači, valjci, mešalice i prateća oprema.', 10),
  ('poljoprivredne-masine', 'Poljoprivredne mašine',
   'Traktori, priključne mašine, kombajni i oprema za ratarstvo.', 20),
  ('industrijske-masine',   'Industrijske mašine',
   'Mašine za proizvodnju, obradu metala i drveta.', 30),
  ('viljuskari-i-transport','Viljuškari i transport',
   'Viljuškari, paletari, dizalice i transportna sredstva.', 40),
  ('alati-i-oprema',        'Alati i oprema',
   'Ručni i električni alati, kompresori, agregati.', 50),
  ('rezervni-delovi',       'Rezervni delovi',
   'Delovi, potrošni materijal i dodatna oprema.', 60),
  ('ostalo',                'Ostalo',
   'Sve što ne spada u prethodne kategorije.', 99)
on conflict (slug) do update set
  name        = excluded.name,
  description = excluded.description,
  sort_order  = excluded.sort_order;

-- ---------------------------------------------------------------------
-- Mock listings
-- ---------------------------------------------------------------------
-- Wrapped in a DO block so the whole thing no-ops cleanly when the seed
-- accounts do not exist yet, instead of failing with a null FK.

do $$
declare
  v_admin  uuid;
  v_seller uuid;
begin
  select id into v_admin  from public.profiles where email = 'admin@jadranko.rs';
  select id into v_seller from public.profiles where email = 'prodavac@jadranko.rs';

  if v_admin is null or v_seller is null then
    raise notice
      'Seed accounts not found — skipping listings. Create admin@jadranko.rs and prodavac@jadranko.rs first (npm run seed:users).';
    return;
  end if;

  -- Give the seed profiles sensible defaults for contact prefill.
  update public.profiles
     set full_name = 'Administrator', phone = '+381641110001',
         location = 'Novi Sad', role = 'admin', must_change_password = false
   where id = v_admin;

  update public.profiles
     set full_name = 'Marko Petrović', phone = '+381641110002',
         location = 'Novi Sad', role = 'seller', must_change_password = false
   where id = v_seller;

  insert into public.listings (
    slug, title, description, condition, price_rsd, is_negotiable,
    status, location, category_id, seller_id,
    contact_name, contact_phone, contact_email, published_at
  )
  values
  (
    'bager-gusenicar-cat-320d-2018-a1b2c3',
    'Bager guseničar CAT 320D, 2018. god, 4.200 radnih sati',
    E'Bager guseničar Caterpillar 320D, godište 2018, 4.200 radnih sati.\n\nRedovno servisiran u ovlašćenom servisu, kompletna servisna dokumentacija dostupna na uvid. Gusenice na oko 70%, hidraulika bez curenja, klima ispravna.\n\nMašina je u svakodnevnoj upotrebi i može se pogledati i isprobati uz prethodni dogovor. Moguć dogovor oko cene za ozbiljne kupce.',
    'korisceno', 8450000, true,
    'aktivan', 'Novi Sad',
    (select id from public.categories where slug = 'gradjevinske-masine'),
    v_seller, 'Marko Petrović', '+381641110002', 'prodavac@jadranko.rs',
    now() - interval '1 day'
  ),
  (
    'traktor-imt-539-servisiran-d4e5f6',
    'Traktor IMT 539, kompletno servisiran',
    E'IMT 539, kompletno servisiran prošle sezone. Zamenjena kvačila, novi akumulator, nove gume napred.\n\nMotor bez dima, ne troši ulje. Hidraulika ispravna. Registrovan do kraja godine.\n\nTraktor je čuvan pod nadstrešnicom. Vlasnik od 2011. godine.',
    'korisceno', 1950000, false,
    'aktivan', 'Kragujevac',
    (select id from public.categories where slug = 'poljoprivredne-masine'),
    v_seller, 'Marko Petrović', '+381641110002', null,
    now() - interval '2 days'
  ),
  (
    'viljuskar-linde-h25-dizel-g7h8i9',
    'Viljuškar Linde H25, dizel, nosivost 2,5 t',
    E'Linde H25, dizel, nosivost 2.500 kg, visina dizanja 3,3 m.\n\nSati rada oko 6.800. Motor i hidraulika ispravni, bez curenja. Gume zadovoljavajuće, prednje nedavno menjane.\n\nMašina radi u zatvorenom magacinu, uredno održavana.',
    'kao_novo', 3200000, false,
    'aktivan', 'Beograd',
    (select id from public.categories where slug = 'viljuskari-i-transport'),
    v_admin, 'Administrator', '+381641110001', 'admin@jadranko.rs',
    now() - interval '3 days'
  ),
  (
    'kompresor-atlas-copco-ga11-j1k2l3',
    'Vijčani kompresor Atlas Copco GA11',
    E'Vijčani kompresor Atlas Copco GA11, 11 kW, radni pritisak 8 bara.\n\nSa ugrađenim rezervoarom i sušačem vazduha. Sati rada oko 12.000. Redovno menjano ulje i filteri.\n\nDemontiran iz pogona zbog prelaska na veći kapacitet. Može se videti u radu.',
    'korisceno', 480000, true,
    'aktivan', 'Niš',
    (select id from public.categories where slug = 'alati-i-oprema'),
    v_seller, 'Marko Petrović', '+381641110002', 'prodavac@jadranko.rs',
    now() - interval '5 days'
  ),
  (
    'cirkular-za-drvo-industrijski-m4n5o6',
    'Industrijski cirkular za drvo sa pomičnim stolom',
    E'Industrijski cirkular sa pomičnim stolom, dužina reza 3.200 mm.\n\nTrofazni motor 5,5 kW, list 400 mm. Sto klizi bez zazora, vođice ispravne.\n\nCena po dogovoru — zavisi od načina preuzimanja i eventualnog transporta. Utovar obezbeđen.',
    'korisceno', null, true,
    'aktivan', 'Subotica',
    (select id from public.categories where slug = 'industrijske-masine'),
    v_seller, 'Marko Petrović', '+381641110002', null,
    now() - interval '8 days'
  ),
  (
    'mini-bager-kubota-u17-nov-p7q8r9',
    'Mini bager Kubota U17-3, nov, nekorišćen',
    E'Kubota U17-3, potpuno nov, nekorišćen. Isporučen prošlog meseca, nije uvođen u rad.\n\nRadna masa 1.720 kg, dubina kopanja 2,3 m. Garancija proizvođača prenosiva na kupca.\n\nProdaje se zbog promene plana nabavke. Račun i garantni list uredni.',
    'novo', 4990000, false,
    'aktivan', 'Beograd',
    (select id from public.categories where slug = 'gradjevinske-masine'),
    v_admin, 'Administrator', '+381641110001', 'admin@jadranko.rs',
    now() - interval '10 days'
  ),
  (
    'prikolica-kiper-jednoosovinska-s1t2u3',
    'Kiper prikolica jednoosovinska, 3,5 t',
    E'Jednoosovinska kiper prikolica nosivosti 3,5 t. Hidraulično kipovanje na tri strane.\n\nSanduk u dobrom stanju, bez propadanja. Gume dobre. Registrovana.\n\nProdato — oglas ostaje radi evidencije.',
    'korisceno', 320000, false,
    'prodato', 'Novi Sad',
    (select id from public.categories where slug = 'poljoprivredne-masine'),
    v_seller, 'Marko Petrović', '+381641110002', null,
    now() - interval '16 days'
  ),
  (
    'agregat-honda-ex7-za-delove-v4w5x6',
    'Agregat Honda EX7 — ne pali, za delove',
    E'Honda EX7, ne pali. Verovatno problem sa paljenjem ili karburatorom, nije detaljno dijagnostikovano.\n\nKućište i alternator izgledaju ispravno. Prodaje se isključivo za delove ili popravku, bez garancije na ispravnost.\n\nCena je simbolična i podložna dogovoru.',
    'neispravno', 18500, true,
    'aktivan', 'Čačak',
    (select id from public.categories where slug = 'alati-i-oprema'),
    v_seller, 'Marko Petrović', '+381641110002', null,
    now() - interval '22 days'
  ),
  (
    'nacrt-primer-neobjavljenog-oglasa-y7z8a9',
    'Primer nacrta — nije javno vidljiv',
    E'Ovo je primer oglasa u statusu „nacrt”. Vidljiv je samo vlasniku oglasa i administratoru, i ne pojavljuje se u javnoj pretrazi ni u sitemap fajlu.',
    'korisceno', 125000, false,
    'nacrt', 'Novi Sad',
    (select id from public.categories where slug = 'rezervni-delovi'),
    v_seller, 'Marko Petrović', '+381641110002', null,
    null
  )
  on conflict (slug) do nothing;

  raise notice 'Seed complete: % listings.', (select count(*) from public.listings);
end $$;
