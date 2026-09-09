/**
 * mock-supabase.mjs — a stand-in for Supabase REST, Auth and Storage.
 *
 * Three jobs:
 *   1. `npm run dev:preview` — the real storefront AND dashboard with
 *      realistic Serbian data, before a Supabase project exists.
 *   2. Back the Playwright public suite (SSG, ISR, JSON-LD, sitemap).
 *   3. Back the seller CRUD suite, so create / update / delete is
 *      verified through the actual UI rather than only as SQL.
 *
 * ────────────────────────────────────────────────────────────────────
 * WHAT THIS DOES NOT DO: there is NO ROW LEVEL SECURITY here.
 *
 * It verifies that the forms, Server Actions, image upload and
 * revalidation work. It says NOTHING about authorization. That is
 * covered separately and properly by `npm run verify:db`, which runs
 * the real policies against real Postgres. Never read a pass here as
 * evidence that a seller cannot touch another seller's listing.
 * ────────────────────────────────────────────────────────────────────
 *
 *   node scripts/mock-supabase.mjs [port]
 */

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";

const DEFAULT_PORT = 54321;

/* ================================================================== */
/* Placeholder images                                                  */
/* ================================================================== */

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

/**
 * Builds a real PNG in-process, so no binary fixtures are committed.
 * next/image will not optimise an SVG without dangerouslyAllowSVG,
 * which production should never enable.
 */
function makePng(width, height, [r, g, b]) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0;
    for (let x = 0; x < width; x++) {
      const band = (x + y) % 160 < 80 ? 12 : -12;
      const shade = band - (Math.abs(y - height / 2) / height) * 26;
      raw[p++] = Math.max(0, Math.min(255, r + shade));
      raw[p++] = Math.max(0, Math.min(255, g + shade));
      raw[p++] = Math.max(0, Math.min(255, b + shade));
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const IMAGE_TONES = [
  [92, 86, 74], [74, 78, 84], [104, 82, 58],
  [70, 74, 68], [88, 74, 70], [64, 70, 78],
];

const generated = new Map();
function generatedImage(path) {
  if (!generated.has(path)) {
    let hash = 0;
    for (const ch of path) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    generated.set(path, makePng(800, 600, IMAGE_TONES[hash % IMAGE_TONES.length]));
  }
  return generated.get(path);
}

/* ================================================================== */
/* Multipart                                                           */
/* ================================================================== */

/**
 * Extracts the uploaded file from a multipart/form-data body.
 *
 * supabase-js does NOT PUT raw bytes for a Storage upload — it posts a
 * multipart form (cacheControl field, then the file). Storing the raw
 * request body therefore stored the whole MIME envelope and served it
 * as an image, so next/image rejected every uploaded cover with a 400
 * and covers rendered blank on the public page.
 *
 * Deliberately minimal: one file part, no nested multipart, no
 * transfer-encoding. That is all the client sends.
 */
function parseMultipart(body, contentTypeHeader) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentTypeHeader ?? "");
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  if (!boundary) return null;

  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let index = body.indexOf(delimiter);

  while (index !== -1) {
    const start = index + delimiter.length;
    const next = body.indexOf(delimiter, start);
    if (next === -1) break;
    // Trim the CRLF that follows the boundary and precedes the next one.
    parts.push(body.subarray(start + 2, next - 2));
    index = next;
  }

  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headers = part.subarray(0, headerEnd).toString("utf8");
    // The file part is the one carrying a filename.
    if (!/filename=/i.test(headers)) continue;

    const typeMatch = /content-type:\s*([^\r\n]+)/i.exec(headers);
    return {
      body: part.subarray(headerEnd + 4),
      contentType: typeMatch?.[1]?.trim() ?? "application/octet-stream",
    };
  }

  return null;
}

/* ================================================================== */
/* In-memory database                                                  */
/* ================================================================== */

const SELLER_ID = "22222222-2222-4222-8222-222222222222";
const ADMIN_ID = "11111111-1111-4111-8111-111111111111";

const DAY = 86_400_000;
const ago = (d) => new Date(Date.now() - d * DAY).toISOString();

/** Mutable store. reset() restores it between test runs. */
const db = {
  profiles: [],
  categories: [],
  listings: [],
  listing_images: [],
  inquiries: [],
  /**
   * path -> { body: Buffer, contentType: string }.
   *
   * The content type is stored, not assumed: the uploader re-encodes
   * everything to WebP, so serving a fixed image/png made next/image
   * reject every uploaded cover with a 400.
   */
  storage: new Map(),
};

const USERS = [
  { id: ADMIN_ID, email: "admin@bgbuilding.rs", password: "AdminLozinka2026!" },
  { id: SELLER_ID, email: "prodaja@bgbuilding.rs", password: "ProdajaLozinka2026!" },
];

