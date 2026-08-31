import Link from "next/link";
import { COPY } from "@/config/copy";
import { LIMITS, SITE } from "@/config/site";
import { Container } from "@/components/layout/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ButtonLink } from "@/components/ui/Button";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { SearchBar } from "@/components/listing/SearchBar";
import { countWithNoun } from "@/lib/format";
import { MOCK_CATEGORIES, MOCK_LISTINGS } from "@/lib/data/mock";

/** ISR: 5 minutes. See the ISR POLICY table in @/config/site. */
export const revalidate = 300;

export default function HomePage() {
  // TODO(M2.10): swap for getActiveListings() / getCategoriesWithCounts().
  const categories = MOCK_CATEGORIES;
  const latest = MOCK_LISTINGS.slice(0, LIMITS.homepageListings);

  return (
    <>
      <SiteHeader />

      <main id="sadrzaj">
        {/* ---------------- Hero ---------------- */}
        <section className="u-grain relative overflow-hidden border-b border-border">
          <Container className="relative py-20 sm:py-28">
            <div className="max-w-3xl">
              <p className="u-eyebrow u-reveal text-accent" style={{ "--i": 0 } as React.CSSProperties}>
                {COPY.home.heroEyebrow}
              </p>
              <h1
                className="u-reveal mt-5 text-display text-paper"
                style={{ "--i": 1 } as React.CSSProperties}
              >
                {COPY.home.heroTitle}
              </h1>
              <p
                className="u-reveal mt-6 max-w-xl text-lg leading-relaxed text-paper-muted"
                style={{ "--i": 2 } as React.CSSProperties}
              >
                {COPY.home.heroSubtitle}
              </p>

              <div
                className="u-reveal mt-9 max-w-xl"
                style={{ "--i": 3 } as React.CSSProperties}
              >
                <SearchBar />
              </div>
            </div>

            {/* Decorative registration rule — technical-drawing motif. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 right-0 hidden h-full w-px bg-border lg:block lg:right-[22%]"
            />
          </Container>
        </section>

        {/* ---------------- Categories ---------------- */}
        <section className="border-b border-border">
          <Container className="py-16 sm:py-20">
            <div className="flex items-end justify-between gap-6">
              <div>
                <h2 className="text-h2 text-paper">{COPY.home.categoriesTitle}</h2>
                <p className="mt-2 text-paper-muted">{COPY.home.categoriesSubtitle}</p>
              </div>
            </div>

            <ul className="mt-9 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category, i) => (
                <li key={category.id}>
                  <Link
                    href={`/kategorija/${category.slug}`}
                    className="u-reveal group flex h-full flex-col justify-between gap-6 bg-surface p-5 transition-colors duration-200 hover:bg-surface-2"
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <div>
                      <h3 className="font-display text-lg font-semibold text-paper transition-colors group-hover:text-accent">
                        {category.name}
                      </h3>
                      {category.description ? (
                        <p className="u-line-clamp-2 mt-2 text-sm text-paper-muted">
                          {category.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="u-numeric text-xs text-paper-faint">
                      {countWithNoun(category.listingCount, "oglas")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* ---------------- Latest listings ---------------- */}
        <section>
          <Container className="py-16 sm:py-20">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
              <div>
                <h2 className="text-h2 text-paper">{COPY.home.latestTitle}</h2>
                <p className="mt-2 text-paper-muted">{COPY.home.latestSubtitle}</p>
              </div>
              <ButtonLink href="/oglasi" variant="outline" size="sm">
                {COPY.home.latestCta}
              </ButtonLink>
            </div>

            <ListingGrid listings={latest} />
          </Container>
        </section>

        {/* ---------------- Trust strip ---------------- */}
        <section className="border-t border-border bg-surface">
          <Container className="py-16 sm:py-20">
            <ul className="grid gap-10 sm:grid-cols-3">
              {COPY.home.trust.map((item, i) => (
                <li key={item.title}>
                  <span className="u-numeric text-sm text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-paper">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-paper-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="border-t border-border">
          <Container className="py-16 text-center sm:py-20">
            <h2 className="text-h2 text-paper">{SITE.tagline}</h2>
            <ButtonLink href="/oglasi" variant="primary" size="lg" className="mt-7">
              {COPY.home.heroCta}
            </ButtonLink>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
