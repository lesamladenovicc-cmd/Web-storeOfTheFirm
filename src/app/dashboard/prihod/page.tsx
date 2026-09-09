import type { Metadata } from "next";
import Link from "next/link";
import { COPY } from "@/config/copy";
import { PageHeader } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { requireProfile } from "@/lib/auth";
import { getRevenueOverview } from "@/lib/data/revenue";
import type { RevenueBucket } from "@/lib/revenue";
import {
  countWithNoun,
  formatCompactRsd,
  formatDate,
  formatNumber,
  formatPrice,
  formatRsd,
} from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * /dashboard/prihod — the internal sales record.
 *
 * VISIBILITY: three layers, none of them this file's own doing.
 *   1. proxy.ts bounces anonymous requests to /prijava.
 *   2. The dashboard layout runs requireProfile() and sets
 *      robots: noindex — so this page is never crawled or linked.
 *   3. requireProfile() again here, because a page must not depend on
 *      its layout for authorization.
 * There is no public route, no public component and no sitemap entry
 * that reaches this data.
 *
 * SCOPE: a seller sees only their own sales, an admin sees everyone's
 * plus the per-seller split. That split happens in the QUERY, not in
 * RLS — see the header of lib/data/revenue.ts.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: COPY.dashboard.revenue.title,
  robots: { index: false, follow: false, nocache: true },
};

