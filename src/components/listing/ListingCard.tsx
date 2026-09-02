import Image from "next/image";
import Link from "next/link";
import { COPY } from "@/config/copy";
import { CONDITION_LABELS } from "@/config/taxonomy";
import { BLUR_DATA_URL, publicImageUrl } from "@/lib/images";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ListingCard as ListingCardType } from "@/types/domain";
import { PriceTag } from "./PriceTag";

/**
 * Grid card. The monospace spec-line (condition · location · date) under
 * the title is the recurring motif that ties the catalogue together.
 */
export function ListingCard({
  listing,
  index = 0,
  priority = false,
}: {
  listing: ListingCardType;
  index?: number;
  priority?: boolean;
}) {
  const href = `/oglas/${listing.slug}`;
  const isSold = listing.status === "prodato";

  return (
    <article
      className="u-reveal u-ticks group relative flex flex-col overflow-hidden rounded-md border border-border bg-surface transition-colors duration-200 hover:border-border-strong"
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-surface-2">
        {listing.coverImagePath ? (
          <Image
            src={publicImageUrl(listing.coverImagePath)}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            priority={priority}
            className={cn(
              "object-cover transition-transform duration-500 ease-[var(--ease-out-quart)] group-hover:scale-[1.03]",
              isSold && "opacity-45 grayscale",
            )}
          />
        ) : (
          <div className="grid h-full place-items-center">
            <span className="u-eyebrow text-paper-faint">{COPY.listing.noImage}</span>
          </div>
        )}

        {isSold ? (
          <div className="absolute inset-x-0 top-0 bg-danger px-3 py-1.5 text-center">
            <span className="u-eyebrow text-paper">{COPY.listing.soldRibbon}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="u-line-clamp-2 font-display text-[1.0625rem] leading-snug font-semibold text-paper">
          <Link href={href} className="before:absolute before:inset-0 before:content-['']">
            {listing.title}
          </Link>
        </h3>

        <p className="u-numeric mt-2 text-xs text-paper-faint">
          {listing.condition ? CONDITION_LABELS[listing.condition] : ""}
          {listing.location ? ` · ${listing.location}` : ""}
          {listing.publishedAt ? ` · ${formatRelativeDate(listing.publishedAt)}` : ""}
        </p>

        <div className="mt-auto pt-4">
          <PriceTag price={listing.priceRsd} isNegotiable={listing.isNegotiable} size="md" />
        </div>
      </div>
    </article>
  );
}
