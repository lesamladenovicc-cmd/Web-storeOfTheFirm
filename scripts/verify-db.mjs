/**
 * verify-db.mjs — executes the migrations and the RLS suite in PGlite.
 *
 * PGlite is real PostgreSQL compiled to WASM, so this catches genuine
 * SQL errors, constraint mistakes and — most importantly — RLS policy
 * logic, without needing Docker or a live Supabase project.
 *
 * What it does NOT cover: Supabase's real GoTrue/Storage behaviour, and
 * the fact that PGlite is a newer major (PG18) than a typical Supabase
 * project. Treat a pass here as "the SQL is sound", not as a substitute
 * for applying the migrations to the real project once.
 *
 *   node scripts/verify-db.mjs
 */

import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const TESTS = path.join(ROOT, "supabase", "tests");

let passed = 0;
let failed = 0;
const failures = [];

function ok(name) {
  passed += 1;
  console.log(`  [32m✓[0m ${name}`);
}

function fail(name, detail) {
  failed += 1;
  failures.push({ name, detail });
  console.log(`  [31m×[0m ${name}`);
  console.log(`      ${String(detail).split("\n")[0]}`);
}

/** Asserts a statement succeeds. */
async function allow(db, name, sql, params = []) {
  try {
    await db.query(sql, params);
    ok(name);
  } catch (e) {
    fail(name, e.message);
  }
}

/** Asserts a multi-statement script succeeds (query() allows only one). */
async function allowScript(db, name, sql) {
  try {
    await db.exec(sql);
    ok(name);
  } catch (e) {
    fail(name, e.message);
  }
}

/** Asserts a statement is rejected (by RLS, a constraint or a trigger). */
async function deny(db, name, sql, params = []) {
  try {
    await db.query(sql, params);
    fail(name, "expected the statement to be rejected, but it succeeded");
  } catch {
    ok(name);
  }
}

/** Asserts a scalar query returns an expected value. */
async function expectValue(db, name, sql, expected, params = []) {
  try {
    const res = await db.query(sql, params);
    const actual = Object.values(res.rows[0] ?? {})[0];
    if (String(actual) === String(expected)) {
      ok(`${name} (= ${expected})`);
    } else {
      fail(name, `expected ${expected}, got ${actual}`);
    }
  } catch (e) {
    fail(name, e.message);
  }
}

/** Runs the remainder of the session as the given Supabase role. */
async function asRole(db, role, userId) {
  await db.exec("reset role;");
  await db.query("select set_config('test.user_id', $1, false)", [userId ?? ""]);
  if (role) await db.exec(`set role ${role};`);
}

