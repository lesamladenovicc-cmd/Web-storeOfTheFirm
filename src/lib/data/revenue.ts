import "server-only";

import { createClient } from "@/lib/supabase/server";
import { summarizeRevenue, type RevenueOverview, type SaleRecord } from "@/lib/revenue";
import type { Profile } from "@/types/domain";

/**
 * DATA / REVENUE — the query behind /dashboard/prihod.
 *
 * ─────────────────────────────────────────────────────────────────────
 * RLS DOES NOT SCOPE THIS QUERY. The `seller_id` filter below is the
 * only thing keeping one seller out of another's turnover.
 *
 * Everywhere else in this codebase the policy is the filter: drafts and
 * inquiries are invisible to anyone but their owner, so a bare SELECT is
 * already scoped. Sold listings are the exception — `listings_select_public`
 * (0007) deliberately keeps them readable by everyone, including anon, so
 * that a shared or indexed link does not 404 the moment an item sells.
 * A seller reading `listings where status = 'prodato'` therefore gets
 * EVERY seller's sales.
 *
 * Do not delete the filter as redundant. `npm run verify:db` asserts
 * both halves of this ("revenue: …") so the mistake fails loudly.
 * ─────────────────────────────────────────────────────────────────────
 *
 * The arithmetic lives in lib/revenue.ts, which is pure and unit-tested.
 */

/** Sold listings are a slow-growing set; this is a ceiling, not a page. */
const MAX_SALES = 2000;

type SoldRow = {
  id: string;
  slug: string;
  title: string;
  price_rsd: number | null;
  sold_at: string | null;
  updated_at: string;
  seller_id: string;
  categories: { name: string; slug: string } | null;
  profiles: { full_name: string } | null;
};

const SOLD_SELECT =
  "id, slug, title, price_rsd, sold_at, updated_at, seller_id, " +
  "categories ( name, slug ), profiles ( full_name )";

function toSale(row: SoldRow): SaleRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    priceRsd: row.price_rsd,
    // sold_at is null only for rows written before migration 0010
    // reached the database. updated_at is the same approximation the
    // backfill uses, so a half-migrated table still charts correctly.
    soldAt: row.sold_at ?? row.updated_at,
    sellerId: row.seller_id,
    sellerName: row.profiles?.full_name ?? null,
    categoryName: row.categories?.name ?? null,
  };
}

/**
 * Everything /dashboard/prihod renders, in one round trip.
 *
 * `now` is injectable so the month buckets do not depend on the clock
 * in tests.
 */
export async function getRevenueOverview(
  profile: Profile,
  now: Date = new Date(),
): Promise<RevenueOverview> {
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select(SOLD_SELECT)
    .eq("status", "prodato")
    .order("sold_at", { ascending: false, nullsFirst: false })
    .limit(MAX_SALES);

  // Load-bearing. See the module header before touching this line.
  if (!isAdmin) query = query.eq("seller_id", profile.id);

  const { data, error } = await query;
  const rows = error || !data ? [] : (data as unknown as SoldRow[]);

  return summarizeRevenue(rows.map(toSale), isAdmin ? "all" : "own", now);
}
