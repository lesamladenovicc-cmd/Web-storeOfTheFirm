import { COPY } from "@/config/copy";
import { EmptyState } from "@/components/ui/Feedback";
import type { ListingCard as ListingCardType } from "@/types/domain";
import { ListingCard } from "./ListingCard";

export function ListingGrid({
  listings,
  /** True when the caller applied a search/filter — changes the empty copy. */
  filtered = false,
  priorityCount = 4,
}: {
  listings: ListingCardType[];
  filtered?: boolean;
  priorityCount?: number;
}) {
  if (listings.length === 0) {
    // Distinct copy for "nothing published yet" vs "your filters matched
    // nothing" — conflating these is a real UX failure.
    return filtered ? (
      <EmptyState
        title={COPY.states.noResultsTitle}
        body={COPY.states.noResultsBody}
        action={{ href: "/oglasi", label: COPY.listings.clearFilters }}
      />
    ) : (
      <EmptyState
        title={COPY.states.emptyListingsTitle}
        body={COPY.states.emptyListingsBody}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((listing, i) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          index={i}
          priority={i < priorityCount}
        />
      ))}
    </div>
  );
}