function seedListing(n, o) {
  const id = `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
  const count = o.imageCount ?? 3;
  // Most fixtures belong to the seller; a couple are the admin's own,
  // so the per-seller revenue table has more than one row to split.
  const owner = o.seller ?? SELLER_ID;

  for (let i = 0; i < count; i++) {
    db.listing_images.push({
      id: randomUUID(),
      listing_id: id,
      storage_path: `${owner}/${id}/foto-${i + 1}.png`,
      alt: o.title,
      width: 800,
      height: 600,
      sort_order: i,
      created_at: ago(o.days),
    });
  }

  db.listings.push({
    id,
    slug: o.slug,
    title: o.title,
    description: o.description,
    condition: o.condition,
    price_eur: o.price,
    is_negotiable: o.negotiable ?? false,
    status: o.status ?? "aktivan",
    location: o.location,
    category_id: o.category,
    seller_id: owner,
    contact_name: owner === ADMIN_ID ? "Administrator" : "Marko Petrović",
    contact_phone: owner === ADMIN_ID ? "+381641110001" : "+381641110002",
    contact_email: owner === ADMIN_ID ? "admin@bgbuilding.rs" : "prodaja@bgbuilding.rs",
    cover_image_path: count > 0 ? `${owner}/${id}/foto-1.png` : null,
    attributes: o.attrs ?? {},
    view_count: o.views ?? 0,
    published_at: o.status === "nacrt" ? null : ago(o.days),
    // Mirrors the stamp_sold_at trigger (0010): set only while sold.
    // `soldDays` back-dates the sale so /dashboard/prihod has a real
    // twelve-month curve to draw instead of a single spike.
    sold_at: o.status === "prodato" ? ago(o.soldDays ?? o.days) : null,
    created_at: ago(o.days),
    updated_at: ago(o.days),
  });
}

export function reset() {
  db.profiles = [
    {
      id: ADMIN_ID, email: "admin@bgbuilding.rs", full_name: "Administrator",
      phone: "+381641110001", location: "Beograd", role: "admin",
      is_active: true, must_change_password: false,
      created_at: ago(60), updated_at: ago(60),
    },
    {
      id: SELLER_ID, email: "prodaja@bgbuilding.rs", full_name: "Marko Petrović",
      phone: "+381641110002", location: "Beograd", role: "seller",
      is_active: true, must_change_password: false,
      created_at: ago(50), updated_at: ago(50),
    },
  ];

  // Mirrors CATEGORY_SEED in src/config/taxonomy.ts. Ids are stable so
  // the listing fixtures below can reference them by hand.
  db.categories = [
    { id: "c0000001-0000-4000-8000-000000000001", slug: "stanovi", name: "Stanovi", description: "Garsonjere, jednosobni i višesobni stanovi u zgradama koje BG Building gradi u Beogradu.", sort_order: 10, is_active: true },
    { id: "c0000001-0000-4000-8000-000000000002", slug: "lokali", name: "Lokali", description: "Ulični lokali u prizemlju novogradnje, sa izlogom i sopstvenim ulazom.", sort_order: 20, is_active: true },
    { id: "c0000001-0000-4000-8000-000000000003", slug: "poslovni-prostor", name: "Poslovni prostor", description: "Kancelarije i poslovne jedinice na višim etažama naših objekata.", sort_order: 30, is_active: true },
    { id: "c0000001-0000-4000-8000-000000000004", slug: "garaze-i-parking", name: "Garaže i parking", description: "Garažna i parking mesta u podzemnim etažama, uz stanove ili zasebno.", sort_order: 40, is_active: true },
    { id: "c0000001-0000-4000-8000-000000000005", slug: "kuce", name: "Kuće", description: "Samostojeći objekti i kuće u nizu iz naše gradnje.", sort_order: 50, is_active: true },
    { id: "c0000001-0000-4000-8000-000000000006", slug: "ostalo", name: "Ostalo", description: "Ostave, magacinski prostor i ostale jedinice u objektima.", sort_order: 99, is_active: true },
  ];

  db.listings = [];
  db.listing_images = [];
  db.inquiries = [];
  db.storage = new Map();

  // Invented demo units on plausible Belgrade streets. Deliberately
  // spread across every build phase, both priced and "po dogovoru", so
  // the phase lamp, the price-per-m² row and the omitted-offer JSON-LD
  // path all have something to render.
  seedListing(1, {
    slug: "dvoiposoban-stan-62m2-vracar-a1b2c3",
    title: "Dvoiposoban stan 62 m², Vračar — Njegoševa",
    description: "Dvoiposoban stan na četvrtom spratu novog objekta u Njegoševoj, sa liftom i podzemnom garažom.\n\nRaspored: dnevni boravak sa trpezarijom i izlazom na terasu, odvojena kuhinja, dve spavaće sobe i kupatilo sa prozorom. Orijentacija jugoistok, stan je svetao tokom celog dana.\n\nObjekat je završen i tehnički primljen. Useljenje odmah po overi ugovora.",
    condition: "useljivo", price: 242000, negotiable: true,
    location: "Vračar, Beograd", category: "c0000001-0000-4000-8000-000000000001", days: 1, views: 214, imageCount: 4,
    attrs: { kvadratura: 62, brojSoba: 2.5, sprat: "4/6", brojKupatila: 1, grejanje: "etažno gasno", orijentacija: "jugoistok", terasaM2: 6, lift: true, garaznoMesto: false, uknjizen: true, rokUseljenja: "odmah", energetskiRazred: "B" },
  });
  seedListing(2, {
    slug: "trosoban-stan-78m2-vozdovac-d4e5f6",
    title: "Trosoban stan 78 m², Voždovac — Vojvode Stepe",
    description: "Trosoban stan na šestom spratu, u objektu koji je u završnoj fazi radova.\n\nDnevni boravak sa kuhinjom u otvorenom planu, tri spavaće sobe, dva kupatila i prostrana terasa. Pogled na Banjicu.\n\nUseljenje se očekuje u trećem kvartalu 2026. Plaćanje u ratama koje prate dinamiku radova.",
    condition: "pred_useljenje", price: 210000,
    location: "Voždovac, Beograd", category: "c0000001-0000-4000-8000-000000000001", days: 2, views: 158,
    attrs: { kvadratura: 78, brojSoba: 3, sprat: "6/8", brojKupatila: 2, grejanje: "toplotna pumpa", orijentacija: "jugozapad", terasaM2: 9, lift: true, garaznoMesto: true, uknjizen: false, rokUseljenja: "Q3 2026", energetskiRazred: "A" },
  });
  seedListing(3, {
    slug: "lokal-45m2-vracar-njegoseva-g7h8i9",
    title: "Lokal 45 m², Vračar — ulični, sa izlogom",
    description: "Ulični lokal u prizemlju stambenog objekta, sa velikim izlogom prema Njegoševoj i sopstvenim ulazom.\n\nJedinstven prostor sa mokrim čvorom i ostavom. Struja, voda i kanalizacija izvedeni do priključaka.",
    condition: "useljivo", price: 180000,
    location: "Vračar, Beograd", category: "c0000001-0000-4000-8000-000000000002", days: 3, views: 96,
    attrs: { kvadratura: 45, sprat: "PR", brojKupatila: 1, grejanje: "etažno gasno", uknjizen: true, rokUseljenja: "odmah", energetskiRazred: "B" },
  });
  seedListing(4, {
    slug: "garazno-mesto-vracar-j1k2l3",
    title: "Garažno mesto, Vračar — podzemna garaža",
    description: "Garažno mesto u podzemnoj etaži objekta u Njegoševoj, dimenzija 2,5 × 5,0 m.\n\nPristup preko automatske rampe. Garaža je pod video nadzorom.\n\nProdaje se zasebno, ne mora uz stan.",
    condition: "useljivo", price: 22000, negotiable: true,
    location: "Vračar, Beograd", category: "c0000001-0000-4000-8000-000000000004", days: 5, views: 73, imageCount: 2,
    attrs: { kvadratura: 12.5, sprat: "-1", uknjizen: true, rokUseljenja: "odmah" },
  });
  seedListing(5, {
    slug: "dvosoban-stan-54m2-vozdovac-m4n5o6",
    title: "Dvosoban stan 54 m², Voždovac — Vojvode Stepe",
    // Po dogovoru: Product JSON-LD must omit `offers` entirely.
    description: "Dvosoban stan na trećem spratu, sa terasom orijentisanom ka mirnoj strani.\n\nPraktičan raspored bez hodnika koji troše kvadraturu.\n\nCena po dogovoru — u zavisnosti od dinamike plaćanja i izmena u standardu opreme.",
    condition: "pred_useljenje", price: null, negotiable: true,
    location: "Voždovac, Beograd", category: "c0000001-0000-4000-8000-000000000001", days: 8, views: 41,
    attrs: { kvadratura: 54, brojSoba: 2, sprat: "3/8", brojKupatila: 1, grejanje: "toplotna pumpa", orijentacija: "zapad", terasaM2: 5, lift: true, garaznoMesto: true, uknjizen: false, rokUseljenja: "Q3 2026" },
  });
  seedListing(6, {
    slug: "cetvorosoban-stan-104m2-novi-beograd-p7q8r9",
    title: "Četvorosoban stan 104 m², Novi Beograd — Blok 63",
    description: "Četvorosoban stan na osmom spratu, sa pogledom na Ušće i dve terase.\n\nVeliki dnevni boravak sa trpezarijom, odvojena kuhinja sa ostavom, tri spavaće sobe, dva kupatila i toalet. Dupla orijentacija.\n\nStan se predaje u standardu opisanom u specifikaciji radova.",
    condition: "useljivo", price: 333000,
    location: "Novi Beograd, Beograd", category: "c0000001-0000-4000-8000-000000000001", days: 10, views: 302, imageCount: 4,
    attrs: { kvadratura: 104, brojSoba: 4, sprat: "8/12", brojKupatila: 2, grejanje: "daljinsko", orijentacija: "istok-zapad", terasaM2: 14, lift: true, garaznoMesto: true, uknjizen: true, rokUseljenja: "odmah", energetskiRazred: "A" },
  });
  seedListing(7, {
    slug: "garsonjera-27m2-zemun-s1t2u3",
    title: "Garsonjera 27 m², Zemun — Gornji grad",
    // Sold: badge, struck price, SoldOut availability, still reachable.
    description: "Garsonjera na trećem spratu manjeg objekta sa osam stanova. Kompaktan raspored bez izgubljenih kvadrata.",
    condition: "useljivo", price: 65000, status: "prodato",
    location: "Zemun, Beograd", category: "c0000001-0000-4000-8000-000000000001",
    days: 16, soldDays: 2, views: 187, imageCount: 2,
    attrs: { kvadratura: 27, brojSoba: 1, sprat: "3/4", brojKupatila: 1, grejanje: "etažno gasno", orijentacija: "jug", lift: false, uknjizen: true, rokUseljenja: "odmah" },
  });
  seedListing(8, {
    slug: "jednosoban-stan-38m2-zvezdara-v4w5x6",
    title: "Jednosoban stan 38 m², Zvezdara — Bulevar kralja Aleksandra",
    description: "Jednosoban stan na drugom spratu, idealan za izdavanje ili prvu nekretninu.\n\nMirno dvorišno krilo bez buke sa bulevara.\n\nObjekat je u izgradnji, grubi radovi su završeni. Kupovina u ovoj fazi je po najpovoljnijoj ceni kvadrata u objektu.",
    condition: "u_izgradnji", price: 95000, negotiable: true,
    location: "Zvezdara, Beograd", category: "c0000001-0000-4000-8000-000000000001", days: 22, views: 55, imageCount: 1,
    attrs: { kvadratura: 38, brojSoba: 1, sprat: "2/7", brojKupatila: 1, grejanje: "centralno", orijentacija: "istok", lift: true, garaznoMesto: false, uknjizen: false, rokUseljenja: "Q2 2027", energetskiRazred: "B" },
  });
  seedListing(9, {
    slug: "nacrt-primer-neobjavljene-jedinice-y7z8a9",
    title: "Primer nacrta — nije javno vidljiv",
    description: "Vidljiv samo vlasniku i administratoru; ne pojavljuje se u javnoj pretrazi.",
    condition: "u_pripremi", price: 88000, status: "nacrt",
    location: "Beograd", category: "c0000001-0000-4000-8000-000000000006", days: 4, views: 0, imageCount: 1,
  });

  // --- Sales history -------------------------------------------------
  // Spread across the last ten months and over both accounts, so
  // /dashboard/prihod renders a real curve, a per-seller split and the
  // "sold without a price" footnote instead of a single bar.
  seedListing(10, {
    slug: "trosoban-stan-81m2-zvezdara-b2c3d4",
    title: "Trosoban stan 81 m², Zvezdara — Mali Mokri Lug",
    description: "Trosoban stan na petom spratu, sa dve terase i pogledom na park. Prodat porodici iz Beograda.",
    condition: "useljivo", price: 205000, status: "prodato",
    location: "Zvezdara, Beograd", category: "c0000001-0000-4000-8000-000000000001",
    days: 78, soldDays: 62, views: 341, imageCount: 3,
    attrs: { kvadratura: 81, brojSoba: 3, sprat: "5/7", brojKupatila: 2, grejanje: "centralno", terasaM2: 11, lift: true, garaznoMesto: true, uknjizen: true },
  });
  seedListing(11, {
    slug: "lokal-62m2-zemun-e5f6g7",
    title: "Lokal 62 m², Zemun — Glavna ulica",
    description: "Ulični lokal sa dvostrukim izlogom u pešačkoj zoni. Prodat pre otvaranja objekta.",
    condition: "useljivo", price: 235000, status: "prodato",
    location: "Zemun, Beograd", category: "c0000001-0000-4000-8000-000000000002",
    days: 150, soldDays: 132, views: 210, imageCount: 2,
    attrs: { kvadratura: 62, sprat: "PR", brojKupatila: 1, uknjizen: true },
  });
  seedListing(12, {
    slug: "poslovni-prostor-88m2-novi-beograd-h8i9j1",
    title: "Poslovni prostor 88 m², Novi Beograd — Blok 63",
    description: "Kancelarijski prostor na drugom spratu, sa zasebnim ulazom iz zajedničkog hola. Prodat agenciji iz Novog Beograda.",
    condition: "useljivo", price: 255000, status: "prodato",
    location: "Novi Beograd, Beograd", category: "c0000001-0000-4000-8000-000000000003",
    days: 240, soldDays: 226, views: 128, imageCount: 2,
    seller: ADMIN_ID,
    attrs: { kvadratura: 88, sprat: "2/12", brojKupatila: 2, grejanje: "toplotna pumpa", lift: true, garaznoMesto: true, uknjizen: true, energetskiRazred: "A" },
  });
  seedListing(13, {
    slug: "garazno-mesto-novi-beograd-k2l3m4",
    title: "Garažno mesto, Novi Beograd — Blok 63",
    // Sold with no price: counts as a sale, cannot enter the sum.
    description: "Garažno mesto u podzemnoj etaži. Cena je dogovorena uz kupovinu stana.",
    condition: "useljivo", price: null, status: "prodato",
    location: "Novi Beograd, Beograd", category: "c0000001-0000-4000-8000-000000000004",
    days: 40, soldDays: 33, views: 64, imageCount: 1,
    attrs: { kvadratura: 12.5, sprat: "-1", uknjizen: true },
  });
  seedListing(14, {
    slug: "dvosoban-stan-49m2-zemun-n5o6p7",
    title: "Dvosoban stan 49 m², Zemun — Gornji grad",
    description: "Dvosoban stan na drugom spratu, sa francuskim balkonom. Prodat prošlog meseca.",
    condition: "useljivo", price: 118000, status: "prodato",
    location: "Zemun, Beograd", category: "c0000001-0000-4000-8000-000000000001",
    days: 34, soldDays: 21, views: 97, imageCount: 2,
    seller: ADMIN_ID,
    attrs: { kvadratura: 49, brojSoba: 2, sprat: "2/4", brojKupatila: 1, grejanje: "etažno gasno", lift: false, uknjizen: true },
  });

  db.inquiries = [
    {
      id: randomUUID(),
      listing_id: db.listings[0].id,
      seller_id: SELLER_ID,
      sender_name: "Petar Petrović",
      sender_phone: "+381641234567",
      sender_email: "petar@primer.rs",
      message: "Poštovani, da li je bager još uvek dostupan i da li je moguća proba?",
      ip_hash: null,
      is_read: false,
      created_at: ago(1),
    },
  ];
}

reset();

/* ================================================================== */
/* Auth                                                                */
/* ================================================================== */

const b64url = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");

/**
 * A structurally valid (but unsigned) JWT. supabase-js decodes the
 * payload to read `exp`, so the shape matters even though nothing here
 * verifies the signature.
 */
function makeToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({
    sub: user.id,
    email: user.email,
    role: "authenticated",
    aud: "authenticated",
    iat: now,
    exp: now + 3600,
  });
  return `${header}.${payload}.mock-signature`;
}

function userPayload(user) {
  const profile = db.profiles.find((p) => p.id === user.id);
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: ago(50),
    phone: "",
    confirmed_at: ago(50),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: profile?.full_name ?? "" },
    identities: [],
    created_at: ago(50),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  };
}

function sessionPayload(user) {
  return {
    access_token: makeToken(user),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `mock-refresh-${user.id}`,
    user: userPayload(user),
  };
}

/** Reads the bearer token and returns the user it identifies. */
function userFromRequest(req) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token.split(".").length !== 3) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    return USERS.find((u) => u.id === payload.sub) ?? null;
  } catch {
    return null;
  }
}

/* ================================================================== */
/* A small slice of PostgREST                                          */
/* ================================================================== */

/**
 * Applies `col=eq.value` / `col=in.(a,b)` / `col=gte.value` filters.
 * Only the operators this application actually issues are implemented —
 * this is a mock, not a PostgREST clone.
 */
function applyFilters(rows, searchParams) {
  let out = rows;

  for (const [key, raw] of searchParams.entries()) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;

    const [op, ...rest] = raw.split(".");
    const value = rest.join(".");

    if (op === "eq") {
      out = out.filter((r) => {
        const v = r[key];
        if (value === "true") return v === true;
        if (value === "false") return v === false;
        if (value === "null") return v === null;
        return String(v) === value;
      });
    } else if (op === "in") {
      const list = value.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
      out = out.filter((r) => list.includes(String(r[key])));
    } else if (op === "gte") {
      out = out.filter((r) => String(r[key]) >= value);
    } else if (op === "neq") {
      out = out.filter((r) => String(r[key]) !== value);
    }
  }

  return out;
}

function applyOrder(rows, searchParams) {
  const order = searchParams.get("order");
  if (!order) return rows;

  const clauses = order.split(",").map((c) => {
    const [col, ...mods] = c.split(".");
    return { col, desc: mods.includes("desc") };
  });

  return [...rows].sort((a, b) => {
    for (const { col, desc } of clauses) {
      const av = a[col] ?? "";
      const bv = b[col] ?? "";
      if (av === bv) continue;
      const cmp = av > bv ? 1 : -1;
      return desc ? -cmp : cmp;
    }
    return 0;
  });
}

/** Attaches the embedded resources the app's select strings ask for. */
function embed(table, row, select) {
  const out = { ...row };

  if (table === "listings") {
    if (select.includes("categories")) {
      const c = db.categories.find((x) => x.id === row.category_id);
      out.categories = c ? { name: c.name, slug: c.slug } : null;
    }
    if (select.includes("listing_images")) {
      out.listing_images = db.listing_images
        .filter((i) => i.listing_id === row.id)
        .sort((a, b) => a.sort_order - b.sort_order);
    }
    if (select.includes("profiles")) {
      const p = db.profiles.find((x) => x.id === row.seller_id);
      out.profiles = p ? { full_name: p.full_name } : null;
    }
  }

  if (table === "inquiries" && select.includes("listings")) {
    const l = db.listings.find((x) => x.id === row.listing_id);
    out.listings = l ? { title: l.title, slug: l.slug } : null;
  }

  return out;
}

const fold = (s) =>
  s.toLowerCase().replace(/[čć]/g, "c").replace(/š/g, "s").replace(/ž/g, "z").replace(/đ/g, "dj");

function touch(row) {
  row.updated_at = new Date().toISOString();
}

/* ================================================================== */
/* Server                                                              */
/* ================================================================== */

export function start(port = DEFAULT_PORT) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const { pathname, searchParams } = url;

    // The browser uploads images directly from a different origin.
    const cors = {
      "Access-Control-Allow-Origin": req.headers.origin ?? "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS,HEAD",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, prefer, range, x-upsert",
      "Access-Control-Expose-Headers": "content-range, range",
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      res.end();
      return;
    }

    // --- Storage read: uploaded first, generated otherwise ----------
    if (
      pathname.startsWith("/storage/v1/object/public/listings/") &&
      req.method === "GET"
    ) {
      const key = pathname.replace("/storage/v1/object/public/listings/", "");
      const stored = db.storage.get(key);

      // Serve the type the object was uploaded with. Hardcoding
      // image/png here served every uploaded file as PNG — and the
      // uploader always re-encodes to WebP — so next/image rejected
      // them with 400 "not a valid image" and covers rendered blank.
      // Seeded placeholders are genuinely PNG.
      const body = stored?.body ?? generatedImage(key);
      const contentType = stored?.contentType ?? "image/png";

      res.writeHead(200, {
        ...cors,
        "Content-Type": contentType,
        "Content-Length": body.length,
        "Cache-Control": "public, max-age=3600",
      });
      res.end(body);
      return;
    }

    const bodyChunks = [];
    req.on("data", (c) => bodyChunks.push(c));
    req.on("end", () => {
      const rawBody = Buffer.concat(bodyChunks);
      const text = rawBody.toString("utf8");
      const json = () => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      };

      const send = (payload, status = 200, extra = {}) => {
        const out = JSON.stringify(payload ?? null);
        res.writeHead(status, {
          ...cors,
          "Content-Type": "application/json",
          ...extra,
        });
        res.end(out);
      };

      /* ---------------- Storage write ---------------- */

      if (pathname.startsWith("/storage/v1/object/listings/")) {
        const key = pathname.replace("/storage/v1/object/listings/", "");
        if (req.method === "POST" || req.method === "PUT") {
          const type = req.headers["content-type"] ?? "";
          // supabase-js posts a multipart form, not the raw file.
          const filePart = type.startsWith("multipart/")
            ? parseMultipart(rawBody, type)
            : { body: rawBody, contentType: type || "application/octet-stream" };

          if (!filePart) {
            return send({ error: "could not parse upload" }, 400);
          }

          db.storage.set(decodeURIComponent(key), filePart);
          return send({ Key: `listings/${key}`, Id: randomUUID() }, 200);
        }
        if (req.method === "DELETE") {
          db.storage.delete(decodeURIComponent(key));
          return send({}, 200);
        }
      }

      // .remove([paths]) posts the list to the bucket root.
      if (pathname === "/storage/v1/object/listings" && req.method === "DELETE") {
        const payload = json();
        for (const p of payload?.prefixes ?? []) db.storage.delete(p);
        return send({}, 200);
      }

      /* ---------------- Auth ---------------- */

      // Test-only: restore the fixtures. The CRUD suite mutates the
      // store, so without this the specs are order-dependent and a
      // second run of the same suite fails against leftover state.
      if (pathname === "/__reset") {
        reset();
        return send({ ok: true });
      }

      if (pathname === "/auth/v1/token") {
        const grant = searchParams.get("grant_type");
        const payload = json() ?? {};

        if (grant === "refresh_token") {
          const user = USERS.find(
            (u) => `mock-refresh-${u.id}` === payload.refresh_token,
          );
          if (!user) return send({ error: "invalid_grant" }, 400);
          return send(sessionPayload(user));
        }

        const user = USERS.find(
          (u) => u.email === payload.email && u.password === payload.password,
        );
        if (!user) {
          return send(
            { error: "invalid_grant", error_description: "Invalid login credentials" },
            400,
          );
        }
        return send(sessionPayload(user));
      }

      if (pathname === "/auth/v1/user") {
        const user = userFromRequest(req);
        if (!user) return send({ message: "invalid claim" }, 401);

        if (req.method === "PUT") {
          const payload = json() ?? {};
          if (payload.password) user.password = payload.password;
          return send(userPayload(user));
        }
        return send(userPayload(user));
      }

      if (pathname === "/auth/v1/logout") {
        res.writeHead(204, cors);
        return res.end();
      }

      if (pathname === "/auth/v1/admin/users") {
        // Service-role user creation, used by the admin panel.
        const payload = json() ?? {};
        if (USERS.some((u) => u.email === payload.email)) {
          return send({ message: "User already registered" }, 422);
        }
        const created = { id: randomUUID(), email: payload.email, password: payload.password };
        USERS.push(created);
        db.profiles.push({
          id: created.id,
          email: created.email,
          full_name: payload.user_metadata?.full_name ?? "",
          phone: null,
          location: null,
          role: "seller",
          is_active: true,
          must_change_password: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return send({ user: userPayload(created) });
      }

      /* ---------------- RPCs ---------------- */

      if (pathname === "/rest/v1/rpc/search_listings") {
        const a = json() ?? {};
        let rows = db.listings.filter((l) => l.status === "aktivan");

        if (a.p_category_slug) {
          const cat = db.categories.find((c) => c.slug === a.p_category_slug);
          rows = rows.filter((l) => l.category_id === cat?.id);
        }
        if (a.p_query) {
          const q = fold(String(a.p_query));
          rows = rows.filter(
            (l) => fold(l.title).includes(q) || fold(l.description).includes(q),
          );
        }
        if (a.p_conditions?.length) rows = rows.filter((l) => a.p_conditions.includes(l.condition));
        if (a.p_price_min != null) rows = rows.filter((l) => l.price_eur != null && l.price_eur >= a.p_price_min);
        if (a.p_price_max != null) rows = rows.filter((l) => l.price_eur != null && l.price_eur <= a.p_price_max);
        if (a.p_location) rows = rows.filter((l) => fold(l.location).includes(fold(a.p_location)));

        if (a.p_sort === "cena_rastuce") {
          rows = [...rows].sort((x, y) => (x.price_eur ?? Infinity) - (y.price_eur ?? Infinity));
        } else if (a.p_sort === "cena_opadajuce") {
          rows = [...rows].sort((x, y) => (y.price_eur ?? -Infinity) - (x.price_eur ?? -Infinity));
        } else {
          rows = [...rows].sort((x, y) => String(y.published_at).localeCompare(String(x.published_at)));
        }

        const total = rows.length;
        const offset = a.p_offset ?? 0;
        return send(
          rows.slice(offset, offset + (a.p_limit ?? 24)).map((l) => {
            const cat = db.categories.find((c) => c.id === l.category_id);
            return {
              id: l.id, slug: l.slug, title: l.title, condition: l.condition,
              price_eur: l.price_eur, is_negotiable: l.is_negotiable, status: l.status,
              location: l.location, cover_image_path: l.cover_image_path,
              category_name: cat?.name ?? null, category_slug: cat?.slug ?? null,
              published_at: l.published_at, updated_at: l.updated_at,
              total_count: total,
            };
          }),
        );
      }

      if (pathname === "/rest/v1/rpc/category_counts") {
        return send(
          db.categories
            .filter((c) => c.is_active)
            .map((c) => ({
              ...c,
              listing_count: db.listings.filter(
                (l) => l.category_id === c.id && l.status === "aktivan",
              ).length,
            })),
        );
      }

      if (pathname === "/rest/v1/rpc/increment_view_count") {
        const a = json() ?? {};
        const l = db.listings.find((x) => x.id === a.p_listing_id && x.status === "aktivan");
        if (l) l.view_count += 1;
        return send(null);
      }

      /* ---------------- Tables ---------------- */

      const tableMatch = /^\/rest\/v1\/([a-z_]+)$/.exec(pathname);
      if (tableMatch) {
        const table = tableMatch[1];
        if (!(table in db)) return send([], 200);

        const select = searchParams.get("select") ?? "*";
        const prefer = req.headers.prefer ?? "";

        if (req.method === "GET" || req.method === "HEAD") {
          let rows = applyFilters(db[table], searchParams);

          // The ONE policy this mock implements: drafts are not public.
          //
          // Everything else here is deliberately unauthorized (see the
          // header). This rule is different because the public detail
          // page depends on the backend hiding a draft in order to 404
          // it, so leaving it out did not just weaken a test — it made
          // `npm run dev:preview` serve every draft to anonymous
          // visitors, complete with the seller's phone number and the
          // inquiry form. It mirrors `listings_select_public` in 0007.
          //
          // Still NOT RLS: a signed-in seller sees every other seller's
          // drafts here. Authorization is verified by `npm run verify:db`.
          if (table === "listings" && !userFromRequest(req)) {
            rows = rows.filter((l) => l.status === "aktivan" || l.status === "prodato");
          }

          rows = applyOrder(rows, searchParams);

          const limit = Number(searchParams.get("limit") ?? 0);
          const total = rows.length;
          if (limit > 0) rows = rows.slice(0, limit);

          // head:true + count=exact is how the unread badge is fetched.
          if (req.method === "HEAD") {
            res.writeHead(200, { ...cors, "Content-Range": `0-${total}/${total}` });
            return res.end();
          }

          return send(
            rows.map((r) => embed(table, r, select)),
            200,
            { "Content-Range": `0-${rows.length}/${total}` },
          );
        }

        if (req.method === "POST") {
          const payload = json();
          const items = Array.isArray(payload) ? payload : [payload];
          const now = new Date().toISOString();

          const created = items.map((item) => {
            const row = {
              id: item.id ?? randomUUID(),
              created_at: now,
              updated_at: now,
              ...item,
            };
            if (table === "listings") {
              row.view_count = row.view_count ?? 0;
              row.attributes = row.attributes ?? {};
              // Mirrors the stamp_published_at trigger.
              row.published_at =
                row.status === "aktivan" && !row.published_at ? now : row.published_at ?? null;
              // ...and stamp_sold_at (0010).
              row.sold_at = row.status === "prodato" ? (row.sold_at ?? now) : null;
            }
            db[table].push(row);
            return row;
          });

          return send(
            prefer.includes("return=representation") ? created : null,
            201,
          );
        }

        if (req.method === "PATCH") {
          const payload = json() ?? {};
          const rows = applyFilters(db[table], searchParams);
          for (const row of rows) {
            Object.assign(row, payload);
            if (table === "listings") {
              if (row.status === "aktivan" && !row.published_at) {
                row.published_at = new Date().toISOString();
              }
              // stamp_sold_at: only when the PATCH actually names status,
              // exactly like the trigger's `before update of status`.
              if ("status" in payload) {
                row.sold_at =
                  row.status === "prodato"
                    ? (row.sold_at ?? new Date().toISOString())
                    : null;
              }
              touch(row);
            } else if ("updated_at" in row) {
              touch(row);
            }
          }
          return send(prefer.includes("return=representation") ? rows : null, 200);
        }

        if (req.method === "DELETE") {
          const rows = applyFilters(db[table], searchParams);
          const ids = new Set(rows.map((r) => r.id));
          db[table] = db[table].filter((r) => !ids.has(r.id));

          // Mirrors ON DELETE CASCADE.
          if (table === "listings") {
            db.listing_images = db.listing_images.filter((i) => !ids.has(i.listing_id));
            db.inquiries = db.inquiries.filter((i) => !ids.has(i.listing_id));
          }
          return send(prefer.includes("return=representation") ? rows : null, 200);
        }
      }

      send([], 200);
    });
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\n  Port ${port} is already in use — another preview is probably\n` +
          `  still running. Stop it, or pick another port:\n\n` +
          `    MOCK_PORT=54322 npm run dev:preview\n`,
      );
      process.exit(1);
    }
    throw err;
  });

  server.listen(port, () => {
    console.log(`  mock supabase  →  http://127.0.0.1:${port}`);
    console.log(`  prijava        →  prodaja@bgbuilding.rs / ProdajaLozinka2026!`);
  });

  return server;
}

// Run directly, but not when imported by dev-preview.mjs.
// pathToFileURL, not a hand-built `file://` string: on Windows the real
// import.meta.url is file:///C:/... (three slashes) and the naive form
// never matches, so running this file directly would silently do nothing.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start(Number(process.argv[2] ?? DEFAULT_PORT));
}
