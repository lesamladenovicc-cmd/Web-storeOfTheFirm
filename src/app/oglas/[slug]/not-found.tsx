import { COPY } from "@/config/copy";
import { Container } from "@/components/layout/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EmptyState } from "@/components/ui/Feedback";

export default function ListingNotFound() {
  return (
    <>
      <SiteHeader />
      <main id="sadrzaj">
        <section className="theme-light">
          <Container className="py-20 sm:py-28">
            <EmptyState
              title={COPY.states.listingNotFoundTitle}
              body={COPY.states.listingNotFoundBody}
              action={{ href: "/oglasi", label: COPY.states.listingNotFoundCta }}
            />
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
