/**
 * mock-supabase.mjs — a stand-in for the Supabase REST API + Storage.
 *
 * Two jobs:
 *   1. Let `npm run dev:preview` show the real storefront with realistic
 *      Serbian data before a Supabase project exists.
 *   2. Back the Playwright suite, so the public rendering path (SSG,
 *      ISR config, JSON-LD, sitemap) is verified without a live database.
 *
 * It answers only the endpoints the public site touches. The dashboard
 * needs real auth and is not covered.
 *
 *   node scripts/mock-supabase.mjs [port]
 */

import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";

const DEFAULT_PORT = 54321;

/* ------------------------------------------------------------------ */
/* Placeholder images                                                  */
/* ------------------------------------------------------------------ */

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
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
 * Builds a real PNG in-process. Avoids committing binary fixtures and
 * keeps next/image happy — it will not optimise an SVG without
 * dangerouslyAllowSVG, which production should never enable.
 *
 * Renders a flat ground with a lighter diagonal band so the cards read
 * as photographs rather than as empty boxes.
 */
function makePng(width, height, [r, g, b]) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const band = ((x + y) % 160 < 80) ? 12 : -12;
      const vignette = Math.abs(y - height / 2) / height;
      const shade = band - vignette * 26;
      raw[p++] = Math.max(0, Math.min(255, r + shade));
      raw[p++] = Math.max(0, Math.min(255, g + shade));
      raw[p++] = Math.max(0, Math.min(255, b + shade));
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Warm, machinery-yard tones so the grid does not look synthetic.
const IMAGE_TONES = [
  [92, 86, 74],
  [74, 78, 84],
  [104, 82, 58],
  [70, 74, 68],
  [88, 74, 70],
  [64, 70, 78],
];

const imageCache = new Map();
function imageFor(path) {
  if (!imageCache.has(path)) {
    let hash = 0;
    for (const ch of path) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const tone = IMAGE_TONES[hash % IMAGE_TONES.length];
    imageCache.set(path, makePng(800, 600, tone));
  }
  return imageCache.get(path);
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { id: "c1", slug: "gradjevinske-masine", name: "Građevinske mašine", description: "Bageri, utovarivači, valjci, mešalice i prateća oprema.", sort_order: 10, is_active: true },
  { id: "c2", slug: "poljoprivredne-masine", name: "Poljoprivredne mašine", description: "Traktori, priključne mašine, kombajni i oprema za ratarstvo.", sort_order: 20, is_active: true },
  { id: "c3", slug: "industrijske-masine", name: "Industrijske mašine", description: "Mašine za proizvodnju, obradu metala i drveta.", sort_order: 30, is_active: true },
  { id: "c4", slug: "viljuskari-i-transport", name: "Viljuškari i transport", description: "Viljuškari, paletari, dizalice i transportna sredstva.", sort_order: 40, is_active: true },
  { id: "c5", slug: "alati-i-oprema", name: "Alati i oprema", description: "Ručni i električni alati, kompresori, agregati.", sort_order: 50, is_active: true },
  { id: "c6", slug: "rezervni-delovi", name: "Rezervni delovi", description: "Delovi, potrošni materijal i dodatna oprema.", sort_order: 60, is_active: true },
];

const SELLER = "22222222-2222-4222-8222-222222222222";
const DAY = 86_400_000;
const ago = (d) => new Date(Date.now() - d * DAY).toISOString();

