import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COPY } from "@/config/copy";
import { CONDITION_LABELS } from "@/config/taxonomy";
import { Container } from "@/components/layout/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Breadcrumbs, type Crumb } from "@/components/layout/Breadcrumbs";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ContactPanel } from "@/components/listing/ContactPanel";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { PriceTag } from "@/components/listing/PriceTag";
import { ShareButton } from "@/components/listing/ShareButton";
import { ViewTracker } from "@/components/listing/ViewTracker";
import { Badge, ConditionBadge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { JsonLd } from "@/components/seo/JsonLd";
import { getActiveListingSlugs, getListingBySlug, getRelatedListings } from "@/lib/data/listings";
import { formatDate, formatNumber, truncate } from "@/lib/format";
import { publicImageUrl } from "@/lib/images";
import { breadcrumbJsonLd, buildMetadata, productJsonLd } from "@/lib/seo";

/**
 * The SEO-critical route.
 *
 * SSG at build time for every active listing, ISR at 1 hour, and
 * `dynamicParams` so a listing published after the build renders on its
 * first request. Seller edits additionally call revalidatePath, so the
 * cached copy is never stale after a save.
 *
 * NO loading.tsx IN THIS SEGMENT — deliberately.
 *
 * A Suspense fallback makes the response stream, and once the response
 * headers are committed the status can no longer change. With one here,
 * a deleted or unpublished listing returned HTTP 200 (a soft 404) and
 * rendered the generic root not-found copy instead of this segment's
 * listing-specific not-found.tsx, which never got a chance to mount.
 *
 * Next injects `noindex` on streamed not-found responses, so indexation
 * was not actually at risk — but a real 404 is still the right answer
 * for analytics, for crawlers that flag soft 404s, and for showing the
 * correct message. The skeleton cost nothing to give up: this page is
 * ISR-cached, so it is served from cache and rarely suspends at all.
 *
 * /oglasi keeps its loading.tsx — that route is dynamic SSR, genuinely
 * slow, and has no 404 path.
 */
export const revalidate = 3600; // See the ISR POLICY table in @/config/site.
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getActiveListingSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);

  if (!listing) {
    return buildMetadata({
      title: COPY.states.listingNotFoundTitle,
      path: `/oglas/${slug}`,
      noIndex: true,
    });
  }

  const images = listing.images.slice(0, 4).map((i) => publicImageUrl(i.storagePath));
  const priceLabel =
    listing.priceRsd === null
      ? COPY.listing.priceOnRequest
      : `${formatNumber(listing.priceRsd)} din`;

  return buildMetadata({
    title: `${listing.title} — ${priceLabel}`,
    description: listing.description,
    path: `/oglas/${listing.slug}`,
    images,
    // A sold listing stays reachable but stops competing in search.
    noIndex: listing.status !== "aktivan",
    ...(listing.priceRsd !== null
      ? {
          other: {
            "product:price:amount": String(listing.priceRsd),
            "product:price:currency": "RSD",
          },
        }
      : {}),
  });
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);

  // Missing and hidden listings are indistinguishable — both 404.
  if (!listing) notFound();

  const related = await getRelatedListings(listing.categorySlug, listing.id);
  const isSold = listing.status === "prodato";

  const crumbs: Crumb[] = [
    { name: COPY.listing.breadcrumbHome, path: "/" },
    { name: COPY.listing.breadcrumbListings, path: "/oglasi" },
    ...(listing.categoryName && listing.categorySlug
      ? [{ name: listing.categoryName, path: `/kategorija/${listing.categorySlug}` }]
      : []),
    { name: truncate(listing.title, 40), path: `/oglas/${listing.slug}` },
  ];

  // The spec sheet: label / dotted leader / value.
  const specs: [string, string][] = [
    ...(listing.condition
      ? [[COPY.listing.conditionLabel, CONDITION_LABELS[listing.condition]] as [string, string]]
      : []),
    ...(listing.categoryName
      ? [[COPY.listing.categoryLabel, listing.categoryName] as [string, string]]
      : []),
    ...(listing.location
      ? [[COPY.listing.locationLabel, listing.location] as [string, string]]
      : []),
    ...(listing.publishedAt
      ? [[COPY.listing.publishedOn, formatDate(listing.publishedAt)] as [string, string]]
      : []),
    [COPY.listing.referenceLabel, listing.id.slice(0, 8).toUpperCase()],
  ];

  return (
    <>
      <SiteHeader />

      <main id="sadrzaj">
        {/* ---------------- Title band (dark) ---------------- */}
        <section className="theme-dark u-grid border-line border-b">
          <Container className="py-8 sm:py-10 lg:py-12">
            <Breadcrumbs items={crumbs} />

            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2.5">
              {/* A sold listing stays reachable (inbound links, and it is
                  still useful as a price reference) but must say so before
                  the visitor reads the price. */}
              {isSold ? (
                <Badge tone="danger" dot>
                  {COPY.listing.soldRibbon}
                </Badge>
              ) : null}
              <ConditionBadge condition={listing.condition} />
              {listing.categoryName && listing.categorySlug ? (
                <Link
                  href={`/kategorija/${listing.categorySlug}`}
                  className="u-eyebrow text-fg-faint hover:text-fg transition-colors"
                >
                  {listing.categoryName}
                </Link>
              ) : null}
              {listing.location ? (
                <span className="u-eyebrow text-fg-faint">{listing.location}</span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
              <h1 className="text-h1 text-fg max-w-3xl">{listing.title}</h1>

              <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 lg:flex-col lg:items-end">
                <PriceTag
                  price={listing.priceRsd}
                  isNegotiable={listing.isNegotiable}
                  size="lg"
                  className={isSold ? "line-through opacity-60" : undefined}
                />
                <ShareButton title={listing.title} />
              </div>
            </div>
          </Container>
        </section>

        {/* ---------------- Sheet (beige) ---------------- */}
        <section className="theme-light">
          <Container className="py-10 sm:py-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)] lg:gap-12">
              {/* Left: gallery, spec sheet, description */}
              <div className="min-w-0">
                <ListingGallery images={listing.images} title={listing.title} />

                <section className="mt-12">
                  <Eyebrow>{COPY.listing.detailsTitle}</Eyebrow>
                  <dl className="border-line mt-5 border-t">
                    {specs.map(([label, value]) => (
                      <div key={label} className="border-line flex items-end gap-3 border-b py-3.5">
                        {/* The dotted leader lives inside the <dt> so the
                            group holds nothing but dt/dd. */}
                        <dt className="u-eyebrow text-fg-muted flex min-w-0 flex-1 items-end gap-3">
                          <span className="shrink-0">{label}</span>
                          <span
                            aria-hidden="true"
                            className="border-line-strong mb-1 flex-1 border-b border-dotted"
                          />
                        </dt>
                        <dd className="u-numeric text-fg shrink-0 text-right text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section className="mt-12">
                  <h2 className="text-h2 text-fg">{COPY.listing.descriptionTitle}</h2>
                  {/* whitespace-pre-line preserves the line breaks the
                      seller typed; React escapes the content. */}
                  <div className="text-fg-muted mt-5 max-w-[68ch] text-[1.0625rem] leading-relaxed whitespace-pre-line">
                    {listing.description}
                  </div>
                </section>
              </div>

              {/* Right: sticky contact plate */}
              <div className="lg:sticky lg:top-28 lg:self-start">
                <ContactPanel listing={listing} />
              </div>
            </div>

            {related.length > 0 ? (
              <section className="border-line mt-20 border-t pt-14">
                <Eyebrow>{COPY.listing.categoryLabel}</Eyebrow>
                <h2 className="text-banner text-fg mt-5 mb-10">{COPY.listing.relatedTitle}</h2>
                <ListingGrid listings={related} priorityCount={0} />
              </section>
            ) : null}
          </Container>
        </section>
      </main>

      <SiteFooter />

      <JsonLd data={[productJsonLd(listing), breadcrumbJsonLd(crumbs)]} />
      {/* Counts one view per visitor; the page body is ISR-cached. */}
      <ViewTracker listingId={listing.id} />
    </>
  );
}
