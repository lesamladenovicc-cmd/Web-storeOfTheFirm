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
  /** path -> Buffer. Uploaded objects live here alongside generated ones. */
  storage: new Map(),
};

const USERS = [
  { id: ADMIN_ID, email: "admin@jadranko.rs", password: "AdminLozinka2026!" },
  { id: SELLER_ID, email: "prodavac@jadranko.rs", password: "ProdavacLozinka2026!" },
];

function seedListing(n, o) {
  const id = `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
  const count = o.imageCount ?? 3;

  for (let i = 0; i < count; i++) {
    db.listing_images.push({
      id: randomUUID(),
      listing_id: id,
      storage_path: `${SELLER_ID}/${id}/foto-${i + 1}.png`,
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
    price_rsd: o.price,
    is_negotiable: o.negotiable ?? false,
    status: o.status ?? "aktivan",
    location: o.location,
    category_id: o.category,
    seller_id: SELLER_ID,
    contact_name: "Marko Petrović",
    contact_phone: "+381641110002",
    contact_email: "prodavac@jadranko.rs",
    cover_image_path: count > 0 ? `${SELLER_ID}/${id}/foto-1.png` : null,
    attributes: {},
    view_count: o.views ?? 0,
    published_at: o.status === "nacrt" ? null : ago(o.days),
    created_at: ago(o.days),
    updated_at: ago(o.days),
  });
}

export function reset() {
  db.profiles = [
    {
      id: ADMIN_ID, email: "admin@jadranko.rs", full_name: "Administrator",
      phone: "+381641110001", location: "Novi Sad", role: "admin",
      is_active: true, must_change_password: false,
      created_at: ago(60), updated_at: ago(60),
    },
    {
      id: SELLER_ID, email: "prodavac@jadranko.rs", full_name: "Marko Petrović",
      phone: "+381641110002", location: "Novi Sad", role: "seller",
      is_active: true, must_change_password: false,
      created_at: ago(50), updated_at: ago(50),
    },
  ];

  db.categories = [
    { id: "c0000001-0000-4000-8000-000000000001", slug: "gradjevinske-masine", name: "Građevinske mašine", description: "Bageri, utovarivači, valjci, mešalice i prateća oprema.", sort_order: 10, is_active: true },
    { id: "c0000001-0000-4000-8000-000000000002", slug: "poljoprivredne-masine", name: "Poljoprivredne mašine", description: "Traktori, priključne mašine, kombajni i oprema za ratarstvo.", sort_order: 20, is_active: true },
    { id: "c0000001-0000-4000-8000-000000000003", slug: "industrijske-masine", name: "Industrijske mašine", description: "Mašine za proizvodnju, obradu metala i drveta.", sort_order: 30, is_active: true },
    { id: "c0000001-0000-4000-8000-000000000004", slug: "viljuskari-i-transport", name: "Viljuškari i transport", description: "Viljuškari, paletari, dizalice i transportna sredstva.", sort_order: 40, is_active: true },
    { id: "c0000001-0000-4000-8000-000000000005", slug: "alati-i-oprema", name: "Alati i oprema", description: "Ručni i električni alati, kompresori, agregati.", sort_order: 50, is_active: true },
    { id: "c0000001-0000-4000-8000-000000000006", slug: "rezervni-delovi", name: "Rezervni delovi", description: "Delovi, potrošni materijal i dodatna oprema.", sort_order: 60, is_active: true },
  ];

  db.listings = [];
  db.listing_images = [];
  db.inquiries = [];
  db.storage = new Map();

  seedListing(1, {
    slug: "bager-gusenicar-cat-320d-2018-a1b2c3",
    title: "Bager guseničar CAT 320D, 2018. god, 4.200 radnih sati",
    description: "Bager guseničar Caterpillar 320D, godište 2018, 4.200 radnih sati.\n\nRedovno servisiran u ovlašćenom servisu, kompletna servisna dokumentacija dostupna na uvid. Gusenice na oko 70%, hidraulika bez curenja, klima ispravna.\n\nMašina je u svakodnevnoj upotrebi i može se pogledati i isprobati uz prethodni dogovor.",
    condition: "korisceno", price: 8450000, negotiable: true,
    location: "Novi Sad", category: "c0000001-0000-4000-8000-000000000001", days: 1, views: 214, imageCount: 4,
  });
  seedListing(2, {
    slug: "traktor-imt-539-servisiran-d4e5f6",
    title: "Traktor IMT 539, kompletno servisiran",
    description: "IMT 539, kompletno servisiran prošle sezone. Zamenjeno kvačilo, novi akumulator, nove gume napred.\n\nMotor bez dima, ne troši ulje. Hidraulika ispravna. Registrovan do kraja godine.",
    condition: "korisceno", price: 1950000,
    location: "Kragujevac", category: "c0000001-0000-4000-8000-000000000002", days: 2, views: 158,
  });
  seedListing(3, {
    slug: "viljuskar-linde-h25-dizel-g7h8i9",
    title: "Viljuškar Linde H25, dizel, nosivost 2,5 t",
    description: "Linde H25, dizel, nosivost 2.500 kg, visina dizanja 3,3 m.\n\nSati rada oko 6.800. Motor i hidraulika ispravni, bez curenja.",
    condition: "kao_novo", price: 3200000,
    location: "Beograd", category: "c0000001-0000-4000-8000-000000000004", days: 3, views: 96,
  });
  seedListing(4, {
    slug: "kompresor-atlas-copco-ga11-j1k2l3",
    title: "Vijčani kompresor Atlas Copco GA11",
    description: "Vijčani kompresor Atlas Copco GA11, 11 kW, radni pritisak 8 bara.\n\nSa ugrađenim rezervoarom i sušačem vazduha. Sati rada oko 12.000.",
    condition: "korisceno", price: 480000, negotiable: true,
    location: "Niš", category: "c0000001-0000-4000-8000-000000000005", days: 5, views: 73, imageCount: 2,
  });
  seedListing(5, {
    slug: "cirkular-za-drvo-industrijski-m4n5o6",
    title: "Industrijski cirkular za drvo sa pomičnim stolom",
    // Po dogovoru: Product JSON-LD must omit `offers` entirely.
    description: "Industrijski cirkular sa pomičnim stolom, dužina reza 3.200 mm.\n\nTrofazni motor 5,5 kW, list 400 mm. Cena po dogovoru — zavisi od načina preuzimanja.",
    condition: "korisceno", price: null, negotiable: true,
    location: "Subotica", category: "c0000001-0000-4000-8000-000000000003", days: 8, views: 41,
  });
  seedListing(6, {
    slug: "mini-bager-kubota-u17-nov-p7q8r9",
    title: "Mini bager Kubota U17-3, nov, nekorišćen",
    description: "Kubota U17-3, potpuno nov, nekorišćen. Isporučen prošlog meseca, nije uvođen u rad.\n\nRadna masa 1.720 kg, dubina kopanja 2,3 m. Garancija proizvođača prenosiva.",
    condition: "novo", price: 4990000,
    location: "Beograd", category: "c0000001-0000-4000-8000-000000000001", days: 10, views: 302, imageCount: 4,
  });
  seedListing(7, {
    slug: "prikolica-kiper-jednoosovinska-s1t2u3",
    title: "Kiper prikolica jednoosovinska, 3,5 t",
    // Sold: badge, struck price, SoldOut availability, still reachable.
    description: "Jednoosovinska kiper prikolica nosivosti 3,5 t. Hidraulično kipovanje na tri strane.",
    condition: "korisceno", price: 320000, status: "prodato",
    location: "Novi Sad", category: "c0000001-0000-4000-8000-000000000002", days: 16, views: 187, imageCount: 2,
  });
  seedListing(8, {
    slug: "agregat-honda-ex7-za-delove-v4w5x6",
    title: "Agregat Honda EX7 — ne pali, za delove",
    description: "Honda EX7, ne pali. Verovatno problem sa paljenjem ili karburatorom.\n\nProdaje se isključivo za delove ili popravku, bez garancije na ispravnost.",
    condition: "neispravno", price: 18500, negotiable: true,
    location: "Čačak", category: "c0000001-0000-4000-8000-000000000005", days: 22, views: 55, imageCount: 1,
  });
  seedListing(9, {
    slug: "nacrt-primer-neobjavljenog-oglasa-y7z8a9",
    title: "Primer nacrta — nije javno vidljiv",
    description: "Vidljiv samo vlasniku i administratoru; ne pojavljuje se u javnoj pretrazi.",
    condition: "korisceno", price: 125000, status: "nacrt",
    location: "Novi Sad", category: "c0000001-0000-4000-8000-000000000006", days: 4, views: 0, imageCount: 1,
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
      const png = db.storage.get(key) ?? generatedImage(key);
      res.writeHead(200, {
        ...cors,
        "Content-Type": "image/png",
        "Content-Length": png.length,
        "Cache-Control": "public, max-age=3600",
      });
      res.end(png);
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
          db.storage.set(decodeURIComponent(key), rawBody);
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
        if (a.p_price_min != null) rows = rows.filter((l) => l.price_rsd != null && l.price_rsd >= a.p_price_min);
        if (a.p_price_max != null) rows = rows.filter((l) => l.price_rsd != null && l.price_rsd <= a.p_price_max);
        if (a.p_location) rows = rows.filter((l) => fold(l.location).includes(fold(a.p_location)));

        if (a.p_sort === "cena_rastuce") {
          rows = [...rows].sort((x, y) => (x.price_rsd ?? Infinity) - (y.price_rsd ?? Infinity));
        } else if (a.p_sort === "cena_opadajuce") {
          rows = [...rows].sort((x, y) => (y.price_rsd ?? -Infinity) - (x.price_rsd ?? -Infinity));
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
              price_rsd: l.price_rsd, is_negotiable: l.is_negotiable, status: l.status,
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
    console.log(`  prijava        →  prodavac@jadranko.rs / ProdavacLozinka2026!`);
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
