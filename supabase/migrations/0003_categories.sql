-- =====================================================================
-- 0003 — categories
-- =====================================================================
-- FLAT taxonomy. There is deliberately no `parent_id` column and there
-- never will be: the brief calls for minimal categorisation, and nested
-- trees are what make marketplace navigation and SEO unmanageable.
--
-- Categories are data, not code, so an admin can re-niche the store
-- without a redeploy.
-- =====================================================================

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_slug_len    check (char_length(slug) between 2 and 60),
  constraint categories_name_len    check (char_length(name) between 2 and 60),
  constraint categories_desc_len    check (description is null or char_length(description) <= 300)
);

comment on table public.categories is
  'Flat listing taxonomy. No parent_id by design.';

create index if not exists categories_active_order_idx
  on public.categories (sort_order, name)
  where is_active;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();
