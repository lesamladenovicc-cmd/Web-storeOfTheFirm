import { describe, expect, it } from "vitest";
import { CHART_MONTHS, monthKey, summarizeRevenue, type SaleRecord } from "./revenue";

/**
 * The money maths. Every case here is one the dashboard would otherwise
 * get wrong silently — a "Po dogovoru" sale counted as 0 dinars still
 * renders a plausible-looking number.
 */

// Mid-month so month arithmetic never straddles a boundary by accident.
const NOW = new Date(2026, 8, 15, 12, 0, 0); // 15.09.2026.

function sale(over: Partial<SaleRecord> & { soldAt: string }): SaleRecord {
  return {
    id: over.soldAt + (over.title ?? ""),
    slug: "oglas",
    title: "Oglas",
    priceEur: 100_000,
    sellerId: "seller-a",
    sellerName: "Prodavac A",
    categoryName: "Mašine",
    ...over,
  };
}

/** Local ISO so the fixtures are not shifted by the runner's timezone. */
function localIso(y: number, m: number, d: number): string {
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

describe("summarizeRevenue — totals", () => {
  it("sums prices and counts sales", () => {
    const r = summarizeRevenue(
      [
        sale({ soldAt: localIso(2026, 9, 10), priceEur: 1_500_000 }),
        sale({ soldAt: localIso(2026, 9, 2), priceEur: 320_000 }),
      ],
      "own",
      NOW,
    );

    expect(r.total).toBe(1_820_000);
    expect(r.count).toBe(2);
    expect(r.best).toBe(1_500_000);
    expect(r.average).toBe(910_000);
  });

  it("counts an unpriced sale but keeps it out of every sum", () => {
    const r = summarizeRevenue(
      [
        sale({ soldAt: localIso(2026, 9, 10), priceEur: 1_000_000 }),
        sale({ soldAt: localIso(2026, 9, 9), priceEur: null }),
      ],
      "own",
      NOW,
    );

    expect(r.count).toBe(2);
    expect(r.unpriced).toBe(1);
    expect(r.total).toBe(1_000_000);
    // The average is over PRICED sales — 500.000 would be the bug.
    expect(r.average).toBe(1_000_000);
  });

  it("returns zeroes, not NaN, when every sale is unpriced", () => {
    const r = summarizeRevenue(
      [sale({ soldAt: localIso(2026, 9, 1), priceEur: null })],
      "own",
      NOW,
    );

    expect(r.total).toBe(0);
    expect(r.average).toBe(0);
    expect(r.best).toBe(0);
    expect(r.count).toBe(1);
  });

  it("handles an empty record", () => {
    const r = summarizeRevenue([], "own", NOW);

    expect(r.total).toBe(0);
    expect(r.count).toBe(0);
    expect(r.average).toBe(0);
    expect(r.months).toHaveLength(CHART_MONTHS);
    expect(r.recent).toEqual([]);
  });
});

describe("summarizeRevenue — periods", () => {
  const sales = [
    sale({ soldAt: localIso(2026, 9, 12), priceEur: 500_000 }), // this month
    sale({ soldAt: localIso(2026, 9, 1), priceEur: 100_000 }), // this month
    sale({ soldAt: localIso(2026, 8, 20), priceEur: 900_000 }), // last month
    sale({ soldAt: localIso(2026, 1, 5), priceEur: 40_000 }), // this year
    sale({ soldAt: localIso(2025, 11, 3), priceEur: 7_000 }), // last year
  ];

  it("splits this month, last month and this year", () => {
    const r = summarizeRevenue(sales, "own", NOW);

    expect(r.thisMonth.total).toBe(600_000);
    expect(r.thisMonth.count).toBe(2);
    expect(r.previousMonth.total).toBe(900_000);
    expect(r.thisYear.total).toBe(1_540_000);
    expect(r.thisYear.count).toBe(4);
  });

  it("labels the periods in Serbian", () => {
    const r = summarizeRevenue(sales, "own", NOW);

    expect(r.thisMonth.label).toBe("septembar 2026.");
    expect(r.previousMonth.label).toBe("avgust 2026.");
    expect(r.thisYear.label).toBe("2026.");
  });

  it("rolls the previous month back across a year boundary", () => {
    const january = new Date(2026, 0, 20, 12, 0, 0);
    const r = summarizeRevenue(
      [sale({ soldAt: localIso(2025, 12, 28), priceEur: 250_000 })],
      "own",
      january,
    );

    expect(r.previousMonth.key).toBe("2025-12");
    expect(r.previousMonth.total).toBe(250_000);
    // ...and December 2025 is not part of the 2026 total.
    expect(r.thisYear.total).toBe(0);
  });
});

describe("summarizeRevenue — the chart window", () => {
  it("always yields twelve buckets, oldest first", () => {
    const r = summarizeRevenue([], "own", NOW);

    expect(r.months).toHaveLength(12);
    expect(r.months[0]!.key).toBe("2025-10");
    expect(r.months.at(-1)!.key).toBe("2026-09");
    expect(r.months[0]!.label).toBe("okt 25");
    expect(r.months.at(-1)!.label).toBe("sep 26");
  });

  it("keeps empty months as zero buckets rather than dropping them", () => {
    const r = summarizeRevenue(
      [sale({ soldAt: localIso(2026, 9, 3), priceEur: 80_000 })],
      "own",
      NOW,
    );

    expect(r.months.filter((m) => m.total === 0)).toHaveLength(11);
    expect(r.months.at(-1)!.total).toBe(80_000);
  });

  it("ignores sales older than the window without losing them from the total", () => {
    const r = summarizeRevenue(
      [
        sale({ soldAt: localIso(2026, 9, 3), priceEur: 80_000 }),
        sale({ soldAt: localIso(2023, 4, 3), priceEur: 5_000_000 }),
      ],
      "own",
      NOW,
    );

    expect(r.months.reduce((sum, m) => sum + m.total, 0)).toBe(80_000);
    expect(r.total).toBe(5_080_000);
  });
});

describe("summarizeRevenue — breakdowns", () => {
  const mixed = [
    sale({
      soldAt: localIso(2026, 9, 12),
      priceEur: 500_000,
      sellerId: "a",
      sellerName: "Prodavac A",
      categoryName: "Mašine",
    }),
    sale({
      soldAt: localIso(2026, 9, 11),
      priceEur: 2_000_000,
      sellerId: "b",
      sellerName: "Prodavac B",
      categoryName: "Alati",
    }),
    sale({
      soldAt: localIso(2026, 9, 10),
      priceEur: 300_000,
      sellerId: "a",
      sellerName: "Prodavac A",
      categoryName: "Mašine",
    }),
  ];

  it("groups by seller, biggest first, under scope 'all'", () => {
    const r = summarizeRevenue(mixed, "all", NOW);

    expect(r.sellers).toHaveLength(2);
    expect(r.sellers[0]).toMatchObject({ sellerId: "b", total: 2_000_000, count: 1 });
    expect(r.sellers[1]).toMatchObject({ sellerId: "a", total: 800_000, count: 2 });
  });

  it("omits the seller split entirely under scope 'own'", () => {
    expect(summarizeRevenue(mixed, "own", NOW).sellers).toEqual([]);
  });

  it("groups by category, biggest first", () => {
    const r = summarizeRevenue(mixed, "all", NOW);

    expect(r.categories.map((c) => c.label)).toEqual(["Alati", "Mašine"]);
    expect(r.categories[1]!.count).toBe(2);
  });

  it("labels a sale with no category rather than dropping it", () => {
    const r = summarizeRevenue(
      [sale({ soldAt: localIso(2026, 9, 4), priceEur: 1000, categoryName: null })],
      "own",
      NOW,
    );

    expect(r.categories).toHaveLength(1);
    expect(r.categories[0]!.label).toBe("—");
  });
});

describe("summarizeRevenue — recent list", () => {
  it("takes the first ten in the order given", () => {
    const sales = Array.from({ length: 14 }, (_, i) =>
      sale({ soldAt: localIso(2026, 9, 14 - i), title: `Oglas ${i}` }),
    );
    const r = summarizeRevenue(sales, "own", NOW);

    expect(r.recent).toHaveLength(10);
    expect(r.recent[0]!.title).toBe("Oglas 0");
    expect(r.recent.at(-1)!.title).toBe("Oglas 9");
  });

  it("survives an unparseable sale date", () => {
    const r = summarizeRevenue([sale({ soldAt: "not-a-date", priceEur: 250_000 })], "own", NOW);

    // Counted in the totals, absent from every calendar bucket.
    expect(r.total).toBe(250_000);
    expect(r.count).toBe(1);
    expect(r.thisMonth.count).toBe(0);
    expect(r.months.every((m) => m.count === 0)).toBe(true);
  });
});

describe("monthKey", () => {
  it("zero-pads the month", () => {
    expect(monthKey(new Date(2026, 0, 31))).toBe("2026-01");
    expect(monthKey(new Date(2026, 11, 1))).toBe("2026-12");
  });
});