export default async function RevenuePage() {
  const profile = await requireProfile();
  const revenue = await getRevenueOverview(profile);
  const isAdmin = revenue.scope === "all";
  const R = COPY.dashboard.revenue;

  return (
    <>
      <PageHeader
        eyebrow={COPY.dashboard.title}
        title={isAdmin ? R.titleAll : R.title}
        subtitle={isAdmin ? R.subtitleAll : R.subtitleOwn}
        actions={<Badge tone="warning">{R.internalOnly}</Badge>}
      />

      {revenue.count === 0 ? (
        <div className="mt-9">
          <EmptyState
            title={R.empty}
            body={R.emptyBody}
            action={{ href: "/dashboard/oglasi", label: R.emptyCta }}
          />
        </div>
      ) : (
        <>
          {/* ---- The headline figure, as a spec-sheet plate ---------- */}
          <section className="u-marks border-line bg-panel mt-9 border" aria-label={R.totalLabel}>
            <div className="flex flex-col gap-6 px-6 py-8 sm:px-8 sm:py-10">
              <p className="u-eyebrow text-fg-faint">{R.totalLabel}</p>
              <p className="u-numeric text-fg text-[clamp(2.25rem,1.4rem+3.4vw,4rem)] leading-none font-semibold tracking-tight">
                {formatRsd(revenue.total)}
              </p>
            </div>

            <dl className="border-line grid grid-cols-1 border-t sm:grid-cols-3">
              <StripCell label={R.countLabel} value={formatNumber(revenue.count)} />
              <StripCell label={R.averageLabel} value={formatRsd(revenue.average)} bordered />
              <StripCell label={R.bestLabel} value={formatRsd(revenue.best)} bordered />
            </dl>
          </section>

          {revenue.unpriced > 0 ? (
            <p className="text-fg-muted mt-3 text-sm">
              <span className="u-numeric text-fg">{countWithNoun(revenue.unpriced, "oglas")}</span>{" "}
              {R.unpricedNote}
            </p>
          ) : null}

          {/* ---- Periods -------------------------------------------- */}
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PeriodCard label={R.thisMonth} bucket={revenue.thisMonth} highlight />
            <PeriodCard label={R.previousMonth} bucket={revenue.previousMonth} />
            <PeriodCard label={R.thisYear} bucket={revenue.thisYear} />
          </ul>

          {/* ---- 12-month chart ------------------------------------- */}
          <MonthChart months={revenue.months} currentKey={revenue.thisMonth.key} />

          {/* ---- Breakdowns ----------------------------------------- */}
          <div
            className={cn(
              "mt-10 grid items-start gap-6",
              isAdmin && revenue.sellers.length > 0 ? "lg:grid-cols-2" : "grid-cols-1",
            )}
          >
            {isAdmin && revenue.sellers.length > 0 ? (
              <Panel title={R.sellersTitle}>
                <ShareTable
                  nameHeader={R.colSeller}
                  rows={revenue.sellers.map((s) => ({
                    key: s.sellerId,
                    name: s.sellerName,
                    count: s.count,
                    total: s.total,
                  }))}
                  grandTotal={revenue.total}
                />
              </Panel>
            ) : null}

            <Panel title={R.categoriesTitle}>
              <ShareTable
                nameHeader={R.colCategory}
                rows={revenue.categories.map((c) => ({
                  key: c.key,
                  name: c.label,
                  count: c.count,
                  total: c.total,
                }))}
                grandTotal={revenue.total}
              />
            </Panel>
          </div>

          {/* ---- Recent sales --------------------------------------- */}
          <Panel title={R.recentTitle} className="mt-6">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-line bg-panel border-b text-left">
                  <Th>{R.colListing}</Th>
                  {isAdmin ? <Th>{R.colSeller}</Th> : null}
                  <Th>{R.colSoldAt}</Th>
                  <Th className="text-right">{R.colPrice}</Th>
                </tr>
              </thead>
              <tbody>
                {revenue.recent.map((sale) => (
                  <tr key={sale.id} className="border-line hover:bg-panel border-b last:border-0">
                    <Td>
                      <Link
                        href={`/dashboard/oglasi/${sale.id}/izmena`}
                        className="text-fg hover:text-accent-text font-medium transition-colors"
                      >
                        {sale.title}
                      </Link>
                      {sale.categoryName ? (
                        <p className="u-numeric text-fg-faint mt-0.5 text-xs">
                          {sale.categoryName}
                        </p>
                      ) : null}
                    </Td>
                    {isAdmin ? (
                      <Td className="text-fg-muted whitespace-nowrap">{sale.sellerName ?? "—"}</Td>
                    ) : null}
                    <Td className="u-numeric text-fg-muted whitespace-nowrap">
                      {sale.soldAt ? formatDate(sale.soldAt) : "—"}
                    </Td>
                    <Td className="u-numeric text-fg text-right whitespace-nowrap">
                      {formatPrice(sale.priceRsd)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <p className="text-fg-faint mt-6 text-xs">{R.basisNote}</p>
        </>
      )}

      <p className="u-rule text-fg-faint mt-10 pt-4 text-xs">
        {COPY.dashboard.revenue.internalNote}
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Chart                                                               */
/* ------------------------------------------------------------------ */

/**
 * Twelve columns, hairline baseline, one accent bar for the current
 * month — the only accent on the page that is not an action, and it is
 * the active marker the design system reserves it for.
 *
 * No SVG and no chart library: the shape is a list of proportions, and
 * a list is what screen readers should get. Each column carries its own
 * label + amount as text; the bar itself is decoration.
 */
function MonthChart({ months, currentKey }: { months: RevenueBucket[]; currentKey: string }) {
  const R = COPY.dashboard.revenue;
  const max = Math.max(...months.map((m) => m.total), 0);

  return (
    <section className="border-line bg-panel mt-8 border" aria-label={R.chartTitle}>
      <header className="border-line flex items-baseline justify-between gap-4 border-b px-5 py-4">
        <h2 className="text-h4 text-fg">{R.chartTitle}</h2>
        <p className="u-eyebrow text-fg-faint">{R.chartHint}</p>
      </header>

      {/* Twelve mono month labels need ~34rem before they collide, so
          below that the chart scrolls inside its own panel. The page
          body itself must never scroll sideways. */}
      <div className="overflow-x-auto">
        <ul className="flex min-w-[34rem] items-stretch px-5 pt-8 pb-5">
          {months.map((month) => {
            const isCurrent = month.key === currentKey;
            // A zero month keeps a 2px stub so the axis reads as twelve
            // slots with a gap, not as a shorter axis.
            const height = max > 0 && month.total > 0 ? Math.max(2, (month.total / max) * 100) : 0;

            return (
              <li key={month.key} className="flex min-w-0 flex-1 flex-col">
                <p
                  className={cn(
                    "u-numeric mb-2 text-center text-[0.625rem] whitespace-nowrap",
                    month.total > 0 ? "text-fg-muted" : "text-transparent",
                  )}
                >
                  {month.total > 0 ? formatCompactRsd(month.total) : "·"}
                </p>

                <div className="flex h-40 items-end" aria-hidden="true">
                  <div
                    className={cn(
                      "mx-auto w-[62%] min-w-[6px]",
                      isCurrent ? "bg-signal" : "bg-fg-muted",
                    )}
                    style={{ height: `${height}%` }}
                  />
                </div>

                <p
                  className={cn(
                    "u-eyebrow border-line-strong mt-0 border-t pt-2 text-center",
                    isCurrent ? "text-signal-text" : "text-fg-faint",
                  )}
                >
                  <span className="sr-only">
                    {month.label} — {formatRsd(month.total)}, {countWithNoun(month.count, "oglas")}
                    .{" "}
                  </span>
                  <span aria-hidden="true">{month.label}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Small parts                                                         */
/* ------------------------------------------------------------------ */

/**
 * A slice that holds sales but no recorded amount — every one of them
 * went out "Po dogovoru". "0 din" would read as "sold for nothing";
 * an em dash reads as "amount not stated", which is what happened.
 * A genuinely empty slice still shows 0 din.
 */
function amountLabel(total: number, count: number): string {
  if (total === 0 && count > 0) return "—";
  return formatRsd(total);
}

function StripCell({
  label,
  value,
  bordered = false,
}: {
  label: string;
  value: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-line px-6 py-5 sm:px-8",
        bordered && "border-t sm:border-t-0 sm:border-l",
      )}
    >
      <dt className="u-eyebrow text-fg-faint">{label}</dt>
      <dd className="u-numeric text-fg mt-2 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function PeriodCard({
  label,
  bucket,
  highlight = false,
}: {
  label: string;
  bucket: RevenueBucket;
  highlight?: boolean;
}) {
  return (
    <li className="border-line bg-panel flex flex-col justify-between border p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="u-eyebrow text-fg-faint">{label}</span>
        <span className="u-numeric text-fg-faint text-xs">{bucket.label}</span>
      </div>
      <p
        className={cn(
          "u-numeric mt-5 text-2xl font-semibold",
          highlight && bucket.total > 0 ? "text-accent-text" : "text-fg",
        )}
      >
        {amountLabel(bucket.total, bucket.count)}
      </p>
      <p className="text-fg-muted mt-1 text-xs">{countWithNoun(bucket.count, "oglas")}</p>
    </li>
  );
}

/**
 * A bordered table plate.
 *
 * `min-w-0` is load-bearing. As a grid item the section otherwise takes
 * min-width:auto — the min-content width of the table inside it, 36rem
 * — refuses to shrink, and the whole PAGE scrolls sideways on a phone
 * instead of the table scrolling inside its own overflow container.
 */
function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-line bg-panel min-w-0 border", className)}>
      <header className="border-line border-b px-5 py-4">
        <h2 className="text-h4 text-fg">{title}</h2>
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

type ShareRow = { key: string; name: string; count: number; total: number };

/** Name, sales, revenue and a share bar — used for sellers and categories. */
function ShareTable({
  nameHeader,
  rows,
  grandTotal,
}: {
  nameHeader: string;
  rows: ShareRow[];
  grandTotal: number;
}) {
  const R = COPY.dashboard.revenue;

  return (
    <table className="w-full min-w-[30rem] border-collapse text-sm">
      <thead>
        <tr className="border-line bg-panel border-b text-left">
          <Th>{nameHeader}</Th>
          <Th className="text-right">{R.colSales}</Th>
          <Th className="text-right">{R.colRevenue}</Th>
          <Th className="w-32">{R.colShare}</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const share = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
          return (
            <tr key={row.key} className="border-line hover:bg-panel border-b last:border-0">
              <Td className="text-fg">{row.name}</Td>
              <Td className="u-numeric text-fg-muted text-right">{formatNumber(row.count)}</Td>
              <Td
                className={cn(
                  "u-numeric text-right whitespace-nowrap",
                  row.total === 0 && row.count > 0 ? "text-fg-muted" : "text-fg",
                )}
              >
                {amountLabel(row.total, row.count)}
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="bg-panel-2 h-1.5 w-full" aria-hidden="true">
                    <div className="bg-fg-muted h-full" style={{ width: `${share}%` }} />
                  </div>
                  <span className="u-numeric text-fg-faint w-10 shrink-0 text-right text-xs">
                    {Math.round(share)}%
                  </span>
                </div>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("u-eyebrow text-fg-faint px-4 py-3", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
