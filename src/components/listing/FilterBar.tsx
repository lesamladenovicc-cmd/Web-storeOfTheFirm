import Link from "next/link";
import { COPY } from "@/config/copy";
import {
  CONDITION_LABELS,
  LISTING_CONDITIONS,
  SORT_LABELS,
  SORT_OPTIONS,
} from "@/config/taxonomy";
import { PARAM, activeChips, buildUrl, hasActiveFilters } from "@/lib/filters";
import type { Category, ListingFilters } from "@/types/domain";

/**
 * Server-rendered filter panel. It is a plain GET <form>, so filtering
 * works with JavaScript disabled and every result set has a real URL.
 * `basePath` lets the same component drive /oglasi and /kategorija/[slug].
 */
export function FilterBar({
  filters,
  categories,
  basePath = "/oglasi",
  /** Hidden on /kategorija/[slug], where the category is the route. */
  showCategory = true,
}: {
  filters: ListingFilters;
  categories: Category[];
  basePath?: string;
  showCategory?: boolean;
}) {
  const selected = new Set(filters.conditions ?? []);

  return (
    <form
      action={basePath}
      method="get"
      className="rounded-md border border-border bg-surface p-5"
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {showCategory ? (
          <div>
            <label
              htmlFor="filter-category"
              className="u-eyebrow mb-2 block text-paper-faint"
            >
              {COPY.listings.category}
            </label>
            <select
              id="filter-category"
              name={PARAM.category}
              defaultValue={filters.categorySlug ?? ""}
              className="h-10 w-full cursor-pointer rounded-sm border border-border bg-bg px-3 text-sm text-paper hover:border-border-strong focus:border-accent focus:outline-none"
            >
              <option value="">{COPY.listings.allCategories}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="filter-location" className="u-eyebrow mb-2 block text-paper-faint">
            {COPY.listings.location}
          </label>
          <input
            id="filter-location"
            type="text"
            name={PARAM.location}
            defaultValue={filters.location ?? ""}
            placeholder={COPY.listings.locationPlaceholder}
            className="h-10 w-full rounded-sm border border-border bg-bg px-3 text-sm text-paper placeholder:text-paper-faint hover:border-border-strong focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <span className="u-eyebrow mb-2 block text-paper-faint">
            {COPY.listings.price}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              name={PARAM.priceMin}
              defaultValue={filters.priceMin ?? ""}
              aria-label={COPY.listings.priceFrom}
              placeholder={COPY.common.from}
              className="u-numeric h-10 w-full rounded-sm border border-border bg-bg px-3 text-sm text-paper placeholder:text-paper-faint hover:border-border-strong focus:border-accent focus:outline-none"
            />
            <span aria-hidden="true" className="text-paper-faint">
              &ndash;
            </span>
            <input
              type="text"
              inputMode="numeric"
              name={PARAM.priceMax}
              defaultValue={filters.priceMax ?? ""}
              aria-label={COPY.listings.priceTo}
              placeholder={COPY.common.to}
              className="u-numeric h-10 w-full rounded-sm border border-border bg-bg px-3 text-sm text-paper placeholder:text-paper-faint hover:border-border-strong focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="filter-sort" className="u-eyebrow mb-2 block text-paper-faint">
            {COPY.listings.sort}
          </label>
          <select
            id="filter-sort"
            name={PARAM.sort}
            defaultValue={filters.sort ?? SORT_OPTIONS[0]}
            className="h-10 w-full cursor-pointer rounded-sm border border-border bg-bg px-3 text-sm text-paper hover:border-border-strong focus:border-accent focus:outline-none"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="u-eyebrow mb-2.5 text-paper-faint">
          {COPY.listings.condition}
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2.5">
          {LISTING_CONDITIONS.map((c) => (
            <label
              key={c}
              className="flex cursor-pointer items-center gap-2 text-sm text-paper-muted transition-colors hover:text-paper"
            >
              <input
                type="checkbox"
                name={PARAM.condition}
                value={c}
                defaultChecked={selected.has(c)}
                className="h-4 w-4 cursor-pointer appearance-none rounded-xs border border-border-strong bg-bg checked:border-accent checked:bg-accent"
              />
              {CONDITION_LABELS[c]}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Preserve the query across a filter submit. */}
      {filters.q ? <input type="hidden" name={PARAM.q} value={filters.q} /> : null}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-sm bg-accent px-5 text-sm font-medium text-bg transition-colors hover:bg-accent-hover"
        >
          {COPY.listings.applyFilters}
        </button>
        {hasActiveFilters(filters) ? (
          <Link
            href={basePath}
            className="text-sm text-paper-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            {COPY.listings.clearFilters}
          </Link>
        ) : null}
      </div>
    </form>
  );
}

/** Removable chips for the currently applied filters. */
export function FilterChips({
  filters,
  categoryName,
  basePath = "/oglasi",
}: {
  filters: ListingFilters;
  categoryName?: string;
  basePath?: string;
}) {
  const chips = activeChips(filters, categoryName, CONDITION_LABELS);
  if (chips.length === 0) return null;

  return (
    <ul aria-label={COPY.listings.activeFilters} className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={buildUrl(basePath, chip.next)}
            className="group inline-flex items-center gap-2 rounded-xs border border-accent/50 px-2.5 py-1 text-xs text-accent transition-colors hover:bg-accent hover:text-bg"
          >
            {chip.label}
            <span className="sr-only">— {COPY.listings.removeFilter}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 10 10"
              className="h-2.5 w-2.5"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M1 1l8 8M9 1L1 9" strokeLinecap="round" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}
