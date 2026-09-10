import { COPY } from "@/config/copy";
import { Container } from "@/components/layout/Container";
import { PageBanner } from "@/components/layout/PageBanner";
import type { Crumb } from "@/components/layout/Breadcrumbs";
import { ListingGrid } from "./ListingGrid";
import { SearchBar } from "./SearchBar";
import { FilterBar, FilterChips } from "./FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { JsonLd } from "@/components/seo/JsonLd";
import { getActiveCategories } from "@/lib/data/categories";
import { searchListings } from "@/lib/data/listings";
import { countWithNoun } from "@/lib/format";
import { hasActiveFilters } from "@/lib/filters";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";
import type { ListingFilters } from "@/types/domain";

/**
 * The catalogue view, shared by /oglasi, /kategorija/[slug], /prodaja
 * and /izdavanje.
 *
 * These four differ only in what the ROUTE fixes and what it lets the
 * visitor change. Everything else — banner, filter panel, chips, grid,
 * pagination and the ItemList markup — was identical, and with four
 * copies a fix to one would silently miss three.
 *
 * ALWAYS SSR. Reading searchParams opts a route out of static
 * generation, so `revalidate` and `generateStaticParams` on any caller
 * would be inert; see the note in /kategorija/[slug]/page.tsx.
 */
export async function ListingsBrowser({
  filters,
  basePath,
  tag,
  title,
  lead,
  crumbs,
  listName,
  listDescription,
  showCategory = true,
  showPurpose = true,
  showSearch = false,
  owns = [],
}: {
  /** Already merged with whatever the route fixes. */
  filters: ListingFilters;
  basePath: string;
  tag: string;
  title: string;
  lead?: string;
  crumbs: Crumb[];
  /** Name/description for the ItemList node; defaults to title/lead. */
  listName?: string;
  listDescription?: string;
  showCategory?: boolean;
  showPurpose?: boolean;
  showSearch?: boolean;
  /**
   * Filter keys the ROUTE owns rather than the visitor. They are hidden
   * from the chips (there is no "remove" for them — that is a different
   * page) and excluded from the "has the visitor narrowed this?" test
   * that suppresses the ItemList markup.
   */
  owns?: ("categorySlug" | "purpose")[];
}) {
  const [result, categories] = await Promise.all([
    searchListings(filters),
    getActiveCategories(),
  ]);

  const visitorFilters: ListingFilters = { ...filters };
  for (const key of owns) visitorFilters[key] = undefined;

  const filtered = hasActiveFilters(visitorFilters);
  const categoryName = categories.find((c) => c.slug === filters.categorySlug)?.name;

  return (
    <>
      <main id="sadrzaj">
        <PageBanner
          tag={tag}
          title={title}
          lead={lead}
          crumbs={crumbs}
          meta={
            <p className="u-eyebrow text-fg-muted">
              {COPY.listings.resultsPrefix} {countWithNoun(result.total, "nekretnina")}
            </p>
          }
        >
          {showSearch ? <SearchBar defaultValue={filters.q ?? ""} /> : null}
        </PageBanner>

        <section className="theme-light">
          <Container className="py-10 sm:py-14">
            <FilterBar
              filters={filters}
              categories={categories}
              basePath={basePath}
              showCategory={showCategory}
              showPurpose={showPurpose}
            />

            <FilterChips
              filters={visitorFilters}
              categoryName={categoryName}
              basePath={basePath}
            />

            <div className="mt-10">
              <ListingGrid listings={result.items} filtered={filtered} />
            </div>

            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              filters={filters}
              basePath={basePath}
            />
          </Container>
        </section>
      </main>

      {/* The catalogue listing is emitted on the bare page only. A
          narrowed or paged view is noindex, and handing a crawler an
          ItemList for a page we ask it not to index is a mixed signal. */}
      <JsonLd
        data={[
          ...(!filtered && result.page === 1
            ? [
                itemListJsonLd({
                  listings: result.items,
                  path: basePath,
                  name: listName ?? title,
                  description: listDescription ?? lead,
                  total: result.total,
                }),
              ]
            : []),
          breadcrumbJsonLd(crumbs),
        ]}
      />
    </>
  );
}
