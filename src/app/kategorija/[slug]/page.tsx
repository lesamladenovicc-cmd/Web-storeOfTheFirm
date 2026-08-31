import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COPY } from "@/config/copy";
import { Container, PageHeader } from "@/components/layout/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Breadcrumbs, type Crumb } from "@/components/layout/Breadcrumbs";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { FilterBar, FilterChips } from "@/components/listing/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { JsonLd } from "@/components/seo/JsonLd";
import { getActiveCategories, getCategoryBySlug } from "@/lib/data/categories";
import { searchListings } from "@/lib/data/listings";
import { countWithNoun } from "@/lib/format";
import { hasActiveFilters, parseFilters, type RawSearchParams } from "@/lib/filters";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

/**
 * The money keyword pages ("polovne građevinske mašine"): indexable and
 * canonical to themselves, unlike the equivalent /oglasi?kategorija=…
 * URL, which is noindex.
 *
 * RENDERED PER REQUEST, not SSG. The plan called for SSG+ISR here, but
 * this route also has to support filtering and pagination, and reading
 * searchParams opts a route out of static generation — `revalidate` and
 * `generateStaticParams` would have been silently inert. SSR is the
 * honest configuration.
 *
 * No SEO cost: static vs. server-rendered is not a ranking signal, and
 * the markup, metadata and canonical are identical either way. The cost
 * is a database round trip per request, which is negligible at this
 * scale. If category traffic ever justifies caching, the fix is to move
 * pagination into the path (/kategorija/[slug]/strana/[n]) rather than
 * to drop the filters.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return buildMetadata({ path: `/kategorija/${slug}`, noIndex: true });
  }

  return buildMetadata({
    title: category.name,
    description: category.description ?? COPY.listings.subtitle,
    path: `/kategorija/${category.slug}`,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ slug }, rawParams] = await Promise.all([params, searchParams]);

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  // The route owns the category; a query param must not override it.
  const filters = { ...parseFilters(rawParams), categorySlug: category.slug };

  const [result, categories] = await Promise.all([
    searchListings(filters),
    getActiveCategories(),
  ]);

  const basePath = `/kategorija/${category.slug}`;
  const crumbs: Crumb[] = [
    { name: COPY.listing.breadcrumbHome, path: "/" },
    { name: COPY.listing.breadcrumbListings, path: "/oglasi" },
    { name: category.name, path: basePath },
  ];

  // Only non-category narrowing counts as "filtered" here.
  const filtered = hasActiveFilters({ ...filters, categorySlug: undefined });

  return (
    <>
      <SiteHeader />

      <main id="sadrzaj">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs items={crumbs} />

          <PageHeader
            eyebrow={COPY.listings.category}
            title={category.name}
            subtitle={category.description ?? undefined}
          />

          <div className="mt-8">
            <FilterBar
              filters={filters}
              categories={categories}
              basePath={basePath}
              showCategory={false}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="u-numeric text-sm text-paper-muted">
              {COPY.listings.resultsPrefix} {countWithNoun(result.total, "oglas")}
            </p>
            <FilterChips
              filters={{ ...filters, categorySlug: undefined }}
              basePath={basePath}
            />
          </div>

          <div className="mt-8">
            <ListingGrid listings={result.items} filtered={filtered} />
          </div>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            filters={filters}
            basePath={basePath}
          />
        </Container>
      </main>

      <SiteFooter />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}
