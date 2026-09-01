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
import { ConditionBadge } from "@/components/ui/Badge";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getActiveListingSlugs,
  getListingBySlug,
  getRelatedListings,
} from "@/lib/data/listings";
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
    listing.priceRsd === null ? COPY.listing.priceOnRequest : `${formatNumber(listing.priceRsd)} din`;

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

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);

  // Missing and hidden listings are indistinguishable — both 404.
  if (!listing) notFound();

  const related = await getRelatedListings(listing.categorySlug, listing.id);

  const crumbs: Crumb[] = [
    { name: COPY.listing.breadcrumbHome, path: "/" },
    { name: COPY.listing.breadcrumbListings, path: "/oglasi" },
    ...(listing.categoryName && listing.categorySlug
      ? [{ name: listing.categoryName, path: `/kategorija/${listing.categorySlug}` }]
      : []),
    { name: truncate(listing.title, 40), path: `/oglas/${listing.slug}` },
  ];

  return (
    <>
      <SiteHeader />

      <main id="sadrzaj">
        <Container className="py-8 sm:py-12">
          <Breadcrumbs items={crumbs} />

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
            {/* ---------------- Left: gallery + copy ---------------- */}
            <div className="min-w-0">
              <ListingGallery images={listing.images} title={listing.title} />

              <div className="mt-8">
                <div className="flex flex-wrap items-center gap-3">
                  <ConditionBadge condition={listing.condition} />
                  {listing.categoryName && listing.categorySlug ? (
                    <Link
                      href={`/kategorija/${listing.categorySlug}`}
                      className="u-eyebrow text-paper-faint transition-colors hover:text-accent"
                    >
                      {listing.categoryName}
                    </Link>
                  ) : null}
                </div>

                <h1 className="mt-4 text-h1 text-paper">{listing.title}</h1>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <PriceTag
                    price={listing.priceRsd}
                    isNegotiable={listing.isNegotiable}
                    size="lg"
                  />
                  <ShareButton title={listing.title} />
                </div>

                <dl className="u-numeric mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 text-sm sm:grid-cols-4">
                  <Detail label={COPY.listing.conditionLabel}>
                    {CONDITION_LABELS[listing.condition]}
                  </Detail>
                  {listing.location ? (
                    <Detail label={COPY.listing.locationLabel}>{listing.location}</Detail>
                  ) : null}
                  {listing.publishedAt ? (
                    <Detail label={COPY.listing.publishedOn}>
                      {formatDate(listing.publishedAt)}
                    </Detail>
                  ) : null}
                  <Detail label={COPY.listing.referenceLabel}>
                    {listing.id.slice(0, 8).toUpperCase()}
                  </Detail>
                </dl>

                <section className="mt-9">
                  <h2 className="u-eyebrow mb-4 text-paper-faint">
                    {COPY.listing.descriptionTitle}
                  </h2>
                  {/* whitespace-pre-line preserves the seller's line
                      breaks; React escapes the content. */}
                  <div className="max-w-[68ch] whitespace-pre-line text-[0.9375rem] leading-relaxed text-paper-muted">
                    {listing.description}
                  </div>
                </section>
              </div>
            </div>

            {/* ---------------- Right: sticky contact ---------------- */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <ContactPanel listing={listing} />
            </div>
          </div>

          {related.length > 0 ? (
            <section className="mt-20 border-t border-border pt-12">
              <h2 className="mb-7 text-h2 text-paper">{COPY.listing.relatedTitle}</h2>
              <ListingGrid listings={related} priorityCount={0} />
            </section>
          ) : null}
        </Container>
      </main>

      <SiteFooter />

      <JsonLd data={[productJsonLd(listing), breadcrumbJsonLd(crumbs)]} />
      {/* Counts one view per visitor; the page body is ISR-cached. */}
      <ViewTracker listingId={listing.id} />
    </>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="u-eyebrow mb-1.5 text-paper-faint">{label}</dt>
      <dd className="text-paper">{children}</dd>
    </div>
  );
}
