/**
 * mock-supabase.mjs — a stand-in for the Supabase REST API.
 *
 * Purpose: verify the full public rendering path (generateStaticParams,
 * ISR route configuration, detail-page rendering, JSON-LD, sitemap)
 * without a live Supabase project.
 *
 * It answers only the handful of endpoints the public build touches and
 * returns fixtures shaped exactly like the real rows. It is a build
 * verification tool, not a development server.
 *
 *   node scripts/mock-supabase.mjs [port]
 */

import { createServer } from "node:http";

const PORT = Number(process.argv[2] ?? 54321);

const CATEGORIES = [
  { id: "c1", slug: "gradjevinske-masine", name: "Građevinske mašine", description: "Bageri i utovarivači.", sort_order: 10, is_active: true },
  { id: "c2", slug: "poljoprivredne-masine", name: "Poljoprivredne mašine", description: "Traktori i priključci.", sort_order: 20, is_active: true },
  { id: "c3", slug: "alati-i-oprema", name: "Alati i oprema", description: "Kompresori i agregati.", sort_order: 30, is_active: true },
];

const LISTINGS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "bager-gusenicar-cat-320d-2018-a1b2c3",
    title: "Bager guseničar CAT 320D, 2018. god, 4.200 radnih sati",
    description:
      "Redovno servisiran u ovlašćenom servisu. Gusenice na oko 70%, hidraulika bez curenja, klima ispravna. Mašina je u svakodnevnoj upotrebi i može se pogledati uz prethodni dogovor.",
    condition: "korisceno",
    price_rsd: 8450000,
    is_negotiable: true,
    status: "aktivan",
    location: "Novi Sad",
    category_id: "c1",
    seller_id: "22222222-2222-4222-8222-222222222222",
    contact_name: "Marko Petrović",
    contact_phone: "+381641110002",
    contact_email: "prodavac@jadranko.rs",
    cover_image_path: null,
    attributes: {},
    view_count: 12,
    published_at: "2026-08-30T10:00:00Z",
    created_at: "2026-08-30T10:00:00Z",
    updated_at: "2026-08-30T10:00:00Z",
    category_name: "Građevinske mašine",
    category_slug: "gradjevinske-masine",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    slug: "cirkular-za-drvo-industrijski-m4n5o6",
    title: "Industrijski cirkular za drvo sa pomičnim stolom",
    description:
      "Trofazni motor 5,5 kW, list 400 mm. Sto klizi bez zazora. Cena po dogovoru, zavisi od načina preuzimanja.",
    condition: "korisceno",
    // The "Po dogovoru" case: JSON-LD must omit the offers block.
    price_rsd: null,
    is_negotiable: true,
    status: "aktivan",
    location: "Subotica",
    category_id: "c3",
    seller_id: "22222222-2222-4222-8222-222222222222",
    contact_name: "Marko Petrović",
    contact_phone: "+381641110002",
    contact_email: null,
    cover_image_path: null,
    attributes: {},
    view_count: 3,
    published_at: "2026-08-24T10:00:00Z",
    created_at: "2026-08-24T10:00:00Z",
    updated_at: "2026-08-24T10:00:00Z",
    category_name: "Alati i oprema",
    category_slug: "alati-i-oprema",
  },
];

const CARD_FIELDS = [
  "id", "slug", "title", "condition", "price_rsd", "is_negotiable", "status",
  "location", "cover_image_path", "category_name", "category_slug",
  "published_at", "updated_at",
];

function toCard(l) {
  const out = {};
  for (const f of CARD_FIELDS) out[f] = l[f];
  out.total_count = LISTINGS.length;
  return out;
}

function toDetail(l) {
  return {
    ...l,
    categories: { name: l.category_name, slug: l.category_slug },
    listing_images: [],
  };
}

/** Parses PostgREST's ?slug=eq.foo style filters. */
function eqValue(searchParams, key) {
  const raw = searchParams.get(key);
  if (!raw) return null;
  return raw.startsWith("eq.") ? raw.slice(3) : raw;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const { pathname, searchParams } = url;

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const send = (payload, status = 200) => {
      const json = JSON.stringify(payload);
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Content-Range": `0-${Array.isArray(payload) ? payload.length : 1}/*`,
      });
      res.end(json);
    };

    if (pathname === "/rest/v1/rpc/search_listings") {
      const args = body ? JSON.parse(body) : {};
      let rows = LISTINGS.filter((l) => l.status === "aktivan");
      if (args.p_category_slug) {
        rows = rows.filter((l) => l.category_slug === args.p_category_slug);
      }
      if (args.p_query) {
        const q = String(args.p_query).toLowerCase();
        rows = rows.filter((l) => l.title.toLowerCase().includes(q));
      }
      return send(rows.slice(0, args.p_limit ?? 24).map(toCard));
    }

    if (pathname === "/rest/v1/rpc/category_counts") {
      return send(
        CATEGORIES.map((c) => ({
          ...c,
          listing_count: LISTINGS.filter((l) => l.category_id === c.id).length,
        })),
      );
    }

    if (pathname === "/rest/v1/rpc/increment_view_count") {
      return send(null);
    }

    if (pathname === "/rest/v1/categories") {
      const slug = eqValue(searchParams, "slug");
      let rows = CATEGORIES.filter((c) => c.is_active);
      if (slug) rows = rows.filter((c) => c.slug === slug);
      // maybeSingle() sends Accept: application/vnd.pgrst.object+json
      if ((req.headers.accept ?? "").includes("object")) {
        return rows[0] ? send(rows[0]) : send({ message: "not found" }, 406);
      }
      return send(rows);
    }

    if (pathname === "/rest/v1/listings") {
      const slug = eqValue(searchParams, "slug");
      const id = eqValue(searchParams, "id");
      let rows = LISTINGS.filter((l) => l.status === "aktivan");
      if (slug) rows = rows.filter((l) => l.slug === slug);
      if (id) rows = rows.filter((l) => l.id === id);
      if ((req.headers.accept ?? "").includes("object")) {
        return rows[0] ? send(toDetail(rows[0])) : send({ message: "not found" }, 406);
      }
      return send(rows.map(toDetail));
    }

    send([], 200);
  });
});

server.listen(PORT, () => {
  console.log(`mock supabase listening on http://127.0.0.1:${PORT}`);
});
