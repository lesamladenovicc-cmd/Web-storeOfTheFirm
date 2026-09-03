import Image from "next/image";
import Link from "next/link";
import { COPY } from "@/config/copy";
import { isListingStatus } from "@/config/taxonomy";
import { PageHeader } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { requireProfile } from "@/lib/auth";
import { getDashboardListings } from "@/lib/data/listings";
import { formatNumber, formatPrice, formatRelativeDate } from "@/lib/format";
import { BLUR_DATA_URL, publicImageUrl } from "@/lib/images";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "", label: COPY.dashboard.listings.tabs.all },
  { value: "nacrt", label: COPY.dashboard.listings.tabs.nacrt },
  { value: "aktivan", label: COPY.dashboard.listings.tabs.aktivan },
  { value: "prodato", label: COPY.dashboard.listings.tabs.prodato },
] as const;

export default async function DashboardListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sacuvano?: string; obrisano?: string }>;
}) {
  const [profile, params] = await Promise.all([requireProfile(), searchParams]);

  const status = isListingStatus(params.status) ? params.status : undefined;
  const listings = await getDashboardListings(status);
  const isAdmin = profile.role === "admin";

  // Both actions redirect here on success, so this is where their
  // confirmation has to appear — otherwise a save looks like a no-op.
  const saved = isListingStatus(params.sacuvano) ? params.sacuvano : undefined;
  const confirmation =
    params.obrisano === "1"
      ? COPY.dashboard.delete.success
      : saved === "nacrt"
        ? COPY.dashboard.form.savedDraft
        : saved
          ? COPY.dashboard.form.published
          : null;

  return (
    <>
      <PageHeader
        eyebrow={COPY.dashboard.title}
        title={isAdmin ? COPY.dashboard.listings.titleAdmin : COPY.dashboard.listings.title}
        actions={
          <ButtonLink href="/dashboard/oglasi/novi" size="md">
            {COPY.dashboard.listings.create}
          </ButtonLink>
        }
      />

      {confirmation ? (
        <div className="mt-6">
          <Alert tone="success">{confirmation}</Alert>
        </div>
      ) : null}

      <nav aria-label={COPY.dashboard.listings.colStatus} className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = (params.status ?? "") === tab.value;
            return (
              <li key={tab.value}>
                <Link
                  href={tab.value ? `/dashboard/oglasi?status=${tab.value}` : "/dashboard/oglasi"}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-sm border px-3.5 text-sm transition-colors",
                    active
                      ? "border-accent text-accent"
                      : "border-border text-paper-muted hover:border-border-strong hover:text-paper",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6">
        {listings.length === 0 ? (
          <EmptyState
            title={COPY.dashboard.listings.empty}
            action={{
              href: "/dashboard/oglasi/novi",
              label: COPY.dashboard.listings.emptyCta,
            }}
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left">
                  <Th className="w-16">{COPY.dashboard.listings.colImage}</Th>
                  <Th>{COPY.dashboard.listings.colTitle}</Th>
                  <Th>{COPY.dashboard.listings.colStatus}</Th>
                  <Th className="text-right">{COPY.dashboard.listings.colPrice}</Th>
                  {isAdmin ? <Th>{COPY.dashboard.listings.colSeller}</Th> : null}
                  <Th className="text-right">{COPY.dashboard.listings.colViews}</Th>
                  <Th>{COPY.dashboard.listings.colUpdated}</Th>
                  <Th className="text-right">{COPY.dashboard.listings.colActions}</Th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr
                    key={listing.id}
                    className="border-b border-border last:border-0 hover:bg-surface"
                  >
                    <Td>
                      <div className="relative h-10 w-14 overflow-hidden rounded-xs bg-surface-2">
                        {listing.coverImagePath ? (
                          <Image
                            src={publicImageUrl(listing.coverImagePath)}
                            alt=""
                            fill
                            sizes="56px"
                            placeholder="blur"
                            blurDataURL={BLUR_DATA_URL}
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/oglasi/${listing.id}/izmena`}
                        className="font-medium text-paper transition-colors hover:text-accent"
                      >
                        {listing.title}
                      </Link>
                      {listing.categoryName ? (
                        <p className="u-numeric mt-0.5 text-xs text-paper-faint">
                          {listing.categoryName}
                        </p>
                      ) : null}
                    </Td>
                    <Td>
                      <StatusBadge status={listing.status} />
                    </Td>
                    <Td className="u-numeric text-right whitespace-nowrap">
                      {formatPrice(listing.priceRsd)}
                    </Td>
                    {isAdmin ? (
                      <Td className="text-paper-muted">{listing.sellerName ?? "—"}</Td>
                    ) : null}
                    <Td className="u-numeric text-right text-paper-muted">
                      {formatNumber(listing.viewCount)}
                    </Td>
                    <Td className="u-numeric whitespace-nowrap text-paper-muted">
                      {formatRelativeDate(listing.updatedAt)}
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <Link
                        href={`/dashboard/oglasi/${listing.id}/izmena`}
                        className="text-paper-muted transition-colors hover:text-accent"
                      >
                        {COPY.common.edit}
                      </Link>
                      {listing.status !== "nacrt" ? (
                        <>
                          <span aria-hidden="true" className="mx-2 text-border-strong">
                            |
                          </span>
                          <Link
                            href={`/oglas/${listing.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-paper-muted transition-colors hover:text-accent"
                          >
                            {COPY.dashboard.listings.view}
                          </Link>
                        </>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("u-eyebrow px-4 py-3 text-paper-faint", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
