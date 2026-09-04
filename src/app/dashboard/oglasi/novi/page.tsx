import { randomUUID } from "node:crypto";
import { COPY } from "@/config/copy";
import { PageHeader } from "@/components/layout/Container";
import { ListingForm } from "@/components/dashboard/ListingForm";
import { requireProfile } from "@/lib/auth";
import { getAllCategories } from "@/lib/data/categories";
import { createListingAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * The listing id is generated HERE, before the row exists, so the
 * image uploader can write to {sellerId}/{listingId}/ immediately. The
 * storage policy checks the first path segment against auth.uid(), so
 * this is safe without a database round trip.
 */
export default async function NewListingPage() {
  const [profile, categories] = await Promise.all([requireProfile(), getAllCategories()]);

  return (
    <>
      <PageHeader eyebrow={COPY.dashboard.nav.listings} title={COPY.dashboard.form.createTitle} />
      <div className="mt-8">
        <ListingForm
          action={createListingAction}
          listingId={randomUUID()}
          sellerId={profile.id}
          categories={categories}
          defaults={{
            contactName: profile.fullName,
            contactPhone: profile.phone ?? "",
            location: profile.location ?? "",
          }}
        />
      </div>
    </>
  );
}
