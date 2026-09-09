import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { Container } from "@/components/layout/Container";
import { PageBanner } from "@/components/layout/PageBanner";
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
import { breadcrumbJsonLd, buildMetadata, itemListJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

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

  const [result, categories] = await Promise.all([searchListings(filters), getActiveCategories()]);

  const filtered = hasActiveFilters(filters);
  const categoryName = categories.find((c) => c.slug === filters.categorySlug)?.name;

  return (
    <>
      <SiteHeader />

      <main id="sadrzaj">
        <PageBanner
          tag={COPY.home.heroEyebrow}
          title={COPY.listings.title}
          lead={COPY.listings.subtitle}
          crumbs={[
            { name: COPY.listing.breadcrumbHome, path: "/" },
            { name: COPY.listing.breadcrumbListings, path: "/oglasi" },
          ]}
          meta={
            <p className="u-eyebrow text-fg-muted">
              {COPY.listings.resultsPrefix} {countWithNoun(result.total, "nekretnina")}
            </p>
          }
        >
          <SearchBar defaultValue={filters.q ?? ""} />
        </PageBanner>

        <section className="theme-light">
          <Container className="py-10 sm:py-14">
            <FilterBar filters={filters} categories={categories} />

            <FilterChips filters={filters} categoryName={categoryName} />

            <div className="mt-10">
              <ListingGrid listings={result.items} filtered={filtered} />
            </div>

            <Pagination page={result.page} pageCount={result.pageCount} filters={filters} />
          </Container>
        </section>
      </main>

      {/* Emitted on the bare /oglasi only. A filtered view is noindex
          (see shouldNoIndex), and handing a crawler a catalogue listing
          for a page we are asking it not to index is a mixed signal. */}
      {!filtered && result.page === 1 ? (
        <JsonLd
          data={[
            itemListJsonLd({
              listings: result.items,
              path: "/oglasi",
              name: COPY.listings.title,
              description: COPY.listings.subtitle,
              total: result.total,
            }),
            breadcrumbJsonLd([
              { name: COPY.listing.breadcrumbHome, path: "/" },
              { name: COPY.listing.breadcrumbListings, path: "/oglasi" },
            ]),
          ]}
        />
      ) : null}

      <SiteFooter />
    </>
  );
}
