import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Container } from "./Container";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

/**
 * The dark band every inner page opens with: breadcrumb trail, a small
 * mono tag, a large heading, an optional lead, and two slots —
 * `meta` (a mono figure pinned to the right, e.g. a result count) and
 * `children` (a control row beneath, e.g. the search bar). The beige
 * body of the page starts under its bottom rule.
 */
export function PageBanner({
  tag,
  title,
  lead,
  crumbs,
  meta,
  children,
}: {
  tag?: string;
  title: string;
  lead?: string;
  crumbs?: Crumb[];
  meta?: ReactNode;
  children?: ReactNode;
}) {
  const hasCrumbs = Boolean(crumbs?.length);

  return (
    <section className="theme-dark u-grid u-glow border-line border-b">
      <Container className="relative py-10 sm:py-14 lg:py-16">
        {hasCrumbs ? <Breadcrumbs items={crumbs!} /> : null}

        <div
          className={cn(
            "flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between",
            hasCrumbs && "mt-10",
          )}
        >
          <div className="max-w-3xl">
            {tag ? <Eyebrow className="mb-5">{tag}</Eyebrow> : null}
            <h1 className="text-banner text-fg">{title}</h1>
            {lead ? (
              <p className="text-fg-muted mt-5 max-w-2xl text-lg leading-relaxed">{lead}</p>
            ) : null}
          </div>

          {meta ? <div className="shrink-0 lg:pb-2">{meta}</div> : null}
        </div>

        {children ? <div className="mt-10 max-w-2xl">{children}</div> : null}
      </Container>
    </section>
  );
}
