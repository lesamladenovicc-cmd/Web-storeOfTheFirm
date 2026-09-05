-- =====================================================================
-- 0010 — sold_at, the time axis for revenue reporting
-- =====================================================================
-- The dashboard reports revenue as "the sum of price_rsd over listings
-- whose status is 'prodato'". Without a timestamp for the sale itself
-- that figure can only ever be an all-time total: `updated_at` moves on
-- every later edit and `published_at` records the opposite event.
--
-- Two deliberate decisions:
--
-- 1. sold_at IS CLEARED WHEN A LISTING LEAVES 'prodato'.
--    A listing put back on sale is not a sale any more, and the report
--    reads current state — it is not an immutable ledger of every
--    transition. A relisted-then-resold item is counted once, at the
--    later date. This is an internal record, not accounting.
--
-- 2. THE AMOUNT IS NOT SNAPSHOTTED.
--    Revenue reads price_rsd live, so correcting the price of a sold
--    listing corrects the report. The alternative (a sold_price_rsd
--    frozen by the trigger) would silently disagree with the price the
--    same page shows, which is worse for an internal figure whose only
--    job is to be recognisable to the person who made the sale.
--
-- PRIVACY: this column is readable by anon, exactly like price_rsd and
-- status. Sold listings stay publicly reachable on purpose (see 0007),
-- so the underlying figures were already public; what is staff-only is
-- the AGGREGATE VIEW at /dashboard/prihod, gated by requireProfile().
-- =====================================================================

alter table public.listings
  add column if not exists sold_at timestamptz;

comment on column public.listings.sold_at is
  'Stamped when the listing enters status prodato; cleared when it leaves. '
  'Null for every listing that is not currently sold.';

-- ---------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------
-- Listings already marked sold before this migration have no true sale
-- date. updated_at is the closest honest approximation — marking sold
-- was, for most of them, the last edit made.

update public.listings
   set sold_at = coalesce(updated_at, published_at, created_at)
 where status = 'prodato'
   and sold_at is null;

-- ---------------------------------------------------------------------
-- Stamp / clear
-- ---------------------------------------------------------------------
-- Kept in the database rather than in setListingStatusAction because
-- status is written from three separate paths (create, edit, the status
-- shortcut) plus seeds and SQL. A trigger is the only place all of them
-- pass through.
--
-- `of status` matters: the trigger fires only when an UPDATE actually
-- names the status column, so editing the price or the photos of a sold
-- listing leaves its sale date alone.

create or replace function public.stamp_sold_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'prodato' then
    if new.sold_at is null then
      new.sold_at = now();
    end if;
  else
    new.sold_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_stamp_sold_at on public.listings;
create trigger listings_stamp_sold_at
  before insert or update of status on public.listings
  for each row execute function public.stamp_sold_at();

-- ---------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------
-- The report is always "sold listings, one seller or all of them,
-- newest first". A partial index keeps it off the active rows, which
-- are the majority and never in this result set.

create index if not exists listings_sold_idx
  on public.listings (seller_id, sold_at desc nulls last)
  where status = 'prodato';
