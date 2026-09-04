/**
 * FILTERS — the single parser/serializer for listing search params.
 *
 * All filter state lives in the URL, never in React state. That makes
 * results shareable, back-button-correct and server-rendered, and it is
 * what lets /oglasi be a plain server component.
 *
 * Everything arriving here is untrusted: parse defensively and drop
 * anything unrecognised rather than passing it to the database.
 */

import {
  DEFAULT_SORT,
  isListingCondition,
  isSortOption,
  type ListingCondition,
  type SortOption,
} from "@/config/taxonomy";
import { LIMITS, SITE } from "@/config/site";
import { groupDigits } from "./format";
import type { ListingFilters } from "@/types/domain";

/** Serbian param names — they are visible in the URL. */
export const PARAM = {
  q: "q",
  category: "kategorija",
  condition: "stanje",
  priceMin: "cena_od",
  priceMax: "cena_do",
  location: "lokacija",
  sort: "sort",
  page: "strana",
} as const;

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function all(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function parsePositiveInt(value: string | undefined, max: number): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[.\s]/g, "");
  if (!/^\d+$/.test(cleaned)) return undefined;
  const n = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(n) || n < 0 || n > max) return undefined;
  return n;
}

export function parseFilters(params: RawSearchParams): ListingFilters {
  const q = first(params[PARAM.q])?.trim();
  const categorySlug = first(params[PARAM.category])?.trim();
  const location = first(params[PARAM.location])?.trim();

  const conditions = all(params[PARAM.condition]).filter((c): c is ListingCondition =>
    isListingCondition(c),
  );

  const rawSort = first(params[PARAM.sort]);
  const sort: SortOption = isSortOption(rawSort) ? rawSort : DEFAULT_SORT;

  const page = parsePositiveInt(first(params[PARAM.page]), 10_000) ?? 1;

  let priceMin = parsePositiveInt(first(params[PARAM.priceMin]), LIMITS.priceMax);
  let priceMax = parsePositiveInt(first(params[PARAM.priceMax]), LIMITS.priceMax);

  // A reversed range returns nothing and looks broken; swap instead.
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }

  return {
    ...(q ? { q } : {}),
    ...(categorySlug ? { categorySlug } : {}),
    ...(conditions.length ? { conditions } : {}),
    ...(priceMin !== undefined ? { priceMin } : {}),
    ...(priceMax !== undefined ? { priceMax } : {}),
    ...(location ? { location } : {}),
    sort,
    page: Math.max(1, page),
  };
}

/** True when the visitor narrowed the results in any way. */
export function hasActiveFilters(filters: ListingFilters): boolean {
  return Boolean(
    filters.q ||
    filters.categorySlug ||
    filters.conditions?.length ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined ||
    filters.location,
  );
}

/**
 * True when the URL should be marked noindex.
 *
 * Category pages have their own canonical route (/kategorija/[slug]) and
 * are indexable there. Every other narrowing — free-text search, price
 * bands, condition, sort, page 2+ — creates near-duplicate pages, so
 * they get `noindex, follow`: crawl the links, index none of the
 * permutations.
 */
export function shouldNoIndex(filters: ListingFilters): boolean {
  return Boolean(
    filters.q ||
    filters.categorySlug ||
    filters.conditions?.length ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined ||
    filters.location ||
    (filters.sort && filters.sort !== DEFAULT_SORT) ||
    (filters.page ?? 1) > 1,
  );
}

/** Builds a query string, omitting defaults so URLs stay clean. */
export function buildQuery(
  filters: ListingFilters,
  overrides: Partial<ListingFilters> = {},
): string {
  const merged = { ...filters, ...overrides };
  const sp = new URLSearchParams();

  if (merged.q) sp.set(PARAM.q, merged.q);
  if (merged.categorySlug) sp.set(PARAM.category, merged.categorySlug);
  for (const c of merged.conditions ?? []) sp.append(PARAM.condition, c);
  if (merged.priceMin !== undefined) sp.set(PARAM.priceMin, String(merged.priceMin));
  if (merged.priceMax !== undefined) sp.set(PARAM.priceMax, String(merged.priceMax));
  if (merged.location) sp.set(PARAM.location, merged.location);
  if (merged.sort && merged.sort !== DEFAULT_SORT) sp.set(PARAM.sort, merged.sort);
  if ((merged.page ?? 1) > 1) sp.set(PARAM.page, String(merged.page));

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function buildUrl(
  pathname: string,
  filters: ListingFilters,
  overrides: Partial<ListingFilters> = {},
): string {
  return `${pathname}${buildQuery(filters, overrides)}`;
}

/**
 * Removable filter chips. `next` is the filter set with that one
 * constraint dropped, so each chip can render as a plain link.
 */
export type FilterChip = {
  key: string;
  label: string;
  next: ListingFilters;
};

export function activeChips(
  filters: ListingFilters,
  categoryName?: string,
  conditionLabels?: Record<string, string>,
): FilterChip[] {
  const chips: FilterChip[] = [];
  const base = { ...filters, page: 1 };

  if (filters.q) {
    chips.push({ key: "q", label: `„${filters.q}”`, next: { ...base, q: undefined } });
  }

  if (filters.categorySlug) {
    chips.push({
      key: "category",
      label: categoryName ?? filters.categorySlug,
      next: { ...base, categorySlug: undefined },
    });
  }

  for (const c of filters.conditions ?? []) {
    chips.push({
      key: `condition-${c}`,
      label: conditionLabels?.[c] ?? c,
      next: {
        ...base,
        conditions: (filters.conditions ?? []).filter((x) => x !== c),
      },
    });
  }

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    chips.push({
      key: "price",
      label: priceChipLabel(filters.priceMin, filters.priceMax),
      next: { ...base, priceMin: undefined, priceMax: undefined },
    });
  }

  if (filters.location) {
    chips.push({
      key: "location",
      label: filters.location,
      next: { ...base, location: undefined },
    });
  }

  return chips;
}

function priceChipLabel(min: number | undefined, max: number | undefined): string {
  // groupDigits, not toLocaleString — the same server/client determinism
  // requirement that governs every other price string in the app.
  const f = groupDigits;
  const unit = SITE.currencySuffix;
  if (min !== undefined && max !== undefined) return `${f(min)}–${f(max)} ${unit}`;
  if (min !== undefined) return `od ${f(min)} ${unit}`;
  if (max !== undefined) return `do ${f(max)} ${unit}`;
  return "";
}
