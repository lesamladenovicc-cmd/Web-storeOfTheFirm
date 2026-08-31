import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { Container, PageHeader } from "@/components/layout/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { SearchBar } from "@/components/listing/SearchBar";
import { FilterBar, FilterChips } from "@/components/listing/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { getActiveCategories } from "@/lib/data/categories";
import { searchListings } from "@/lib/data/listings";
import { countWithNoun } from "@/lib/format";
import { hasActiveFilters, parseFilters, shouldNoIndex, type RawSearchParams } from "@/lib/filters";
import { buildMetadata } from "@/lib/seo";

/**
 * SSR on every request: reading searchParams makes the route dynamic by
 * definition, and filtered result sets are not worth caching.
 *
 * SEO: the bare /oglasi is indexable and canonical to itself. Any
 * narrowing (q, price, condition, sort, page 2+) emits noindex,follow —
 * crawl the links, index none of the permutations. Category facets are
 * excluded from this rule because they have their own canonical route
 * at /kategorija/[slug].
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const filters = parseFilters(await searchParams);

  return buildMetadata({
    title: COPY.listings.title,
    description: COPY.listings.subtitle,
    path: "/oglasi",
    noIndex: shouldNoIndex(filters),
  });
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseFilters(await searchParams);

  const [result, categories] = await Promise.all([
    searchListings(filters),
    getActiveCategories(),
  ]);

  const filtered = hasActiveFilters(filters);
  const categoryName = categories.find((c) => c.slug === filters.categorySlug)?.name;

  return (
    <>
      <SiteHeader />

      <main id="sadrzaj">
        <Container className="py-12 sm:py-16">
          <PageHeader
            eyebrow={COPY.home.heroEyebrow}
            title={COPY.listings.title}
            subtitle={COPY.listings.subtitle}
          />

          <div className="mt-9 max-w-2xl">
            <SearchBar defaultValue={filters.q ?? ""} />
          </div>

          <div className="mt-6">
            <FilterBar filters={filters} categories={categories} />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="u-numeric text-sm text-paper-muted">
              {COPY.listings.resultsPrefix} {countWithNoun(result.total, "oglas")}
            </p>
            <FilterChips filters={filters} categoryName={categoryName} />
          </div>

          <div className="mt-8">
            <ListingGrid listings={result.items} filtered={filtered} />
          </div>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            filters={filters}
          />
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}
