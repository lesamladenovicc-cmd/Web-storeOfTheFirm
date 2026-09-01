import Link from "next/link";
import { COPY } from "@/config/copy";
import { PageHeader } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";
import { requireProfile } from "@/lib/auth";
import { getDashboardStats } from "@/lib/data/listings";
import { getUnreadInquiryCount } from "@/lib/data/inquiries";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [stats, unread] = await Promise.all([
    getDashboardStats(),
    getUnreadInquiryCount(),
  ]);

  const cards = [
    { label: COPY.dashboard.stats.total, value: stats.total, href: "/dashboard/oglasi" },
    { label: COPY.dashboard.stats.active, value: stats.aktivan, href: "/dashboard/oglasi?status=aktivan" },
    { label: COPY.dashboard.stats.drafts, value: stats.nacrt, href: "/dashboard/oglasi?status=nacrt" },
    { label: COPY.dashboard.stats.sold, value: stats.prodato, href: "/dashboard/oglasi?status=prodato" },
    { label: COPY.dashboard.stats.unreadInquiries, value: unread, href: "/dashboard/upiti", accent: true },
  ];

  return (
    <>
      <PageHeader
        eyebrow={COPY.dashboard.welcome}
        title={profile.fullName || profile.email}
        actions={
          <ButtonLink href="/dashboard/oglasi/novi">
            {COPY.dashboard.listings.create}
          </ButtonLink>
        }
      />

      <ul className="mt-9 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((card) => (
          <li key={card.label}>
            <Link
              href={card.href}
              className="group flex h-full flex-col justify-between rounded-md border border-border bg-surface p-5 transition-colors hover:border-border-strong"
            >
              <span className="u-eyebrow text-paper-faint">{card.label}</span>
              <span
                className={
                  card.accent && card.value > 0
                    ? "u-numeric mt-5 text-3xl font-semibold text-accent"
                    : "u-numeric mt-5 text-3xl font-semibold text-paper"
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
