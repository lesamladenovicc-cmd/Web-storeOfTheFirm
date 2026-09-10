-- =====================================================================
-- 0013 — purpose: a unit is for sale OR for rent
-- =====================================================================
-- Until now every listing was implicitly a sale. BG Building also rents
-- units out, and "for sale" vs "for rent" is a different axis from both
-- `condition` (how far the building has got) and `status` (whether the
-- unit is still in the offer).
--
-- THREE DECISIONS, EACH DELIBERATE:
--
-- 1. A NEW COLUMN, NOT A NEW CATEGORY.
--    Categories are flat and describe WHAT the unit is (stan, lokal,
--    garaža). Duplicating each of them into "-za-izdavanje" would double
--    the taxonomy and make "all apartments" unaskable.
--
-- 2. NO NEW STATUS VALUE FOR "izdato".
--    `status = 'prodato'` becomes the generic terminal state — the unit
--    has left the offer — and the Serbian label is DERIVED from purpose
--    (prodaja -> "Prodato", izdavanje -> "Izdato").
--    Adding an 'izdato' enum value instead would have to be threaded
--    through, in lockstep: two RLS policies (0007), the three
--    listings_active_needs_* CHECKs (0004, written as `status <>
--    'aktivan'`, so a new value silently bypasses them), four partial
--    indexes, stamp_sold_at (0010), the search RPC, and eight places in
--    TypeScript. Every one of those is a silent failure if missed — a
--    rented unit would 404 the instant it flipped. A derived label costs
--    one lookup table and nothing else.
--
-- 3. THE PRICE COLUMN IS SHARED.
--    `price_eur` holds a sale price for prodaja and a MONTHLY rent for
--    izdavanje. A second column would fork the price filter, the sort,
--    the JSON-LD and the form for a value that is never both at once.
--    The "/mesec" suffix is presentation and lives in lib/format.ts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The enum and the column
-- ---------------------------------------------------------------------
-- `default 'prodaja'` is what makes this migration safe on a populated
-- database: every row that exists today IS a sale, so the backfill is
-- the default itself and the column can be NOT NULL from the start.

do $$ begin
  create type public.listing_purpose as enum ('prodaja', 'izdavanje');
exception when duplicate_object then null;
end $$;

comment on type public.listing_purpose is
  'What the unit is offered for. Orthogonal to both condition (build phase) and status.';

alter table public.listings
  add column if not exists purpose public.listing_purpose not null default 'prodaja';

comment on column public.listings.purpose is
  'prodaja = one-off sale price in price_eur; izdavanje = MONTHLY rent in price_eur.';

comment on column public.listings.status is
  'nacrt = draft. aktivan = in the offer. prodato = TERMINAL, left the offer — '
  'it reads "Prodato" for purpose=prodaja and "Izdato" for purpose=izdavanje. '
  'The Serbian label is derived in src/config/taxonomy.ts, never stored.';

-- ---------------------------------------------------------------------
-- 2. Index
-- ---------------------------------------------------------------------
-- The new landing routes (/prodaja, /izdavanje) filter on purpose alone
-- and are the highest-traffic queries on the site. The predicate covers
-- both public statuses because, as of this migration, search returns
-- sold/rented rows too (see §3).

create index if not exists listings_public_purpose_idx
  on public.listings (purpose, published_at desc nulls last)
  where status in ('aktivan', 'prodato');

-- ---------------------------------------------------------------------
-- 3. search_listings — purpose filter, and sold rows come back
-- ---------------------------------------------------------------------
-- TWO CHANGES OF BEHAVIOUR, not just a new argument:
--
--   a) The WHERE moves from `status = 'aktivan'` to
--      `status in ('aktivan','prodato')`. The sold/rented ribbon has
--      existed in ListingCard since the first build but was UNREACHABLE
--      from search, because this function never returned a sold row.
--      Showing them is the point: a visitor scrolling past three
--      "Izdato" units learns the offer moves, which an empty-looking
--      catalogue does not tell them.
--
--   b) A new FIRST sort key parks them below every available unit,
--      whatever p_sort says. Without it "cena_rastuce" would happily
--      open with a sold flat — the cheapest thing in the catalogue is
--      very often the one already gone.
--
-- category_counts() (0009) deliberately stays on 'aktivan': a "12" next
-- to a category whose twelve units are all sold is a false promise.
--
-- DROP + CREATE, not CREATE OR REPLACE: the argument list and the
-- RETURNS TABLE both change, and neither can be altered in place. The
-- drop must name the OLD nine-argument signature; the grant does not
-- survive it.

drop function if exists public.search_listings(
  text, text, public.listing_condition[], integer, integer, text, text, integer, integer
);

create function public.search_listings(
  p_query         text                       default null,
  p_category_slug text                       default null,
  p_conditions    public.listing_condition[] default null,
  p_price_min     integer                    default null,
  p_price_max     integer                    default null,
  p_location      text                       default null,
  p_sort          text                       default 'najnovije',
  p_limit         integer                    default 24,
  p_offset        integer                    default 0,
  p_purpose       public.listing_purpose     default null
)
returns table (
  id               uuid,
  slug             text,
  title            text,
  condition        public.listing_condition,
  purpose          public.listing_purpose,
  price_eur        integer,
  is_negotiable    boolean,
  status           public.listing_status,
  location         text,
  cover_image_path text,
  category_name    text,
  category_slug    text,
  published_at     timestamptz,
  updated_at       timestamptz,
  total_count      bigint
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with q as (
    select case
             when p_query is null or btrim(p_query) = '' then null
             else websearch_to_tsquery('simple', public.f_unaccent(p_query))
           end as tsq
  ),
  filtered as (
    select
      l.id,
      l.slug,
      l.title,
      l.condition,
      l.purpose,
      l.price_eur,
      l.is_negotiable,
      l.status,
      l.location,
      l.cover_image_path,
      c.name as category_name,
      c.slug as category_slug,
      l.published_at,
      l.updated_at
    from public.listings l
    left join public.categories c on c.id = l.category_id
    cross join q
    where l.status in ('aktivan', 'prodato')
      and (q.tsq is null or l.search_tsv @@ q.tsq)
      and (p_category_slug is null or c.slug = p_category_slug)
      and (p_conditions is null or l.condition = any (p_conditions))
      and (p_purpose is null or l.purpose = p_purpose)
      and (p_price_min is null or (l.price_eur is not null and l.price_eur >= p_price_min))
      and (p_price_max is null or (l.price_eur is not null and l.price_eur <= p_price_max))
      and (
        p_location is null
        or public.f_unaccent(l.location) ilike '%' || public.f_unaccent(p_location) || '%'
      )
  )
  select
    f.*,
    count(*) over () as total_count
  from filtered f
  order by
    -- Availability outranks every user-chosen sort: what is still on
    -- offer comes first, gone units trail behind in the chosen order.
    case when f.status = 'prodato' then 1 else 0 end asc,
    -- Only the matching branch produces a non-null key; the rest fall
    -- through to the recency tiebreak.
    case when p_sort = 'cena_rastuce'   then f.price_eur end asc  nulls last,
    case when p_sort = 'cena_opadajuce' then f.price_eur end desc nulls last,
    f.published_at desc nulls last,
    f.id
  limit greatest(1, least(coalesce(p_limit, 24), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.search_listings(
  text, text, public.listing_condition[], integer, integer, text, text, integer, integer,
  public.listing_purpose
) to anon, authenticated;
