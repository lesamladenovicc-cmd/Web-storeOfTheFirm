import type { ReactNode } from "react";
import { COPY } from "@/config/copy";
import { Container } from "./Container";
import { PageBanner } from "./PageBanner";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/**
 * Shared shell for the static content pages: dark banner, beige body.
 * Body copy is capped at 68ch — past that, line length hurts readability.
 */
export function ProsePage({
  eyebrow,
  title,
  lead,
  paragraphs,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  paragraphs?: readonly string[];
  children?: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="sadrzaj">
        <PageBanner
          tag={eyebrow}
          title={title}
          lead={lead}
          crumbs={[
            { name: COPY.listing.breadcrumbHome, path: "/" },
            { name: title, path: "#" },
          ]}
        />

        <section className="theme-light">
          <Container className="py-14 sm:py-20 lg:py-24">
            {paragraphs?.length ? (
              <div className="text-fg-muted max-w-[68ch] space-y-5 text-[1.0625rem] leading-relaxed">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : null}

            {children ? (
              <div className={paragraphs?.length ? "mt-12" : undefined}>{children}</div>
            ) : null}
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
