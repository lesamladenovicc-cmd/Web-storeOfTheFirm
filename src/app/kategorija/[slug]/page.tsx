import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COPY } from "@/config/copy";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { Crumb } from "@/components/layout/Breadcrumbs";
import { ListingsBrowser } from "@/components/listing/ListingsBrowser";
import { getCategoryBySlug } from "@/lib/data/categories";
import { parseFilters, type RawSearchParams } from "@/lib/filters";
import { buildMetadata } from "@/lib/seo";

/**
 * The money keyword pages ("stanovi u novogradnji Vračar"): indexable and
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

  const basePath = `/kategorija/${category.slug}`;
  const crumbs: Crumb[] = [
    { name: COPY.listing.breadcrumbHome, path: "/" },
    { name: COPY.listing.breadcrumbListings, path: "/oglasi" },
    { name: category.name, path: basePath },
  ];

  return (
    <>
      <SiteHeader />
      <ListingsBrowser
        filters={filters}
        basePath={basePath}
        tag={COPY.listings.category}
        title={category.name}
        lead={category.description ?? undefined}
        listDescription={category.description || undefined}
        crumbs={crumbs}
        showCategory={false}
        owns={["categorySlug"]}
      />
      <SiteFooter />
    </>
  );
}
