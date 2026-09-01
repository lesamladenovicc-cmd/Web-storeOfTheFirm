# CLAUDE.md

Project guidance for Claude Code. Read this before doing anything in this repo.

## Project
Internal listings web store (MVP). KupujemProdajem-style but **listing-only**: approved internal staff post products; public browses and contacts sellers. **No cart, no checkout, no payments.** Language: **Serbian (sr-RS)**. Currency: **RSD**. Niche is not final (starts with "machines") — keep everything **niche-agnostic and easy to re-theme**.

## Golden rules
- **Listing-only.** Never add cart, checkout, or payment code.
- Only authenticated internal users can create/edit/delete listings. Public = **read + contact** only. Enforce at BOTH the DB (RLS) and the route level.
- **No public sign-up.** Admin creates or invites internal accounts.
- Keep categorization **flat and minimal**. No deep nested category trees.
- All UI text in **Serbian**. Use Serbian mock/placeholder text until told otherwise.
- Prices in **RSD**, formatted like `1.950 din`.

## Skills — BUILD PHASE ONLY
- The project vendors the cline/skills repo at `Skills/skills/` (36 skill folders, standard `SKILL.md` format).
- Before starting related work, scan `Skills/skills/`, read any relevant `SKILL.md`, then follow it.
- Use the **`frontend-design`** skill before building or restyling any UI.
- Do **NOT** consult or invoke skills during planning — skills are for implementation only.
- `Skills/` is **read-only reference**. Never edit anything under it.

## Stack (LOCKED)
- **Next.js 16.3.4** (App Router, TypeScript strict) — SEO + SSR/SSG
- **React 19.2.8**
- **Supabase** — Postgres, Auth, Storage (`@supabase/supabase-js` 2.x, `@supabase/ssr` 0.8)
- **Tailwind CSS v4** — CSS-first `@theme` tokens in `src/app/globals.css`
- **zod 4** — every server-side validation boundary
- **Vercel** hosting
- Tests: Vitest (units), PGlite (SQL/RLS), Playwright (e2e)

Fonts: Archivo (display) + IBM Plex Sans (body) + IBM Plex Mono (numerics).
Always request the `latin-ext` subset — Serbian č ć š ž đ live there.

### Hard-won constraints (do not regress these)
- **Two Supabase clients.** `lib/supabase/public.ts` (session-less, anon) for
  every public read — reading cookies opts a route out of static generation and
  silently kills ISR. `lib/supabase/server.ts` (cookie) for dashboard reads only.
- `generateStaticParams` and `sitemap()` run at build time with **no request** —
  they must never touch the cookie client.
- Defining `openGraph` in `generateMetadata` **suppresses** the
  `opengraph-image.tsx` file convention; `buildMetadata` references the fallback
  explicitly.
- `export const revalidate` must be a **literal**, not an imported constant.
  The ISR policy table lives in `src/config/site.ts` as documentation only.
- Never call `incrementViewCount` from an ISR page body — it would count once
  per regeneration, not per visitor.
- Formatting is hand-rolled in `lib/format.ts`, never `Intl` — server/client ICU
  disagreement causes hydration mismatches on prices.
- `"use server"` modules may only export async functions.

## Design system
Beige + dark, one bright accent, minimal but powerful. Tokens (swappable — change these to re-theme):
```
--bg-dark:      #141414   /* page background (dark) */
--surface-dark: #1E1E1E   /* cards / panels on dark  */
--beige:        #E7DECB   /* primary light surface   */
--beige-muted:  #D3C7AE   /* secondary beige         */
--ink:          #1A1A1A   /* text on beige           */
--paper:        #F4EFE3   /* light text on dark      */
--accent:       #FF4D00   /* primary CTA — sparingly */
--accent-2:     #C6FF3D   /* optional highlight      */
```
Rules: accent color ONLY on primary actions/highlights. Generous whitespace. Strong type hierarchy. No decorative gradients, no clutter. Must not look templated — lean on the `frontend-design` skill.

## Domain model (target)
- **users** — internal staff; `role` (admin | seller)
- **listings** — title, description, condition, price_rsd, status, location, seller_id, category, created_at, updated_at
- **listing_images** — listing_id, storage_path, sort_order

Enums (Serbian, user-facing):
- condition: `Novo`, `Kao novo`, `Korišćeno`, `Neispravno`
- status: `aktivan`, `prodato`, `nacrt`

## Auth
- Internal accounts only. Admin creates/invites; no public registration route.
- Protect all `/dashboard` routes. Sellers see/edit only their own listings; admin sees all.
- Supabase RLS: public `SELECT` on active listings; `INSERT/UPDATE/DELETE` restricted to owner (and admin).

## SEO (non-negotiable)
- SSR/SSG all public listing pages.
- Per listing: `<title>`, meta description, canonical, OG/Twitter tags, and **Product JSON-LD** (name, description, image, `offers` in RSD, `itemCondition`).
- Generate `sitemap.xml` + `robots.txt`. Locale `sr-RS`. Optimize images via `next/image`.

## Conventions
- TypeScript strict. Server Components by default; client components only when needed.
- Validate all input **server-side**. Never trust the client.
- Keep components small and typed; co-locate by feature.
- Centralize copy/labels so the niche can change without touching components.
- Secrets in `.env.local`, never committed. Document required env vars in the README.

## Commands
- dev: `npm run dev`
- build: `npm run build` (requires a reachable Supabase project)
- lint: `npm run lint`
- typecheck: `npm run typecheck`
- unit tests: `npm run test`
- **db + RLS verification: `npm run verify:db`** — runs every migration and 75
  assertions in PGlite (real Postgres in WASM). No Docker needed. Run this after
  ANY change under `supabase/migrations/`.
- e2e: `npm run test:e2e`
- seed staff accounts: `npm run seed:users`

## Don'ts
- No payment/checkout. No public registration. No nested category trees.
- Don't hardcode the niche.
- Don't edit anything under `Skills/`.
- Don't ship the Supabase service-role key to the client.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
