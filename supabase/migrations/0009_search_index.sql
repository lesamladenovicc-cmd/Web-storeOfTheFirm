-- =====================================================================
-- 0009 — Search
-- =====================================================================
-- Postgres ships no Serbian FTS dictionary, and Serbian users routinely
-- type without diacritics ("masina" for "mašina"). The 'simple' config
-- plus f_unaccent() handles the diacritic problem, and a trigram index
-- covers short or misspelled terms. What it does NOT handle is
-- morphology ("mašine" vs "mašinama") — acceptable at MVP scale, and
-- flagged as a known limitation.
--
-- f_unaccent (0001) is the IMMUTABLE wrapper; extensions.unaccent() is
-- only STABLE and Postgres refuses it in a generated column.
-- =====================================================================

alter table public.listings
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(title, ''))), 'A')
    ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(description, ''))), 'B')
  ) stored;

create index if not exists listings_search_idx
  on public.listings using gin (search_tsv);

create index if not exists listings_title_trgm_idx
  on public.listings using gin (public.f_unaccent(title) extensions.gin_trgm_ops);

-- =====================================================================
-- search_listings — the single public query entry point
-- =====================================================================
-- Search, filter, sort and paginate in one round trip, returning the
-- total row count alongside the page via a window function.
--
-- SECURITY INVOKER is deliberate and load-bearing: RLS on `listings`
-- still applies, so this function cannot leak drafts even though it is
-- callable by anon. The explicit status filter is for the planner (it
-- enables the partial indexes), not for security.

create or replace function public.search_listings(
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
  price_rsd        integer,
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
      l.price_rsd,
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
      and (p_price_min is null or (l.price_rsd is not null and l.price_rsd >= p_price_min))
      and (p_price_max is null or (l.price_rsd is not null and l.price_rsd <= p_price_max))
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
    case when p_sort = 'cena_rastuce'   then f.price_rsd end asc  nulls last,
    case when p_sort = 'cena_opadajuce' then f.price_rsd end desc nulls last,
    f.published_at desc nulls last,
    f.id
  limit greatest(1, least(coalesce(p_limit, 24), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.search_listings(
  text, text, public.listing_condition[], integer, integer, text, text, integer, integer
) to anon, authenticated;

-- =====================================================================
-- category_counts — categories plus their live listing counts
-- =====================================================================

create or replace function public.category_counts()
returns table (
  id            uuid,
  slug          text,
  name          text,
  description   text,
  sort_order    integer,
  is_active     boolean,
  listing_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.slug,
    c.name,
    c.description,
    c.sort_order,
    c.is_active,
    count(l.id) as listing_count
  from public.categories c
  left join public.listings l
    on l.category_id = c.id
   and l.status = 'aktivan'
  where c.is_active
  group by c.id, c.slug, c.name, c.description, c.sort_order, c.is_active
  order by c.sort_order, c.name;
$$;

grant execute on function public.category_counts() to anon, authenticated;

-- =====================================================================
-- increment_view_count — fire-and-forget counter
-- =====================================================================
-- SECURITY DEFINER because an anonymous reader must be able to bump the
-- counter, but must not hold UPDATE on listings. The function body can
-- only ever touch this one column on one active row.

create or replace function public.increment_view_count(p_listing_id uuid)
returns void
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  update public.listings
  set view_count = view_count + 1
  where id = p_listing_id
    and status = 'aktivan';
$$;

grant execute on function public.increment_view_count(uuid) to anon, authenticated;
