import Link from "next/link";
import { COPY } from "@/config/copy";
import { LIMITS, SITE } from "@/config/site";
import { Container } from "@/components/layout/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { SearchBar } from "@/components/listing/SearchBar";
import { countWithNoun, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getCategoriesWithCounts } from "@/lib/data/categories";
import { getLatestListings, searchListings } from "@/lib/data/listings";
import { parseFilters } from "@/lib/filters";

/** ISR: 5 minutes. See the ISR POLICY table in @/config/site. */
export const revalidate = 300;

/** Small mono tag, large heading, optional lead — every section opener. */
function SectionTitle({ tag, title, subtitle }: { tag: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{tag}</Eyebrow>
      <h2 className="text-banner text-fg mt-5">{title}</h2>
      {subtitle ? <p className="text-fg-muted mt-4 text-lg leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}

export default async function HomePage() {
  const [categories, latest, all] = await Promise.all([
    getCategoriesWithCounts(),
    getLatestListings(LIMITS.homepageListings),
    searchListings(parseFilters({})),
  ]);

  const plate: [string, string][] = [
    [COPY.home.plateListings, formatNumber(all.total)],
    [COPY.home.plateCategories, formatNumber(categories.length)],
    [COPY.home.plateCurrency, SITE.currency],
    [COPY.home.plateCommission, COPY.home.plateCommissionValue],
  ];

  return (
    <>
      <SiteHeader />

      <main id="sadrzaj">
        {/* ---------------- Hero (dark) ---------------- */}
        <section className="theme-dark u-grid u-grain border-line relative overflow-hidden border-b">
          <Container className="relative py-20 sm:py-28 lg:py-32">
            <div className="grid gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] lg:items-end lg:gap-20">
              <div>
                <Eyebrow className="u-reveal" style={{ "--i": 0 } as React.CSSProperties}>
                  {COPY.home.heroEyebrow}
                </Eyebrow>
                <h1
                  className="u-reveal text-display text-fg mt-6 max-w-3xl"
                  style={{ "--i": 1 } as React.CSSProperties}
                >
                  {COPY.home.heroTitle}
                </h1>
                <p
                  className="u-reveal text-fg-muted mt-7 max-w-xl text-lg leading-relaxed"
                  style={{ "--i": 2 } as React.CSSProperties}
                >
                  {COPY.home.heroSubtitle}
                </p>

                <div
                  className="u-reveal mt-10 max-w-2xl"
                  style={{ "--i": 3 } as React.CSSProperties}
                >
                  <SearchBar />
                </div>
              </div>

              {/* The data plate: live figures, set like a nameplate. */}
              <dl
                className="u-marks u-reveal border-line bg-panel/70 grid grid-cols-2 border backdrop-blur-sm"
                style={{ "--i": 4 } as React.CSSProperties}
              >
                <div className="border-line col-span-2 border-b px-6 py-3">
                  <dt className="u-eyebrow text-fg-muted">{COPY.home.plateTitle}</dt>
                  <dd className="sr-only">{SITE.name}</dd>
                </div>
                {plate.map(([label, value], i) => (
                  <div
                    key={label}
                    className={cn(
                      "px-6 py-6",
                      i % 2 === 1 && "border-line border-l",
                      i >= 2 && "border-line border-t",
                    )}
                  >
                    <dt className="u-eyebrow text-fg-faint">{label}</dt>
                    <dd className="u-numeric text-fg mt-3 text-3xl font-semibold tracking-tight">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Container>
        </section>

        {/* ---------------- Categories index (beige) ---------------- */}
        <section className="theme-light border-line border-b">
          <Container className="py-16 sm:py-20 lg:py-24">
            <SectionTitle
              tag={COPY.home.categoriesTag}
              title={COPY.home.categoriesTitle}
              subtitle={COPY.home.categoriesSubtitle}
            />

            <ol className="border-line mt-12 border-t">
              {categories.map((category, i) => (
                <li key={category.id}>
                  <Link
                    href={`/kategorija/${category.slug}`}
                    className="group border-line hover:bg-panel grid grid-cols-[3rem_minmax(0,1fr)_auto] items-baseline gap-x-4 border-b py-5 transition-colors sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:gap-x-6 sm:py-6"
                  >
                    <span className="u-numeric text-fg-faint text-sm">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-h3 text-fg decoration-accent decoration-2 underline-offset-[6px] group-hover:underline">
                      {category.name}
                    </h3>
                    {/* `hidden` + `sm:line-clamp-2` rather than a custom clamp
                        utility: a later `display: -webkit-box` would beat
                        `hidden` at every width and show this on phones. */}
                    <p className="text-fg-muted hidden text-sm leading-relaxed sm:line-clamp-2">
                      {category.description}
                    </p>
                    <span className="u-eyebrow text-fg-faint flex items-center gap-3 whitespace-nowrap">
                      {countWithNoun(category.listingCount, "oglas")}
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-300 ease-[var(--ease-out-quart)] group-hover:translate-x-1"
                      >
                        &rarr;
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* ---------------- Latest listings (beige) ---------------- */}
        <section className="theme-light">
          <Container className="py-16 sm:py-20 lg:py-24">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
              <SectionTitle
                tag={COPY.home.latestTag}
                title={COPY.home.latestTitle}
                subtitle={COPY.home.latestSubtitle}
              />
              <ButtonLink href="/oglasi" variant="secondary" size="md">
                {COPY.home.latestCta}
              </ButtonLink>
            </div>

            <ListingGrid listings={latest} />
          </Container>
        </section>

        {/* ---------------- Trust + CTA (dark) ---------------- */}
        <section className="theme-dark u-grid border-line border-t">
          <Container className="py-16 sm:py-20 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] lg:gap-20">
              <div>
                <Eyebrow>{COPY.home.trustTag}</Eyebrow>
                <h2 className="text-banner text-fg mt-5 max-w-md">{SITE.tagline}</h2>
                <ButtonLink href="/oglasi" variant="primary" size="lg" className="mt-9">
                  {COPY.home.heroCta}
                </ButtonLink>
              </div>

              <ol className="border-line bg-line grid gap-px border sm:grid-cols-3">
                {COPY.home.trust.map((item, i) => (
                  <li key={item.title} className="bg-ground flex flex-col p-6 lg:p-7">
                    <span aria-hidden="true" className="u-numeric text-fg-faint text-sm">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-h4 text-fg mt-8">{item.title}</h3>
                    <p className="text-fg-muted mt-2.5 text-sm leading-relaxed">{item.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
