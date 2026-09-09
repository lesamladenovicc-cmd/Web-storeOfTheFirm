-- =====================================================================
-- 0012 — prices move from dinars to euros
-- =====================================================================
-- Serbian property is quoted in EUR. Everyone advertising new-build
-- apartments here prices in euros, buyers compare in euros, and banks
-- index housing loans to it — a dinar figure on a listing would have to
-- be mentally converted by every visitor.
--
-- The column is RENAMED rather than left as `price_rsd` holding euros.
-- A column whose name states the wrong currency is a trap for every
-- future query and every future reader, and the value is only an
-- integer: nothing in the data says which currency it is.
--
-- ⚠️ THIS MIGRATION DOES NOT CONVERT VALUES. It renames the column and
-- leaves the numbers untouched, which is correct for this project — the
-- only rows that exist are seed data, rewritten in euros alongside this
-- file. If you are applying this to a database holding REAL dinar
-- prices, convert first, in a separate statement you have thought about:
--
--     update public.listings set price_rsd = round(price_rsd / 117.0)
--      where price_rsd is not null;   -- pick your own rate, then rename
--
-- Renaming without converting would silently reprice a 19,500,000 RSD
-- flat as 19,500,000 EUR.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The column
-- ---------------------------------------------------------------------
-- Guarded rather than relying on an exception handler: a rename that has
-- already happened is the normal case on a re-run, not an error.

do $$ begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'listings'
       and column_name  = 'price_rsd'
  ) then
    alter table public.listings rename column price_rsd to price_eur;
  end if;
end $$;

comment on column public.listings.price_eur is
  'Whole euros. NULL means "Po dogovoru" — never 0.';

-- ---------------------------------------------------------------------
-- 2. The bound
-- ---------------------------------------------------------------------
-- The old ceiling was 2,000,000,000 — a sane guard against a fat-fingered
-- dinar amount, and meaningless in euros. 100,000,000 is still far above
-- anything we will ever list while still catching a stray extra zero.
-- Mirrored by LIMITS.priceMax in src/config/site.ts.

alter table public.listings drop constraint if exists listings_price_range;

alter table public.listings add constraint listings_price_range check (
  price_eur is null or (price_eur >= 0 and price_eur <= 100000000)
);

-- ---------------------------------------------------------------------
-- 3. The index
-- ---------------------------------------------------------------------
-- A column rename carries the index definition across but keeps the old
-- name, which would read as a dinar index forever.

alter index if exists public.listings_active_price_idx
  rename to listings_active_price_eur_idx;

-- ---------------------------------------------------------------------
-- 4. search_listings
-- ---------------------------------------------------------------------
-- The RETURNS TABLE column name is part of the function's output
-- contract and does NOT follow a table-column rename — the client would
-- keep receiving a field called `price_rsd`. CREATE OR REPLACE cannot
-- change it either ("cannot change name of input parameter" / return
-- type), so the function is dropped and rebuilt.
--
-- Body is otherwise identical to 0009; only price_rsd -> price_eur.

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
  p_offset        integer                    default 0
)
returns table (
  id               uuid,
  slug             text,
  title            text,
  condition        public.listing_condition,
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
    where l.status = 'aktivan'
      and (q.tsq is null or l.search_tsv @@ q.tsq)
      and (p_category_slug is null or c.slug = p_category_slug)
      and (p_conditions is null or l.condition = any (p_conditions))
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
  text, text, public.listing_condition[], integer, integer, text, text, integer, integer
) to anon, authenticated;
