-- =====================================================================
-- seed.sql — categories and Serbian mock listings (BG Building)
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
--
-- The addresses and buildings below are INVENTED demo data. They are
-- plausible Belgrade streets so the layout can be judged with realistic
-- text lengths, but no unit here is a real BG Building property.
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
  select id into v_admin  from public.profiles where email = 'admin@bgbuilding.rs';
  select id into v_seller from public.profiles where email = 'prodaja@bgbuilding.rs';

  if v_admin is null or v_seller is null then
    raise notice
      'Seed accounts not found — skipping listings. Create admin@bgbuilding.rs and prodaja@bgbuilding.rs first (npm run seed:users).';
    return;
  end if;

  -- Give the seed profiles sensible defaults for contact prefill.
  update public.profiles
     set full_name = 'Administrator', phone = '+381641110001',
         location = 'Beograd', role = 'admin', must_change_password = false
   where id = v_admin;

  update public.profiles
     set full_name = 'Marko Petrović', phone = '+381641110002',
         location = 'Beograd', role = 'seller', must_change_password = false
   where id = v_seller;

  insert into public.listings (
    slug, title, description, condition, price_eur, is_negotiable,
    status, location, category_id, seller_id,
    contact_name, contact_phone, contact_email, attributes, published_at
  )
  values
  (
    'dvoiposoban-stan-62m2-vracar-a1b2c3',
    'Dvoiposoban stan 62 m², Vračar — Njegoševa',
    E'Dvoiposoban stan na četvrtom spratu novog objekta u Njegoševoj, sa liftom i podzemnom garažom.\n\nRaspored: dnevni boravak sa trpezarijom i izlazom na terasu, odvojena kuhinja, dve spavaće sobe i kupatilo sa prozorom. Orijentacija jugoistok, stan je svetao tokom celog dana.\n\nObjekat je završen i tehnički primljen, uknjižba je u toku. Useljenje odmah po overi ugovora. Garažno mesto se kupuje odvojeno.',
    'useljivo', 242000, true,
    'aktivan', 'Vračar, Beograd',
    (select id from public.categories where slug = 'stanovi'),
    v_seller, 'Marko Petrović', '+381641110002', 'prodaja@bgbuilding.rs',
    '{"kvadratura": 62, "brojSoba": 2.5, "sprat": "4/6", "brojKupatila": 1, "grejanje": "etažno gasno", "orijentacija": "jugoistok", "terasaM2": 6, "lift": true, "garaznoMesto": false, "uknjizen": true, "rokUseljenja": "odmah", "energetskiRazred": "B"}'::jsonb,
    now() - interval '1 day'
  ),
  (
    'trosoban-stan-78m2-vozdovac-d4e5f6',
    'Trosoban stan 78 m², Voždovac — Vojvode Stepe',
    E'Trosoban stan na šestom spratu, u objektu koji je u završnoj fazi radova.\n\nDnevni boravak sa kuhinjom u otvorenom planu, tri spavaće sobe, dva kupatila i prostrana terasa od 9 m². Pogled na Banjicu, orijentacija jugozapad.\n\nRadovi su u završnoj fazi — postavljaju se podovi i sanitarija. Useljenje se očekuje u trećem kvartalu 2026. Plaćanje u ratama koje prate dinamiku radova.',
    'pred_useljenje', 210000, false,
    'aktivan', 'Voždovac, Beograd',
    (select id from public.categories where slug = 'stanovi'),
    v_seller, 'Marko Petrović', '+381641110002', 'prodaja@bgbuilding.rs',
    '{"kvadratura": 78, "brojSoba": 3, "sprat": "6/8", "brojKupatila": 2, "grejanje": "toplotna pumpa", "orijentacija": "jugozapad", "terasaM2": 9, "lift": true, "garaznoMesto": true, "uknjizen": false, "rokUseljenja": "Q3 2026", "energetskiRazred": "A"}'::jsonb,
    now() - interval '2 days'
  ),
  (
    'jednosoban-stan-38m2-zvezdara-g7h8i9',
    'Jednosoban stan 38 m², Zvezdara — Bulevar kralja Aleksandra',
    E'Jednosoban stan na drugom spratu, idealan za izdavanje ili prvu nekretninu.\n\nDnevni boravak sa kuhinjskim delom, spavaća soba, kupatilo i francuski balkon. Orijentacija istok, mirno dvorišno krilo bez buke sa bulevara.\n\nObjekat je u izgradnji, grubi radovi su završeni. Kupovina u ovoj fazi je po najpovoljnijoj ceni kvadrata u objektu.',
    'u_izgradnji', 95000, true,
    'aktivan', 'Zvezdara, Beograd',
    (select id from public.categories where slug = 'stanovi'),
    v_seller, 'Marko Petrović', '+381641110002', null,
    '{"kvadratura": 38, "brojSoba": 1, "sprat": "2/7", "brojKupatila": 1, "grejanje": "centralno", "orijentacija": "istok", "lift": true, "garaznoMesto": false, "uknjizen": false, "rokUseljenja": "Q2 2027", "energetskiRazred": "B"}'::jsonb,
    now() - interval '4 days'
  ),
  (
    'cetvorosoban-stan-104m2-novi-beograd-j1k2l3',
    'Četvorosoban stan 104 m², Novi Beograd — Blok 63',
    E'Četvorosoban stan na osmom spratu, sa pogledom na Ušće i dve terase.\n\nVeliki dnevni boravak sa trpezarijom, odvojena kuhinja sa ostavom, tri spavaće sobe, dva kupatila i toalet. Dupla orijentacija, istok i zapad.\n\nStan se predaje u standardu opisanom u specifikaciji radova: obrađeni zidovi, parket u sobama, keramika u kupatilima, ALU stolarija sa troslojnim staklom.',
    'useljivo', 333000, false,
    'aktivan', 'Novi Beograd, Beograd',
    (select id from public.categories where slug = 'stanovi'),
    v_seller, 'Marko Petrović', '+381641110002', 'prodaja@bgbuilding.rs',
    '{"kvadratura": 104, "brojSoba": 4, "sprat": "8/12", "brojKupatila": 2, "grejanje": "daljinsko", "orijentacija": "istok-zapad", "terasaM2": 14, "lift": true, "garaznoMesto": true, "uknjizen": true, "rokUseljenja": "odmah", "energetskiRazred": "A"}'::jsonb,
    now() - interval '6 days'
  ),
  (
    'garsonjera-27m2-zemun-m4n5o6',
    'Garsonjera 27 m², Zemun — Gornji grad',
    E'Garsonjera na trećem spratu manjeg objekta sa osam stanova.\n\nJedinstven prostor sa kuhinjskim delom, kupatilo i francuski balkon. Kompaktan raspored bez izgubljenih kvadrata.\n\nProjekat je u pripremi, ugovaranje ide po sistemu rezervacije. Cena važi za kupce koji rezervišu pre početka radova.',
    'u_pripremi', 65000, true,
    'aktivan', 'Zemun, Beograd',
    (select id from public.categories where slug = 'stanovi'),
    v_seller, 'Marko Petrović', '+381641110002', null,
    '{"kvadratura": 27, "brojSoba": 1, "sprat": "3/4", "brojKupatila": 1, "grejanje": "etažno gasno", "orijentacija": "jug", "lift": false, "garaznoMesto": false, "uknjizen": false, "rokUseljenja": "Q4 2027"}'::jsonb,
    now() - interval '8 days'
  ),
  (
    'lokal-45m2-vracar-njegoseva-p7q8r9',
    'Lokal 45 m², Vračar — ulični, sa izlogom',
    E'Ulični lokal u prizemlju stambenog objekta, sa velikim izlogom prema Njegoševoj i sopstvenim ulazom.\n\nJedinstven prostor sa mokrim čvorom i ostavom. Struja, voda i kanalizacija su izvedeni do priključaka. Prostor je pogodan za uslužnu delatnost, kancelariju ili manji ugostiteljski objekat.\n\nObjekat je završen i tehnički primljen.',
    'useljivo', 180000, true,
    'aktivan', 'Vračar, Beograd',
    (select id from public.categories where slug = 'lokali'),
    v_admin, 'Administrator', '+381641110001', 'prodaja@bgbuilding.rs',
    '{"kvadratura": 45, "sprat": "PR", "brojKupatila": 1, "grejanje": "etažno gasno", "orijentacija": "sever", "lift": false, "uknjizen": true, "rokUseljenja": "odmah", "energetskiRazred": "B"}'::jsonb,
    now() - interval '10 days'
  ),
  (
    'poslovni-prostor-88m2-novi-beograd-s1t2u3',
    'Poslovni prostor 88 m², Novi Beograd — Blok 63',
    E'Kancelarijski prostor na drugom spratu poslovno-stambenog objekta, sa zasebnim ulazom iz zajedničkog hola.\n\nOtvoreni plan sa mogućnošću pregrađivanja, čajna kuhinja i dva toaleta. Instalacije za klimatizaciju i strukturno kabliranje su izvedene.\n\nUz prostor se mogu kupiti do tri parking mesta u podzemnoj garaži.',
    'pred_useljenje', 255000, false,
    'aktivan', 'Novi Beograd, Beograd',
    (select id from public.categories where slug = 'poslovni-prostor'),
    v_admin, 'Administrator', '+381641110001', 'prodaja@bgbuilding.rs',
    '{"kvadratura": 88, "sprat": "2/12", "brojKupatila": 2, "grejanje": "toplotna pumpa", "lift": true, "garaznoMesto": true, "uknjizen": false, "rokUseljenja": "Q3 2026", "energetskiRazred": "A"}'::jsonb,
    now() - interval '12 days'
  ),
  (
    'garazno-mesto-vracar-v4w5x6',
    'Garažno mesto, Vračar — podzemna garaža',
    E'Garažno mesto u podzemnoj etaži objekta u Njegoševoj, dimenzija 2,5 × 5,0 m.\n\nPristup preko automatske rampe sa daljinskim upravljačem. Garaža je pod video nadzorom i ima protivpožarnu instalaciju.\n\nProdaje se zasebno, ne mora uz stan.',
    'useljivo', 22000, false,
    'aktivan', 'Vračar, Beograd',
    (select id from public.categories where slug = 'garaze-i-parking'),
    v_seller, 'Marko Petrović', '+381641110002', null,
    '{"kvadratura": 12.5, "sprat": "-1", "uknjizen": true, "rokUseljenja": "odmah"}'::jsonb,
    now() - interval '14 days'
  ),
  (
    'dvosoban-stan-54m2-vozdovac-y7z8a9',
    'Dvosoban stan 54 m², Voždovac — Vojvode Stepe',
    E'Dvosoban stan na trećem spratu, sa terasom orijentisanom ka mirnoj strani.\n\nDnevni boravak sa kuhinjskim delom, dve spavaće sobe i kupatilo. Praktičan raspored bez hodnika koji troše kvadraturu.\n\nCena po dogovoru — u zavisnosti od dinamike plaćanja i eventualnih izmena u standardu opreme.',
    'pred_useljenje', null, true,
    'aktivan', 'Voždovac, Beograd',
    (select id from public.categories where slug = 'stanovi'),
    v_seller, 'Marko Petrović', '+381641110002', 'prodaja@bgbuilding.rs',
    '{"kvadratura": 54, "brojSoba": 2, "sprat": "3/8", "brojKupatila": 1, "grejanje": "toplotna pumpa", "orijentacija": "zapad", "terasaM2": 5, "lift": true, "garaznoMesto": true, "uknjizen": false, "rokUseljenja": "Q3 2026"}'::jsonb,
    now() - interval '16 days'
  ),
  (
    'trosoban-stan-81m2-zvezdara-prodato-b1c2d3',
    'Trosoban stan 81 m², Zvezdara — Mali Mokri Lug',
    E'Trosoban stan na petom spratu, sa dve terase i pogledom na park.\n\nProdato. Oglas je zadržan kao referenca o ostvarenim cenama u objektu.',
    'useljivo', 205000, false,
    'prodato', 'Zvezdara, Beograd',
    (select id from public.categories where slug = 'stanovi'),
    v_seller, 'Marko Petrović', '+381641110002', 'prodaja@bgbuilding.rs',
    '{"kvadratura": 81, "brojSoba": 3, "sprat": "5/7", "brojKupatila": 2, "grejanje": "centralno", "orijentacija": "jug", "terasaM2": 11, "lift": true, "garaznoMesto": true, "uknjizen": true, "rokUseljenja": "odmah", "energetskiRazred": "B"}'::jsonb,
    now() - interval '40 days'
  ),
  (
    'lokal-62m2-zemun-prodato-e4f5g6',
    'Lokal 62 m², Zemun — Glavna ulica',
    E'Ulični lokal sa dvostrukim izlogom u pešačkoj zoni.\n\nProdato.',
    'useljivo', 235000, false,
    'prodato', 'Zemun, Beograd',
    (select id from public.categories where slug = 'lokali'),
    v_admin, 'Administrator', '+381641110001', null,
    '{"kvadratura": 62, "sprat": "PR", "brojKupatila": 1, "uknjizen": true, "rokUseljenja": "odmah"}'::jsonb,
    now() - interval '75 days'
  ),
  (
    'primer-nacrta-h7i8j9',
    'Primer nacrta — jedinica u pripremi',
    E'Ovo je primer jedinice u statusu „nacrt”. Vidljiva je samo vlasniku i administratoru, i ne pojavljuje se u javnoj pretrazi ni u sitemap fajlu.',
    'u_pripremi', 88000, false,
    'nacrt', 'Beograd',
    (select id from public.categories where slug = 'stanovi'),
    v_seller, 'Marko Petrović', '+381641110002', null,
    '{}'::jsonb,
    null
  )
  on conflict (slug) do nothing;

  raise notice 'Seed complete: % listings.', (select count(*) from public.listings);
end $$;
