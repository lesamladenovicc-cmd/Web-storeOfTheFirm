/**
 * REVENUE — the arithmetic behind /dashboard/prihod.
 *
 * Deliberately pure and free of `server-only`, so the money maths is
 * covered by unit tests instead of eyeballed in a screenshot. The
 * database half lives in lib/data/revenue.ts; this module never knows
 * what a Supabase row looks like.
 *
 * Two rules the whole file turns on:
 *
 *   * A sale with NO PRICE ("Po dogovoru", price_eur is null) is a real
 *     sale and is counted, but it can never enter a sum or an average.
 *     Treating it as 0 would quietly drag every average down.
 *   * Buckets are built from the calendar, not from the data: twelve
 *     months always yield twelve buckets, so an empty month renders as
 *     a gap rather than shortening the axis.
 */

import { formatMonthLabel } from "@/lib/format";

/** One sale, already mapped out of the wire format. */
export type SaleRecord = {
  id: string;
  slug: string;
  title: string;
  /** Null means the price was never published — "Po dogovoru". */
  priceEur: number | null;
  /** ISO timestamp of the sale. */
  soldAt: string;
  sellerId: string;
  sellerName: string | null;
  categoryName: string | null;
};

/** One aggregated slice — a month, a category, a period. */
export type RevenueBucket = {
  key: string;
  label: string;
  /** Sum of known prices, in whole dinars. */
  total: number;
  /** Sales in the slice, including ones with no price. */
  count: number;
};

export type RevenueBySeller = {
  sellerId: string;
  sellerName: string;
  total: number;
  count: number;
};

export type RevenueOverview = {
  /** "all" for an admin, "own" for a seller — drives the page copy. */
  scope: "all" | "own";
  total: number;
  count: number;
  /** Sold "Po dogovoru": counted as a sale, absent from every sum. */
  unpriced: number;
  /** Mean over priced sales only. 0 when there are none. */
  average: number;
  best: number;
  thisMonth: RevenueBucket;
  previousMonth: RevenueBucket;
  thisYear: RevenueBucket;
  /** Exactly CHART_MONTHS buckets, oldest first, gaps included. */
  months: RevenueBucket[];
  categories: RevenueBucket[];
  /** Empty under scope "own" — there is only one row to show a seller. */
  sellers: RevenueBySeller[];
  recent: SaleRecord[];
};

export const CHART_MONTHS = 12;
export const RECENT_LIMIT = 10;

/** Fallback label for a sale whose category was deleted. */
const NO_CATEGORY = "—";

/* ------------------------------------------------------------------ */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local-time month key, matching how formatDate reads a timestamp. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function emptyBucket(key: string, label: string): RevenueBucket {
  return { key, label, total: 0, count: 0 };
}

function add(bucket: RevenueBucket, price: number | null): void {
  bucket.count += 1;
  if (price !== null) bucket.total += price;
}

/* ------------------------------------------------------------------ */

/**
 * Everything the report renders, from a flat list of sales.
 *
 * `sales` must already be scoped to what the viewer may see and sorted
 * newest first — `recent` is a slice of it, not a re-sort.
 */
export function summarizeRevenue(
  sales: SaleRecord[],
  scope: "all" | "own",
  now: Date = new Date(),
): RevenueOverview {
  const currentKey = monthKey(now);
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousKey = monthKey(previousDate);
  const yearKey = String(now.getFullYear());

  const thisMonth = emptyBucket(
    currentKey,
    formatMonthLabel(now.getFullYear(), now.getMonth(), { short: false }),
  );
  const previousMonth = emptyBucket(
    previousKey,
    formatMonthLabel(previousDate.getFullYear(), previousDate.getMonth(), { short: false }),
  );
  const thisYear = emptyBucket(yearKey, `${yearKey}.`);

  const months: RevenueBucket[] = [];
  const monthIndex = new Map<string, RevenueBucket>();
  for (let i = CHART_MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const bucket = emptyBucket(monthKey(d), formatMonthLabel(d.getFullYear(), d.getMonth()));
    months.push(bucket);
    monthIndex.set(bucket.key, bucket);
  }

  const categoryIndex = new Map<string, RevenueBucket>();
  const sellerIndex = new Map<string, RevenueBySeller>();

  let total = 0;
  let count = 0;
  let unpriced = 0;
  let best = 0;

  for (const sale of sales) {
    const price = sale.priceEur;
    const sold = new Date(sale.soldAt);

    count += 1;
    if (price === null) {
      unpriced += 1;
    } else {
      total += price;
      if (price > best) best = price;
    }

    // An unparseable timestamp still counts towards the totals; it just
    // cannot land in a calendar bucket.
    if (!Number.isNaN(sold.getTime())) {
      const key = monthKey(sold);
      if (key === currentKey) add(thisMonth, price);
      if (key === previousKey) add(previousMonth, price);
      if (String(sold.getFullYear()) === yearKey) add(thisYear, price);

      const windowed = monthIndex.get(key);
      if (windowed) add(windowed, price);
    }

    const categoryName = sale.categoryName ?? NO_CATEGORY;
    const category = categoryIndex.get(categoryName) ?? emptyBucket(categoryName, categoryName);
    add(category, price);
    categoryIndex.set(categoryName, category);

    if (scope === "all") {
      const seller = sellerIndex.get(sale.sellerId) ?? {
        sellerId: sale.sellerId,
        sellerName: sale.sellerName || NO_CATEGORY,
        total: 0,
        count: 0,
      };
      seller.count += 1;
      if (price !== null) seller.total += price;
      sellerIndex.set(sale.sellerId, seller);
    }
  }

  const priced = count - unpriced;

  return {
    scope,
    total,
    count,
    unpriced,
    average: priced > 0 ? Math.round(total / priced) : 0,
    best,
    thisMonth,
    previousMonth,
    thisYear,
    months,
    categories: [...categoryIndex.values()].sort((a, b) => b.total - a.total),
    sellers: [...sellerIndex.values()].sort((a, b) => b.total - a.total),
    recent: sales.slice(0, RECENT_LIMIT),
  };
}
