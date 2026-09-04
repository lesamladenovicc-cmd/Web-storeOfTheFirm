import Link from "next/link";
import { COPY } from "@/config/copy";
import { cn } from "@/lib/cn";
import { buildUrl } from "@/lib/filters";
import type { ListingFilters } from "@/types/domain";

/**
 * Server-rendered pagination. Real <a> links, so crawlers can follow
 * them and users can open pages in a new tab.
 *
 * A row of 44px squares in the mono face. The current page is the one
 * "active marker" the accent is allowed to fill.
 */
export function Pagination({
  page,
  pageCount,
  filters,
  basePath = "/oglasi",
}: {
  page: number;
  pageCount: number;
  filters: ListingFilters;
  basePath?: string;
}) {
  if (pageCount <= 1) return null;

  const pages = pageWindow(page, pageCount);

  const linkClass = (active: boolean) =>
    cn(
      "u-numeric inline-flex h-11 w-11 items-center justify-center border text-sm font-medium transition-colors duration-200",
      active
        ? "border-accent bg-accent text-on-accent"
        : "border-line bg-panel text-fg hover:border-fg",
    );

  return (
    <nav aria-label={COPY.listings.page} className="mt-14 flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {page > 1 ? (
            <Link
              href={buildUrl(basePath, filters, { page: page - 1 })}
              rel="prev"
              className={linkClass(false)}
            >
              &larr;<span className="sr-only">{COPY.common.previous}</span>
            </Link>
          ) : (
            <span className={cn(linkClass(false), "opacity-35")} aria-hidden="true">
              &larr;
            </span>
          )}
        </li>

        {pages.map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="u-numeric text-fg-faint px-1">
              &hellip;
            </li>
          ) : (
            <li key={p}>
              <Link
                href={buildUrl(basePath, filters, { page: p })}
                aria-current={p === page ? "page" : undefined}
                className={linkClass(p === page)}
              >
                {p}
              </Link>
            </li>
          ),
        )}

        <li>
          {page < pageCount ? (
            <Link
              href={buildUrl(basePath, filters, { page: page + 1 })}
              rel="next"
              className={linkClass(false)}
            >
              &rarr;<span className="sr-only">{COPY.common.next}</span>
            </Link>
          ) : (
            <span className={cn(linkClass(false), "opacity-35")} aria-hidden="true">
              &rarr;
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

/** First, last, and a window around the current page; null = ellipsis. */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const out: (number | null)[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) out.push(null);
  for (let p = start; p <= end; p++) out.push(p);
  if (end < pageCount - 1) out.push(null);

  out.push(pageCount);
  return out;
}
