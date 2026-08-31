-- =====================================================================
-- 0004 — listings
-- =====================================================================
-- The core table. Two design decisions worth stating explicitly:
--
-- 1. CONTACT DETAILS ARE DENORMALIZED ONTO THE LISTING.
--    They are not joined from `profiles` at read time. This keeps the
--    profiles table entirely private to authenticated users (the public
--    RLS path never touches staff records), lets a seller publish a
--    per-listing number, and removes a join from the hottest query.
--
-- 2. `price_rsd` IS NULLABLE and null means "Po dogovoru".
--    It is not 0 and not -1. The JSON-LD builder omits the whole offers
--    block when it is null, which is the only markup-valid option.
-- =====================================================================

create table if not exists public.listings (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,

  title             text not null,
  description       text not null default '',
  condition         public.listing_condition not null,

  price_rsd         integer,
  is_negotiable     boolean not null default false,

  status            public.listing_status not null default 'nacrt',
  location          text not null default '',

  category_id       uuid references public.categories(id) on delete restrict,
  seller_id         uuid not null references public.profiles(id) on delete cascade,

  -- Snapshotted from the seller's profile at creation; editable per listing.
  contact_name      text not null default '',
  contact_phone     text,
  contact_email     text,

  -- Denormalized so grid queries never join listing_images.
  cover_image_path  text,

  -- Niche escape hatch: {"godiste": 2018, "radni_sati": 4200}.
  -- Present in the schema, intentionally unused by the MVP UI.
  attributes        jsonb not null default '{}'::jsonb,

  view_count        integer not null default 0,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint listings_slug_format  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint listings_slug_len     check (char_length(slug) between 3 and 100),
  constraint listings_title_len    check (char_length(title) between 5 and 120),
  constraint listings_desc_len     check (char_length(description) <= 5000),
  constraint listings_location_len check (char_length(location) <= 80),
  constraint listings_price_range  check (
    price_rsd is null or (price_rsd >= 0 and price_rsd <= 2000000000)
  ),
  constraint listings_contact_email_format check (
    contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint listings_attributes_object check (jsonb_typeof(attributes) = 'object'),

  -- A listing may only be publicly visible if it is actually contactable.
  constraint listings_active_needs_contact check (
    status <> 'aktivan'
    or contact_phone is not null
    or contact_email is not null
  ),
  constraint listings_active_needs_category check (
    status <> 'aktivan' or category_id is not null
  )
);

comment on column public.listings.price_rsd is
  'Whole dinars. NULL means "Po dogovoru" — never 0.';
comment on column public.listings.attributes is
  'Niche-specific extras. Schema-present, unused by the MVP UI.';

-- ---------------------------------------------------------------------
-- updated_at, but a view-count bump is not a content change
-- ---------------------------------------------------------------------
-- increment_view_count() (0009) runs on every anonymous page view. With
-- the generic set_updated_at trigger that would move updated_at on each
-- view, which in turn poisons <lastmod> in the sitemap and the "Ažurirano"
-- label. Comparing the rows minus the volatile columns keeps updated_at
-- meaning "the seller changed something".

-- `search_tsv` (added in 0009) MUST be excluded from the comparison.
-- It is a STORED generated column, and inside a BEFORE UPDATE trigger
-- NEW.search_tsv is still NULL — generated columns are computed after
-- BEFORE triggers run — while OLD.search_tsv holds the stored value.
-- Comparing them would therefore never match and updated_at would move
-- on every single view. Excluding it loses nothing, because the columns
-- it derives from (title, description) are still compared.

create or replace function public.set_listing_updated_at()
returns trigger
language plpgsql
as $$
declare
  volatile_keys constant text[] := array['view_count', 'updated_at', 'search_tsv'];
begin
  if (to_jsonb(new) - volatile_keys) = (to_jsonb(old) - volatile_keys) then
    return new;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_listing_updated_at();

-- ---------------------------------------------------------------------
-- Stamp published_at on the first transition into 'aktivan'
-- ---------------------------------------------------------------------
-- Kept in the database rather than the Server Action so that a listing
-- published through any path (admin API, SQL, seed) gets a correct
-- publication date — which is what the sitemap and ordering rely on.

create or replace function public.stamp_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'aktivan' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists listings_stamp_published_at on public.listings;
create trigger listings_stamp_published_at
  before insert or update of status on public.listings
  for each row execute function public.stamp_published_at();

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
-- Partial indexes on status='aktivan' keep the public read path small:
-- drafts and sold listings are the majority of rows over time but are
-- never in a public result set.

create index if not exists listings_active_published_idx
  on public.listings (published_at desc nulls last)
  where status = 'aktivan';

create index if not exists listings_active_category_idx
  on public.listings (category_id, published_at desc nulls last)
  where status = 'aktivan';

create index if not exists listings_active_price_idx
  on public.listings (price_rsd nulls last)
  where status = 'aktivan';

create index if not exists listings_seller_idx
  on public.listings (seller_id, updated_at desc);

create index if not exists listings_category_fk_idx
  on public.listings (category_id);
