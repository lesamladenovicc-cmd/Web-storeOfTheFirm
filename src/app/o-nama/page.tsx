import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { ProsePage } from "@/components/layout/ProsePage";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, faqJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: COPY.pages.about.title,
  description: COPY.pages.about.lead,
  path: "/o-nama",
});

/**
 * About + FAQ on one page.
 *
 * The FAQ lives here rather than on its own route because it is the same
 * question a visitor is already asking ("who are these people and how
 * does buying from them work"), and one page with both ranks better than
 * two thin ones. `#pitanja` is linked from the footer.
 *
 * The Q&A is also the block answer engines quote most readily, so it is
 * rendered as a real <dl> AND emitted as FAQPage — the visible text and
 * the markup come from the same COPY entries and cannot drift.
 */
export default function AboutPage() {
  const faq = COPY.pages.faq;

  return (
    <>
      <ProsePage
        eyebrow={COPY.home.heroEyebrow}
        title={COPY.pages.about.title}
        lead={COPY.pages.about.lead}
        paragraphs={COPY.pages.about.body}
      >
        {/* Two columns from lg up: the prose above is capped at 68ch and
            leaves half the page empty, and a ten-item Q&A stacked under
            it in the same narrow measure reads as an appendix. The
            heading holds the left rail — sticky, so it stays with the
            questions on the way down — and the list takes the width. */}
        <section
          id="pitanja"
          className="border-line scroll-mt-24 border-t pt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16"
        >
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-h2 text-fg">{faq.title}</h2>
          </div>

          <dl className="mt-8 lg:mt-0">
            {faq.items.map((item) => (
              <div key={item.q} className="border-line border-t py-6 first:border-t-0 first:pt-0">
                <dt className="text-fg text-lg font-semibold">{item.q}</dt>
                <dd className="text-fg-muted mt-2.5 max-w-[62ch] leading-relaxed">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </ProsePage>

      <JsonLd data={faqJsonLd(faq.items)} />
    </>
  );
}