function listing(n, o) {
  const id = `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
  const images = Array.from({ length: o.imageCount ?? 3 }, (_, i) => ({
    id: `${id}-img${i}`,
    listing_id: id,
    storage_path: `${SELLER}/${id}/foto-${i + 1}.png`,
    alt: o.title,
    width: 800,
    height: 600,
    sort_order: i,
  }));

  return {
    id,
    slug: o.slug,
    title: o.title,
    description: o.description,
    condition: o.condition,
    price_rsd: o.price,
    is_negotiable: o.negotiable ?? false,
    status: o.status ?? "aktivan",
    location: o.location,
    category_id: o.category,
    seller_id: SELLER,
    contact_name: "Marko Petrović",
    contact_phone: "+381641110002",
    contact_email: "prodavac@jadranko.rs",
    cover_image_path: images[0]?.storage_path ?? null,
    attributes: {},
    view_count: o.views ?? 0,
    published_at: ago(o.days),
    created_at: ago(o.days),
    updated_at: ago(o.days),
    category_name: CATEGORIES.find((c) => c.id === o.category)?.name ?? null,
    category_slug: CATEGORIES.find((c) => c.id === o.category)?.slug ?? null,
    listing_images: images,
  };
}

const LISTINGS = [
  listing(1, {
    slug: "bager-gusenicar-cat-320d-2018-a1b2c3",
    title: "Bager guseničar CAT 320D, 2018. god, 4.200 radnih sati",
    description:
      "Bager guseničar Caterpillar 320D, godište 2018, 4.200 radnih sati.\n\nRedovno servisiran u ovlašćenom servisu, kompletna servisna dokumentacija dostupna na uvid. Gusenice na oko 70%, hidraulika bez curenja, klima ispravna.\n\nMašina je u svakodnevnoj upotrebi i može se pogledati i isprobati uz prethodni dogovor.",
    condition: "korisceno", price: 8450000, negotiable: true,
    location: "Novi Sad", category: "c1", days: 1, views: 214, imageCount: 4,
  }),
  listing(2, {
    slug: "traktor-imt-539-servisiran-d4e5f6",
    title: "Traktor IMT 539, kompletno servisiran",
    description:
      "IMT 539, kompletno servisiran prošle sezone. Zamenjeno kvačilo, novi akumulator, nove gume napred.\n\nMotor bez dima, ne troši ulje. Hidraulika ispravna. Registrovan do kraja godine.\n\nTraktor je čuvan pod nadstrešnicom. Vlasnik od 2011. godine.",
    condition: "korisceno", price: 1950000,
    location: "Kragujevac", category: "c2", days: 2, views: 158,
  }),
  listing(3, {
    slug: "viljuskar-linde-h25-dizel-g7h8i9",
    title: "Viljuškar Linde H25, dizel, nosivost 2,5 t",
    description:
      "Linde H25, dizel, nosivost 2.500 kg, visina dizanja 3,3 m.\n\nSati rada oko 6.800. Motor i hidraulika ispravni, bez curenja. Gume zadovoljavajuće, prednje nedavno menjane.\n\nMašina radi u zatvorenom magacinu, uredno održavana.",
    condition: "kao_novo", price: 3200000,
    location: "Beograd", category: "c4", days: 3, views: 96,
  }),
  listing(4, {
    slug: "kompresor-atlas-copco-ga11-j1k2l3",
    title: "Vijčani kompresor Atlas Copco GA11",
    description:
      "Vijčani kompresor Atlas Copco GA11, 11 kW, radni pritisak 8 bara.\n\nSa ugrađenim rezervoarom i sušačem vazduha. Sati rada oko 12.000. Redovno menjano ulje i filteri.\n\nDemontiran iz pogona zbog prelaska na veći kapacitet. Može se videti u radu.",
    condition: "korisceno", price: 480000, negotiable: true,
    location: "Niš", category: "c5", days: 5, views: 73, imageCount: 2,
  }),
  listing(5, {
    slug: "cirkular-za-drvo-industrijski-m4n5o6",
    title: "Industrijski cirkular za drvo sa pomičnim stolom",
    // The "Po dogovoru" case: Product JSON-LD must omit `offers`.
    description:
      "Industrijski cirkular sa pomičnim stolom, dužina reza 3.200 mm.\n\nTrofazni motor 5,5 kW, list 400 mm. Sto klizi bez zazora, vođice ispravne.\n\nCena po dogovoru — zavisi od načina preuzimanja i eventualnog transporta. Utovar obezbeđen.",
    condition: "korisceno", price: null, negotiable: true,
    location: "Subotica", category: "c3", days: 8, views: 41,
  }),
  listing(6, {
    slug: "mini-bager-kubota-u17-nov-p7q8r9",
    title: "Mini bager Kubota U17-3, nov, nekorišćen",
    description:
      "Kubota U17-3, potpuno nov, nekorišćen. Isporučen prošlog meseca, nije uvođen u rad.\n\nRadna masa 1.720 kg, dubina kopanja 2,3 m. Garancija proizvođača prenosiva na kupca.\n\nProdaje se zbog promene plana nabavke. Račun i garantni list uredni.",
    condition: "novo", price: 4990000,
    location: "Beograd", category: "c1", days: 10, views: 302, imageCount: 4,
  }),
  listing(7, {
    slug: "prikolica-kiper-jednoosovinska-s1t2u3",
    title: "Kiper prikolica jednoosovinska, 3,5 t",
    // The sold case: badge, struck-through price, SoldOut availability.
    description:
      "Jednoosovinska kiper prikolica nosivosti 3,5 t. Hidraulično kipovanje na tri strane.\n\nSanduk u dobrom stanju, bez propadanja. Gume dobre. Registrovana.",
    condition: "korisceno", price: 320000, status: "prodato",
    location: "Novi Sad", category: "c2", days: 16, views: 187, imageCount: 2,
  }),
  listing(8, {
    slug: "agregat-honda-ex7-za-delove-v4w5x6",
    title: "Agregat Honda EX7 — ne pali, za delove",
    description:
      "Honda EX7, ne pali. Verovatno problem sa paljenjem ili karburatorom, nije detaljno dijagnostikovano.\n\nKućište i alternator izgledaju ispravno. Prodaje se isključivo za delove ili popravku, bez garancije na ispravnost.",
    condition: "neispravno", price: 18500, negotiable: true,
    location: "Čačak", category: "c5", days: 22, views: 55, imageCount: 1,
  }),
  listing(9, {
    slug: "struga-metal-universal-c6d7e8",
    title: "Univerzalna strug mašina za metal, 1500 mm",
    description:
      "Univerzalna strug mašina, dužina struganja 1500 mm, prihvat 400 mm.\n\nMehanika bez zazora, vretena ispravna. Kompletan set noževa i steznih glava uključen u cenu.\n\nMašina je pod naponom i može se testirati na licu mesta.",
    condition: "korisceno", price: 1250000, negotiable: true,
    location: "Kraljevo", category: "c3", days: 26, views: 64,
  }),
  listing(10, {
    slug: "hidraulicna-pumpa-rezervni-deo-f9g0h1",
    title: "Hidraulična pumpa za bager, nova, u originalnom pakovanju",
    description:
      "Nova hidraulična pumpa, odgovara većini bagera srednje klase.\n\nU originalnom pakovanju, nekorišćena. Kupljena kao rezerva, nije bila potrebna.\n\nMoguća provera kompatibilnosti po broju dela pre kupovine.",
    condition: "novo", price: 165000,
    location: "Beograd", category: "c6", days: 30, views: 28, imageCount: 2,
  }),
];

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

const CARD_FIELDS = [
  "id", "slug", "title", "condition", "price_rsd", "is_negotiable", "status",
  "location", "cover_image_path", "category_name", "category_slug",
  "published_at", "updated_at",
];

function toCard(l, total) {
  const out = {};
  for (const f of CARD_FIELDS) out[f] = l[f];
  out.total_count = total;
  return out;
}

function toDetail(l) {
  return { ...l, categories: { name: l.category_name, slug: l.category_slug } };
}

/** Strips PostgREST's `eq.` prefix. */
function eqValue(searchParams, key) {
  const raw = searchParams.get(key);
  if (!raw) return null;
  return raw.startsWith("eq.") ? raw.slice(3) : raw;
}

/** Diacritic-insensitive, like f_unaccent + simple in the real schema. */
const fold = (s) =>
  s.toLowerCase()
    .replace(/[čć]/g, "c").replace(/š/g, "s").replace(/ž/g, "z").replace(/đ/g, "dj");

export function start(port = DEFAULT_PORT) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const { pathname, searchParams } = url;

    // --- Storage: generated placeholder photos ---------------------
    if (pathname.startsWith("/storage/v1/object/public/listings/")) {
      const png = imageFor(pathname);
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": png.length,
        "Cache-Control": "public, max-age=3600",
      });
      res.end(png);
      return;
    }

    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const send = (payload, status = 200) => {
        res.writeHead(status, {
          "Content-Type": "application/json",
          "Content-Range": `0-${Array.isArray(payload) ? payload.length : 1}/*`,
        });
        res.end(JSON.stringify(payload));
      };

      if (pathname === "/rest/v1/rpc/search_listings") {
        const a = body ? JSON.parse(body) : {};
        let rows = LISTINGS.filter((l) => l.status === "aktivan");

        if (a.p_category_slug) rows = rows.filter((l) => l.category_slug === a.p_category_slug);
        if (a.p_query) {
          const q = fold(String(a.p_query));
          rows = rows.filter(
            (l) => fold(l.title).includes(q) || fold(l.description).includes(q),
          );
        }
        if (a.p_conditions?.length) rows = rows.filter((l) => a.p_conditions.includes(l.condition));
        if (a.p_price_min != null) rows = rows.filter((l) => l.price_rsd != null && l.price_rsd >= a.p_price_min);
        if (a.p_price_max != null) rows = rows.filter((l) => l.price_rsd != null && l.price_rsd <= a.p_price_max);
        if (a.p_location) rows = rows.filter((l) => fold(l.location).includes(fold(a.p_location)));

        if (a.p_sort === "cena_rastuce") {
          rows = [...rows].sort((x, y) => (x.price_rsd ?? Infinity) - (y.price_rsd ?? Infinity));
        } else if (a.p_sort === "cena_opadajuce") {
          rows = [...rows].sort((x, y) => (y.price_rsd ?? -Infinity) - (x.price_rsd ?? -Infinity));
        } else {
          rows = [...rows].sort((x, y) => y.published_at.localeCompare(x.published_at));
        }

        const total = rows.length;
        const offset = a.p_offset ?? 0;
        return send(rows.slice(offset, offset + (a.p_limit ?? 24)).map((l) => toCard(l, total)));
      }

      if (pathname === "/rest/v1/rpc/category_counts") {
        return send(
          CATEGORIES.map((c) => ({
            ...c,
            listing_count: LISTINGS.filter(
              (l) => l.category_id === c.id && l.status === "aktivan",
            ).length,
          })),
        );
      }

      if (pathname === "/rest/v1/rpc/increment_view_count") return send(null);

      if (pathname === "/rest/v1/categories") {
        const slug = eqValue(searchParams, "slug");
        let rows = CATEGORIES.filter((c) => c.is_active);
        if (slug) rows = rows.filter((c) => c.slug === slug);
        return send(rows);
      }

      if (pathname === "/rest/v1/listings") {
        const slug = eqValue(searchParams, "slug");
        const id = eqValue(searchParams, "id");
        let rows = LISTINGS.filter((l) => l.status === "aktivan" || slug || id);
        if (slug) rows = rows.filter((l) => l.slug === slug);
        if (id) rows = rows.filter((l) => l.id === id);
        return send(rows.map(toDetail));
      }

      send([], 200);
    });
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `
  Port ${port} is already in use -- another preview is probably
` +
          `  still running. Stop it, or pick another port:

` +
          `    MOCK_PORT=54322 npm run dev:preview
`,
      );
      process.exit(1);
    }
    throw err;
  });

  server.listen(port, () => {
    console.log(`  mock supabase  →  http://127.0.0.1:${port}`);
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
