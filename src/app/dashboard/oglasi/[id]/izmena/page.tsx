import { notFound } from "next/navigation";
import Link from "next/link";
import { COPY } from "@/config/copy";
import { PageHeader } from "@/components/layout/Container";
import { StatusBadge } from "@/components/ui/Badge";
import { ListingForm } from "@/components/dashboard/ListingForm";
import { DeleteListingDialog } from "@/components/dashboard/DeleteListingDialog";
import { canEditListing, requireProfile } from "@/lib/auth";
import { getAllCategories } from "@/lib/data/categories";
import { getListingById } from "@/lib/data/listings";
import { updateListingAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sacuvano?: string }>;
}) {
  const [{ id }, query, profile] = await Promise.all([params, searchParams, requireProfile()]);

  const [listing, categories] = await Promise.all([getListingById(id), getAllCategories()]);

  // RLS already hides other sellers' listings, so this is normally a
  // genuine 404. The explicit ownership check covers the admin path and
  // keeps the intent legible.
  if (!listing || !canEditListing(profile, listing.sellerId)) notFound();

  return (
    <>
      <PageHeader
        eyebrow={COPY.dashboard.nav.listings}
        title={COPY.dashboard.form.editTitle}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={listing.status} />
            {listing.status !== "nacrt" ? (
              <Link
                href={`/oglas/${listing.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border-line-strong text-fg hover:border-accent hover:text-accent-text inline-flex h-9 items-center rounded-sm border px-3.5 text-sm transition-colors"
              >
                {COPY.dashboard.listings.view}
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="mt-8">
        <ListingForm
          action={updateListingAction}
          listingId={listing.id}
          sellerId={listing.sellerId}
          categories={categories}
          listing={listing}
          saved={query.sacuvano === "1"}
        />
      </div>

      <div className="border-danger/30 bg-danger-soft mt-14 rounded-md border p-6">
        <h2 className="font-display text-danger text-base font-semibold">
          {COPY.dashboard.delete.title}
        </h2>
        <p className="text-fg-muted mt-2 max-w-[60ch] text-sm">{COPY.dashboard.delete.body}</p>
        <div className="mt-5">
          <DeleteListingDialog listingId={listing.id} title={listing.title} />
        </div>
      </div>
    </>
  );
}