/** seed.sql is 150 lines of untested SQL; execute it for real. */
async function seedSection(db) {
  console.log("\nseed.sql");
  await asRole(db, null, null);

  // It resolves sellers by e-mail and must no-op when they are absent.
  await allowScript(
    db,
    "no-ops safely when the seed accounts do not exist",
    await readFile(path.join(ROOT, "supabase", "seed.sql"), "utf8"),
  );
  await expectValue(
    db,
    "inserted no listings on that first pass",
    "select count(*) from public.listings where slug like 'bager-gusenicar-cat%'",
    0,
  );

  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('55555555-5555-4555-8555-555555555555', 'admin@jadranko.rs',    '{}'),
      ('66666666-6666-4666-8666-666666666666', 'prodavac@jadranko.rs', '{}');
  `);

  const before = await db.query("select count(*)::int as n from public.listings");

  await allowScript(
    db,
    "executes cleanly once the accounts exist",
    await readFile(path.join(ROOT, "supabase", "seed.sql"), "utf8"),
  );
  await expectValue(db, "added 9 mock listings",
    `select count(*)::int - ${before.rows[0].n} from public.listings`, 9);
  await expectValue(db, "one of them is an unpublished draft",
    "select count(*) from public.listings where slug like 'nacrt-primer%'", 1);
  await expectValue(db, "seeded all 7 categories",
    "select count(*) from public.categories where slug in " +
      "('gradjevinske-masine','poljoprivredne-masine','industrijske-masine'," +
      "'viljuskari-i-transport','alati-i-oprema','rezervni-delovi','ostalo')", 7);

  const after = await db.query("select count(*)::int as n from public.listings");
  await allowScript(
    db,
    "is idempotent — a second run is safe",
    await readFile(path.join(ROOT, "supabase", "seed.sql"), "utf8"),
  );
  await expectValue(db, "listing count unchanged after the re-run",
    "select count(*)::int from public.listings", after.rows[0].n);

  // A null price must survive as NULL, not collapse to 0.
  await expectValue(db, "'Po dogovoru' listing stored price as NULL",
    "select price_rsd is null from public.listings where slug like 'cirkular-za-drvo%'",
    true);
}

async function main() {
  console.log("\nPGlite — verifying migrations and RLS\n");

  const db = await PGlite.create({
    extensions: {
      unaccent: (await import("@electric-sql/pglite/contrib/unaccent")).unaccent,
      pg_trgm: (await import("@electric-sql/pglite/contrib/pg_trgm")).pg_trgm,
    },
  });

  // ---- Stubs ------------------------------------------------------
  await db.exec(await readFile(path.join(TESTS, "_local_stubs.sql"), "utf8"));
  console.log("[2m  stubs loaded (auth, storage, roles)[0m");

  // ---- Migrations -------------------------------------------------
  const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();
  console.log(`\n[1mMigrations[0m (${files.length})`);
  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS, file), "utf8");
    try {
      await db.exec(sql);
      ok(file);
    } catch (e) {
      fail(file, e.message);
      console.log("\n[31mMigration failed — stopping.[0m\n");
      console.log(e.message);
      process.exit(1);
    }
  }

  // ---- Fixtures ---------------------------------------------------
  const ADMIN = "11111111-1111-4111-8111-111111111111";
  const SELLER_A = "22222222-2222-4222-8222-222222222222";
  const SELLER_B = "33333333-3333-4333-8333-333333333333";
  const INACTIVE = "44444444-4444-4444-8444-444444444444";

  console.log("\n[1mFixtures[0m");
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ADMIN}',    'admin@test.rs',    '{"full_name":"Admin Adminovic"}'),
      ('${SELLER_A}', 'a@test.rs',        '{"full_name":"Prodavac A"}'),
      ('${SELLER_B}', 'b@test.rs',        '{"full_name":"Prodavac B"}'),
      ('${INACTIVE}', 'inactive@test.rs', '{"full_name":"Neaktivan"}');

    update public.profiles set role = 'admin' where id = '${ADMIN}';
    update public.profiles set is_active = false where id = '${INACTIVE}';
  `);
  await expectValue(db, "auth.users trigger created 4 profiles",
    "select count(*) from public.profiles", 4);

  await db.exec(`
    insert into public.categories (id, slug, name, sort_order) values
      ('aaaaaaaa-0000-4000-8000-000000000001', 'masine', 'Mašine', 10),
      ('aaaaaaaa-0000-4000-8000-000000000002', 'alati',  'Alati',  20);
  `);

  const L_ACTIVE_A = "bbbbbbbb-0000-4000-8000-000000000001";
  const L_DRAFT_A = "bbbbbbbb-0000-4000-8000-000000000002";
  const L_ACTIVE_B = "bbbbbbbb-0000-4000-8000-000000000003";

  await db.exec(`
    insert into public.listings
      (id, slug, title, description, condition, price_rsd, status, location,
       category_id, seller_id, contact_phone)
    values
      ('${L_ACTIVE_A}', 'bager-masina-aktivan-a1b2c3',
       'Bager mašina guseničar', 'Ispravna mašina, redovno servisirana.',
       'korisceno', 1950000, 'aktivan', 'Novi Sad',
       'aaaaaaaa-0000-4000-8000-000000000001', '${SELLER_A}', '+381641234567'),
      ('${L_DRAFT_A}', 'nacrt-oglas-a-d4e5f6',
       'Nacrt oglasa prodavca A', 'Ovo je nacrt.',
       'novo', 100000, 'nacrt', 'Beograd',
       'aaaaaaaa-0000-4000-8000-000000000001', '${SELLER_A}', '+381641234567'),
      ('${L_ACTIVE_B}', 'testera-aktivan-b-g7h8i9',
       'Testera za drvo', 'Ispravna testera.',
       'kao_novo', 45000, 'aktivan', 'Niš',
       'aaaaaaaa-0000-4000-8000-000000000002', '${SELLER_B}', '+381641234568');

    insert into public.listing_images (listing_id, storage_path, sort_order) values
      ('${L_ACTIVE_A}', '${SELLER_A}/${L_ACTIVE_A}/img1.webp', 0),
      ('${L_DRAFT_A}',  '${SELLER_A}/${L_DRAFT_A}/img1.webp', 0);

    insert into public.inquiries (listing_id, seller_id, sender_name, sender_email, message)
    values ('${L_ACTIVE_A}', '${SELLER_A}', 'Kupac Kupcevic', 'kupac@test.rs',
            'Da li je masina jos uvek dostupna?');
  `);
  ok("seed listings, images and one inquiry");

  // =================================================================
  console.log("\n[1mANON — the public surface[0m");
  await asRole(db, "anon", null);

  await expectValue(db, "sees only active listings",
    "select count(*) from public.listings", 2);
  await expectValue(db, "cannot see drafts",
    `select count(*) from public.listings where id = '${L_DRAFT_A}'`, 0);
  await expectValue(db, "sees images of active listings only",
    "select count(*) from public.listing_images", 1);
  await expectValue(db, "sees active categories",
    "select count(*) from public.categories", 2);

  await deny(db, "CANNOT read staff profiles at all",
    "select * from public.profiles");
  await deny(db, "CANNOT read inquiries",
    "select * from public.inquiries");
  await deny(db, "CANNOT insert an inquiry (no anon policy — anti-spam)",
    `insert into public.inquiries (listing_id, seller_id, sender_name, sender_email, message)
     values ('${L_ACTIVE_A}', '${SELLER_A}', 'Spam Bot', 's@b.rs', 'spam spam spam')`);
  await deny(db, "CANNOT insert a listing",
    `insert into public.listings (slug, title, condition, seller_id)
     values ('hack-oglas-x1y2z3', 'Neovlascen oglas', 'novo', '${SELLER_A}')`);
  await deny(db, "CANNOT update a listing",
    `update public.listings set price_rsd = 1 where id = '${L_ACTIVE_A}'`);
  await deny(db, "CANNOT delete a listing",
    `delete from public.listings where id = '${L_ACTIVE_A}'`);

  // =================================================================
  console.log("\n[1mSELLER A[0m");
  await asRole(db, "authenticated", SELLER_A);

  await expectValue(db, "sees own draft plus all active listings",
    "select count(*) from public.listings", 3);
  await expectValue(db, "sees own profile only",
    "select count(*) from public.profiles", 1);
  await expectValue(db, "sees own inquiries",
    "select count(*) from public.inquiries", 1);

  await allow(db, "can update own listing",
    `update public.listings set price_rsd = 1900000 where id = '${L_ACTIVE_A}'`);

  await expectValue(db, "update to seller B's listing affects 0 rows",
    `with u as (update public.listings set price_rsd = 1
                where id = '${L_ACTIVE_B}' returning 1)
     select count(*) from u`, 0);
  await expectValue(db, "delete of seller B's listing affects 0 rows",
    `with d as (delete from public.listings where id = '${L_ACTIVE_B}' returning 1)
     select count(*) from d`, 0);

  await deny(db, "CANNOT create a listing owned by seller B",
    `insert into public.listings (slug, title, condition, seller_id)
     values ('podmetnut-oglas-x1y2z3', 'Podmetnut oglas', 'novo', '${SELLER_B}')`);
  await deny(db, "CANNOT reassign own listing to seller B",
    `update public.listings set seller_id = '${SELLER_B}' where id = '${L_ACTIVE_A}'`);
  await deny(db, "CANNOT escalate own role to admin",
    `update public.profiles set role = 'admin' where id = '${SELLER_A}'`);
  await deny(db, "CANNOT deactivate own account",
    `update public.profiles set is_active = false where id = '${SELLER_A}'`);
  await deny(db, "CANNOT create a category",
    "insert into public.categories (slug, name) values ('podmetnuto', 'Podmetnuto')");
  await deny(db, "CANNOT attach an image to seller B's listing",
    `insert into public.listing_images (listing_id, storage_path)
     values ('${L_ACTIVE_B}', '${SELLER_A}/${L_ACTIVE_B}/x.webp')`);

  await allow(db, "can update own profile name",
    `update public.profiles set full_name = 'Prodavac A. Petrovic'
     where id = '${SELLER_A}'`);

  // =================================================================
  console.log("\n[1mINACTIVE SELLER[0m");
  await asRole(db, "authenticated", INACTIVE);

  await deny(db, "CANNOT create listings once deactivated",
    `insert into public.listings (slug, title, condition, seller_id)
     values ('deaktiviran-oglas-x1y2z3', 'Oglas deaktiviranog', 'novo', '${INACTIVE}')`);
  // The real escalation path: a disabled account switching itself back on.
  await deny(db, "CANNOT reactivate its own disabled account",
    `update public.profiles set is_active = true where id = '${INACTIVE}'`);
  await deny(db, "CANNOT escalate itself to admin",
    `update public.profiles set role = 'admin' where id = '${INACTIVE}'`);

  // =================================================================
  console.log("\n[1mADMIN[0m");
  await asRole(db, "authenticated", ADMIN);

  await expectValue(db, "sees every listing including others' drafts",
    "select count(*) from public.listings", 3);
  await expectValue(db, "sees every profile",
    "select count(*) from public.profiles", 4);
  await allow(db, "can edit another seller's listing",
    `update public.listings set location = 'Kragujevac' where id = '${L_ACTIVE_B}'`);
  await allow(db, "can create a category",
    "insert into public.categories (slug, name, sort_order) values ('delovi','Delovi',30)");
  await allow(db, "can change another user's role",
    `update public.profiles set role = 'admin' where id = '${SELLER_B}'`);

  // =================================================================
  console.log("\n[1mSearch, triggers and constraints[0m");
  await asRole(db, "anon", null);

  await expectValue(db, "diacritic-insensitive search: 'masina' finds 'Mašina'",
    "select count(*) from public.search_listings('masina')", 1);
  await expectValue(db, "accented query 'mašina' also matches",
    "select count(*) from public.search_listings('mašina')", 1);
  await expectValue(db, "search never returns drafts",
    "select count(*) from public.search_listings('nacrt')", 0);
  await expectValue(db, "search returns a total_count window value",
    "select total_count from public.search_listings(null, null, null, null, null, null, 'najnovije', 1, 0)", 2);
  await expectValue(db, "category filter narrows results",
    "select count(*) from public.search_listings(null, 'alati')", 1);
  await expectValue(db, "price filter narrows results",
    "select count(*) from public.search_listings(null, null, null, 1000000, null)", 1);
  await expectValue(db, "condition filter narrows results",
    "select count(*) from public.search_listings(null, null, array['kao_novo']::public.listing_condition[])", 1);
  await expectValue(db, "category_counts() reports live counts",
    "select listing_count from public.category_counts() where slug = 'masine'", 1);

  await asRole(db, null, null);

  await expectValue(db, "published_at was stamped on activation",
    `select published_at is not null from public.listings where id = '${L_ACTIVE_A}'`, true);
  await expectValue(db, "draft has no published_at",
    `select published_at is null from public.listings where id = '${L_DRAFT_A}'`, true);

  // The important one: a view bump must not move updated_at, or every
  // crawl would rewrite <lastmod> in the sitemap.
  const before = await db.query(
    `select updated_at from public.listings where id = '${L_ACTIVE_A}'`,
  );
  await db.query("select public.increment_view_count($1)", [L_ACTIVE_A]);
  const after = await db.query(
    `select updated_at, view_count from public.listings where id = '${L_ACTIVE_A}'`,
  );
  if (before.rows[0].updated_at.getTime() === after.rows[0].updated_at.getTime()) {
    ok("increment_view_count does NOT touch updated_at");
  } else {
    fail("increment_view_count does NOT touch updated_at", "updated_at moved");
  }
  await expectValue(db, "view_count incremented",
    `select view_count from public.listings where id = '${L_ACTIVE_A}'`, 1);

  await deny(db, "constraint: cannot activate a listing with no contact",
    `insert into public.listings (slug, title, condition, status, seller_id, category_id)
     values ('bez-kontakta-x1y2z3', 'Oglas bez kontakta', 'novo', 'aktivan',
             '${SELLER_A}', 'aaaaaaaa-0000-4000-8000-000000000001')`);
  await deny(db, "constraint: cannot activate a listing with no category",
    `insert into public.listings (slug, title, condition, status, seller_id, contact_phone)
     values ('bez-kategorije-x1y2z3', 'Oglas bez kategorije', 'novo', 'aktivan',
             '${SELLER_A}', '+381641234567')`);
  await deny(db, "constraint: rejects a malformed slug",
    `insert into public.listings (slug, title, condition, seller_id)
     values ('Neispravan Slug!', 'Neispravan slug', 'novo', '${SELLER_A}')`);
  await deny(db, "constraint: rejects a negative price",
    `insert into public.listings (slug, title, condition, seller_id, price_rsd)
     values ('negativna-cena-x1y2z3', 'Negativna cena', 'novo', '${SELLER_A}', -1)`);
  await deny(db, "constraint: rejects an image path outside {seller}/{listing}/",
    `insert into public.listing_images (listing_id, storage_path)
     values ('${L_ACTIVE_A}', '../../etc/passwd')`);
  await deny(db, "constraint: rejects an inquiry with no contact channel",
    `insert into public.inquiries (listing_id, seller_id, sender_name, message)
     values ('${L_ACTIVE_A}', '${SELLER_A}', 'Bez kontakta', 'Poruka bez kontakta.')`);
  await allow(db, "cascade: deleting a listing removes its images",
    `delete from public.listings where id = '${L_DRAFT_A}'`);
  await expectValue(db, "images of the deleted listing are gone",
    `select count(*) from public.listing_images where listing_id = '${L_DRAFT_A}'`, 0);

  // =================================================================
  console.log("\n[1mStorage policies[0m");
  await asRole(db, "authenticated", SELLER_A);
  await allow(db, "seller can upload under their own uid prefix",
    `insert into storage.objects (bucket_id, name)
     values ('listings', '${SELLER_A}/${L_ACTIVE_A}/new.webp')`);
  await deny(db, "seller CANNOT upload under another uid prefix",
    `insert into storage.objects (bucket_id, name)
     values ('listings', '${SELLER_B}/${L_ACTIVE_B}/evil.webp')`);

  await asRole(db, "anon", null);
  await expectValue(db, "anon can read bucket objects (public bucket)",
    "select count(*) from storage.objects where bucket_id = 'listings'", 1);
  await deny(db, "anon CANNOT upload",
    `insert into storage.objects (bucket_id, name) values ('listings', 'anon/x/y.webp')`);

  // =================================================================
  await seedSection(db);

  await asRole(db, null, null);
  console.log(
    `\n[1mResult:[0m ${passed} passed, ${failed} failed\n`,
  );
  if (failed > 0) {
    console.log("[31mFailures:[0m");
    for (const f of failures) console.log(`  • ${f.name}\n    ${f.detail}`);
    process.exit(1);
  }
  await db.close();
}

main().catch((e) => {
  console.error("\nHarness error:", e);
  process.exit(1);
});
