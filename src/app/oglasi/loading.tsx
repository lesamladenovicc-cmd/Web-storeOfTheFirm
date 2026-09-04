import { COPY } from "@/config/copy";
import { Container } from "@/components/layout/Container";
import { PageBanner } from "@/components/layout/PageBanner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ListingGridSkeleton, Skeleton } from "@/components/ui/Feedback";

/**
 * Skeleton geometry mirrors the real page so the swap does not shift
 * layout. No spinner on a content area.
 */
export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageBanner
          tag={COPY.home.heroEyebrow}
          title={COPY.listings.title}
          lead={COPY.listings.subtitle}
          crumbs={[
            { name: COPY.listing.breadcrumbHome, path: "/" },
            { name: COPY.listing.breadcrumbListings, path: "/oglasi" },
          ]}
          meta={<Skeleton className="h-3 w-40" />}
        >
          <Skeleton className="h-14 w-full" />
        </PageBanner>

        <section className="theme-light">
          <Container className="py-10 sm:py-14">
            <Skeleton className="h-72" />
            <div className="mt-10">
              <ListingGridSkeleton count={8} />
            </div>
          </Container>
        </section>
      </main>
    </>
  );
}
