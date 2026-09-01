# Jadranko — interna prodavnica oglasa

Internal listings web store. Approved staff post products; the public
browses and contacts the seller directly. **Listing-only: no cart, no
checkout, no on-site payment.** Language Serbian (sr-RS, Latin script),
currency RSD.

The niche is not final. Copy, taxonomy and brand live in `src/config/`
and the category list lives in the database, so re-niching the store is
a config edit plus a few rows — not a rewrite.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16.3.4 (App Router), React 19.2, TypeScript strict |
| Data / Auth / Storage | Supabase (Postgres + GoTrue + Storage, RLS-enforced) |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) |
| Validation | zod 4 |
| Hosting | Vercel |
| Tests | Vitest (units), PGlite (SQL + RLS), Playwright (e2e) |

Fonts: Archivo (display) + IBM Plex Sans (body) + IBM Plex Mono
(prices, spec lines). All loaded with the `latin-ext` subset — Serbian
č ć š ž đ live there and silently fall back without it.

---

## Just want to look at it?

```bash
npm install
npm run dev:preview
```

Open <http://localhost:3000>. No Supabase project, no `.env.local`, no
setup at all.

This boots a mock backend (`scripts/mock-supabase.mjs`) with ten
realistic Serbian listings and generated placeholder photos, then starts
the dev server against it. Everything public works: homepage, search
(including diacritic-free — try `masina`), filters, sorting, categories,
listing detail with gallery and contact panel, a sold listing, a
"Po dogovoru" listing, `sitemap.xml` and the Product JSON-LD.

**The dashboard is not included** — it needs real Supabase Auth. Follow
the setup below when you want to log in and post listings.

---

## Getting started for real

```bash
npm install
cp .env.local.example .env.local     # then fill it in — see below
npm run dev
```

The app **requires a reachable Supabase project**. There is no offline
mode: a build with an unreachable database fails loudly rather than
caching an empty storefront.

### 1. Create the Supabase project

Pick an EU region (`eu-central-1` is closest to Serbia).

Then, in **Authentication → Sign In / Providers → Email**, turn
**"Allow new users to sign up" OFF**. This is the hard guarantee behind
"no public registration" — the code has no `signUp()` call and no
`/registracija` route, but this setting is what makes it impossible.

### 2. Run the migrations

Paste each file in `supabase/migrations/` into the SQL editor **in
numeric order**, or apply them with the Supabase CLI. They are
idempotent and safe to re-run.

```
0001_extensions_and_enums.sql     unaccent, pg_trgm, enums, helpers
0002_profiles.sql                 staff + auth trigger + privilege guard
0003_categories.sql               flat taxonomy
0004_listings.sql                 core table
0005_listing_images.sql
0006_inquiries.sql
0007_rls_policies.sql             ← the authorization boundary
0008_storage_bucket_and_policies.sql
0009_search_index.sql             search_listings / category_counts RPCs
```

### 3. Seed

```bash
npm run seed:users     # creates admin@jadranko.rs + prodavac@jadranko.rs
```

Then run `supabase/seed.sql` in the SQL editor. It resolves sellers by
e-mail and no-ops cleanly if the accounts do not exist yet.

### 4. Generate database types (optional but recommended)

```bash
SUPABASE_PROJECT_ID=your-ref npm run types:db
```

---

## Environment variables

See `.env.local.example` for the annotated copy.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Public. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public — ships to the browser. RLS is what protects the data. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Server only. Bypasses RLS.** Never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SITE_URL` | prod | Canonical origin for canonical tags, OG and sitemap. |
| `INQUIRY_IP_SALT` | recommended | Salts the SHA-256 of inquirer IPs. Without it the rate limiter is disabled rather than storing weakly-hashed addresses. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | optional | Inquiry notification e-mails. Without them inquiries still save and appear in `/dashboard/upiti`. |

The service-role key is imported by exactly one module,
`src/lib/supabase/admin.ts`, which is marked `server-only` so bundling
it into a client component is a build error rather than a silent leak.

---

## Commands

```bash
npm run dev:preview  # storefront with mock data -- no Supabase needed
npm run dev          # dev server (needs Supabase)
npm run build        # production build (needs a reachable Supabase)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest — formatting, plurals, transliteration
npm run verify:db    # migrations + 75 RLS assertions in PGlite (no Docker)
npm run test:e2e     # playwright
npm run seed:users   # create the seed staff accounts
```

`npm run verify:db` is the important one. It runs every migration and
the full RLS suite against real PostgreSQL compiled to WASM, so schema
and policy changes can be verified without Docker or a live project.

---

## Architecture notes

**Three trust layers, and only one of them is the boundary.**

1. `src/proxy.ts` — refreshes the session cookie, redirects anonymous
   `/dashboard` hits. Cheap gate, not authorization.
2. Server Components and Actions — zod validation, role checks, good
   Serbian error messages.
3. **RLS in Postgres — the actual boundary.** Every policy is written
   assuming the attacker holds a valid anon key, because they do.

**Two Supabase clients, deliberately.** `supabase/public.ts` is
session-less and used by every public read: it keeps those routes
statically generatable and, running as `anon`, can only ever see active
rows. `supabase/server.ts` carries the cookie and is used by the
dashboard. Mixing them up turns the whole storefront dynamic — see the
comment in `public.ts`.

**Images upload straight from the browser** to Supabase Storage under
`{sellerId}/{listingId}/`, constrained by a path-prefix storage policy.
This keeps multi-megabyte photos out of Server Actions entirely.

**Serbian formatting is hand-rolled** (`src/lib/format.ts`), not
`Intl`. Server and browser ICU can disagree on the sr-RS group
separator, which would hydration-mismatch the most visible string on
the page. Plurals use the real three-form Slavic rule.

---

## Deploying to Vercel

1. Push to GitHub, import the repo in Vercel.
2. Add the environment variables for **Production and Preview**.
3. Deploy, add the custom domain, set `NEXT_PUBLIC_SITE_URL` to it.
4. Verify in Google Search Console and submit `/sitemap.xml`.

Preview deploys point at the same Supabase project by default, so
preview writes hit live data. Create a second project if that matters.

---

## Known limitations

- **Supabase free tier pauses a project after 7 days idle.** Upgrade
  before real traffic, or the site goes down.
- **Search has no stemming.** Postgres ships no Serbian dictionary;
  `simple` + `unaccent` handles diacritic-free queries ("masina" finds
  "mašina") but not morphology ("mašinama").
- **Abandoned draft images are not reaped.** Deleting a listing cleans
  up its objects; abandoning a draft leaves them. A `pg_cron` sweep is
  the fix when it matters.
- **The `listings` bucket is public-read.** Required for OG cards and
  `next/image`. Staff must not upload anything sensitive.
- Legal pages (`uslovi-koriscenja`, `politika-privatnosti`) are
  placeholder text pending review.
