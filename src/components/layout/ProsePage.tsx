import type { ReactNode } from "react";
import { Container, PageHeader } from "./Container";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/**
 * Shared shell for the static content pages. Body copy is capped at
 * 68ch — past that, line length hurts readability badly.
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
        <Container className="py-12 sm:py-16">
          <PageHeader eyebrow={eyebrow} title={title} subtitle={lead} />

          {paragraphs?.length ? (
            <div className="mt-10 max-w-[68ch] space-y-5 text-[0.9375rem] leading-relaxed text-paper-muted">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : null}

          {children ? <div className="mt-10">{children}</div> : null}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
