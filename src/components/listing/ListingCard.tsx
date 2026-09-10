import Image from "next/image";
import Link from "next/link";
import { COPY } from "@/config/copy";
import {
  CONDITION_LABELS,
  PURPOSE_LABELS,
  soldLabel,
  type ListingCondition,
} from "@/config/taxonomy";
import { BLUR_DATA_URL, publicImageUrl } from "@/lib/images";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ListingCard as ListingCardType } from "@/types/domain";
import { PriceTag } from "./PriceTag";

/**
 * The build-phase lamp at the head of the data strip — the one coloured
 * pixel on a resting card. It warms up with readiness, so scanning down
 * the grid reads as "how soon can I move in". The two early phases are
 * the commonest, so they stay in the strip's own grey and only a unit
 * you can actually take keys to lights up.
 *
 * No phase is red: red would read as a fault, and a building that is
 * still going up is not a fault. Red stays with the `prodato` status.
 */
const CONDITION_LAMP: Record<ListingCondition, string> = {
  u_pripremi: "bg-fg-faint",
  u_izgradnji: "bg-fg-faint",
  pred_useljenje: "bg-signal-blue",
  useljivo: "bg-signal-green",
};

/**
 * Grid card as a small spec sheet: a 4:3 photograph, a mono data strip
 * (condition / location / date) under its own rule, the title, and the
 * price row with a square arrow that takes the signal yellow on hover.
 *
 * The <Link> in the title is stretched over the whole <article> via a
 * `before:` pseudo-element, so the card must stay `relative` and must
 * not gain any other positioned child that would sit above it.
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
  // `prodato` is the terminal state for both purposes; the WORD differs.
  const isSold = listing.status === "prodato";

  /**
   * The data strip. `lamp` is a Tailwind background class for the 6px
   * square that leads its chip — carried per chip rather than assumed to
   * be the first one, so chips can come and go without moving the lamp.
   *
   * The purpose chip appears ONLY on rentals: sale is the default mode
   * of the whole catalogue, so saying "Prodaja" on every card is noise,
   * while an unmarked rental is a misread price.
   */
  const specs: { label: string; lamp?: string }[] = [
    ...(listing.purpose === "izdavanje"
      ? [{ label: PURPOSE_LABELS.izdavanje, lamp: "bg-signal" }]
      : []),
    ...(listing.condition
      ? [{ label: CONDITION_LABELS[listing.condition], lamp: CONDITION_LAMP[listing.condition] }]
      : []),
    ...(listing.location ? [{ label: listing.location }] : []),
    ...(listing.publishedAt ? [{ label: formatRelativeDate(listing.publishedAt) }] : []),
  ];

  return (
    <article
      className="u-reveal group border-line bg-panel hover:border-fg relative flex flex-col border transition-colors duration-200"
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="bg-panel-2 relative aspect-[4/3] overflow-hidden">
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
            <span className="u-eyebrow text-fg-faint">{COPY.listing.noImage}</span>
          </div>
        )}

        {isSold ? (
          <span className="u-eyebrow bg-ink text-paper absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 text-[0.625rem]">
            <span aria-hidden="true" className="bg-signal-red h-1.5 w-1.5" />
            {soldLabel(listing.purpose)}
          </span>
        ) : null}
      </div>

      {specs.length ? (
        <ul className="u-eyebrow border-line text-fg-faint flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b px-4 py-2.5 text-[0.625rem]">
          {specs.map((spec, i) => (
            <li key={spec.label} className="flex items-center gap-2.5 whitespace-nowrap">
              {i > 0 ? (
                <span aria-hidden="true" className="text-line-strong">
                  /
                </span>
              ) : null}
              {spec.lamp ? (
                <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0", spec.lamp)} />
              ) : null}
              {spec.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="u-line-clamp-2 text-h4 text-fg">
          <Link href={href} className="before:absolute before:inset-0 before:content-['']">
            {listing.title}
          </Link>
        </h3>

        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <PriceTag
            price={listing.priceEur}
            purpose={listing.purpose}
            isNegotiable={listing.isNegotiable}
            size="md"
          />
          <span
            aria-hidden="true"
            className="border-line text-fg-muted group-hover:border-signal group-hover:bg-signal group-hover:text-on-signal grid h-8 w-8 shrink-0 place-items-center border transition-colors duration-200"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </article>
  );
}
