import Link from "next/link";
import { COPY } from "@/config/copy";
import { CONDITION_LABELS, LISTING_CONDITIONS, SORT_LABELS, SORT_OPTIONS } from "@/config/taxonomy";
import { Button } from "@/components/ui/Button";
import { PARAM, activeChips, buildUrl, hasActiveFilters } from "@/lib/filters";
import type { Category, ListingFilters } from "@/types/domain";

/**
 * Server-rendered filter panel. It is a plain GET <form>, so filtering
 * works with JavaScript disabled and every result set has a real URL.
 * `basePath` lets the same component drive /oglasi and /kategorija/[slug].
 *
 * Controls sit on the ground colour inside a panel plate — on beige that
 * reads as recessed fields cut into a sheet of paper.
 */
const CONTROL =
  "h-12 w-full border border-line bg-ground px-3.5 font-sans text-sm text-fg transition-colors placeholder:text-fg-faint hover:border-line-strong focus:border-fg focus:outline-none";

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
  const active = hasActiveFilters(filters);

  return (
    <form action={basePath} method="get" className="u-tab border-line bg-panel border">
      <div className="border-line flex items-center justify-between gap-4 border-b px-5 py-3 sm:px-6">
        <p className="u-eyebrow text-fg-muted">{COPY.listings.filters}</p>
        {active ? (
          <Link
            href={basePath}
            className="u-eyebrow text-fg-muted hover:text-fg underline underline-offset-4 transition-colors"
          >
            {COPY.listings.clearFilters}
          </Link>
        ) : null}
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {showCategory ? (
            <div>
              <label htmlFor="filter-category" className="u-eyebrow text-fg-muted mb-2.5 block">
                {COPY.listings.category}
              </label>
              <select
                id="filter-category"
                name={PARAM.category}
                defaultValue={filters.categorySlug ?? ""}
                className={`${CONTROL} cursor-pointer`}
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
            <label htmlFor="filter-location" className="u-eyebrow text-fg-muted mb-2.5 block">
              {COPY.listings.location}
            </label>
            <input
              id="filter-location"
              type="text"
              name={PARAM.location}
              defaultValue={filters.location ?? ""}
              placeholder={COPY.listings.locationPlaceholder}
              className={CONTROL}
            />
          </div>

          <div>
            <span className="u-eyebrow text-fg-muted mb-2.5 block">{COPY.listings.price}</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                name={PARAM.priceMin}
                defaultValue={filters.priceMin ?? ""}
                aria-label={COPY.listings.priceFrom}
                placeholder={COPY.common.from}
                className={`${CONTROL} u-numeric`}
              />
              <span aria-hidden="true" className="text-fg-faint">
                &ndash;
              </span>
              <input
                type="text"
                inputMode="numeric"
                name={PARAM.priceMax}
                defaultValue={filters.priceMax ?? ""}
                aria-label={COPY.listings.priceTo}
                placeholder={COPY.common.to}
                className={`${CONTROL} u-numeric`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="filter-sort" className="u-eyebrow text-fg-muted mb-2.5 block">
              {COPY.listings.sort}
            </label>
            <select
              id="filter-sort"
              name={PARAM.sort}
              defaultValue={filters.sort ?? SORT_OPTIONS[0]}
              className={`${CONTROL} cursor-pointer`}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="u-eyebrow text-fg-muted mb-3">{COPY.listings.condition}</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2.5">
            {LISTING_CONDITIONS.map((c) => (
              <label
                key={c}
                className="text-fg-muted hover:text-fg flex cursor-pointer items-center gap-2.5 text-sm transition-colors"
              >
                <input
                  type="checkbox"
                  name={PARAM.condition}
                  value={c}
                  defaultChecked={selected.has(c)}
                  className="border-line-strong bg-ground checked:border-signal checked:bg-signal h-4 w-4 cursor-pointer appearance-none border transition-colors"
                />
                {CONDITION_LABELS[c]}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Preserve the query across a filter submit. */}
        {filters.q ? <input type="hidden" name={PARAM.q} value={filters.q} /> : null}

        <div className="border-line mt-6 border-t pt-5">
          <Button type="submit" size="md">
            {COPY.listings.applyFilters}
          </Button>
        </div>
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
            className="u-eyebrow group border-line-strong bg-panel text-fg hover:border-fg hover:bg-fg hover:text-ground inline-flex items-center gap-2 border px-2.5 py-1.5 text-[0.625rem] transition-colors"
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
