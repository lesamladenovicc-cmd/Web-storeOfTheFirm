-- =====================================================================
-- 0005 — listing_images
-- =====================================================================
-- Storage path convention: {seller_id}/{listing_id}/{uuid}.webp
--
-- The seller_id prefix is what makes direct browser uploads safe: the
-- storage policy in 0008 checks that the first path segment equals
-- auth.uid(), which works even before the listing row exists (the client
-- generates the listing UUID up front).
--
-- There is deliberately NO unique constraint on (listing_id, sort_order).
-- It would turn every reorder into a swap-through-temporary-value dance
-- for no integrity benefit.
-- =====================================================================

create table if not exists public.listing_images (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  alt          text,
  width        integer,
  height       integer,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),

  constraint listing_images_path_len check (char_length(storage_path) between 3 and 400),
  constraint listing_images_path_shape check (
    storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$'
  ),
  constraint listing_images_alt_len check (alt is null or char_length(alt) <= 200),
  constraint listing_images_dims check (
    (width is null or width between 1 and 20000)
    and (height is null or height between 1 and 20000)
  )
);

comment on constraint listing_images_path_shape on public.listing_images is
  'Enforces {seller_uuid}/{listing_uuid}/{file} so storage RLS stays meaningful.';

create index if not exists listing_images_listing_idx
  on public.listing_images (listing_id, sort_order);

-- One object may only be attached once.
create unique index if not exists listing_images_path_uniq
  on public.listing_images (storage_path);
