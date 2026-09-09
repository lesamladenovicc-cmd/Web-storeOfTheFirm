import Link from "next/link";
import { COPY } from "@/config/copy";
import { PageHeader } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";
import { requireProfile } from "@/lib/auth";
import { getDashboardStats } from "@/lib/data/listings";
import { getUnreadInquiryCount } from "@/lib/data/inquiries";
import { getRevenueOverview } from "@/lib/data/revenue";
import { countWithNoun, formatNumber, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [stats, unread, revenue] = await Promise.all([
    getDashboardStats(),
    getUnreadInquiryCount(),
    getRevenueOverview(profile),
  ]);

  const isAdmin = revenue.scope === "all";

  const cards = [
    { label: COPY.dashboard.stats.total, value: stats.total, href: "/dashboard/oglasi" },
    {
      label: COPY.dashboard.stats.active,
      value: stats.aktivan,
      href: "/dashboard/oglasi?status=aktivan",
    },
    {
      label: COPY.dashboard.stats.drafts,
      value: stats.nacrt,
      href: "/dashboard/oglasi?status=nacrt",
    },
    {
      label: COPY.dashboard.stats.sold,
      value: stats.prodato,
      href: "/dashboard/oglasi?status=prodato",
    },
    {
      label: COPY.dashboard.stats.unreadInquiries,
      value: unread,
      href: "/dashboard/upiti",
      accent: true,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={COPY.dashboard.welcome}
        title={profile.fullName || profile.email}
        actions={
          <ButtonLink href="/dashboard/oglasi/novi">{COPY.dashboard.listings.create}</ButtonLink>
        }
      />

      {/* The turnover plate leads: it is the figure both roles open the
          dashboard for. Its scope follows the role — a seller's own
          sales, an admin's whole store. */}
      <Link
        href="/dashboard/prihod"
        className="u-marks border-line bg-panel hover:border-line-strong group mt-9 flex flex-col gap-6 border px-6 py-7 transition-colors sm:flex-row sm:items-end sm:justify-between sm:px-8"
      >
        <div>
          <span className="u-eyebrow text-fg-faint">
            {COPY.dashboard.revenue.totalLabel}
            {isAdmin ? " · " + COPY.dashboard.revenue.allSellers : ""}
          </span>
          <p className="u-numeric text-fg mt-4 text-[clamp(1.875rem,1.2rem+2.4vw,3rem)] leading-none font-semibold tracking-tight">
            {formatMoney(revenue.total)}
          </p>
          <p className="text-fg-muted mt-3 text-sm">
            {countWithNoun(revenue.count, "jedinica")} {COPY.dashboard.revenue.soldSuffix}
          </p>
        </div>

        <div className="sm:text-right">
          <span className="u-eyebrow text-fg-faint">{COPY.dashboard.revenue.thisMonth}</span>
          <p className="u-numeric text-fg mt-3 text-xl font-semibold">
            {formatMoney(revenue.thisMonth.total)}
          </p>
          <span className="u-eyebrow text-accent-text mt-4 inline-block">
            {COPY.dashboard.revenue.openReport} →
          </span>
        </div>
      </Link>

      <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((card) => (
          <li key={card.label}>
            <Link
              href={card.href}
              className="group border-line bg-panel hover:border-line-strong flex h-full flex-col justify-between rounded-md border p-5 transition-colors"
            >
              <span className="u-eyebrow text-fg-faint">{card.label}</span>
              <span
                className={
                  card.accent && card.value > 0
                    ? "u-numeric text-accent-text mt-5 text-3xl font-semibold"
                    : "u-numeric text-fg mt-5 text-3xl font-semibold"
                }
              >
                {formatNumber(card.value)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
