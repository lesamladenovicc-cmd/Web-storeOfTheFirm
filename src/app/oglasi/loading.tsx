import { COPY } from "@/config/copy";
import { Container, PageHeader } from "@/components/layout/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ListingGridSkeleton, Skeleton } from "@/components/ui/Feedback";

/**
 * Skeleton geometry mirrors the real grid so the swap does not shift
 * layout. No spinner on a content area.
 */
export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12 sm:py-16">
          <PageHeader
            eyebrow={COPY.home.heroEyebrow}
            title={COPY.listings.title}
            subtitle={COPY.listings.subtitle}
          />
          <Skeleton className="mt-9 h-12 max-w-2xl" />
          <Skeleton className="mt-6 h-52 rounded-md" />
          <Skeleton className="mt-6 h-5 w-40" />
          <div className="mt-8">
            <ListingGridSkeleton count={8} />
          </div>
        </Container>
      </main>
    </>
  );
}
