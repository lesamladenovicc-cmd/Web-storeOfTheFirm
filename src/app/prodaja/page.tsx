import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { Crumb } from "@/components/layout/Breadcrumbs";
import { ListingsBrowser } from "@/components/listing/ListingsBrowser";
import { parseFilters, type RawSearchParams } from "@/lib/filters";
import { buildMetadata } from "@/lib/seo";

/**
 * The sale facet, canonical to itself — the indexable twin of
 * /oglasi?namena=prodaja, which is noindex.
 *
 * SSR for the same reason as /kategorija/[slug]: it reads searchParams,
 * which opts the route out of static generation, so `revalidate` here
 * would be inert rather than helpful.
 */
const PAGE = COPY.listings.purposePages.prodaja;

export const metadata: Metadata = buildMetadata({
  title: PAGE.title,
  description: PAGE.meta,
  path: "/prodaja",
});

export default async function SalePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  // The route owns the purpose; ?namena= must not override it.
  const filters = { ...parseFilters(await searchParams), purpose: "prodaja" as const };

  const crumbs: Crumb[] = [
    { name: COPY.listing.breadcrumbHome, path: "/" },
    { name: PAGE.title, path: "/prodaja" },
  ];

  return (
    <>
      <SiteHeader />
      <ListingsBrowser
        filters={filters}
        basePath="/prodaja"
        tag={PAGE.tag}
        title={PAGE.title}
        lead={PAGE.lead}
        listDescription={PAGE.meta}
        crumbs={crumbs}
        showPurpose={false}
        showSearch
        owns={["purpose"]}
      />
      <SiteFooter />
    </>
  );
}
