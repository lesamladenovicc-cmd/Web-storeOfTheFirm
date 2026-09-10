import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ListingsBrowser } from "@/components/listing/ListingsBrowser";
import { parseFilters, shouldNoIndex, type RawSearchParams } from "@/lib/filters";
import { buildMetadata } from "@/lib/seo";

/**
 * SSR on every request: reading searchParams makes the route dynamic by
 * definition, and filtered result sets are not worth caching.
 *
 * SEO: the bare /oglasi is indexable and canonical to itself. Any
 * narrowing (q, price, condition, sort, page 2+) emits noindex,follow —
 * crawl the links, index none of the permutations. The category and
 * purpose facets are in that list too, because each has its own
 * canonical route: /kategorija/[slug], /prodaja and /izdavanje.
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

  return (
    <>
      <SiteHeader />
      <ListingsBrowser
        filters={filters}
        basePath="/oglasi"
        tag={COPY.home.heroEyebrow}
        title={COPY.listings.title}
        lead={COPY.listings.subtitle}
        showSearch
        crumbs={[
          { name: COPY.listing.breadcrumbHome, path: "/" },
          { name: COPY.listing.breadcrumbListings, path: "/oglasi" },
        ]}
      />
      <SiteFooter />
    </>
  );
}
