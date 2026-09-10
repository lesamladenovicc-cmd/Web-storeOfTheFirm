import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { Crumb } from "@/components/layout/Breadcrumbs";
import { ListingsBrowser } from "@/components/listing/ListingsBrowser";
import { parseFilters, type RawSearchParams } from "@/lib/filters";
import { buildMetadata } from "@/lib/seo";

/**
 * The rental facet, canonical to itself — the indexable twin of
 * /oglasi?namena=izdavanje, which is noindex.
 *
 * This is the page "stanovi za izdavanje Beograd" should land on: the
 * generic /oglasi title cannot compete for it, and a filtered URL is
 * the wrong thing to rank even if it could.
 *
 * SSR for the same reason as /kategorija/[slug] — it reads searchParams.
 */
const PAGE = COPY.listings.purposePages.izdavanje;

export const metadata: Metadata = buildMetadata({
  title: PAGE.title,
  description: PAGE.meta,
  path: "/izdavanje",
});

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  // The route owns the purpose; ?namena= must not override it.
  const filters = { ...parseFilters(await searchParams), purpose: "izdavanje" as const };

  const crumbs: Crumb[] = [
    { name: COPY.listing.breadcrumbHome, path: "/" },
    { name: PAGE.title, path: "/izdavanje" },
  ];

  return (
    <>
      <SiteHeader />
      <ListingsBrowser
        filters={filters}
        basePath="/izdavanje"
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
